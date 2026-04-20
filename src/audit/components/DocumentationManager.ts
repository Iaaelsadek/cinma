import { ComponentReport, Issue } from '../types';
import { auditLogger } from '../logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DocumentationManager {
  private kiroDir: string;

  constructor(kiroDir: string = '.kiro') {
    this.kiroDir = kiroDir;
  }

  async run(): Promise<ComponentReport> {
    auditLogger.info('DocumentationManager', 'Starting documentation audit');
    const startTime = Date.now();
    const issues: Issue[] = [];
    const metrics: Record<string, any> = {};

    try {
      const indexIssues = await this.reviewIndexMD();
      issues.push(...indexIssues);

      const constitutionIssues = await this.reviewProjectConstitution();
      issues.push(...constitutionIssues);

      const startHereIssues = await this.reviewStartHere();
      issues.push(...startHereIssues);

      const linkIssues = await this.verifyLinks();
      issues.push(...linkIssues);
      metrics.brokenLinks = linkIssues.length;

      const specIssues = await this.verifySpecCoverage();
      issues.push(...specIssues);
      metrics.specsDocumented = await this.countDocumentedSpecs();

      const status = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'fail' : 'pass';

      auditLogger.info('DocumentationManager', `Documentation audit completed with status: ${status}`);

      return {
        component: 'DocumentationManager',
        status,
        issues,
        metrics,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      auditLogger.error('DocumentationManager', 'Documentation audit failed', { error });
      return {
        component: 'DocumentationManager',
        status: 'fail',
        issues: [{
          severity: 'high',
          category: 'documentation',
          description: `Documentation audit failed: ${error instanceof Error ? error.message : String(error)}`,
          recommendation: 'Check file access and documentation structure',
          autoFixable: false
        }],
        metrics: { error: String(error) },
        duration: Date.now() - startTime
      };
    }
  }

  async reviewIndexMD(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Reviewing INDEX.md');
    const issues: Issue[] = [];
    const indexPath = path.join(this.kiroDir, 'INDEX.md');

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      
      if (content.length < 1000) {
        issues.push({
          severity: 'medium',
          category: 'documentation',
          description: 'INDEX.md appears incomplete (less than 1000 characters)',
          file: indexPath,
          recommendation: 'Expand INDEX.md with comprehensive project overview',
          autoFixable: false
        });
      }

      const requiredSections = ['Architecture', 'Features', 'Deployment', 'Database'];
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          issues.push({
            severity: 'medium',
            category: 'documentation',
            description: `INDEX.md missing '${section}' section`,
            file: indexPath,
            recommendation: `Add ${section} section to INDEX.md`,
            autoFixable: false
          });
        }
      }

      const specsDir = path.join(this.kiroDir, 'specs');
      const specs = await fs.readdir(specsDir);
      
      for (const spec of specs) {
        if (!content.includes(spec)) {
          issues.push({
            severity: 'low',
            category: 'documentation',
            description: `Spec '${spec}' not documented in INDEX.md`,
            file: indexPath,
            recommendation: `Add reference to ${spec} in INDEX.md`,
            autoFixable: false
          });
        }
      }
    } catch (error: any) {
      issues.push({
        severity: 'high',
        category: 'documentation',
        description: 'INDEX.md not found',
        file: indexPath,
        recommendation: 'Create INDEX.md with project overview',
        autoFixable: false
      });
    }

    return issues;
  }

  async reviewProjectConstitution(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Reviewing PROJECT_CONSTITUTION_V2.md');
    const issues: Issue[] = [];
    const constitutionPath = path.join(this.kiroDir, 'PROJECT_CONSTITUTION_V2.md');

    try {
      const content = await fs.readFile(constitutionPath, 'utf-8');
      
      const requiredArchitecture = [
        'GitHub', 'Cloudflare', 'Koyeb', 'CockroachDB', 'Supabase'
      ];

      for (const component of requiredArchitecture) {
        if (!content.includes(component)) {
          issues.push({
            severity: 'high',
            category: 'documentation',
            description: `PROJECT_CONSTITUTION_V2.md missing '${component}' in architecture`,
            file: constitutionPath,
            recommendation: `Document ${component} role in architecture`,
            autoFixable: false
          });
        }
      }

      if (!content.includes('CockroachDB') || !content.includes('content')) {
        issues.push({
          severity: 'high',
          category: 'documentation',
          description: 'Database separation rules not clearly documented',
          file: constitutionPath,
          recommendation: 'Document CockroachDB for content, Supabase for auth/users',
          autoFixable: false
        });
      }
    } catch (error: any) {
      issues.push({
        severity: 'high',
        category: 'documentation',
        description: 'PROJECT_CONSTITUTION_V2.md not found',
        file: constitutionPath,
        recommendation: 'Create PROJECT_CONSTITUTION_V2.md with architecture documentation',
        autoFixable: false
      });
    }

    return issues;
  }

  async reviewStartHere(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Reviewing START_HERE.md');
    const issues: Issue[] = [];
    const startHerePath = path.join(this.kiroDir, 'START_HERE.md');

    try {
      const content = await fs.readFile(startHerePath, 'utf-8');
      
      const requiredSteps = ['install', 'build', 'deploy', 'environment'];
      for (const step of requiredSteps) {
        if (!content.toLowerCase().includes(step)) {
          issues.push({
            severity: 'medium',
            category: 'documentation',
            description: `START_HERE.md missing '${step}' instructions`,
            file: startHerePath,
            recommendation: `Add ${step} instructions to START_HERE.md`,
            autoFixable: false
          });
        }
      }
    } catch (error: any) {
      issues.push({
        severity: 'high',
        category: 'documentation',
        description: 'START_HERE.md not found',
        file: startHerePath,
        recommendation: 'Create START_HERE.md with getting started guide',
        autoFixable: false
      });
    }

    return issues;
  }

  async verifyLinks(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Verifying documentation links');
    const issues: Issue[] = [];

    const docFiles = await this.getAllMarkdownFiles(this.kiroDir);
    
    for (const file of docFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        const url = match[2];
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
          continue;
        }

        const linkPath = path.join(path.dirname(file), url);
        try {
          await fs.access(linkPath);
        } catch {
          issues.push({
            severity: 'medium',
            category: 'documentation',
            description: `Broken link: ${url}`,
            file,
            recommendation: `Fix or remove broken link to ${url}`,
            autoFixable: false
          });
        }
      }
    }

    return issues;
  }

  async verifySpecCoverage(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Verifying spec file coverage');
    const issues: Issue[] = [];

    const specsDir = path.join(this.kiroDir, 'specs');
    
    try {
      const specs = await fs.readdir(specsDir);
      
      for (const spec of specs) {
        const specPath = path.join(specsDir, spec);
        const stat = await fs.stat(specPath);
        
        if (!stat.isDirectory()) continue;

        const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
        for (const file of requiredFiles) {
          const filePath = path.join(specPath, file);
          try {
            await fs.access(filePath);
          } catch {
            issues.push({
              severity: 'high',
              category: 'documentation',
              description: `Spec '${spec}' missing ${file}`,
              file: specPath,
              recommendation: `Create ${file} for spec ${spec}`,
              autoFixable: false
            });
          }
        }
      }
    } catch (error: any) {
      // Specs directory doesn't exist - not critical
    }

    return issues;
  }

  private async getAllMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...await this.getAllMarkdownFiles(fullPath));
          }
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error: any) {
      auditLogger.error('DocumentationManager', `Failed to read directory: ${dir}`, { error });
    }
    
    return files;
  }

  private async countDocumentedSpecs(): Promise<number> {
    try {
      const specsDir = path.join(this.kiroDir, 'specs');
      const specs = await fs.readdir(specsDir);
      return specs.length;
    } catch {
      return 0;
    }
  }

  async updateDocumentation(): Promise<{ updated: string[]; errors: string[] }> {
    auditLogger.info('DocumentationManager', 'Updating documentation files');
    const updated: string[] = [];
    const errors: string[] = [];

    try {
      const indexPath = path.join(this.kiroDir, 'INDEX.md');
      const specsDir = path.join(this.kiroDir, 'specs');
      const specs = await fs.readdir(specsDir);
      
      let indexContent = await fs.readFile(indexPath, 'utf-8');
      
      if (!indexContent.includes('## Specifications')) {
        indexContent += '\n\n## Specifications\n\n';
        for (const spec of specs) {
          indexContent += `- [${spec}](.kiro/specs/${spec}/)\n`;
        }
        await fs.writeFile(indexPath, indexContent);
        updated.push('INDEX.md');
      }
    } catch (error: any) {
      errors.push(`Failed to update INDEX.md: ${error instanceof Error ? error.message : String(error)}`);
    }

    auditLogger.info('DocumentationManager', `Documentation update completed: ${updated.length} files updated, ${errors.length} errors`);
    
    return { updated, errors };
  }

  async verifyDocumentationConsistency(): Promise<Issue[]> {
    auditLogger.info('DocumentationManager', 'Verifying documentation consistency');
    const issues: Issue[] = [];

    const docFiles = await this.getAllMarkdownFiles(this.kiroDir);
    
    for (const file of docFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for outdated architecture references
      if (content.includes('Vercel') && !file.includes('MIGRATION')) {
        issues.push({
          severity: 'medium',
          category: 'documentation',
          description: `File references Vercel instead of Cloudflare: ${file}`,
          file,
          recommendation: 'Update to reference Cloudflare for frontend hosting',
          autoFixable: false
        });
      }

      // Check for code examples with syntax errors
      const codeBlockRegex = /```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g;
      let match;
      
      while ((match = codeBlockRegex.exec(content)) !== null) {
        const code = match[1];
        
        // Basic syntax checks
        if (code.includes('function') && !code.includes('{')) {
          issues.push({
            severity: 'low',
            category: 'documentation',
            description: `Potentially incomplete code example in ${file}`,
            file,
            recommendation: 'Review and complete code examples',
            autoFixable: false
          });
        }
      }
    }

    return issues;
  }
}
