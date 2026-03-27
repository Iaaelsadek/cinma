#!/usr/bin/env node

/**
 * Security Audit Script
 * 
 * Performs automated security checks on the Cinema Online application:
 * - SQL injection vulnerability testing
 * - XSS vulnerability testing
 * - Authentication security
 * - API security
 * - Environment variable exposure
 * - Security headers
 * 
 * Usage:
 *   node scripts/test/security_audit.mjs
 *   node scripts/test/security_audit.mjs --url https://cinma.online
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5173';

const TIMEOUT = 10000;

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  critical: 0,
  tests: []
};

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

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TIMEOUT
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Log test result
 */
function logTest(name, severity, passed, message = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? colors.green : (severity === 'critical' ? colors.red : colors.yellow);
  const severityLabel = severity === 'critical' ? ' [CRITICAL]' : severity === 'warning' ? ' [WARNING]' : '';
  
  console.log(`${color}${status}${colors.reset} ${name}${severityLabel}`);
  
  if (message) {
    console.log(`  ${colors.cyan}→${colors.reset} ${message}`);
  }
  
  results.tests.push({ name, severity, passed, message });
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
    if (severity === 'critical') {
      results.critical++;
    } else if (severity === 'warning') {
      results.warnings++;
    }
  }
}

/**
 * Test: SQL Injection Protection
 */
async function testSQLInjection() {
  console.log(`\n${colors.blue}=== SQL Injection Tests ===${colors.reset}\n`);
  
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE movies; --",
    "' UNION SELECT NULL, NULL, NULL--",
    "1' AND '1'='1",
    "admin'--",
    "' OR 1=1--"
  ];
  
  const searchUrl = `${BASE_URL}/api/search`;
  
  for (const payload of sqlPayloads) {
    try {
      const url = `${searchUrl}?q=${encodeURIComponent(payload)}`;
      const response = await makeRequest(url);
      
      // Check if response contains SQL error messages
      const sqlErrors = [
        'sql syntax',
        'mysql_fetch',
        'postgresql',
        'ora-',
        'syntax error',
        'unclosed quotation',
        'quoted string not properly terminated'
      ];
      
      const bodyLower = response.body.toLowerCase();
      const hasSQLError = sqlErrors.some(error => bodyLower.includes(error));
      
      if (hasSQLError) {
        logTest(`SQL Injection: ${payload.substring(0, 20)}...`, 'critical', false, 'SQL error exposed in response');
      } else if (response.statusCode === 500) {
        logTest(`SQL Injection: ${payload.substring(0, 20)}...`, 'warning', false, 'Server error (500) - may indicate vulnerability');
      } else {
        logTest(`SQL Injection: ${payload.substring(0, 20)}...`, 'info', true, 'Payload handled safely');
      }
    } catch (error) {
      logTest(`SQL Injection: ${payload.substring(0, 20)}...`, 'info', true, 'Request rejected (good)');
    }
  }
}

/**
 * Test: XSS Protection
 */
async function testXSS() {
  console.log(`\n${colors.blue}=== XSS Protection Tests ===${colors.reset}\n`);
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ];
  
  const searchUrl = `${BASE_URL}/api/search`;
  
  for (const payload of xssPayloads) {
    try {
      const url = `${searchUrl}?q=${encodeURIComponent(payload)}`;
      const response = await makeRequest(url);
      
      // Check if payload is reflected unescaped
      if (response.body.includes(payload)) {
        logTest(`XSS: ${payload.substring(0, 30)}...`, 'critical', false, 'Payload reflected unescaped');
      } else {
        logTest(`XSS: ${payload.substring(0, 30)}...`, 'info', true, 'Payload escaped or filtered');
      }
    } catch (error) {
      logTest(`XSS: ${payload.substring(0, 30)}...`, 'info', true, 'Request rejected (good)');
    }
  }
}

/**
 * Test: Security Headers
 */
