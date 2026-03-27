#!/usr/bin/env tsx

import { APIValidationAuditor } from './components/APIValidationAuditor';
import { auditLogger } from './logger';

async function main() {
  auditLogger.info('Test', 'Starting API Validation Auditor test');
  
  const auditor = new APIValidationAuditor();
  const report = await auditor.run();
  
  
  
  if (report.issues.length > 0) {
    const bySeverity = {
      critical: report.issues.filter(i => i.severity === 'critical'),
      high: report.issues.filter(i => i.severity === 'high'),
      medium: report.issues.filter(i => i.severity === 'medium'),
      low: report.issues.filter(i => i.severity === 'low'),
    };
    
    
    // Show first 10 issues
    report.issues.slice(0, 10).forEach((issue, idx) => {
      if (issue.file) {
      }
    });
  }
  
  auditLogger.info('Test', 'API Validation Auditor test completed');
}

main().catch(error => {
  process.exit(1);
});
