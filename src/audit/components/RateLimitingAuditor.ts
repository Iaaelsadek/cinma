import type { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import { glob } from 'glob';
import * as fs from 'fs/promises';

interface RateLimiterReport {
  rateLimiterActive: boolean;
  endpointsWithRateLimiting: string[];
  endpointsWithoutRateLimiting: string[];
  rateLimiterConfig: {
    tmdb: { maxRequests: number; windowMs: number; status: 'configured' | 'missing' };
    supabase: { maxRequests: number; windowMs: number; status: 'configured' | 'missing' };
    ai: { maxRequests: number; windowMs: number; status: 'configured' | 'missing' };
  };
  gracefulErrorMessages: boolean;
}

interface CircuitBreakerReport {
  circuitBreakerImplemented: boolean;
  circuitBreakerFiles: string[];
  servicesWithCircuitBreaker: string[];
  servicesWithoutCircuitBreaker: string[];
}

interface CacheStrategyReport {
  cacheImplemented: boolean;
  cacheFiles: string[];
  cacheTTLValues: {
    popular: { expected: number; actual: number; status: 'correct' | 'incorrect' | 'missing' };
    new: { expected: number; actual: number; status: 'correct' | 'incorrect' | 'missing' };
  };
  cacheInvalidationStrategy: {
    documented: boolean;
    implemented: boolean;
    triggers: string[];
  };
  cacheVersioning: boolean;
  cacheEvictionPolicy: string;
}

export class RateLimitingAuditor {
  async run(): Promise<ComponentReport> {
    auditLogger.info('RateLimitingAuditor', 'Starting rate limiting and cache audit');
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // Verify rate limiter
      const rateLimiterReport = await this.verifyRateLimiter();
      issues.push(...this.convertRateLimiterToIssues(rateLimiterReport));

      // Verify circuit breaker
      const circuitBreakerReport = await this.verifyCircuitBreaker();
      issues.push(...this.convertCircuitBreakerToIssues(circuitBreakerReport));

      // Verify cache strategy
      const cacheReport = await this.verifyCacheStrategy();
      issues.push(...this.convertCacheToIssues(cacheReport));

      const status = issues.some(i => i.severity === 'critical') ? 'fail' :
                     issues.some(i => i.severity === 'high') ? 'warning' : 'pass';

      return {
        component: 'RateLimitingAuditor',
        status,
        issues,
        metrics: {
          rateLimiterActive: rateLimiterReport.rateLimiterActive,
          endpointsWithRateLimiting: rateLimiterReport.endpointsWithRateLimiting.length,
          endpointsWithoutRateLimiting: rateLimiterReport.endpointsWithoutRateLimiting.length,
          circuitBreakerImplemented: circuitBreakerReport.circuitBreakerImplemented,
          cacheImplemented: cacheReport.cacheImplemented,
          cacheTTLCorrect: cacheReport.cacheTTLValues.popular.status === 'correct' && 
                          cacheReport.cacheTTLValues.new.status === 'correct',
        },
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      auditLogger.error('RateLimitingAuditor', 'Audit failed', { error });
      throw error;
    }
  }

  async verifyRateLimiter(): Promise<RateLimiterReport> {
    auditLogger.info('RateLimitingAuditor', 'Verifying rate limiter implementation');
    
    const report: RateLimiterReport = {
      rateLimiterActive: false,
      endpointsWithRateLimiting: [],
      endpointsWithoutRateLimiting: [],
      rateLimiterConfig: {
        tmdb: { maxRequests: 0, windowMs: 0, status: 'missing' },
        supabase: { maxRequests: 0, windowMs: 0, status: 'missing' },
        ai: { maxRequests: 0, windowMs: 0, status: 'missing' },
      },
      gracefulErrorMessages: false,
    };

    try {
      // Check if rate limiter file exists
      const rateLimiterPath = 'src/lib/rateLimiter.ts';
      try {
        const content = await fs.readFile(rateLimiterPath, 'utf-8');
        report.rateLimiterActive = true;

        // Parse rate limiter configuration
        const tmdbMatch = content.match(/'tmdb':\s*{\s*maxRequests:\s*(\d+),\s*windowMs:\s*(\d+)/);
        if (tmdbMatch) {
          report.rateLimiterConfig.tmdb = {
            maxRequests: parseInt(tmdbMatch[1]),
            windowMs: parseInt(tmdbMatch[2]),
            status: 'configured',
          };
        }

        const supabaseMatch = content.match(/'supabase':\s*{\s*maxRequests:\s*(\d+),\s*windowMs:\s*(\d+)/);
        if (supabaseMatch) {
          report.rateLimiterConfig.supabase = {
            maxRequests: parseInt(supabaseMatch[1]),
            windowMs: parseInt(supabaseMatch[2]),
            status: 'configured',
          };
        }

        const aiMatch = content.match(/'ai':\s*{\s*maxRequests:\s*(\d+),\s*windowMs:\s*(\d+)/);
        if (aiMatch) {
          report.rateLimiterConfig.ai = {
            maxRequests: parseInt(aiMatch[1]),
            windowMs: parseInt(aiMatch[2]),
            status: 'configured',
          };
        }

        // Check for graceful error messages
        report.gracefulErrorMessages = content.includes('Rate limit exceeded') && 
                                       content.includes('Please wait');
      } catch {
        report.rateLimiterActive = false;
      }

      // Scan for API endpoints using rate limiter
      const files = await glob('src/**/*.{ts,tsx}', { 
        ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'] 
      });

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          // Check if file uses rate limiter
          if (content.includes('rateLimiter.checkLimit')) {
            report.endpointsWithRateLimiting.push(file);
          }

          // Check for API calls without rate limiting
          if ((content.includes('tmdb.get') || content.includes('fetch') || content.includes('axios')) &&
              !content.includes('rateLimiter') &&
              !content.includes('tmdbOptimized')) {
            // Check if it's an API file
            if (file.includes('api') || file.includes('service') || file.includes('lib')) {
              report.endpointsWithoutRateLimiting.push(file);
            }
          }
        } catch (error: any) {
          auditLogger.warn('RateLimitingAuditor', `Failed to scan file: ${file}`, { error });
        }
      }
    } catch (error: any) {
      auditLogger.error('RateLimitingAuditor', 'Rate limiter verification failed', { error });
    }

    return report;
  }

  async verifyCircuitBreaker(): Promise<CircuitBreakerReport> {
    auditLogger.info('RateLimitingAuditor', 'Verifying circuit breaker implementation');
    
    const report: CircuitBreakerReport = {
      circuitBreakerImplemented: false,
      circuitBreakerFiles: [],
      servicesWithCircuitBreaker: [],
      servicesWithoutCircuitBreaker: [],
    };

    try {
      const files = await glob('src/**/*.{ts,tsx}', { 
        ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'] 
      });

      const apiServices = ['tmdb', 'supabase', 'gemini', 'groq'];

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          // Check for circuit breaker patterns
          if (content.includes('circuit') && content.includes('breaker') ||
              content.includes('CircuitBreaker') ||
              content.includes('failureCount') && content.includes('threshold')) {
            report.circuitBreakerImplemented = true;
            report.circuitBreakerFiles.push(file);
          }

          // Check for retry logic (alternative to circuit breaker)
          if (content.includes('retry') && content.includes('maxRetries')) {
            report.servicesWithCircuitBreaker.push(file);
          }

          // Check for services without protection
          for (const service of apiServices) {
            if (content.includes(service) && 
                !content.includes('retry') && 
                !content.includes('circuit') &&
                !content.includes('fallback')) {
              if (!report.servicesWithoutCircuitBreaker.includes(file)) {
                report.servicesWithoutCircuitBreaker.push(file);
              }
            }
          }
        } catch (error: any) {
          auditLogger.warn('RateLimitingAuditor', `Failed to scan file: ${file}`, { error });
        }
      }
    } catch (error: any) {
      auditLogger.error('RateLimitingAuditor', 'Circuit breaker verification failed', { error });
    }

    return report;
  }

  async verifyCacheStrategy(): Promise<CacheStrategyReport> {
    auditLogger.info('RateLimitingAuditor', 'Verifying cache strategy');
    
    const report: CacheStrategyReport = {
      cacheImplemented: false,
      cacheFiles: [],
      cacheTTLValues: {
        popular: { expected: 86400000, actual: 0, status: 'missing' }, // 24 hours
        new: { expected: 900000, actual: 0, status: 'missing' },       // 15 minutes
      },
      cacheInvalidationStrategy: {
        documented: false,
        implemented: false,
        triggers: [],
      },
      cacheVersioning: false,
      cacheEvictionPolicy: 'unknown',
    };

    try {
      // Check if cache file exists
      const cachePath = 'src/lib/tmdbCache.ts';
      try {
        const content = await fs.readFile(cachePath, 'utf-8');
        report.cacheImplemented = true;
        report.cacheFiles.push(cachePath);

        // Check for TTL values
        // Popular content (person, credits, similar, recommendations)
        const personMatch = content.match(/\/person\/.*?:\s*(\d+)/);
        const creditsMatch = content.match(/'credits':\s*(\d+)/);
        if (personMatch || creditsMatch) {
          const ttl = parseInt(personMatch?.[1] || creditsMatch?.[1] || '0');
          report.cacheTTLValues.popular.actual = ttl;
          // Check if it's approximately 24 hours (86400000ms)
          if (ttl >= 43200000 && ttl <= 129600000) { // 12-36 hours range
            report.cacheTTLValues.popular.status = 'correct';
          } else {
            report.cacheTTLValues.popular.status = 'incorrect';
          }
        }

        // New content (search, trending, discover)
        const searchMatch = content.match(/\/search.*?:\s*(\d+)/);
        const trendingMatch = content.match(/\/trending.*?:\s*(\d+)/);
        const discoverMatch = content.match(/\/discover.*?:\s*(\d+)/);
        if (searchMatch || trendingMatch || discoverMatch) {
          const ttl = parseInt(searchMatch?.[1] || trendingMatch?.[1] || discoverMatch?.[1] || '0');
          report.cacheTTLValues.new.actual = ttl;
          // Check if it's approximately 15 minutes (900000ms)
          if (ttl >= 600000 && ttl <= 1800000) { // 10-30 minutes range
            report.cacheTTLValues.new.status = 'correct';
          } else {
            report.cacheTTLValues.new.status = 'incorrect';
          }
        }

        // Check for cache invalidation
        if (content.includes('clearCache') || content.includes('invalidate') || content.includes('clearAll')) {
          report.cacheInvalidationStrategy.implemented = true;
        }

        if (content.includes('clearExpired')) {
          report.cacheInvalidationStrategy.triggers.push('time-based');
        }

        if (content.includes('evict')) {
          report.cacheInvalidationStrategy.triggers.push('size-based');
        }

        // Check for cache versioning
        if (content.includes('version') || content.includes('etag')) {
          report.cacheVersioning = true;
        }

        // Check for eviction policy
        if (content.includes('LRU') || content.includes('oldestTime')) {
          report.cacheEvictionPolicy = 'LRU';
        } else if (content.includes('FIFO')) {
          report.cacheEvictionPolicy = 'FIFO';
        }
      } catch {
        report.cacheImplemented = false;
      }

      // Check for cache documentation
      const docFiles = await glob('.kiro/**/*.md', { ignore: ['**/node_modules/**'] });
      for (const file of docFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          if (content.includes('cache invalidation') || content.includes('Cache Strategy')) {
            report.cacheInvalidationStrategy.documented = true;
            break;
          }
        } catch {
          // Ignore
        }
      }
    } catch (error: any) {
      auditLogger.error('RateLimitingAuditor', 'Cache strategy verification failed', { error });
    }

    return report;
  }

  private convertRateLimiterToIssues(report: RateLimiterReport): Issue[] {
    const issues: Issue[] = [];

    if (!report.rateLimiterActive) {
      issues.push({
        severity: 'critical',
        category: 'rate-limiting',
        description: 'Rate limiter not implemented',
        file: 'src/lib/rateLimiter.ts',
        autoFixable: false,
        recommendation: 'Implement rate limiter to protect API endpoints from abuse',
      });
      return issues;
    }

    // Check TMDB rate limiter (should be 50 requests/10s according to requirements)
    if (report.rateLimiterConfig.tmdb.status === 'missing') {
      issues.push({
        severity: 'high',
        category: 'rate-limiting',
        description: 'TMDB rate limiter not configured',
        file: 'src/lib/rateLimiter.ts',
        autoFixable: false,
        recommendation: 'Configure TMDB rate limiter: 50 requests per 10 seconds',
      });
    } else {
      const { maxRequests, windowMs } = report.rateLimiterConfig.tmdb;
      const expectedRequests = 50;
      const expectedWindow = 10000;
      
      if (maxRequests !== expectedRequests || windowMs !== expectedWindow) {
        issues.push({
          severity: 'medium',
          category: 'rate-limiting',
          description: `TMDB rate limiter misconfigured: ${maxRequests} requests/${windowMs}ms (expected: ${expectedRequests} requests/${expectedWindow}ms)`,
          file: 'src/lib/rateLimiter.ts',
          autoFixable: false,
          recommendation: `Update TMDB rate limiter to ${expectedRequests} requests per ${expectedWindow}ms`,
        });
      }
    }

    // Check Supabase rate limiter (should be 60 requests/10s according to requirements)
    if (report.rateLimiterConfig.supabase.status === 'missing') {
      issues.push({
        severity: 'high',
        category: 'rate-limiting',
        description: 'Supabase rate limiter not configured',
        file: 'src/lib/rateLimiter.ts',
        autoFixable: false,
        recommendation: 'Configure Supabase rate limiter: 60 requests per 10 seconds',
      });
    } else {
      const { maxRequests, windowMs } = report.rateLimiterConfig.supabase;
      const expectedRequests = 60;
      const expectedWindow = 10000;
      
      if (maxRequests !== expectedRequests || windowMs !== expectedWindow) {
        issues.push({
          severity: 'medium',
          category: 'rate-limiting',
          description: `Supabase rate limiter misconfigured: ${maxRequests} requests/${windowMs}ms (expected: ${expectedRequests} requests/${expectedWindow}ms)`,
          file: 'src/lib/rateLimiter.ts',
          autoFixable: false,
          recommendation: `Update Supabase rate limiter to ${expectedRequests} requests per ${expectedWindow}ms`,
        });
      }
    }

    // Check AI rate limiter (should be 10 requests/1min according to requirements)
    if (report.rateLimiterConfig.ai.status === 'missing') {
      issues.push({
        severity: 'high',
        category: 'rate-limiting',
        description: 'AI rate limiter not configured',
        file: 'src/lib/rateLimiter.ts',
        autoFixable: false,
        recommendation: 'Configure AI rate limiter: 10 requests per 1 minute',
      });
    } else {
      const { maxRequests, windowMs } = report.rateLimiterConfig.ai;
      const expectedRequests = 10;
      const expectedWindow = 60000;
      
      if (maxRequests !== expectedRequests || windowMs !== expectedWindow) {
        issues.push({
          severity: 'medium',
          category: 'rate-limiting',
          description: `AI rate limiter misconfigured: ${maxRequests} requests/${windowMs}ms (expected: ${expectedRequests} requests/${expectedWindow}ms)`,
          file: 'src/lib/rateLimiter.ts',
          autoFixable: false,
          recommendation: `Update AI rate limiter to ${expectedRequests} requests per ${expectedWindow}ms`,
        });
      }
    }

    // Check for graceful error messages
    if (!report.gracefulErrorMessages) {
      issues.push({
        severity: 'medium',
        category: 'rate-limiting',
        description: 'Rate limiter lacks graceful error messages',
        file: 'src/lib/rateLimiter.ts',
        autoFixable: false,
        recommendation: 'Add user-friendly error messages when rate limit is exceeded',
      });
    }

    // Check for endpoints without rate limiting
    if (report.endpointsWithoutRateLimiting.length > 0) {
      issues.push({
        severity: 'high',
        category: 'rate-limiting',
        description: `${report.endpointsWithoutRateLimiting.length} API endpoints lack rate limiting`,
        autoFixable: false,
        recommendation: 'Apply rate limiting to all API endpoints',
      });
    }

    return issues;
  }

  private convertCircuitBreakerToIssues(report: CircuitBreakerReport): Issue[] {
    const issues: Issue[] = [];

    if (!report.circuitBreakerImplemented && report.servicesWithCircuitBreaker.length === 0) {
      issues.push({
        severity: 'high',
        category: 'circuit-breaker',
        description: 'Circuit breaker pattern not implemented',
        autoFixable: false,
        recommendation: 'Implement circuit breaker or retry logic for external API calls',
      });
    }

    if (report.servicesWithoutCircuitBreaker.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'circuit-breaker',
        description: `${report.servicesWithoutCircuitBreaker.length} services lack circuit breaker protection`,
        autoFixable: false,
        recommendation: 'Add circuit breaker or retry logic to protect against cascading failures',
      });
    }

    return issues;
  }

  private convertCacheToIssues(report: CacheStrategyReport): Issue[] {
    const issues: Issue[] = [];

    if (!report.cacheImplemented) {
      issues.push({
        severity: 'critical',
        category: 'cache',
        description: 'Cache system not implemented',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Implement caching layer to reduce API calls',
      });
      return issues;
    }

    // Check popular content TTL (should be 24 hours)
    if (report.cacheTTLValues.popular.status === 'missing') {
      issues.push({
        severity: 'high',
        category: 'cache',
        description: 'Popular content cache TTL not configured',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Set popular content cache TTL to 24 hours (86400000ms)',
      });
    } else if (report.cacheTTLValues.popular.status === 'incorrect') {
      issues.push({
        severity: 'medium',
        category: 'cache',
        description: `Popular content cache TTL incorrect: ${report.cacheTTLValues.popular.actual}ms (expected: ~86400000ms)`,
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Update popular content cache TTL to 24 hours',
      });
    }

    // Check new content TTL (should be 15 minutes)
    if (report.cacheTTLValues.new.status === 'missing') {
      issues.push({
        severity: 'high',
        category: 'cache',
        description: 'New content cache TTL not configured',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Set new content cache TTL to 15 minutes (900000ms)',
      });
    } else if (report.cacheTTLValues.new.status === 'incorrect') {
      issues.push({
        severity: 'medium',
        category: 'cache',
        description: `New content cache TTL incorrect: ${report.cacheTTLValues.new.actual}ms (expected: ~900000ms)`,
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Update new content cache TTL to 15 minutes',
      });
    }

    // Check cache invalidation strategy
    if (!report.cacheInvalidationStrategy.implemented) {
      issues.push({
        severity: 'high',
        category: 'cache',
        description: 'Cache invalidation strategy not implemented',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Implement cache invalidation triggers (time-based, size-based, manual)',
      });
    }

    if (!report.cacheInvalidationStrategy.documented) {
      issues.push({
        severity: 'low',
        category: 'cache',
        description: 'Cache invalidation strategy not documented',
        autoFixable: false,
        recommendation: 'Document cache invalidation strategy in .kiro/docs/',
      });
    }

    // Check cache versioning
    if (!report.cacheVersioning) {
      issues.push({
        severity: 'low',
        category: 'cache',
        description: 'Cache versioning not implemented',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Consider implementing cache versioning for better cache management',
      });
    }

    // Check eviction policy
    if (report.cacheEvictionPolicy === 'unknown') {
      issues.push({
        severity: 'medium',
        category: 'cache',
        description: 'Cache eviction policy not clear',
        file: 'src/lib/tmdbCache.ts',
        autoFixable: false,
        recommendation: 'Implement LRU (Least Recently Used) eviction policy',
      });
    }

    return issues;
  }
}
