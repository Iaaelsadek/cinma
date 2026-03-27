import { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

interface LoadTestScenario {
  users: number;
  duration: number;
  rampUp?: number;
}

interface LoadTestResult {
  scenario: LoadTestScenario;
  metrics: {
    requestsTotal: number;
    requestsPerSecond: number;
    responseTime: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
    };
    throughput: number;
    errorRate: number;
    errors: number;
    timeouts: number;
  };
  resources: {
    cpu: number;
    memory: number;
    network: number;
  };
  breakingPoint?: {
    users: number;
    reason: string;
  };
}

export class LoadTester {
  private baseUrl: string;
  private resultsDir: string;

  constructor(baseUrl: string = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.resultsDir = path.join(process.cwd(), '.kiro', 'load-tests');
  }

  async run(): Promise<ComponentReport> {
    auditLogger.info('LoadTester', 'Starting load testing audit');
    const startTime = Date.now();
    const issues: Issue[] = [];
    const metrics: Record<string, any> = {};

    try {
      await fs.mkdir(this.resultsDir, { recursive: true });

      const hasArtillery = await this.checkArtillery();
      if (!hasArtillery) {
        issues.push({
          severity: 'high',
          category: 'load-testing',
          description: 'Artillery not installed - load testing cannot be performed',
          recommendation: 'Install Artillery: npm install -g artillery@latest',
          autoFixable: false
        });
        
        return {
          component: 'LoadTester',
          status: 'fail',
          issues,
          metrics: { artillery: 'not-installed' },
          duration: Date.now() - startTime
        };
      }

      auditLogger.info('LoadTester', 'Running 10k users simulation');
      const result10k = await this.simulate10kUsers();
      metrics.load_10k = result10k.metrics;

      if (result10k.metrics.responseTime.average > 500) {
        issues.push({
          severity: 'high',
          category: 'performance',
          description: `Average response time ${result10k.metrics.responseTime.average}ms exceeds 500ms target under 10k users`,
          recommendation: 'Optimize database queries, implement caching, or scale infrastructure',
          autoFixable: false
        });
      }

      if (result10k.metrics.responseTime.p95 > 1000) {
        issues.push({
          severity: 'high',
          category: 'performance',
          description: `P95 response time ${result10k.metrics.responseTime.p95}ms exceeds 1000ms target`,
          recommendation: 'Investigate slow queries and optimize critical paths',
          autoFixable: false
        });
      }

      if (result10k.metrics.errorRate > 1) {
        issues.push({
          severity: 'critical',
          category: 'reliability',
          description: `Error rate ${result10k.metrics.errorRate}% exceeds 1% target under load`,
          recommendation: 'Fix error handling and improve system stability',
          autoFixable: false
        });
      }

      const status = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'fail' : 'pass';

      auditLogger.info('LoadTester', `Load testing audit completed with status: ${status}`);

      return {
        component: 'LoadTester',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime
      };
    } catch (error) {
      auditLogger.error('LoadTester', 'Load testing audit failed', { error });
      issues.push({
        severity: 'high',
        category: 'load-testing',
        description: `Load testing failed: ${error instanceof Error ? error.message : String(error)}`,
        recommendation: 'Check Artillery installation and server availability',
        autoFixable: false
      });

      return {
        component: 'LoadTester',
        status: 'fail',
        issues,
        metrics: { error: String(error) },
        duration: Date.now() - startTime
      };
    }
  }