async function testSecurityHeaders() {
  console.log(`\n${colors.blue}=== Security Headers Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    const headers = response.headers;
    
    // X-Frame-Options
    if (headers['x-frame-options']) {
      const value = headers['x-frame-options'].toUpperCase();
      if (value === 'DENY' || value === 'SAMEORIGIN') {
        logTest('X-Frame-Options header', 'info', true, `Set to: ${value}`);
      } else {
        logTest('X-Frame-Options header', 'warning', false, `Weak value: ${value}`);
      }
    } else {
      logTest('X-Frame-Options header', 'warning', false, 'Header missing (clickjacking risk)');
    }
    
    // X-Content-Type-Options
    if (headers['x-content-type-options'] === 'nosniff') {
      logTest('X-Content-Type-Options header', 'info', true, 'Set to: nosniff');
    } else {
      logTest('X-Content-Type-Options header', 'warning', false, 'Header missing or incorrect');
    }
    
    // X-XSS-Protection
    if (headers['x-xss-protection']) {
      logTest('X-XSS-Protection header', 'info', true, `Set to: ${headers['x-xss-protection']}`);
    } else {
      logTest('X-XSS-Protection header', 'warning', false, 'Header missing');
    }
    
    // Content-Security-Policy
    if (headers['content-security-policy']) {
      logTest('Content-Security-Policy header', 'info', true, 'CSP configured');
      
      // Check for unsafe-inline
      if (headers['content-security-policy'].includes('unsafe-inline')) {
        logTest('CSP unsafe-inline', 'warning', false, 'CSP allows unsafe-inline (XSS risk)');
      } else {
        logTest('CSP unsafe-inline', 'info', true, 'No unsafe-inline in CSP');
      }
    } else {
      logTest('Content-Security-Policy header', 'warning', false, 'Header missing');
    }
    
    // Strict-Transport-Security (HSTS)
    if (BASE_URL.startsWith('https://')) {
      if (headers['strict-transport-security']) {
        logTest('Strict-Transport-Security header', 'info', true, `Set to: ${headers['strict-transport-security']}`);
      } else {
        logTest('Strict-Transport-Security header', 'warning', false, 'HSTS header missing');
      }
    }
    
    // Referrer-Policy
    if (headers['referrer-policy']) {
      logTest('Referrer-Policy header', 'info', true, `Set to: ${headers['referrer-policy']}`);
    } else {
      logTest('Referrer-Policy header', 'warning', false, 'Header missing');
    }
    
    // Permissions-Policy
    if (headers['permissions-policy']) {
      logTest('Permissions-Policy header', 'info', true, 'Permissions configured');
    } else {
      logTest('Permissions-Policy header', 'warning', false, 'Header missing');
    }
    
  } catch (error) {
    logTest('Security headers check', 'critical', false, error.message);
  }
}

/**
 * Test: Environment Variable Exposure
 */
async function testEnvExposure() {
  console.log(`\n${colors.blue}=== Environment Variable Exposure Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    // Check for exposed secrets in HTML
    const sensitivePatterns = [
      /COCKROACHDB_URL.*postgresql:\/\/[^"'\s]+/i,
      /GROQ_API_KEY.*gsk_[a-zA-Z0-9]+/i,
      /password.*[=:]\s*["'][^"']+["']/i,
      /secret.*[=:]\s*["'][^"']+["']/i,
      /api[_-]?key.*[=:]\s*["'][^"']+["']/i
    ];
    
    let exposedSecrets = false;
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(response.body)) {
        exposedSecrets = true;
        logTest('Environment variable exposure', 'critical', false, `Sensitive data found matching: ${pattern}`);
      }
    }
    
    if (!exposedSecrets) {
      logTest('Environment variable exposure', 'info', true, 'No sensitive data exposed in HTML');
    }
    
    // Check for .env file exposure
    try {
      const envResponse = await makeRequest(`${BASE_URL}/.env`);
      if (envResponse.statusCode === 200) {
        logTest('.env file exposure', 'critical', false, '.env file is publicly accessible!');
      } else {
        logTest('.env file exposure', 'info', true, '.env file not accessible');
      }
    } catch (error) {
      logTest('.env file exposure', 'info', true, '.env file not accessible');
    }
    
  } catch (error) {
    logTest('Environment variable check', 'warning', false, error.message);
  }
}

/**
 * Test: HTTPS Configuration
 */
async function testHTTPS() {
  console.log(`\n${colors.blue}=== HTTPS Configuration Tests ===${colors.reset}\n`);
  
  if (!BASE_URL.startsWith('https://')) {
    logTest('HTTPS enabled', 'warning', false, 'Site is not using HTTPS');
    return;
  }
  
  logTest('HTTPS enabled', 'info', true, 'Site uses HTTPS');
  
  // Test HTTP to HTTPS redirect
  const httpUrl = BASE_URL.replace('https://', 'http://');
  
  try {
    const response = await makeRequest(httpUrl);
    
    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.headers.location;
      if (location && location.startsWith('https://')) {
        logTest('HTTP to HTTPS redirect', 'info', true, 'HTTP redirects to HTTPS');
      } else {
        logTest('HTTP to HTTPS redirect', 'warning', false, 'Redirect does not use HTTPS');
      }
    } else {
      logTest('HTTP to HTTPS redirect', 'warning', false, 'No redirect from HTTP to HTTPS');
    }
  } catch (error) {
    logTest('HTTP to HTTPS redirect', 'warning', false, `Could not test: ${error.message}`);
  }
}

/**
 * Test: CORS Configuration
 */
