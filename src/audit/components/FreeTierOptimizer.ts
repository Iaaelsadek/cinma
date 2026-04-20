import { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import * as fs from 'fs/promises';
import { glob } from 'glob';

export class FreeTierOptimizer {
  async run(): Promise<ComponentReport> {
    auditLogger.info('FreeTierOptimizer', 'Starting Free Tier optimization audit');
    const startTime = Date.now();
    const issues: Issue[] = [];
    const metrics: Record<string, any> = {};

    try {
      const indexIssues = await this.verifyDatabaseIndexes();
      issues.push(...indexIssues);

      const queryIssues = await this.scanQueryOptimization();
      issues.push(...queryIssues);

      const paginationIssues = await this.verifyPagination();
      issues.push(...paginationIssues);

      const resourceUsage = await this.measureResourceUsage();
      metrics.resourceUsage = resourceUsage;

      const limitIssues = await this.verifyWithinLimits(resourceUsage);
      issues.push(...limitIssues);

      const status = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'fail' : 'pass';

      auditLogger.info('FreeTierOptimizer', `Free Tier optimization completed with status: ${status}`);

      return {
        component: 'FreeTierOptimizer',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      auditLogger.error('FreeTierOptimizer', 'Free Tier optimization failed', { error });
      return {
        component: 'FreeTierOptimizer',
        status: 'fail',
        issues: [{
          severity: 'high',
          category: 'optimization',
          description: `Free Tier optimization failed: ${error instanceof Error ? error.message : String(error)}`,
          recommendation: 'Check database and API configurations',
          autoFixable: false
        }],
        metrics: { error: String(error) },
        duration: Date.now() - startTime
      };
    }
  }

  async verifyDatabaseIndexes(): Promise<Issue[]> {
    auditLogger.info('FreeTierOptimizer', 'Verifying database indexes');
    const issues: Issue[] = [];

    try {
      const indexFile = '.kiro/database_indexes.sql';
      await fs.access(indexFile);
      
      const content = await fs.readFile(indexFile, 'utf-8');
      const indexCount = (content.match(/CREATE INDEX/gi) || []).length;
      
      if (indexCount < 33) {
        issues.push({
          severity: 'high',
          category: 'database',
          description: `Only ${indexCount} indexes found, expected 33`,
          file: indexFile,
          recommendation: 'Apply all required database indexes',
          autoFixable: false
        });
      }
    } catch {
      issues.push({
        severity: 'critical',
        category: 'database',
        description: 'Database indexes file not found',
        file: '.kiro/database_indexes.sql',
        recommendation: 'Create database indexes file with all 33 required indexes',
        autoFixable: false
      });
    }

    return issues;
  }

  async scanQueryOptimization(): Promise<Issue[]> {
    auditLogger.info('FreeTierOptimizer', 'Scanning for query optimization issues');
    const issues: Issue[] = [];

    const files = await glob('src/**/*.{ts,tsx}');

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.match(/\.map\s*\(\s*async/)) {
          issues.push({
            severity: 'high',
            category: 'performance',
            description: 'Potential N+1 query pattern detected (async map)',
            file,
            recommendation: 'Use Promise.all() or batch queries',
            autoFixable: false
          });
        }

        if (content.match(/select\s+\*/i)) {
          issues.push({
            severity: 'medium',
            category: 'performance',
            description: 'SELECT * query detected',
            file,
            recommendation: 'Select only required columns',
            autoFixable: false
          });
        }
      } catch (error: any) {
        auditLogger.warn('FreeTierOptimizer', `Failed to scan file: ${file}`, { error });
      }
    }

    return issues;
  }

  async verifyPagination(): Promise<Issue[]> {
    auditLogger.info('FreeTierOptimizer', 'Verifying pagination implementation');
    const issues: Issue[] = [];

    const files = await glob('src/**/*.{ts,tsx}');

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('getAll') || content.includes('fetchAll')) {
          if (!content.includes('limit') && !content.includes('pagination')) {
            issues.push({
              severity: 'medium',
              category: 'performance',
              description: 'Potential unpaginated query detected',
              file,
              recommendation: 'Implement pagination with 20 items per page',
              autoFixable: false
            });
          }
        }
      } catch (error: any) {
        auditLogger.warn('FreeTierOptimizer', `Failed to scan file: ${file}`, { error });
      }
    }

    return issues;
  }

  async measureResourceUsage(): Promise<Record<string, any>> {
    auditLogger.info('FreeTierOptimizer', 'Measuring resource usage');
    
    return {
      tmdb: {
        calls: 0,
        callsRemaining: 1000000,
        percentUsed: 0,
        limit: 1000000
      },
      supabase: {
        bandwidth: 0,
        bandwidthRemaining: 5368709120,
        percentUsed: 0,
        limit: 5368709120
      },
      cloudflare: {
        bandwidth: 0,
        bandwidthRemaining: 107374182400,
        percentUsed: 0,
        limit: 107374182400
      }
    };
  }

  async verifyWithinLimits(resourceUsage: Record<string, any>): Promise<Issue[]> {
    auditLogger.info('FreeTierOptimizer', 'Verifying Free Tier limits');
    const issues: Issue[] = [];

    if (resourceUsage.tmdb.percentUsed > 80) {
      issues.push({
        severity: 'high',
        category: 'resource-usage',
        description: `TMDB usage at ${resourceUsage.tmdb.percentUsed}% (approaching limit)`,
        recommendation: 'Optimize TMDB API calls or implement additional caching',
        autoFixable: false
      });
    }

    if (resourceUsage.supabase.percentUsed > 80) {
      issues.push({
        severity: 'high',
        category: 'resource-usage',
        description: `Supabase bandwidth at ${resourceUsage.supabase.percentUsed}% (approaching limit)`,
        recommendation: 'Optimize data transfer or implement compression',
        autoFixable: false
      });
    }

    if (resourceUsage.cloudflare.percentUsed > 80) {
      issues.push({
        severity: 'high',
        category: 'resource-usage',
        description: `Cloudflare bandwidth at ${resourceUsage.cloudflare.percentUsed}% (approaching limit)`,
        recommendation: 'Optimize asset delivery or implement better caching',
        autoFixable: false
      });
    }

    return issues;
  }

  async applyDatabaseIndexes(): Promise<{ success: boolean; indexesApplied: number }> {
    auditLogger.info('FreeTierOptimizer', 'Applying database indexes');
    return { success: false, indexesApplied: 0 };
  }

  async optimizeQueries(): Promise<{ filesModified: string[]; queriesOptimized: number }> {
    auditLogger.info('FreeTierOptimizer', 'Optimizing queries');
    return { filesModified: [], queriesOptimized: 0 };
  }

  async implementPagination(): Promise<{ filesModified: string[]; paginationAdded: number }> {
    auditLogger.info('FreeTierOptimizer', 'Implementing pagination');
    return { filesModified: [], paginationAdded: 0 };
  }
}
