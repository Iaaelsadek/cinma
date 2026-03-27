import type { AuditReport, Issue, Recommendation, IssueSeverity } from './types';
import { auditLogger } from './logger';

export class ReportGenerator {
  generateMarkdownReport(report: AuditReport): string {
    const lines: string[] = [];
    
    lines.push('# Audit Report');
    lines.push('');
    lines.push(`**Generated:** ${report.timestamp.toISOString()}`);
    lines.push(`**Overall Status:** ${report.overallStatus.toUpperCase()}`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total Issues: ${report.summary.totalIssues}`);
    lines.push(`- Critical: ${report.summary.criticalIssues}`);
    lines.push(`- High Priority: ${report.summary.highPriorityIssues}`);
    lines.push(`- Medium Priority: ${report.summary.mediumPriorityIssues}`);
    lines.push(`- Low Priority: ${report.summary.lowPriorityIssues}`);
    lines.push('');
    
    lines.push('## Component Results');
    lines.push('');
    for (const comp of report.components) {
      lines.push(`### ${comp.component}`);
      lines.push('');
      lines.push(`**Status:** ${comp.status}`);
      lines.push(`**Duration:** ${comp.duration}ms`);
      lines.push(`**Issues Found:** ${comp.issues.length}`);
      lines.push('');
      
      if (comp.issues.length > 0) {
        lines.push('**Issues:**');
        lines.push('');
        for (const issue of comp.issues) {
          lines.push(`- [${issue.severity.toUpperCase()}] ${issue.description}`);
          if (issue.file) {
            lines.push(`  - File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
          }
          lines.push(`  - Recommendation: ${issue.recommendation}`);
          lines.push(`  - Auto-fixable: ${issue.autoFixable ? 'Yes' : 'No'}`);
          lines.push('');
        }
      }
    }
    
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`### [${rec.priority.toUpperCase()}] ${rec.category}`);
        lines.push('');
        lines.push(rec.description);
        lines.push('');
        lines.push(`**Estimated Effort:** ${rec.estimatedEffort}`);
        lines.push(`**Impact:** ${rec.impact}`);
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  generateJSONReport(report: AuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  generateRecommendations(issues: Issue[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const grouped = this.groupIssuesByCategory(issues);
    
    for (const [category, categoryIssues] of Object.entries(grouped)) {
      const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
      const highCount = categoryIssues.filter(i => i.severity === 'high').length;
      
      if (criticalCount > 0 || highCount > 0) {
        const priority: IssueSeverity = criticalCount > 0 ? 'critical' : 'high';
        const effort = this.estimateEffort(categoryIssues);
        const impact = this.estimateImpact(categoryIssues);
        
        recommendations.push({
          priority,
          category,
          description: `Fix ${categoryIssues.length} ${category} issues`,
          estimatedEffort: effort,
          impact,
        });
      }
    }
    
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.priority] - severityOrder[b.priority];
    });
  }

  private groupIssuesByCategory(issues: Issue[]): Record<string, Issue[]> {
    const grouped: Record<string, Issue[]> = {};
    
    for (const issue of issues) {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    }
    
    return grouped;
  }

  private estimateEffort(issues: Issue[]): string {
    const count = issues.length;
    if (count <= 5) return '15-30 minutes';
    if (count <= 15) return '1-2 hours';
    if (count <= 30) return '3-5 hours';
    return '1-2 days';
  }

  private estimateImpact(issues: Issue[]): string {
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasHigh = issues.some(i => i.severity === 'high');
    
    if (hasCritical) return 'Critical - blocks production launch';
    if (hasHigh) return 'High - significant risk to production';
    return 'Medium - improves quality and maintainability';
  }

  async exportReport(report: AuditReport, format: 'json' | 'markdown' = 'markdown'): Promise<string> {
    auditLogger.info('ReportGenerator', `Exporting report in ${format} format`);
    
    if (format === 'json') {
      return this.generateJSONReport(report);
    }
    
    return this.generateMarkdownReport(report);
  }
}

export const reportGenerator = new ReportGenerator();
