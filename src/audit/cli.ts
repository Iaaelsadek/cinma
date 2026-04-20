#!/usr/bin/env node
import { AuditOrchestrator } from './orchestrator';
import { defaultAuditConfig } from './config';
import { auditLogger } from './logger';
import { CodeCleaner } from './components/CodeCleaner';
import { SecurityScanner } from './components/SecurityScanner';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { FreeTierOptimizer } from './components/FreeTierOptimizer';
import { LoadTester } from './components/LoadTester';
import { DatabaseAuditor } from './components/DatabaseAuditor';
import { DocumentationManager } from './components/DocumentationManager';
import { ProductionValidator } from './components/ProductionValidator';
import { ErrorHandlingAuditor } from './components/ErrorHandlingAuditor';
import { RateLimitingAuditor } from './components/RateLimitingAuditor';
import { APIValidationAuditor } from './components/APIValidationAuditor';
import { IntegrationTestAuditor } from './components/IntegrationTestAuditor';
import { I18nUXAuditor } from './components/I18nUXAuditor';
import { ContentDeliveryAuditor } from './components/ContentDeliveryAuditor';
import { AnalyticsAuditor } from './components/AnalyticsAuditor';
import * as fs from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  auditLogger.info('CLI', `Starting audit: ${command}`);

  const orchestrator = new AuditOrchestrator(defaultAuditConfig);

  orchestrator.registerComponent('CodeCleaner', new CodeCleaner(defaultAuditConfig.excludePaths));
  orchestrator.registerComponent('SecurityScanner', new SecurityScanner());
  orchestrator.registerComponent('PerformanceMonitor', new PerformanceMonitor());
  orchestrator.registerComponent('FreeTierOptimizer', new FreeTierOptimizer());
  orchestrator.registerComponent('LoadTester', new LoadTester());
  orchestrator.registerComponent('DatabaseAuditor', new DatabaseAuditor());
  orchestrator.registerComponent('DocumentationManager', new DocumentationManager());
  orchestrator.registerComponent('ProductionValidator', new ProductionValidator());
  orchestrator.registerComponent('ErrorHandlingAuditor', new ErrorHandlingAuditor());
  orchestrator.registerComponent('RateLimitingAuditor', new RateLimitingAuditor());
  orchestrator.registerComponent('APIValidationAuditor', new APIValidationAuditor());
  orchestrator.registerComponent('IntegrationTestAuditor', new IntegrationTestAuditor());
  orchestrator.registerComponent('I18nUXAuditor', new I18nUXAuditor());
  orchestrator.registerComponent('ContentDeliveryAuditor', new ContentDeliveryAuditor());
  orchestrator.registerComponent('AnalyticsAuditor', new AnalyticsAuditor());

  try {
    let report: unknown;
    
    switch (command) {
      case 'full':
        report = await orchestrator.runFullAudit();
        await fs.writeFile('.kiro/audit-report.json', JSON.stringify(report, null, 2));
        break;
      case 'code':
        report = await orchestrator.runComponent('CodeCleaner');
        break;
      case 'fix': {
        const codeCleaner = new CodeCleaner(defaultAuditConfig.excludePaths);
        await codeCleaner.removeUnusedCode();
        await codeCleaner.removeConsoleLogs();
        break;
      }
      case 'security':
        report = await orchestrator.runComponent('SecurityScanner');
        break;
      case 'performance':
        report = await orchestrator.runComponent('PerformanceMonitor');
        break;
      case 'freetier':
        report = await orchestrator.runComponent('FreeTierOptimizer');
        break;
      case 'load':
        report = await orchestrator.runComponent('LoadTester');
        break;
      case 'database':
        report = await orchestrator.runComponent('DatabaseAuditor');
        break;
      case 'docs':
        report = await orchestrator.runComponent('DocumentationManager');
        break;
      case 'production':
        report = await orchestrator.runComponent('ProductionValidator');
        break;
      case 'errorhandling':
        report = await orchestrator.runComponent('ErrorHandlingAuditor');
        break;
      case 'ratelimiting':
        report = await orchestrator.runComponent('RateLimitingAuditor');
        break;
      case 'apivalidation':
        report = await orchestrator.runComponent('APIValidationAuditor');
        break;
      case 'integration':
        report = await orchestrator.runComponent('IntegrationTestAuditor');
        break;
      case 'i18nux':
        report = await orchestrator.runComponent('I18nUXAuditor');
        break;
      case 'contentdelivery':
        report = await orchestrator.runComponent('ContentDeliveryAuditor');
        break;
      case 'analytics':
        report = await orchestrator.runComponent('AnalyticsAuditor');
        break;
      case 'report': {
        orchestrator.getStatus();
        break;
      }
      case 'status':
        break;
      default:
        process.exit(1);
    }

    auditLogger.info('CLI', 'Audit completed successfully');
  } catch (error: any) {
    auditLogger.error('CLI', 'Audit failed', { error });
    process.exit(1);
  }
}

main();
