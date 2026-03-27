import type { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface AnalyticsMetrics {
  trackingImplemented: boolean;
  pageViewsTracked: boolean;
  userActionsTracked: boolean;
  conversionFunnelTracked: boolean;
  retentionTracked: boolean;
  bounceRateTracked: boolean;
  sessionDurationTracked: boolean;
  popularContentTracked: boolean;
  searchQueriesTracked: boolean;
  errorRatesTracked: boolean;
  performanceMetricsTracked: boolean;
  dashboardAccessible: boolean;
  dataActionable: boolean;
  privacyCompliant: boolean;
  gdprCompliant: boolean;
  provider: string;
  issues: string[];
}

export class AnalyticsAuditor {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async run(): Promise<ComponentReport> {
    auditLogger.info('AnalyticsAuditor', 'Starting analytics audit');
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      const metrics = await this.verifyAnalyticsImplementation();
      issues.push(...this.convertMetricsToIssues(metrics));

      const status = issues.some(i => i.severity === 'critical') ? 'fail' :
                     issues.some(i => i.severity === 'high') ? 'warning' : 'pass';

      return {
        component: 'AnalyticsAuditor',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      auditLogger.error('AnalyticsAuditor', 'Audit failed', { error });
      throw error;
    }
  }

  private async verifyAnalyticsImplementation(): Promise<AnalyticsMetrics> {
    auditLogger.info('AnalyticsAuditor', 'Verifying analytics implementation');
    
    const metrics: AnalyticsMetrics = {
      trackingImplemented: false,
      pageViewsTracked: false,
      userActionsTracked: false,
      conversionFunnelTracked: false,
      retentionTracked: false,
      bounceRateTracked: false,
      sessionDurationTracked: false,
      popularContentTracked: false,
      searchQueriesTracked: false,
      errorRatesTracked: false,
      performanceMetricsTracked: false,
      dashboardAccessible: false,
      dataActionable: false,
      privacyCompliant: false,
      gdprCompliant: false,
      provider: 'unknown',
      issues: [],
    };

    try {
      // Check index.html for analytics scripts
      const indexHtml = await readFile(join(this.projectRoot, 'index.html'), 'utf-8');
      
      // Check for Google Analytics
      if (indexHtml.includes('gtag') || indexHtml.includes('googletagmanager')) {
        metrics.trackingImplemented = true;
        metrics.provider = 'Google Analytics';
        metrics.pageViewsTracked = true; // GA tracks page views by default
        metrics.bounceRateTracked = true; // GA tracks bounce rate by default
        metrics.sessionDurationTracked = true; // GA tracks session duration by default
        metrics.dashboardAccessible = true; // GA has a dashboard
      }

      // Check for Plausible Analytics
      if (indexHtml.includes('plausible')) {
        metrics.trackingImplemented = true;
        metrics.provider = 'Plausible Analytics';
        metrics.pageViewsTracked = true;
        metrics.privacyCompliant = true; // Plausible is privacy-focused
        metrics.gdprCompliant = true; // Plausible is GDPR compliant
        metrics.dashboardAccessible = true;
      }

      // Check for Vercel Analytics
      if (indexHtml.includes('vercel') && indexHtml.includes('analytics')) {
        metrics.performanceMetricsTracked = true;
      }

      // Check for custom analytics implementation
      try {
        const analyticsFile = await readFile(join(this.projectRoot, 'android_app/src/services/analytics.ts'), 'utf-8');
        
        if (analyticsFile.includes('trackEvent')) {
          metrics.userActionsTracked = true;
        }

        if (analyticsFile.includes('playback_started') || analyticsFile.includes('content_tapped')) {
          metrics.popularContentTracked = true;
        }

        if (analyticsFile.includes('retention') || analyticsFile.includes('winback')) {
          metrics.retentionTracked = true;
        }

        metrics.dataActionable = true; // Custom analytics with specific events
      } catch {
        // Analytics file not found - not an issue for web app
      }

      // Check for error tracking (Sentry)
      try {
        const mainFile = await readFile(join(this.projectRoot, 'src/main.tsx'), 'utf-8');
        
        if (mainFile.includes('Sentry') || mainFile.includes('sentry')) {
          metrics.errorRatesTracked = true;
        }
      } catch {
        metrics.issues.push('Could not verify error tracking implementation');
      }

      // Check for search tracking
      try {
        const searchFiles = await readFile(join(this.projectRoot, 'src/pages/Search.tsx'), 'utf-8');
        
        if (searchFiles.includes('gtag') || searchFiles.includes('trackEvent') || searchFiles.includes('analytics')) {
          metrics.searchQueriesTracked = true;
        }
      } catch {
        // Search page might not exist or tracking not implemented
      }

      // Check for conversion funnel tracking
      try {
        const authFiles = await readFile(join(this.projectRoot, 'src/pages/auth/Login.tsx'), 'utf-8');
        
        if (authFiles.includes('gtag') || authFiles.includes('trackEvent')) {
          metrics.conversionFunnelTracked = true;
        }
      } catch {
        // Auth tracking might not be implemented
      }

      // Validate tracking implementation
      if (!metrics.trackingImplemented) {
        metrics.issues.push('No analytics tracking implementation found');
      }

      if (!metrics.userActionsTracked) {
        metrics.issues.push('User actions (play, search, add to list) are not tracked');
      }

      if (!metrics.conversionFunnelTracked) {
        metrics.issues.push('Conversion funnel is not tracked');
      }

      if (!metrics.retentionTracked) {
        metrics.issues.push('User retention is not tracked');
      }

      if (!metrics.searchQueriesTracked) {
        metrics.issues.push('Search queries are not tracked');
      }

      if (!metrics.errorRatesTracked) {
        metrics.issues.push('Error rates are not tracked');
      }

      if (!metrics.performanceMetricsTracked) {
        metrics.issues.push('Performance metrics are not tracked');
      }

      if (!metrics.privacyCompliant) {
        metrics.issues.push('Analytics privacy compliance not verified');
      }

      if (!metrics.gdprCompliant) {
        metrics.issues.push('GDPR compliance not verified');
      }

    } catch (error) {
      auditLogger.warn('AnalyticsAuditor', 'Analytics verification failed', { error });
      metrics.issues.push('Failed to verify analytics implementation');
    }

    return metrics;
  }

  private convertMetricsToIssues(metrics: AnalyticsMetrics): Issue[] {
    const issues: Issue[] = [];

    if (!metrics.trackingImplemented) {
      issues.push({
        severity: 'critical',
        category: 'analytics',
        description: 'Analytics tracking is not implemented',
        autoFixable: false,
        recommendation: 'Implement Google Analytics, Plausible, or another analytics solution',
      });
    }

    if (!metrics.pageViewsTracked) {
      issues.push({
        severity: 'high',
        category: 'analytics',
        description: 'Page views are not tracked',
        autoFixable: false,
        recommendation: 'Implement page view tracking in analytics',
      });
    }

    if (!metrics.userActionsTracked) {
      issues.push({
        severity: 'high',
        category: 'analytics',
        description: 'User actions (play, search, add to list) are not tracked',
        autoFixable: false,
        recommendation: 'Implement event tracking for key user actions',
      });
    }

    if (!metrics.conversionFunnelTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Conversion funnel is not tracked',
        autoFixable: false,
        recommendation: 'Implement funnel tracking for user registration and engagement',
      });
    }

    if (!metrics.retentionTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'User retention is not tracked',
        autoFixable: false,
        recommendation: 'Implement retention tracking to measure user engagement over time',
      });
    }

    if (!metrics.bounceRateTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Bounce rate is not tracked',
        autoFixable: false,
        recommendation: 'Implement bounce rate tracking to measure user engagement',
      });
    }

    if (!metrics.sessionDurationTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Session duration is not tracked',
        autoFixable: false,
        recommendation: 'Implement session duration tracking to measure user engagement',
      });
    }

    if (!metrics.popularContentTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Popular content is not tracked',
        autoFixable: false,
        recommendation: 'Implement content tracking to identify popular movies and shows',
      });
    }

    if (!metrics.searchQueriesTracked) {
      issues.push({
        severity: 'low',
        category: 'analytics',
        description: 'Search queries are not tracked',
        autoFixable: false,
        recommendation: 'Implement search query tracking to understand user intent',
      });
    }

    if (!metrics.errorRatesTracked) {
      issues.push({
        severity: 'high',
        category: 'analytics',
        description: 'Error rates are not tracked',
        autoFixable: false,
        recommendation: 'Implement error tracking with Sentry or similar service',
      });
    }

    if (!metrics.performanceMetricsTracked) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Performance metrics are not tracked',
        autoFixable: false,
        recommendation: 'Implement performance tracking with Vercel Analytics or similar',
      });
    }

    if (!metrics.dashboardAccessible) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Analytics dashboard is not accessible',
        autoFixable: false,
        recommendation: 'Ensure analytics dashboard is set up and accessible',
      });
    }

    if (!metrics.dataActionable) {
      issues.push({
        severity: 'medium',
        category: 'analytics',
        description: 'Analytics data is not actionable',
        autoFixable: false,
        recommendation: 'Implement custom events and metrics that provide actionable insights',
      });
    }

    if (!metrics.privacyCompliant) {
      issues.push({
        severity: 'high',
        category: 'analytics',
        description: 'Analytics privacy compliance not verified',
        autoFixable: false,
        recommendation: 'Ensure analytics respects user privacy and provides opt-out options',
      });
    }

    if (!metrics.gdprCompliant) {
      issues.push({
        severity: 'high',
        category: 'analytics',
        description: 'GDPR compliance not verified',
        autoFixable: false,
        recommendation: 'Ensure analytics complies with GDPR requirements if applicable',
      });
    }

    return issues;
  }
}
