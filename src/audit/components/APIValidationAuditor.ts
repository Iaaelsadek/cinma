import type { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import { glob } from 'glob';
import * as fs from 'fs/promises';

interface APIValidationReport {
  apiCallsWithoutValidation: Array<{
    file: string;
    line: number;
    apiCall: string;
    apiType: 'tmdb' | 'supabase' | 'fetch' | 'unknown';
  }>;
  missingNullChecks: Array<{
    file: string;
    line: number;
    field: string;
    context: string;
  }>;
  missingFallbackData: Array<{
    file: string;
    line: number;
    apiCall: string;
  }>;
  typeValidationIssues: Array<{
    file: string;
    line: number;
    issue: string;
  }>;
  totalIssues: number;
}

interface DependencyReport {
  bundleSize: {
    total: number;
    largest: Array<{ name: string; size: number }>;
  };
  unusedDependencies: string[];
  duplicateDependencies: Array<{ name: string; versions: string[] }>;
  outdatedDependencies: Array<{ name: string; current: string; latest: string }>;
  heavyDependencies: Array<{ name: string; size: number; alternatives?: string[] }>;
  totalIssues: number;
}

export class APIValidationAuditor {
  private optionalFieldPatterns = [
    /\?\./, // Optional chaining
    /\|\|/, // Logical OR for fallback
    /\?\?/, // Nullish coalescing
  ];

  async run(): Promise<ComponentReport> {
    auditLogger.info('APIValidationAuditor', 'Starting API validation and dependency audit');
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // Scan API response validation
      const apiReport = await this.scanAPIResponseValidation();
      issues.push(...this.convertAPIToIssues(apiReport));

      // Scan dependencies
      const depReport = await this.scanDependencies();
      issues.push(...this.convertDependenciesToIssues(depReport));

      const status = issues.some(i => i.severity === 'critical') ? 'fail' :
                     issues.some(i => i.severity === 'high') ? 'warning' : 'pass';

      return {
        component: 'APIValidationAuditor',
        status,
        issues,
        metrics: {
          apiCallsWithoutValidation: apiReport.apiCallsWithoutValidation.length,
          missingNullChecks: apiReport.missingNullChecks.length,
          missingFallbackData: apiReport.missingFallbackData.length,
          typeValidationIssues: apiReport.typeValidationIssues.length,
          unusedDependencies: depReport.unusedDependencies.length,
          duplicateDependencies: depReport.duplicateDependencies.length,
          outdatedDependencies: depReport.outdatedDependencies.length,
          bundleSize: depReport.bundleSize.total,
        },
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      auditLogger.error('APIValidationAuditor', 'Audit failed', { error });
      throw error;
    }
  }

  async scanAPIResponseValidation(): Promise<APIValidationReport> {
    auditLogger.info('APIValidationAuditor', 'Scanning API response validation');
    
    const apiCallsWithoutValidation: Array<{ file: string; line: number; apiCall: string; apiType: 'tmdb' | 'supabase' | 'fetch' | 'unknown' }> = [];
    const missingNullChecks: Array<{ file: string; line: number; field: string; context: string }> = [];
    const missingFallbackData: Array<{ file: string; line: number; apiCall: string }> = [];
    const typeValidationIssues: Array<{ file: string; line: number; issue: string }> = [];

    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'] 
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Detect API calls
          const apiType = this.detectAPIType(trimmedLine);
          if (apiType) {
            // Check if response is validated
            const hasValidation = this.checkResponseValidation(lines, i);
            if (!hasValidation) {
              apiCallsWithoutValidation.push({
                file,
                line: i + 1,
                apiCall: trimmedLine.substring(0, 80),
                apiType,
              });
            }

            // Check for fallback data
            const hasFallback = this.checkFallbackData(lines, i);
            if (!hasFallback) {
              missingFallbackData.push({
                file,
                line: i + 1,
                apiCall: trimmedLine.substring(0, 80),
              });
            }
          }

          // Check for direct property access without null checks
          if (this.hasDirectPropertyAccess(trimmedLine)) {
            const field = this.extractFieldName(trimmedLine);
            if (field && !this.hasNullCheck(trimmedLine)) {
              missingNullChecks.push({
                file,
                line: i + 1,
                field,
                context: trimmedLine.substring(0, 80),
              });
            }
          }

          // Check for type assertions without validation
          if (/as\s+\w+/.test(trimmedLine) && !/(if|typeof|instanceof)/.test(trimmedLine)) {
            typeValidationIssues.push({
              file,
              line: i + 1,
              issue: 'Type assertion without runtime validation',
            });
          }
        }
      } catch (error: any) {
        auditLogger.warn('APIValidationAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    return {
      apiCallsWithoutValidation,
      missingNullChecks,
      missingFallbackData,
      typeValidationIssues,
      totalIssues: apiCallsWithoutValidation.length + 
                   missingNullChecks.length + 
                   missingFallbackData.length + 
                   typeValidationIssues.length,
    };
  }

  async scanDependencies(): Promise<DependencyReport> {
    auditLogger.info('APIValidationAuditor', 'Scanning dependencies');
    
    const unusedDependencies: string[] = [];
    const duplicateDependencies: Array<{ name: string; versions: string[] }> = [];
    const outdatedDependencies: Array<{ name: string; current: string; latest: string }> = [];
    const heavyDependencies: Array<{ name: string; size: number; alternatives?: string[] }> = [];

    try {
      // Read package.json
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for unused dependencies (basic check - look for imports)
      for (const dep of Object.keys(dependencies)) {
        const isUsed = await this.isDependencyUsed(dep);
        if (!isUsed) {
          unusedDependencies.push(dep);
        }
      }

      // Check for heavy dependencies
      const heavyDeps = [
        { name: 'moment', size: 288, alternatives: ['date-fns', 'dayjs'] },
        { name: 'lodash', size: 72, alternatives: ['lodash-es (tree-shakeable)'] },
        { name: 'axios', size: 32, alternatives: ['native fetch'] },
      ];

      for (const heavy of heavyDeps) {
        if (dependencies[heavy.name]) {
          heavyDependencies.push(heavy);
        }
      }

    } catch (error: any) {
      auditLogger.warn('APIValidationAuditor', 'Failed to scan dependencies', { error });
    }

    return {
      bundleSize: {
        total: 0, // Would need actual bundle analysis
        largest: [],
      },
      unusedDependencies,
      duplicateDependencies,
      outdatedDependencies,
      heavyDependencies,
      totalIssues: unusedDependencies.length + 
                   duplicateDependencies.length + 
                   outdatedDependencies.length + 
                   heavyDependencies.length,
    };
  }

  private detectAPIType(line: string): 'tmdb' | 'supabase' | 'fetch' | 'unknown' | null {
    if (/tmdb(Optimized)?\.get\(/.test(line)) return 'tmdb';
    if (/supabase\.from\(/.test(line)) return 'supabase';
    if (/fetch\(/.test(line)) return 'fetch';
    if (/axios\.(get|post|put|delete)\(/.test(line)) return 'unknown';
    return null;
  }

  private checkResponseValidation(lines: string[], startIndex: number): boolean {
    // Check next 10 lines for validation patterns
    for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
      const line = lines[i];
      
      // Look for validation patterns
      if (/(if|typeof|instanceof|Array\.isArray|\.length|\.hasOwnProperty)/.test(line)) {
        return true;
      }
      
      // Look for optional chaining or nullish coalescing
      if (/(\?\.|\\?\?|\|\|)/.test(line)) {
        return true;
      }
      
      // Look for try-catch
      if (/catch/.test(line)) {
        return true;
      }
    }
    
    return false;
  }

  private checkFallbackData(lines: string[], startIndex: number): boolean {
    // Check for fallback patterns in catch blocks or default values
    for (let i = startIndex; i < Math.min(startIndex + 15, lines.length); i++) {
      const line = lines[i];
      
      // Look for catch with fallback
      if (/catch/.test(line)) {
        // Check next few lines for return or fallback
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (/(return|=)\s*(\[|\{|null|undefined|\|\|)/.test(lines[j])) {
            return true;
          }
        }
      }
      
      // Look for default values
      if (/(\|\||\\?\?)\s*(\[|\{)/.test(line)) {
        return true;
      }
    }
    
    return false;
  }

  private hasDirectPropertyAccess(line: string): boolean {
    // Check for property access patterns like data.field or response.data
    return /\w+\.\w+/.test(line) && !/(console|logger|Math|Object|Array|String|Number)\./.test(line);
  }

  private hasNullCheck(line: string): boolean {
    // Check if line has null/undefined checks
    return this.optionalFieldPatterns.some(pattern => pattern.test(line));
  }

  private extractFieldName(line: string): string | null {
    const match = line.match(/(\w+)\.(\w+)/);
    return match ? match[2] : null;
  }

  private async isDependencyUsed(dep: string): Promise<boolean> {
    try {
      const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
        ignore: ['**/node_modules/**'] 
      });

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        
        // Check for import statements
        if (new RegExp(`from ['"]${dep}['"]|require\\(['"]${dep}['"]\\)`).test(content)) {
          return true;
        }
      }

      return false;
    } catch {
      return true; // Assume used if we can't check
    }
  }

  private convertAPIToIssues(report: APIValidationReport): Issue[] {
    const issues: Issue[] = [];

    report.apiCallsWithoutValidation.forEach(item => {
      issues.push({
        severity: 'high',
        category: 'api-validation',
        description: `${item.apiType.toUpperCase()} API call lacks response validation: ${item.apiCall}`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Add response validation to check data structure and types',
      });
    });

    report.missingNullChecks.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'api-validation',
        description: `Property '${item.field}' accessed without null/undefined check`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Use optional chaining (?.) or nullish coalescing (??)',
      });
    });

    report.missingFallbackData.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'api-validation',
        description: `API call lacks fallback data: ${item.apiCall}`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Provide fallback data in catch block or use default values',
      });
    });

    report.typeValidationIssues.forEach(item => {
      issues.push({
        severity: 'low',
        category: 'api-validation',
        description: item.issue,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Add runtime validation before type assertion',
      });
    });

    return issues;
  }

  private convertDependenciesToIssues(report: DependencyReport): Issue[] {
    const issues: Issue[] = [];

    report.unusedDependencies.forEach(dep => {
      issues.push({
        severity: 'low',
        category: 'dependencies',
        description: `Unused dependency: ${dep}`,
        autoFixable: true,
        recommendation: `Remove ${dep} from package.json`,
      });
    });

    report.duplicateDependencies.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'dependencies',
        description: `Duplicate dependency: ${item.name} (versions: ${item.versions.join(', ')})`,
        autoFixable: false,
        recommendation: 'Consolidate to a single version',
      });
    });

    report.outdatedDependencies.forEach(item => {
      issues.push({
        severity: 'low',
        category: 'dependencies',
        description: `Outdated dependency: ${item.name} (${item.current} → ${item.latest})`,
        autoFixable: false,
        recommendation: `Update to ${item.latest}`,
      });
    });

    report.heavyDependencies.forEach(item => {
      const alternatives = item.alternatives ? ` (alternatives: ${item.alternatives.join(', ')})` : '';
      issues.push({
        severity: 'medium',
        category: 'dependencies',
        description: `Heavy dependency: ${item.name} (${item.size}KB)${alternatives}`,
        autoFixable: false,
        recommendation: item.alternatives ? `Consider using ${item.alternatives[0]}` : 'Consider lighter alternatives',
      });
    });

    return issues;
  }
}
