import { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DatabaseAuditor {
  private srcDir: string;
  
  // CockroachDB tables (content only)
  private cockroachTables = [
    'movies', 'tv_series', 'seasons', 'episodes', 'actors', 'genres',
    'movie_genres', 'series_genres', 'movie_actors', 'series_actors',
    'videos', 'software', 'games', 'cinematics', 'plays', 'quran_reciters',
    'quran_recitations', 'summaries'
  ];

  // Supabase tables (auth and user data only)
  private supabaseTables = [
    'profiles', 'watchlist', 'watch_history', 'comments', 'ratings',
    'user_preferences', 'notifications', 'user_achievements'
  ];

  constructor(srcDir: string = 'src') {
    this.srcDir = srcDir;
  }

  async run(): Promise<ComponentReport> {
    auditLogger.info('DatabaseAuditor', 'Starting database audit');
    const startTime = Date.now();
    const issues: Issue[] = [];
    const metrics: Record<string, any> = {};

    try {
      // Scan database usage
      const usages = await this.scanDatabaseUsage();
      metrics.totalDatabaseCalls = usages.length;
      metrics.cockroachdbCalls = usages.filter(u => u.database === 'cockroachdb').length;
      metrics.supabaseCalls = usages.filter(u => u.database === 'supabase').length;
      metrics.incorrectUsages = usages.filter(u => !u.isCorrect).length;

      // Check for incorrect database usage
      for (const usage of usages.filter(u => !u.isCorrect)) {
        issues.push({
          severity: 'critical',
          category: 'database',
          description: `Incorrect database usage: ${usage.reason}`,
          file: usage.file,
          line: usage.line,
          recommendation: usage.database === 'cockroachdb' 
            ? 'Use Supabase for user/auth data'
            : 'Use CockroachDB for content data',
          autoFixable: false
        });
      }

      // Verify CockroachDB usage
      const cockroachIssues = await this.verifyCockroachDBUsage();
      issues.push(...cockroachIssues);

      // Verify Supabase usage
      const supabaseIssues = await this.verifySupabaseUsage();
      issues.push(...supabaseIssues);

      // Analyze queries for N+1 and optimization issues
      const queryIssues = await this.analyzeQueries();
      issues.push(...queryIssues);
      metrics.nPlusOneQueries = queryIssues.filter(i => i.description.includes('N+1')).length;
      metrics.unoptimizedQueries = queryIssues.filter(i => i.description.includes('unoptimized')).length;

      // Verify indexes
      const indexIssues = await this.verifyIndexes();
      issues.push(...indexIssues);

      const status = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'fail' : 'pass';

      auditLogger.info('DatabaseAuditor', `Database audit completed with status: ${status}`);

      return {
        component: 'DatabaseAuditor',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      auditLogger.error('DatabaseAuditor', 'Database audit failed', { error });
      return {
        component: 'DatabaseAuditor',
        status: 'fail',
        issues: [{
          severity: 'high',
          category: 'database',
          description: `Database audit failed: ${error instanceof Error ? error.message : String(error)}`,
          recommendation: 'Check database connections and file access',
          autoFixable: false
        }],
        metrics: { error: String(error) },
        duration: Date.now() - startTime
      };
    }
  }

  async scanDatabaseUsage() {
    auditLogger.info('DatabaseAuditor', 'Scanning database usage across codebase');
    const usages: Array<{
      file: string;
      line: number;
      database: 'cockroachdb' | 'supabase' | 'unknown';
      table?: string;
      operation: 'select' | 'insert' | 'update' | 'delete' | 'query';
      isCorrect: boolean;
      reason?: string;
    }> = [];

    const files = await this.getAllFiles(this.srcDir);
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js')) continue;

      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect Supabase queries
        if (line.includes('supabase.from(')) {
          const tableMatch = line.match(/supabase\.from\(['"`](\w+)['"`]\)/);
          const table = tableMatch ? tableMatch[1] : undefined;
          
          usages.push({
            file,
            line: i + 1,
            database: 'supabase',
            table,
            operation: this.detectOperation(line),
            isCorrect: table ? this.supabaseTables.includes(table) : true,
            reason: table && !this.supabaseTables.includes(table) 
              ? `Table '${table}' should use CockroachDB, not Supabase`
              : undefined
          });
        }

        // Detect CockroachDB queries (pg client)
        if (line.includes('pool.query') || line.includes('client.query')) {
          const tableMatch = line.match(/FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)/i);
          const table = tableMatch ? (tableMatch[1] || tableMatch[2] || tableMatch[3]) : undefined;
          
          usages.push({
            file,
            line: i + 1,
            database: 'cockroachdb',
            table,
            operation: this.detectOperation(line),
            isCorrect: table ? this.cockroachTables.includes(table) : true,
            reason: table && !this.cockroachTables.includes(table)
              ? `Table '${table}' should use Supabase, not CockroachDB`
              : undefined
          });
        }
      }
    }

    auditLogger.info('DatabaseAuditor', `Found ${usages.length} database calls`);
    return usages;
  }

  async verifyCockroachDBUsage(): Promise<Issue[]> {
    auditLogger.info('DatabaseAuditor', 'Verifying CockroachDB usage for content tables');
    const issues: Issue[] = [];

    // Check that content tables are only accessed via CockroachDB
    const files = await this.getAllFiles(this.srcDir);
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for Supabase accessing content tables
        for (const table of this.cockroachTables) {
          if (line.includes(`supabase.from('${table}')`) || line.includes(`supabase.from("${table}")`)) {
            issues.push({
              severity: 'critical',
              category: 'database',
              description: `Content table '${table}' accessed via Supabase instead of CockroachDB`,
              file,
              line: i + 1,
              recommendation: 'Use CockroachDB (pool.query) for content tables',
              autoFixable: false
            });
          }
        }
      }
    }

    return issues;
  }

  async verifySupabaseUsage(): Promise<Issue[]> {
    auditLogger.info('DatabaseAuditor', 'Verifying Supabase usage for auth and user data');
    const issues: Issue[] = [];

    // Check that user/auth tables are only accessed via Supabase
    const files = await this.getAllFiles(this.srcDir);
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for CockroachDB accessing user/auth tables
        for (const table of this.supabaseTables) {
          if (line.includes(`FROM ${table}`) || line.includes(`INTO ${table}`) || line.includes(`UPDATE ${table}`)) {
            if (line.includes('pool.query') || line.includes('client.query')) {
              issues.push({
                severity: 'critical',
                category: 'database',
                description: `User/auth table '${table}' accessed via CockroachDB instead of Supabase`,
                file,
                line: i + 1,
                recommendation: 'Use Supabase for user and authentication tables',
                autoFixable: false
              });
            }
          }
        }
      }
    }

    return issues;
  }

  async analyzeQueries(): Promise<Issue[]> {
    auditLogger.info('DatabaseAuditor', 'Analyzing queries for N+1 and optimization issues');
    const issues: Issue[] = [];

    const files = await this.getAllFiles(this.srcDir);
    
    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect potential N+1 queries (queries inside loops)
        if ((line.includes('pool.query') || line.includes('supabase.from')) && 
            this.isInsideLoop(lines, i)) {
          issues.push({
            severity: 'high',
            category: 'performance',
            description: 'Potential N+1 query detected - database call inside loop',
            file,
            line: i + 1,
            recommendation: 'Use JOIN or batch queries to fetch related data',
            autoFixable: false
          });
        }

        // Detect SELECT * queries
        if (line.includes('SELECT *') || line.includes('select(\'*\')')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            description: 'Unoptimized query - SELECT * fetches all columns',
            file,
            line: i + 1,
            recommendation: 'Select only required columns to reduce bandwidth',
            autoFixable: false
          });
        }

        // Detect queries without LIMIT
        if ((line.includes('SELECT') || line.includes('supabase.from')) && 
            !line.includes('LIMIT') && !line.includes('.limit(') &&
            !line.includes('.single()')) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            description: 'Query without LIMIT - may return too many rows',
            file,
            line: i + 1,
            recommendation: 'Add LIMIT clause or pagination',
            autoFixable: false
          });
        }
      }
    }

    return issues;
  }

  async verifyIndexes(): Promise<Issue[]> {
    auditLogger.info('DatabaseAuditor', 'Verifying database indexes');
    const issues: Issue[] = [];

    // Read the database indexes file
    const indexesPath = path.join(process.cwd(), '.kiro', 'database_indexes.sql');
    
    try {
      const indexesContent = await fs.readFile(indexesPath, 'utf-8');
      const indexCount = (indexesContent.match(/CREATE INDEX/gi) || []).length;
      
      if (indexCount < 33) {
        issues.push({
          severity: 'high',
          category: 'database',
          description: `Only ${indexCount} indexes found, expected 33`,
          file: indexesPath,
          recommendation: 'Apply all required database indexes for optimal performance',
          autoFixable: false
        });
      }

      auditLogger.info('DatabaseAuditor', `Found ${indexCount} database indexes`);
    } catch (error: any) {
      issues.push({
        severity: 'high',
        category: 'database',
        description: 'Database indexes file not found',
        file: indexesPath,
        recommendation: 'Create database_indexes.sql with all required indexes',
        autoFixable: false
      });
    }

    return issues;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error: any) {
      auditLogger.error('DatabaseAuditor', `Failed to read directory: ${dir}`, { error });
    }
    
    return files;
  }

  private detectOperation(line: string): 'select' | 'insert' | 'update' | 'delete' | 'query' {
    if (line.includes('.select(') || line.includes('SELECT')) return 'select';
    if (line.includes('.insert(') || line.includes('INSERT')) return 'insert';
    if (line.includes('.update(') || line.includes('UPDATE')) return 'update';
    if (line.includes('.delete(') || line.includes('DELETE')) return 'delete';
    return 'query';
  }

  private isInsideLoop(lines: string[], currentLine: number): boolean {
    // Look backwards to find loop keywords
    for (let i = currentLine - 1; i >= Math.max(0, currentLine - 20); i--) {
      const line = lines[i].trim();
      if (line.includes('for (') || line.includes('for(') || 
          line.includes('.map(') || line.includes('.forEach(') ||
          line.includes('while (') || line.includes('while(')) {
        return true;
      }
      // Stop at function boundaries
      if (line.includes('function ') || line.includes('async ') || line.includes('=>')) {
        break;
      }
    }
    return false;
  }
}
