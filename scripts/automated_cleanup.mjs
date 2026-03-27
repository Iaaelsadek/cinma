
import { CodeCleaner } from '../src/audit/components/CodeCleaner';
import { auditLogger } from '../src/audit/logger';

async function main() {
  const codeCleaner = new CodeCleaner(['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**']);
  
  console.log('🚀 Starting automated code cleanup...');
  
  console.log('📦 Removing unused imports...');
  const unusedResult = await codeCleaner.removeUnusedCode();
  console.log(`✅ Removed unused imports from ${unusedResult.filesModified.length} files (${unusedResult.issuesFixed} issues fixed).`);
  
  console.log('💬 Removing console statements...');
  const consoleResult = await codeCleaner.removeConsoleLogs();
  console.log(`✅ Removed console statements from ${consoleResult.filesModified.length} files (${consoleResult.issuesFixed} issues fixed).`);
  
  if (unusedResult.errors.length > 0 || consoleResult.errors.length > 0) {
    console.error('❌ Errors occurred during cleanup:', [...unusedResult.errors, ...consoleResult.errors]);
  }
}

main().catch(console.error);