  private async checkArtillery(): Promise<boolean> {
    try {
      execSync('artillery --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  async testLoad(users: number, duration: number, rampUp: number = 30): Promise<LoadTestResult> {
    auditLogger.info('LoadTester', `Running load test: ${users} users, ${duration}s duration`);

    const scenario: LoadTestScenario = { users, duration, rampUp };
    const configPath = await this.createArtilleryConfig(scenario);
    const reportPath = path.join(this.resultsDir, `load-test-${users}-users-${Date.now()}.json`);

    try {
      // Run Artillery
      const command = `artillery run --output "${reportPath}" "${configPath}"`;
      auditLogger.info('LoadTester', `Executing: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Parse results
      const reportData = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      const result = this.parseArtilleryReport(reportData, scenario);

      auditLogger.info('LoadTester', `Load test completed: ${result.metrics.requestsTotal} requests, ${result.metrics.errorRate}% errors`);

      return result;
    } catch (error) {
      auditLogger.error('LoadTester', 'Load test failed', { error });
      throw error;
    }
  }

  async simulate10kUsers(): Promise<LoadTestResult> {
    return this.testLoad(10000, 300, 60);
  }

  async simulate50kUsers(): Promise<LoadTestResult> {
    return this.testLoad(50000, 300, 120);
  }

  async simulate100kUsers(): Promise<LoadTestResult> {
    return this.testLoad(100000, 300, 180);
  }

  async testStress(): Promise<LoadTestResult> {
    auditLogger.info('LoadTester', 'Starting stress test to find breaking point');

    // Start with 10k users and increase until failure
    const userLevels = [10000, 25000, 50000, 75000, 100000, 150000, 200000];
    let breakingPoint: { users: number; reason: string } | undefined;

    for (const users of userLevels) {
      try {
        const result = await this.testLoad(users, 180, 60);
        
        // Check if system is degrading
        if (result.metrics.errorRate > 5) {
          breakingPoint = {
            users,
            reason: `Error rate ${result.metrics.errorRate}% exceeds acceptable threshold`
          };
          break;
        }

        if (result.metrics.responseTime.p95 > 3000) {
          breakingPoint = {
            users,
            reason: `P95 response time ${result.metrics.responseTime.p95}ms exceeds acceptable threshold`
          };
          break;
        }
      } catch (error) {
        breakingPoint = {
          users,
          reason: `System failure: ${error instanceof Error ? error.message : String(error)}`
        };
        break;
      }
    }

    // Return the last successful test result with breaking point info
    const finalResult = await this.testLoad(breakingPoint ? breakingPoint.users / 2 : 200000, 180, 60);
    finalResult.breakingPoint = breakingPoint;

    auditLogger.info('LoadTester', `Stress test completed. Breaking point: ${breakingPoint ? `${breakingPoint.users} users - ${breakingPoint.reason}` : 'Not found (>200k users)'}`);

    return finalResult;
  }

  async analyzeResults(results: LoadTestResult[]): Promise<{
    summary: string;
    recommendations: string[];
    capacity: {
      maxUsers: number;
      recommendedMax: number;
    };
  }> {
    auditLogger.info('LoadTester', `Analyzing ${results.length} load test results`);

    const recommendations: string[] = [];
    let maxUsers = 0;

    // Find maximum sustainable load
    for (const result of results) {
      if (result.metrics.errorRate < 1 && result.metrics.responseTime.p95 < 1000) {
        maxUsers = Math.max(maxUsers, result.scenario.users);
      }
    }

    // Generate recommendations
    const avgErrorRate = results.reduce((sum, r) => sum + r.metrics.errorRate, 0) / results.length;
    if (avgErrorRate > 1) {
      recommendations.push('Error rate exceeds target - improve error handling and system stability');
    }

    const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime.average, 0) / results.length;
    if (avgResponseTime > 500) {
      recommendations.push('Average response time exceeds target - optimize database queries and implement caching');
    }

    const avgCacheHitRate = results.reduce((sum, r) => sum + (r.metrics as any).cacheHitRate || 0, 0) / results.length;
    if (avgCacheHitRate < 70) {
      recommendations.push('Cache hit rate below target - review cache strategy and TTL values');
    }

    const summary = `Load testing completed. System supports up to ${maxUsers} concurrent users with acceptable performance. ${recommendations.length} recommendations generated.`;

    return {
      summary,
      recommendations,
      capacity: {
        maxUsers,
        recommendedMax: Math.floor(maxUsers * 0.8) // 80% of max for safety margin
      }
    };
  }

  private async createArtilleryConfig(scenario: LoadTestScenario): Promise<string> {
    const config = {
      config: {
        target: this.baseUrl,
        phases: [
          {
            duration: scenario.rampUp || 30,
            arrivalRate: Math.floor(scenario.users / (scenario.rampUp || 30)),
            name: 'Ramp up'
          },
          {
            duration: scenario.duration - (scenario.rampUp || 30),
            arrivalRate: Math.floor(scenario.users / scenario.duration),
            name: 'Sustained load'
          }
        ],
        http: {
          timeout: 30
        }
      },
      scenarios: [
        {
          name: 'Browse and watch',
          weight: 50,
          flow: [
            { get: { url: '/' } },
            { get: { url: '/movies' } },
            { get: { url: '/series' } },
            { think: 2 }
          ]
        },
        {
          name: 'Search',
          weight: 30,
          flow: [
            { get: { url: '/search?q=action' } },
            { think: 1 }
          ]
        },
        {
          name: 'View details',
          weight: 20,
          flow: [
            { get: { url: '/movie/550' } },
            { think: 3 }
          ]
        }
      ]
    };

    const configPath = path.join(this.resultsDir, `artillery-config-${Date.now()}.yml`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    return configPath;
  }

  private parseArtilleryReport(reportData: any, scenario: LoadTestScenario): LoadTestResult {
    const aggregate = reportData.aggregate || {};
    
    return {
      scenario,
      metrics: {
        requestsTotal: aggregate.counters?.['http.requests'] || 0,
        requestsPerSecond: aggregate.rates?.['http.request_rate'] || 0,
        responseTime: {
          average: aggregate.summaries?.['http.response_time']?.mean || 0,
          p50: aggregate.summaries?.['http.response_time']?.p50 || 0,
          p95: aggregate.summaries?.['http.response_time']?.p95 || 0,
          p99: aggregate.summaries?.['http.response_time']?.p99 || 0,
          min: aggregate.summaries?.['http.response_time']?.min || 0,
          max: aggregate.summaries?.['http.response_time']?.max || 0
        },
        throughput: aggregate.rates?.['http.download_rate'] || 0,
        errorRate: this.calculateErrorRate(aggregate),
        errors: aggregate.counters?.['errors.total'] || 0,
        timeouts: aggregate.counters?.['errors.ETIMEDOUT'] || 0
      },
      resources: {
        cpu: 0, // Would need system monitoring integration
        memory: 0,
        network: (aggregate.rates?.['http.download_rate'] || 0) / 1024 / 1024 // Convert to MB/s
      }
    };
  }

  private calculateErrorRate(aggregate: any): number {
    const total = aggregate.counters?.['http.requests'] || 0;
    const errors = aggregate.counters?.['errors.total'] || 0;
    
    if (total === 0) return 0;
    return (errors / total) * 100;
  }
}
