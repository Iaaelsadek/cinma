import { I18nUXAuditor } from './components/I18nUXAuditor';
import { auditLogger } from './logger';

async function testI18nUXAuditor() {
  auditLogger.info('Test', 'Starting I18nUXAuditor test');
  
  const auditor = new I18nUXAuditor();
  const report = await auditor.run();
  
  
  // Group issues by severity
  const critical = report.issues.filter(i => i.severity === 'critical');
  const high = report.issues.filter(i => i.severity === 'high');
  const medium = report.issues.filter(i => i.severity === 'medium');
  const low = report.issues.filter(i => i.severity === 'low');
  
  
  critical.forEach(issue => {
  });
  
  high.forEach(issue => {
  });
  
  medium.slice(0, 10).forEach(issue => {
  });
  
  auditLogger.info('Test', 'I18nUXAuditor test completed');
}

testI18nUXAuditor().catch(error => {
  process.exit(1);
});
