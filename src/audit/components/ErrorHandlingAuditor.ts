import type { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import { glob } from 'glob';
import * as fs from 'fs/promises';

interface AsyncErrorReport {
  asyncFunctionsWithoutTryCatch: Array<{
    file: string;
    line: number;
    functionName: string;
  }>;
  promisesWithoutCatch: Array<{
    file: string;
    line: number;
    promiseCall: string;
  }>;
  apiCallsWithoutErrorHandling: Array<{
    file: string;
    line: number;
    apiCall: string;
  }>;
  totalCount: number;
}

interface ErrorBoundaryReport {
  errorBoundariesFound: string[];
  componentsWithoutBoundaries: string[];
  hasErrorBoundaries: boolean;
}

interface LoggingReport {
  loggingSystemImplemented: boolean;
  logLevelIssues: Array<{
    file: string;
    line: number;
    issue: string;
    currentLevel: string;
    suggestedLevel: string;
  }>;
  errorsWithoutStackTrace: Array<{
    file: string;
    line: number;
  }>;
  sensitiveDataInLogs: Array<{
    file: string;
    line: number;
    sensitiveType: string;
    logStatement: string;
  }>;
  totalIssues: number;
}

export class ErrorHandlingAuditor {
  private sensitivePatterns = [
    { pattern: /password/i, type: 'password' },
    { pattern: /token/i, type: 'token' },
    { pattern: /api[_-]?key/i, type: 'api-key' },
    { pattern: /secret/i, type: 'secret' },
    { pattern: /credit[_-]?card/i, type: 'credit-card' },
    { pattern: /ssn|social[_-]?security/i, type: 'ssn' },
    { pattern: /email/i, type: 'email' },
    { pattern: /phone/i, type: 'phone' },
  ];

  async run(): Promise<ComponentReport> {
    auditLogger.info('ErrorHandlingAuditor', 'Starting error handling and logging audit');
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // Scan async error handling
      const asyncReport = await this.scanAsyncErrorHandling();
      issues.push(...this.convertAsyncToIssues(asyncReport));

      // Scan error boundaries
      const boundaryReport = await this.scanErrorBoundaries();
      issues.push(...this.convertBoundariesToIssues(boundaryReport));

      // Scan logging system
      const loggingReport = await this.scanLoggingSystem();
      issues.push(...this.convertLoggingToIssues(loggingReport));

      const status = issues.some(i => i.severity === 'critical') ? 'fail' :
                     issues.some(i => i.severity === 'high') ? 'warning' : 'pass';

      return {
        component: 'ErrorHandlingAuditor',
        status,
        issues,
        metrics: {
          asyncFunctionsWithoutTryCatch: asyncReport.asyncFunctionsWithoutTryCatch.length,
          promisesWithoutCatch: asyncReport.promisesWithoutCatch.length,
          apiCallsWithoutErrorHandling: asyncReport.apiCallsWithoutErrorHandling.length,
          errorBoundariesFound: boundaryReport.errorBoundariesFound.length,
          hasErrorBoundaries: boundaryReport.hasErrorBoundaries,
          logLevelIssues: loggingReport.logLevelIssues.length,
          sensitiveDataInLogs: loggingReport.sensitiveDataInLogs.length,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      auditLogger.error('ErrorHandlingAuditor', 'Audit failed', { error });
      throw error;
    }
  }

  async scanAsyncErrorHandling(): Promise<AsyncErrorReport> {
    auditLogger.info('ErrorHandlingAuditor', 'Scanning async functions for error handling');
    
    const asyncFunctionsWithoutTryCatch: Array<{ file: string; line: number; functionName: string }> = [];
    const promisesWithoutCatch: Array<{ file: string; line: number; promiseCall: string }> = [];
    const apiCallsWithoutErrorHandling: Array<{ file: string; line: number; apiCall: string }> = [];

    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'] 
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        // Track function context
        let inAsyncFunction = false;
        let asyncFunctionStart = 0;
        let asyncFunctionName = '';
        let hasTryCatch = false;
        let braceDepth = 0;
        let functionBraceDepth = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Track brace depth
          braceDepth += (line.match(/{/g) || []).length;
          braceDepth -= (line.match(/}/g) || []).length;

          // Detect async function start
          if (/async\s+(function\s+\w+|[\w]+\s*=|\(.*\)\s*=>)/.test(trimmedLine)) {
            inAsyncFunction = true;
            asyncFunctionStart = i + 1;
            asyncFunctionName = this.extractFunctionName(trimmedLine);
            hasTryCatch = false;
            functionBraceDepth = braceDepth;
          }

          // Check for try-catch in async function
          if (inAsyncFunction && /try\s*{/.test(trimmedLine)) {
            hasTryCatch = true;
          }

          // Detect async function end
          if (inAsyncFunction && braceDepth < functionBraceDepth) {
            if (!hasTryCatch && asyncFunctionName) {
              asyncFunctionsWithoutTryCatch.push({
                file,
                line: asyncFunctionStart,
                functionName: asyncFunctionName,
              });
            }
            inAsyncFunction = false;
          }

          // Detect promises without catch
          if (/\.(then|fetch|axios)\(/.test(trimmedLine) && !trimmedLine.includes('.catch(')) {
            // Check next few lines for .catch
            let hasCatch = false;
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              if (lines[j].includes('.catch(')) {
                hasCatch = true;
                break;
              }
            }
            if (!hasCatch) {
              promisesWithoutCatch.push({
                file,
                line: i + 1,
                promiseCall: trimmedLine.substring(0, 50),
              });
            }
          }

          // Detect API calls without error handling
          if (/(fetch|axios|api\.|tmdb|supabase)/.test(trimmedLine) && 
              !/(try|catch|\.catch\(|\.then\(.*catch)/.test(trimmedLine)) {
            // Check if in try-catch block
            let inTryBlock = false;
            for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
              if (/try\s*{/.test(lines[j])) {
                inTryBlock = true;
                break;
              }
            }
            if (!inTryBlock) {
              apiCallsWithoutErrorHandling.push({
                file,
                line: i + 1,
                apiCall: trimmedLine.substring(0, 50),
              });
            }
          }
        }
      } catch (error) {
        auditLogger.warn('ErrorHandlingAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    return {
      asyncFunctionsWithoutTryCatch,
      promisesWithoutCatch,
      apiCallsWithoutErrorHandling,
      totalCount: asyncFunctionsWithoutTryCatch.length + 
                  promisesWithoutCatch.length + 
                  apiCallsWithoutErrorHandling.length,
    };
  }

  async scanErrorBoundaries(): Promise<ErrorBoundaryReport> {
    auditLogger.info('ErrorHandlingAuditor', 'Scanning for Error Boundaries');
    
    const errorBoundariesFound: string[] = [];
    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
      ignore: ['**/node_modules/**'] 
    });

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Look for Error Boundary patterns
        if (/componentDidCatch|ErrorBoundary|error.*boundary/i.test(content)) {
          errorBoundariesFound.push(file);
        }
      } catch (error) {
        auditLogger.warn('ErrorHandlingAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    return {
      errorBoundariesFound,
      componentsWithoutBoundaries: [],
      hasErrorBoundaries: errorBoundariesFound.length > 0,
    };
  }

  async scanLoggingSystem(): Promise<LoggingReport> {
    auditLogger.info('ErrorHandlingAuditor', 'Scanning logging system');
    
    const logLevelIssues: Array<{ file: string; line: number; issue: string; currentLevel: string; suggestedLevel: string }> = [];
    const errorsWithoutStackTrace: Array<{ file: string; line: number }> = [];
    const sensitiveDataInLogs: Array<{ file: string; line: number; sensitiveType: string; logStatement: string }> = [];

    const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
      ignore: ['**/node_modules/**', '**/logger.ts', '**/errorLogger.ts'] 
    });

    let loggingSystemImplemented = false;

    // Check if logging system exists
    try {
      await fs.access('src/lib/logger.ts');
      loggingSystemImplemented = true;
    } catch {
      try {
        await fs.access('src/audit/logger.ts');
        loggingSystemImplemented = true;
      } catch {
        // No logging system found
      }
    }

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          if (/console\.(log|warn|error|info|debug)/.test(trimmedLine)) {
            logLevelIssues.push({
              file,
              line: i + 1,
              issue: 'Using console instead of logger',
              currentLevel: 'console',
              suggestedLevel: 'logger',
            });
          }

          // Check for error logging without stack trace
          if (/(logger\.error|console\.error)/.test(trimmedLine) && 
              !/(error\.stack|error\.message|stack:)/.test(trimmedLine)) {
            // Check next few lines for stack trace
            let hasStackTrace = false;
            for (let j = i; j < Math.min(i + 3, lines.length); j++) {
              if (/(stack|error)/.test(lines[j])) {
                hasStackTrace = true;
                break;
              }
            }
            if (!hasStackTrace) {
              errorsWithoutStackTrace.push({ file, line: i + 1 });
            }
          }

          // Check for sensitive data in logs
          if (/(logger\.|console\.)/.test(trimmedLine)) {
            for (const { pattern, type } of this.sensitivePatterns) {
              if (pattern.test(trimmedLine)) {
                sensitiveDataInLogs.push({
                  file,
                  line: i + 1,
                  sensitiveType: type,
                  logStatement: trimmedLine.substring(0, 80),
                });
              }
            }
          }
        }
      } catch (error) {
        auditLogger.warn('ErrorHandlingAuditor', `Failed to scan file: ${file}`, { error });
      }
    }

    return {
      loggingSystemImplemented,
      logLevelIssues,
      errorsWithoutStackTrace,
      sensitiveDataInLogs,
      totalIssues: logLevelIssues.length + errorsWithoutStackTrace.length + sensitiveDataInLogs.length,
    };
  }

  private extractFunctionName(line: string): string {
    // Extract function name from various patterns
    const patterns = [
      /async\s+function\s+(\w+)/,
      /const\s+(\w+)\s*=\s*async/,
      /(\w+)\s*:\s*async/,
      /async\s+(\w+)\s*\(/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1];
    }

    return 'anonymous';
  }

  private convertAsyncToIssues(report: AsyncErrorReport): Issue[] {
    const issues: Issue[] = [];

    report.asyncFunctionsWithoutTryCatch.forEach(item => {
      issues.push({
        severity: 'high',
        category: 'error-handling',
        description: `Async function '${item.functionName}' lacks try-catch block`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Add try-catch block to handle potential errors',
      });
    });

    report.promisesWithoutCatch.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'error-handling',
        description: `Promise call lacks .catch() handler: ${item.promiseCall}`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Add .catch() handler or use try-catch with await',
      });
    });

    report.apiCallsWithoutErrorHandling.forEach(item => {
      issues.push({
        severity: 'high',
        category: 'error-handling',
        description: `API call lacks error handling: ${item.apiCall}`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Wrap API call in try-catch block or add .catch() handler',
      });
    });

    return issues;
  }

  private convertBoundariesToIssues(report: ErrorBoundaryReport): Issue[] {
    const issues: Issue[] = [];

    if (!report.hasErrorBoundaries) {
      issues.push({
        severity: 'high',
        category: 'error-handling',
        description: 'No Error Boundaries found in component tree',
        autoFixable: false,
        recommendation: 'Implement Error Boundary components to catch React errors',
      });
    }

    return issues;
  }

  private convertLoggingToIssues(report: LoggingReport): Issue[] {
    const issues: Issue[] = [];

    if (!report.loggingSystemImplemented) {
      issues.push({
        severity: 'high',
        category: 'logging',
        description: 'No logging system implemented',
        autoFixable: false,
        recommendation: 'Implement a centralized logging system (e.g., Winston, Pino)',
      });
    }

    report.logLevelIssues.forEach(item => {
      issues.push({
        severity: 'low',
        category: 'logging',
        description: item.issue,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: `Use ${item.suggestedLevel} instead of ${item.currentLevel}`,
      });
    });

    report.errorsWithoutStackTrace.forEach(item => {
      issues.push({
        severity: 'medium',
        category: 'logging',
        description: 'Error logged without stack trace',
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Include error.stack or full error object in log',
      });
    });

    report.sensitiveDataInLogs.forEach(item => {
      issues.push({
        severity: 'critical',
        category: 'logging',
        description: `Potential sensitive data (${item.sensitiveType}) in log statement`,
        file: item.file,
        line: item.line,
        autoFixable: false,
        recommendation: 'Remove or redact sensitive information from logs',
      });
    });

    return issues;
  }
}