async function testCORS() {
  console.log(`\n${colors.blue}=== CORS Configuration Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL, {
      headers: {
        'Origin': 'https://evil.com'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    
    if (corsHeader === '*') {
      logTest('CORS configuration', 'warning', false, 'CORS allows all origins (*)');
    } else if (corsHeader) {
      logTest('CORS configuration', 'info', true, `CORS restricted to: ${corsHeader}`);
    } else {
      logTest('CORS configuration', 'info', true, 'CORS not enabled (good for non-API sites)');
    }
    
  } catch (error) {
    logTest('CORS configuration', 'warning', false, error.message);
  }
}

/**
 * Test: Rate Limiting
 */
async function testRateLimiting() {
  console.log(`\n${colors.blue}=== Rate Limiting Tests ===${colors.reset}\n`);
  
  const apiUrl = `${BASE_URL}/api/search?q=test`;
  const requests = 50;
  let rateLimited = false;
  
  try {
    for (let i = 0; i < requests; i++) {
      const response = await makeRequest(apiUrl);
      
      if (response.statusCode === 429) {
        rateLimited = true;
        logTest('Rate limiting', 'info', true, `Rate limit triggered after ${i + 1} requests`);
        break;
      }
    }
    
    if (!rateLimited) {
      logTest('Rate limiting', 'warning', false, `No rate limit detected after ${requests} requests`);
    }
    
  } catch (error) {
    logTest('Rate limiting', 'warning', false, `Could not test: ${error.message}`);
  }
}

/**
 * Test: Authentication Security
 */
async function testAuthSecurity() {
  console.log(`\n${colors.blue}=== Authentication Security Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    // Check for secure cookie flags
    const setCookie = response.headers['set-cookie'];
    
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      
      let hasSecure = false;
      let hasHttpOnly = false;
      let hasSameSite = false;
      
      for (const cookie of cookies) {
        if (cookie.includes('Secure')) hasSecure = true;
        if (cookie.includes('HttpOnly')) hasHttpOnly = true;
        if (cookie.includes('SameSite')) hasSameSite = true;
      }
      
      if (BASE_URL.startsWith('https://')) {
        if (hasSecure) {
          logTest('Cookie Secure flag', 'info', true, 'Cookies have Secure flag');
        } else {
          logTest('Cookie Secure flag', 'warning', false, 'Cookies missing Secure flag');
        }
      }
      
      if (hasHttpOnly) {
        logTest('Cookie HttpOnly flag', 'info', true, 'Cookies have HttpOnly flag');
      } else {
        logTest('Cookie HttpOnly flag', 'warning', false, 'Cookies missing HttpOnly flag (XSS risk)');
      }
      
      if (hasSameSite) {
        logTest('Cookie SameSite flag', 'info', true, 'Cookies have SameSite flag');
      } else {
        logTest('Cookie SameSite flag', 'warning', false, 'Cookies missing SameSite flag (CSRF risk)');
      }
    } else {
      logTest('Cookie security', 'info', true, 'No cookies set (may use token-based auth)');
    }
    
  } catch (error) {
    logTest('Authentication security', 'warning', false, error.message);
  }
}

/**
 * Test: Source Code Exposure
 */
async function testSourceCodeExposure() {
  console.log(`\n${colors.blue}=== Source Code Exposure Tests ===${colors.reset}\n`);
  
  const sensitiveFiles = [
    '/.git/config',
    '/.env',
    '/.env.local',
    '/package.json',
    '/tsconfig.json',
    '/.gitignore',
    '/README.md'
  ];
  
  for (const file of sensitiveFiles) {
    try {
      const response = await makeRequest(`${BASE_URL}${file}`);
      
      if (response.statusCode === 200) {
        logTest(`Source file exposure: ${file}`, 'warning', false, 'File is publicly accessible');
      } else {
        logTest(`Source file exposure: ${file}`, 'info', true, 'File not accessible');
      }
    } catch (error) {
      logTest(`Source file exposure: ${file}`, 'info', true, 'File not accessible');
    }
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}Security Audit Summary${colors.reset}`);
  console.log('='.repeat(60));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}Passed:${colors.reset}    ${results.passed}/${total} (${passRate}%)`);
  console.log(`${colors.red}Failed:${colors.reset}    ${results.failed}/${total}`);
  console.log(`${colors.magenta}Critical:${colors.reset}  ${results.critical}`);
  console.log(`${colors.yellow}Warnings:${colors.reset}  ${results.warnings}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (results.critical > 0) {
    console.log(`${colors.red}✗ CRITICAL ISSUES FOUND!${colors.reset}`);
    console.log(`${colors.cyan}Please fix critical issues before deploying to production.${colors.reset}`);
  } else if (results.failed > 0) {
    console.log(`${colors.yellow}⚠ Some security warnings found.${colors.reset}`);
    console.log(`${colors.cyan}Review warnings and improve security where possible.${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ No critical security issues found!${colors.reset}`);
    console.log(`${colors.cyan}Application passes basic security checks.${colors.reset}`);
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}Cinema Online - Security Audit${colors.reset}`);
  console.log(`${colors.cyan}Testing: ${BASE_URL}${colors.reset}\n`);
  
  // Run all tests
  await testSQLInjection();
  await testXSS();
  await testSecurityHeaders();
  await testEnvExposure();
  await testHTTPS();
  await testCORS();
  await testRateLimiting();
  await testAuthSecurity();
  await testSourceCodeExposure();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(results.critical > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
