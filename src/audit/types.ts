// Audit System Types and Interfaces

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'in_progress' | 'fixed' | 'wont_fix';
export type AuditStatus = 'pass' | 'warning' | 'fail';
export type ComponentStatus = 'pass' | 'warning' | 'fail';

export interface Issue {
  severity: IssueSeverity;
  category: string;
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  recommendation: string;
}

export interface ComponentReport {
  component: string;
  status: ComponentStatus;
  issues: Issue[];
  metrics: Record<string, any>;
  duration: number;
}

export interface AuditReport {
  timestamp: Date;
  overallStatus: AuditStatus;
  components: ComponentReport[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
  };
  metrics: {
    before: MetricsSnapshot;
    after: MetricsSnapshot;
    improvement: Partial<MetricsSnapshot>;
  };
  recommendations: Recommendation[];
}

export interface Recommendation {
  priority: IssueSeverity;
  category: string;
  description: string;
  estimatedEffort: string;
  impact: string;
}

export interface MetricsSnapshot {
  timestamp: Date;
  performance: {
    responseTime: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
    };
    cacheHitRate: number;
    errorRate: number;
  };
  resources: {
    tmdb: {
      calls: number;
      callsRemaining: number;
      percentUsed: number;
    };
    supabase: {
      bandwidth: number;
      bandwidthRemaining: number;
      percentUsed: number;
    };
    cloudflare: {
      bandwidth: number;
      bandwidthRemaining: number;
      percentUsed: number;
    };
  };
  codeQuality: {
    typescriptErrors: number;
    warnings: number;
    securityVulnerabilities: {
      critical: number;
      high: number;
      moderate: number;
      low: number;
    };
  };
  capacity: {
    currentUsers: number;
    maxSupportedUsers: number;
    utilizationPercent: number;
  };
}

export interface TrackedIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  component: string;
  description: string;
  file?: string;
  line?: number;
  status: IssueStatus;
  autoFixable: boolean;
  detectedAt: Date;
  fixedAt?: Date;
  estimatedEffort: string;
  priority: number;
  recommendation: string;
  fixApplied?: string;
  verificationMethod?: string;
  relatedIssues: string[];
  blockedBy: string[];
  blocks: string[];
}

export interface AuditConfig {
  thresholds: {
    maxWarnings: number;
    maxResponseTime: number;
    minPerformanceScore: number;
    minAccessibilityScore: number;
    minSEOScore: number;
    maxBundleSize: number;
    minCacheHitRate: number;
  };
  freeTierLimits: {
    tmdb: {
      callsPerMonth: number;
      callsPerSecond: number;
    };
    supabase: {
      bandwidthPerMonth: number;
      storageGB: number;
      requestsPerSecond: number;
    };
    cloudflare: {
      bandwidthPerMonth: number;
      deploymentsPerMonth: number;
    };
    koyeb: {
      activeHoursPerMonth: number;
      ramGB: number;
      cpu: number;
    };
  };
  loadTestScenarios: {
    light: { users: number; duration: number };
    medium: { users: number; duration: number };
    heavy: { users: number; duration: number };
  };
  excludePaths: string[];
  components: {
    codeCleanerEnabled: boolean;
    securityScannerEnabled: boolean;
    performanceMonitorEnabled: boolean;
    freeTierOptimizerEnabled: boolean;
    loadTesterEnabled: boolean;
    databaseAuditorEnabled: boolean;
    documentationManagerEnabled: boolean;
    productionValidatorEnabled: boolean;
  };
}

export interface FileIssue {
  file: string;
  line: number;
  column: number;
  name: string;
  type: 'import' | 'variable' | 'function';
}

export interface FixResult {
  filesModified: string[];
  issuesFixed: number;
  errors: Error[];
}
