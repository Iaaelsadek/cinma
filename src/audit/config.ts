import type { AuditConfig } from './types';

export const defaultAuditConfig: AuditConfig = {
  thresholds: {
    maxWarnings: 50,
    maxResponseTime: 500,
    minPerformanceScore: 90,
    minAccessibilityScore: 90,
    minSEOScore: 90,
    maxBundleSize: 5,
    minCacheHitRate: 70,
  },
  freeTierLimits: {
    tmdb: {
      callsPerMonth: 1_000_000,
      callsPerSecond: 50,
    },
    supabase: {
      bandwidthPerMonth: 5 * 1024 * 1024 * 1024,
      storageGB: 0.5,
      requestsPerSecond: 50,
    },
    cloudflare: {
      bandwidthPerMonth: -1,
      deploymentsPerMonth: 500,
    },
    koyeb: {
      activeHoursPerMonth: 50,
      ramGB: 1,
      cpu: 0.25,
    },
  },
  loadTestScenarios: {
    light: { users: 10000, duration: 300 },
    medium: { users: 50000, duration: 300 },
    heavy: { users: 100000, duration: 300 },
  },
  excludePaths: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    'coverage/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],
  components: {
    codeCleanerEnabled: true,
    securityScannerEnabled: true,
    performanceMonitorEnabled: true,
    freeTierOptimizerEnabled: true,
    loadTesterEnabled: true,
    databaseAuditorEnabled: true,
    documentationManagerEnabled: true,
    productionValidatorEnabled: true,
  },
};
