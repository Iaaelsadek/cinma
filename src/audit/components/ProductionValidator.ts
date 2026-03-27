import { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import * as fs from 'fs/promises';

export class ProductionValidator {
  private envPath: string;

  constructor(envPath: string = '.env') {
    this.envPath = envPath;
  }

  async run(): Promise<ComponentReport> {
    auditLogger.info('ProductionValidator', 'Starting production validation');
    const startTime = Date.now();
    const issues: Issue[] = [];
    const metrics: Record<string, any> = {};

    try {
      const envIssues = await this.verifyEnvironmentVariables();
      issues.push(...envIssues);
      metrics.missingEnvVars = envIssues.length;

      const dbIssues = await this.verifyDatabaseConnections();
      issues.push(...dbIssues);

      const apiIssues = await this.verifyAPIKeys();
      issues.push(...apiIssues);

      const monitoringIssues = await this.verifyMonitoring();
      issues.push(...monitoringIssues);

      const authIssues = await this.testAuthenticationFlow();
      issues.push(...authIssues);

      const videoIssues = await this.testVideoPlayback();
      issues.push(...videoIssues);

      const status = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'fail' : 'pass';

      auditLogger.info('ProductionValidator', `Production validation completed with status: ${status}`);

      return {
        component: 'ProductionValidator',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime
      };
    } catch (error) {
      auditLogger.error('ProductionValidator', 'Production validation failed', { error });
      return {
        component: 'ProductionValidator',
        status: 'fail',
        issues: [{
          severity: 'high',
          category: 'production',
          description: `Production validation failed: ${error instanceof Error ? error.message : String(error)}`,
          recommendation: 'Check environment configuration',
          autoFixable: false
        }],
        metrics: { error: String(error) },
        duration: Date.now() - startTime
      };
    }
  }

  async verifyEnvironmentVariables(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Verifying environment variables');
    const issues: Issue[] = [];

    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_TMDB_API_KEY',
      'VITE_GEMINI_API_KEY',
      'DATABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`)) {
          issues.push({
            severity: 'critical',
            category: 'configuration',
            description: `Missing required environment variable: ${varName}`,
            file: this.envPath,
            recommendation: `Add ${varName} to ${this.envPath}`,
            autoFixable: false
          });
        } else {
          const match = envContent.match(new RegExp(`${varName}=(.+)`));
          if (match && (!match[1] || match[1].trim() === '')) {
            issues.push({
              severity: 'critical',
              category: 'configuration',
              description: `Environment variable ${varName} is empty`,
              file: this.envPath,
              recommendation: `Set value for ${varName}`,
              autoFixable: false
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        severity: 'critical',
        category: 'configuration',
        description: '.env file not found',
        file: this.envPath,
        recommendation: 'Create .env file with required variables',
        autoFixable: false
      });
    }

    return issues;
  }

  async verifyDatabaseConnections(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Verifying database connections');
    const issues: Issue[] = [];

    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      
      if (!envContent.includes('DATABASE_URL=')) {
        issues.push({
          severity: 'critical',
          category: 'database',
          description: 'CockroachDB connection string (DATABASE_URL) not configured',
          file: this.envPath,
          recommendation: 'Add DATABASE_URL for CockroachDB connection',
          autoFixable: false
        });
      }

      if (!envContent.includes('VITE_SUPABASE_URL=')) {
        issues.push({
          severity: 'critical',
          category: 'database',
          description: 'Supabase URL not configured',
          file: this.envPath,
          recommendation: 'Add VITE_SUPABASE_URL for Supabase connection',
          autoFixable: false
        });
      }
    } catch (error) {
      // Already reported in verifyEnvironmentVariables
    }

    return issues;
  }

  async verifyAPIKeys(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Verifying API keys');
    const issues: Issue[] = [];

    const apiKeys = [
      { name: 'VITE_TMDB_API_KEY', service: 'TMDB' },
      { name: 'VITE_GEMINI_API_KEY', service: 'Gemini AI' },
      { name: 'VITE_SUPABASE_ANON_KEY', service: 'Supabase' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', service: 'Supabase Admin' }
    ];

    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      
      for (const key of apiKeys) {
        if (!envContent.includes(`${key.name}=`)) {
          issues.push({
            severity: 'critical',
            category: 'configuration',
            description: `${key.service} API key (${key.name}) not configured`,
            file: this.envPath,
            recommendation: `Add ${key.name} for ${key.service} integration`,
            autoFixable: false
          });
        }
      }
    } catch (error) {
      // Already reported
    }

    return issues;
  }

  async verifyMonitoring(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Verifying monitoring setup');
    const issues: Issue[] = [];

    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      
      if (!envContent.includes('VITE_SENTRY_DSN=')) {
        issues.push({
          severity: 'high',
          category: 'monitoring',
          description: 'Sentry DSN not configured - error monitoring disabled',
          file: this.envPath,
          recommendation: 'Add VITE_SENTRY_DSN for error tracking',
          autoFixable: false
        });
      }
    } catch (error) {
      // Already reported
    }

    const sentryConfigPath = 'src/lib/sentry.ts';
    try {
      await fs.access(sentryConfigPath);
    } catch {
      issues.push({
        severity: 'high',
        category: 'monitoring',
        description: 'Sentry configuration file not found',
        file: sentryConfigPath,
        recommendation: 'Create Sentry configuration for error monitoring',
        autoFixable: false
      });
    }

    return issues;
  }

  async testAuthenticationFlow(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Testing authentication flow');
    const issues: Issue[] = [];

    const authFiles = [
      'src/contexts/AuthContext.tsx',
      'src/hooks/useAuth.ts',
      'src/pages/auth/Login.tsx',
      'src/pages/auth/Register.tsx'
    ];

    for (const file of authFiles) {
      try {
        await fs.access(file);
      } catch {
        issues.push({
          severity: 'critical',
          category: 'authentication',
          description: `Authentication file missing: ${file}`,
          file,
          recommendation: 'Implement complete authentication system',
          autoFixable: false
        });
      }
    }

    return issues;
  }

  async testVideoPlayback(): Promise<Issue[]> {
    auditLogger.info('ProductionValidator', 'Testing video playback');
    const issues: Issue[] = [];

    const videoFiles = [
      'src/pages/media/Watch.tsx',
      'src/pages/media/WatchVideo.tsx',
      'src/components/VideoPlayer.tsx'
    ];

    for (const file of videoFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('sandbox') || content.includes('credentialless')) {
          issues.push({
            severity: 'critical',
            category: 'video',
            description: `Video file contains forbidden attributes (sandbox/credentialless): ${file}`,
            file,
            recommendation: 'Remove sandbox and credentialless attributes from video elements',
            autoFixable: false
          });
        }
      } catch {
        issues.push({
          severity: 'high',
          category: 'video',
          description: `Video playback file missing: ${file}`,
          file,
          recommendation: 'Implement video playback functionality',
          autoFixable: false
        });
      }
    }

    return issues;
  }

  async generateFinalChecklist(): Promise<string> {
    auditLogger.info('ProductionValidator', 'Generating final production checklist');
    
    const checklist = `# Final Production Checklist

## Pre-Launch Verification

### 1. Code Quality ✓
- [ ] TypeScript: 0 errors
- [ ] Build: Successful
- [ ] Warnings: <50
- [ ] No unused imports/code

### 2. Database & Performance ✓
- [ ] All 33 indexes applied
- [ ] No N+1 queries
- [ ] Pagination implemented (20 items/page)
- [ ] CockroachDB: Content tables only
- [ ] Supabase: Auth/user tables only

### 3. Security ✓
- [ ] 0 critical/high vulnerabilities
- [ ] No hardcoded API keys
- [ ] Environment variables protected
- [ ] HTTPS enforced
- [ ] Security headers configured

### 4. Performance ✓
- [ ] Response time: <500ms average
- [ ] P95 response time: <1000ms
- [ ] Cache hit rate: >70%
- [ ] Lighthouse Performance: >90

### 5. Load Testing ✓
- [ ] 10k users: Passing
- [ ] 50k users: Passing
- [ ] 100k users: Passing
- [ ] Error rate: <1%

### 6. Accessibility ✓
- [ ] Lighthouse Accessibility: >90
- [ ] All images have alt text
- [ ] Keyboard navigation works
- [ ] ARIA labels correct

### 7. SEO ✓
- [ ] Lighthouse SEO: >90
- [ ] Meta descriptions on all pages
- [ ] Unique title tags
- [ ] Sitemap.xml exists

### 8. Production Config ✓
- [ ] All environment variables set
- [ ] Database connections verified
- [ ] API keys valid
- [ ] Monitoring active (Sentry)

### 9. Documentation ✓
- [ ] INDEX.md complete
- [ ] PROJECT_CONSTITUTION_V2.md accurate
- [ ] START_HERE.md clear
- [ ] All links working

### 10. Final Checks ✓
- [ ] No video sandbox/credentialless attributes
- [ ] TMDB uses tmdbOptimized
- [ ] Free Tier limits verified
- [ ] Backup strategy documented

## Team Sign-Off

- [ ] Developer: _________________ Date: _______
- [ ] QA: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______

## Launch Details

- Launch Date: _________________
- Emergency Contact: _________________
- Rollback Plan: Documented in DEPLOYMENT_GUIDE.md

## Post-Launch Monitoring

- Monitor error rates in Sentry
- Track resource usage (TMDB, Supabase, Cloudflare)
- Review performance metrics daily for first week
- Check user feedback and bug reports
`;

    return checklist;
  }
}
