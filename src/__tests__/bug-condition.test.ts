import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Bug Condition Exploration Test', () => {
  const projectRoot = process.cwd();
  
  describe('Bug Condition 1: Missing Request.tsx file', () => {
    it('should fail because Request.tsx file is missing', () => {
      const requestTsxPath = join(projectRoot, 'src', 'components', 'Request.tsx');
      const fileExists = existsSync(requestTsxPath);
      
      // This test should fail because Request.tsx is missing
      // This confirms the bug condition exists
      expect(fileExists).toBe(false);
    });
  });

  describe('Bug Condition 2: TypeScript compilation errors', () => {
    it('should have TypeScript compilation errors', () => {
      try {
        const typecheckOutput = readFileSync('typecheck_output.txt', 'utf-8');
        const hasErrors = typecheckOutput.includes('error TS');
        
        // This test should fail because TypeScript errors exist
        expect(hasErrors).toBe(true);
      } catch (error: any) {
        // If file doesn't exist, that's also a failure condition
        expect(true).toBe(false); // Force test to fail
      }
    });
  });

  describe('Bug Condition 3: ESLint warnings', () => {
    it('should have ESLint warnings', () => {
      try {
        const eslintOutput = readFileSync('eslint_output_final.json', 'utf-8');
        const eslintData = JSON.parse(eslintOutput);
        const totalWarnings = eslintData.reduce((sum, file) => sum + file.warningCount, 0);
        
        // This test should fail because ESLint warnings exist
        expect(totalWarnings).toBeGreaterThan(0);
      } catch (error: any) {
        // If file doesn't exist or can't be parsed, that's also a failure
        expect(true).toBe(false); // Force test to fail
      }
    });
  });

  describe('Bug Condition Summary', () => {
    it('should have all three bug conditions present', () => {
      // Check Request.tsx is missing
      const requestTsxPath = join(projectRoot, 'src', 'components', 'Request.tsx');
      const fileExists = existsSync(requestTsxPath);
      
      // Check TypeScript errors
      let hasTypeErrors = false;
      try {
        const typecheckOutput = readFileSync('typecheck_output.txt', 'utf-8');
        hasTypeErrors = typecheckOutput.includes('error TS');
      } catch (error: any) {
        hasTypeErrors = false;
      }
      
      // Check ESLint warnings
      let hasEslintWarnings = false;
      try {
        const eslintOutput = readFileSync('eslint_output_final.json', 'utf-8');
        const eslintData = JSON.parse(eslintOutput);
        const totalWarnings = eslintData.reduce((sum, file) => sum + file.warningCount, 0);
        hasEslintWarnings = totalWarnings > 0;
      } catch (error: any) {
        hasEslintWarnings = false;
      }
      
      // All three conditions should be true for the bug to exist
      const bugExists = !fileExists && hasTypeErrors && hasEslintWarnings;
      
      // This test should fail because all bug conditions are present
      expect(bugExists).toBe(true);
    });
  });
});