#!/usr/bin/env node

/**
 * Run All Tests
 * 
 * Executes all test suites for Cinema Online:
 * - Comprehensive tests (database, API, functionality)
 * - Production smoke tests
 * - Security audit
 * - Accessibility audit
 * 
 * Usage:
 *   node scripts/test/run_all_tests.mjs
 *   node scripts/test/run_all_tests.mjs --url https://cinma.online
 *   node scripts/test/run_all_tests.mjs --skip-security
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5173';

const SKIP_SECURITY = process.argv.includes('--skip-security');
const SKIP_ACCESSIBILITY = process.argv.includes('--skip-accessibility');
const SKIP_SMOKE = process.argv.includes('--skip-smoke');
const SKIP_COMPREHENSIVE = process.argv.includes('--skip-comprehensive');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test results
const results = {
  comprehensive: null,
  smoke: null,
  security: null,
  accessibility: null
};

/**
 * Run a test script
 */
function runTest(scriptPath, name) {
  return new Promise((resolve) => {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}Running: ${name}${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
    
    const args = ['--url', BASE_URL];
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      resolve({
        name,
        passed: code === 0,
        exitCode: code
      });
    });
    
    child.on('error', (error) => {
      console.error(`${colors.red}Error running ${name}:${colors.reset}`, error);
      resolve({
        name,
        passed: false,
        exitCode: 1,
        error: error.message
      });
    });
  });
}

/**
 * Print final summary
 */
function printFinalSummary() {
  console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.magenta}Final Test Summary${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
  
  const allResults = Object.values(results).filter(r => r !== null);
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const total = allResults.length;
  
  console.log(`${colors.cyan}Test Suites:${colors.reset}`);
  
  for (const [key, result] of Object.entries(results)) {
    if (result === null) continue;
    
    const status = result.passed ? `${colors.green}✓ PASSED${colors.reset}` : `${colors.red}✗ FAILED${colors.reset}`;
    console.log(`  ${status} - ${result.name}`);
  }
  
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Total: ${total}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  
  console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`${colors.green}✓ All test suites passed!${colors.reset}`);
    console.log(`${colors.cyan}Application is ready for production.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some test suites failed.${colors.reset}`);
    console.log(`${colors.cyan}Please review the failures above.${colors.reset}`);
  }
  
  console.log(`${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.magenta}Cinema Online - Complete Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Testing: ${BASE_URL}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Run comprehensive tests
  if (!SKIP_COMPREHENSIVE) {
    results.comprehensive = await runTest(
      join(__dirname, 'comprehensive_test.mjs'),
      'Comprehensive Tests'
    );
  }
  
  // Run smoke tests
  if (!SKIP_SMOKE) {
    results.smoke = await runTest(
      join(__dirname, 'production_smoke_test.mjs'),
      'Production Smoke Tests'
    );
  }
  
  // Run security audit
  if (!SKIP_SECURITY) {
    results.security = await runTest(
      join(__dirname, 'security_audit.mjs'),
      'Security Audit'
    );
  }
  
  // Run accessibility audit
  if (!SKIP_ACCESSIBILITY) {
    results.accessibility = await runTest(
      join(__dirname, 'accessibility_audit.mjs'),
      'Accessibility Audit'
    );
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print final summary
  printFinalSummary();
  
  console.log(`${colors.cyan}Total execution time: ${duration}s${colors.reset}\n`);
  
  // Exit with appropriate code
  const failed = Object.values(results).filter(r => r !== null && !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
