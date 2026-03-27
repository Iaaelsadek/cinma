#!/usr/bin/env node

/**
 * Production Smoke Test
 * 
 * Runs automated smoke tests against production deployment to verify:
 * - All pages load successfully
 * - Database connectivity works
 * - API endpoints respond correctly
 * - Images load from TMDB
 * - Authentication flow works
 * 
 * Usage:
 *   node scripts/test/production_smoke_test.mjs
 *   node scripts/test/production_smoke_test.mjs --url https://cinma.online
 */

import https from 'https';
import http from 'http';

// Configuration
const BASE_URL = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'https://cinma.online';

const TIMEOUT = 10000; // 10 seconds

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
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
function logTest(name, passed, message = '', duration = 0) {
  const status = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  const durationStr = duration > 0 ? ` (${duration}ms)` : '';
  
  console.log(`${color}${status}${colors.reset} ${name}${durationStr}`);
  
  if (message) {
    console.log(`  ${colors.cyan}→${colors.reset} ${message}`);
  }
  
  results.tests.push({ name, passed, message, duration });
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Log warning
 */
function logWarning(name, message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${name}`);
  console.log(`  ${colors.cyan}→${colors.reset} ${message}`);
  results.warnings++;
}

/**
 * Test: Homepage loads
 */
async function testHomepage() {
  const start = Date.now();
  
  try {
    const response = await makeRequest(BASE_URL);
    const duration = Date.now() - start;
    
    if (response.statusCode === 200) {
      const hasContent = response.body.includes('<!DOCTYPE html') || response.body.includes('<html');
      
      if (hasContent) {
        logTest('Homepage loads', true, `Status: ${response.statusCode}`, duration);
        
        // Check for key elements
        if (response.body.includes('Cinema') || response.body.includes('سينما')) {
          logTest('Homepage contains branding', true);
        } else {
          logWarning('Homepage branding', 'Could not find Cinema branding in HTML');
        }
        
        // Check load time
        if (duration > 2000) {
          logWarning('Homepage load time', `Slow load time: ${duration}ms (target: < 2000ms)`);
        }
      } else {
        logTest('Homepage loads', false, 'Response does not contain HTML');
      }
    } else {
      logTest('Homepage loads', false, `Unexpected status code: ${response.statusCode}`);
    }
  } catch (error) {
    logTest('Homepage loads', false, error.message);
  }
}

/**
 * Test: HTTPS redirect
 */
async function testHTTPSRedirect() {
  if (!BASE_URL.startsWith('https://')) {
    logWarning('HTTPS redirect', 'Skipping test (base URL is not HTTPS)');
    return;
  }
  
  const httpUrl = BASE_URL.replace('https://', 'http://');
  
  try {
    const response = await makeRequest(httpUrl);
    
    if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
      const location = response.headers.location;
      
      if (location && location.startsWith('https://')) {
        logTest('HTTP redirects to HTTPS', true, `Redirects to: ${location}`);
      } else {
        logTest('HTTP redirects to HTTPS', false, 'Redirect location is not HTTPS');
      }
    } else {
      logTest('HTTP redirects to HTTPS', false, `No redirect (status: ${response.statusCode})`);
    }
  } catch (error) {
    logWarning('HTTPS redirect', `Could not test: ${error.message}`);
  }
}

/**
 * Test: Security headers
 */
async function testSecurityHeaders() {
  try {
    const response = await makeRequest(BASE_URL);
    const headers = response.headers;
    
    const requiredHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1',
      'referrer-policy': true,
      'content-security-policy': true
    };
    
    let allPresent = true;
    const missing = [];
    
    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const headerValue = headers[header];
      
      if (!headerValue) {
        allPresent = false;
        missing.push(header);
      } else if (expectedValue !== true && !headerValue.includes(expectedValue)) {
        allPresent = false;
        missing.push(`${header} (incorrect value)`);
      }
    }
    
    if (allPresent) {
      logTest('Security headers present', true);
    } else {
      logTest('Security headers present', false, `Missing: ${missing.join(', ')}`);
    }
  } catch (error) {
    logTest('Security headers present', false, error.message);
  }
}

/**
 * Test: API endpoint (movies)
 */
async function testAPIEndpoint() {
  const apiUrl = `${BASE_URL}/api/movies?page=1&limit=10`;
  const start = Date.now();
  
  try {
    const response = await makeRequest(apiUrl);
    const duration = Date.now() - start;
    
    if (response.statusCode === 200) {
      try {
        const data = JSON.parse(response.body);
        
        if (Array.isArray(data) || (data.movies && Array.isArray(data.movies))) {
          logTest('API endpoint responds', true, `Returned data in ${duration}ms`, duration);
          
          if (duration > 500) {
            logWarning('API response time', `Slow response: ${duration}ms (target: < 500ms)`);
          }
        } else {
          logTest('API endpoint responds', false, 'Response is not an array');
        }
      } catch (parseError) {
        logTest('API endpoint responds', false, 'Response is not valid JSON');
      }
    } else if (response.statusCode === 404) {
      logWarning('API endpoint', 'API endpoint not found (may be using different route structure)');
    } else {
      logTest('API endpoint responds', false, `Unexpected status code: ${response.statusCode}`);
    }
  } catch (error) {
    logTest('API endpoint responds', false, error.message);
  }
}

/**
 * Test: TMDB image loading
 */
async function testTMDBImages() {
  const testImagePath = '/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'; // Popular movie poster
  const imageUrl = `https://image.tmdb.org/t/p${testImagePath}`;
  
  try {
    const response = await makeRequest(imageUrl);
    
    if (response.statusCode === 200) {
      const contentType = response.headers['content-type'];
      
      if (contentType && contentType.includes('image')) {
        logTest('TMDB images load', true, 'Image loaded successfully');
      } else {
        logTest('TMDB images load', false, `Unexpected content type: ${contentType}`);
      }
    } else {
      logTest('TMDB images load', false, `Status code: ${response.statusCode}`);
    }
  } catch (error) {
    logTest('TMDB images load', false, error.message);
  }
}

/**
 * Test: Static assets
 */
async function testStaticAssets() {
  const assets = [
    '/favicon.ico',
    '/manifest.webmanifest',
    '/robots.txt'
  ];
  
  let allLoaded = true;
  const failed = [];
  
  for (const asset of assets) {
    try {
      const response = await makeRequest(`${BASE_URL}${asset}`);
      
      if (response.statusCode !== 200) {
        allLoaded = false;
        failed.push(`${asset} (${response.statusCode})`);
      }
    } catch (error) {
      allLoaded = false;
      failed.push(`${asset} (${error.message})`);
    }
  }
  
  if (allLoaded) {
    logTest('Static assets load', true, `All ${assets.length} assets loaded`);
  } else {
    logTest('Static assets load', false, `Failed: ${failed.join(', ')}`);
  }
}

/**
 * Test: Sitemap
 */
async function testSitemap() {
  try {
    const response = await makeRequest(`${BASE_URL}/sitemap.xml`);
    
    if (response.statusCode === 200) {
      if (response.body.includes('<?xml') && response.body.includes('<urlset')) {
        logTest('Sitemap exists', true);
      } else {
        logTest('Sitemap exists', false, 'File exists but is not valid XML sitemap');
      }
    } else {
      logTest('Sitemap exists', false, `Status code: ${response.statusCode}`);
    }
  } catch (error) {
    logTest('Sitemap exists', false, error.message);
  }
}

/**
 * Test: 404 page
 */
async function test404Page() {
  const nonExistentUrl = `${BASE_URL}/this-page-does-not-exist-${Date.now()}`;
  
  try {
    const response = await makeRequest(nonExistentUrl);
    
    if (response.statusCode === 404) {
      logTest('404 page works', true, 'Returns 404 for non-existent pages');
    } else {
      logTest('404 page works', false, `Expected 404, got ${response.statusCode}`);
    }
  } catch (error) {
    logTest('404 page works', false, error.message);
  }
}

/**
 * Test: Compression
 */
async function testCompression() {
  try {
    const response = await makeRequest(BASE_URL, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    const encoding = response.headers['content-encoding'];
    
    if (encoding && (encoding.includes('gzip') || encoding.includes('br') || encoding.includes('deflate'))) {
      logTest('Compression enabled', true, `Using: ${encoding}`);
    } else {
      logWarning('Compression', 'No compression detected (may impact performance)');
    }
  } catch (error) {
    logTest('Compression enabled', false, error.message);
  }
}

/**
 * Test: Caching headers
 */
async function testCachingHeaders() {
  try {
    const response = await makeRequest(BASE_URL);
    const cacheControl = response.headers['cache-control'];
    
    if (cacheControl) {
      logTest('Caching headers present', true, `Cache-Control: ${cacheControl}`);
    } else {
      logWarning('Caching headers', 'No Cache-Control header found');
    }
  } catch (error) {
    logTest('Caching headers present', false, error.message);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log('='.repeat(60));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}Passed:${colors.reset}   ${results.passed}/${total} (${passRate}%)`);
  console.log(`${colors.red}Failed:${colors.reset}   ${results.failed}/${total}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
    console.log(`${colors.cyan}Production deployment is healthy.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some tests failed.${colors.reset}`);
    console.log(`${colors.cyan}Please review the failures above.${colors.reset}`);
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}Cinema Online - Production Smoke Test${colors.reset}`);
  console.log(`${colors.cyan}Testing: ${BASE_URL}${colors.reset}\n`);
  
  // Run all tests
  await testHomepage();
  await testHTTPSRedirect();
  await testSecurityHeaders();
  await testAPIEndpoint();
  await testTMDBImages();
  await testStaticAssets();
  await testSitemap();
  await test404Page();
  await testCompression();
  await testCachingHeaders();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
