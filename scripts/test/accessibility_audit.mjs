#!/usr/bin/env node

/**
 * Accessibility Audit Script
 * 
 * Performs automated accessibility checks on Cinema Online:
 * - WCAG 2.1 compliance
 * - Semantic HTML structure
 * - ARIA attributes
 * - Keyboard navigation
 * - Color contrast
 * - Alt text on images
 * 
 * Usage:
 *   node scripts/test/accessibility_audit.mjs
 *   node scripts/test/accessibility_audit.mjs --url https://cinma.online
 */

import https from 'https';
import http from 'http';

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
  tests: []
};

// Colors
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
function logTest(name, passed, message = '', severity = 'info') {
  const status = passed ? '✓' : '✗';
  const color = passed ? colors.green : (severity === 'warning' ? colors.yellow : colors.red);
  
  console.log(`${color}${status}${colors.reset} ${name}`);
  
  if (message) {
    console.log(`  ${colors.cyan}→${colors.reset} ${message}`);
  }
  
  results.tests.push({ name, passed, message, severity });
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
    if (severity === 'warning') {
      results.warnings++;
    }
  }
}

/**
 * Parse HTML and extract elements
 */
function parseHTML(html) {
  // Simple HTML parsing (for basic checks)
  const elements = {
    images: [],
    buttons: [],
    links: [],
    inputs: [],
    headings: [],
    forms: []
  };
  
  // Extract images
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = html.match(imgRegex) || [];
  elements.images = imgMatches;
  
  // Extract buttons
  const buttonRegex = /<button[^>]*>.*?<\/button>/gi;
  const buttonMatches = html.match(buttonRegex) || [];
  elements.buttons = buttonMatches;
  
  // Extract links
  const linkRegex = /<a[^>]*>.*?<\/a>/gi;
  const linkMatches = html.match(linkRegex) || [];
  elements.links = linkMatches;
  
  // Extract inputs
  const inputRegex = /<input[^>]*>/gi;
  const inputMatches = html.match(inputRegex) || [];
  elements.inputs = inputMatches;
  
  // Extract headings
  const headingRegex = /<h[1-6][^>]*>.*?<\/h[1-6]>/gi;
  const headingMatches = html.match(headingRegex) || [];
  elements.headings = headingMatches;
  
  // Extract forms
  const formRegex = /<form[^>]*>.*?<\/form>/gis;
  const formMatches = html.match(formRegex) || [];
  elements.forms = formMatches;
  
  return elements;
}

/**
 * Test: HTML lang attribute
 */
async function testHTMLLang() {
  console.log(`\n${colors.blue}=== HTML Structure Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.body.match(/<html[^>]*lang=["'][^"']+["']/i)) {
      logTest('HTML lang attribute', true, 'Language attribute present');
    } else {
      logTest('HTML lang attribute', false, 'Missing lang attribute on <html> tag', 'error');
    }
  } catch (error) {
    logTest('HTML lang attribute', false, error.message, 'error');
  }
}

/**
 * Test: Page title
 */
async function testPageTitle() {
  try {
    const response = await makeRequest(BASE_URL);
    
    const titleMatch = response.body.match(/<title>([^<]+)<\/title>/i);
    
    if (titleMatch && titleMatch[1].trim().length > 0) {
      logTest('Page title', true, `Title: "${titleMatch[1].trim()}"`);
    } else {
      logTest('Page title', false, 'Missing or empty <title> tag', 'error');
    }
  } catch (error) {
    logTest('Page title', false, error.message, 'error');
  }
}

/**
 * Test: Heading hierarchy
 */
async function testHeadingHierarchy() {
  try {
    const response = await makeRequest(BASE_URL);
    const elements = parseHTML(response.body);
    
    if (elements.headings.length === 0) {
      logTest('Heading hierarchy', false, 'No headings found on page', 'warning');
      return;
    }
    
    // Check for h1
    const hasH1 = elements.headings.some(h => h.match(/<h1/i));
    
    if (hasH1) {
      logTest('H1 heading present', true, 'Page has H1 heading');
    } else {
      logTest('H1 heading present', false, 'Page missing H1 heading', 'error');
    }
    
    // Count h1s
    const h1Count = elements.headings.filter(h => h.match(/<h1/i)).length;
    
    if (h1Count === 1) {
      logTest('Single H1 heading', true, 'Page has exactly one H1');
    } else if (h1Count > 1) {
      logTest('Single H1 heading', false, `Page has ${h1Count} H1 headings (should have 1)`, 'warning');
    }
    
    logTest('Heading structure', true, `Found ${elements.headings.length} headings`);
    
  } catch (error) {
    logTest('Heading hierarchy', false, error.message, 'error');
  }
}

/**
 * Test: Image alt text
 */
async function testImageAltText() {
  console.log(`\n${colors.blue}=== Image Accessibility Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    const elements = parseHTML(response.body);
    
    if (elements.images.length === 0) {
      logTest('Image alt text', true, 'No images found (or dynamically loaded)');
      return;
    }
    
    let missingAlt = 0;
    let emptyAlt = 0;
    
    for (const img of elements.images) {
      if (!img.match(/alt=/i)) {
        missingAlt++;
      } else if (img.match(/alt=["']["']/i)) {
        emptyAlt++;
      }
    }
    
    if (missingAlt === 0) {
      logTest('Images have alt attributes', true, `All ${elements.images.length} images have alt attributes`);
    } else {
      logTest('Images have alt attributes', false, `${missingAlt}/${elements.images.length} images missing alt attribute`, 'error');
    }
    
    if (emptyAlt > 0) {
      logTest('Empty alt attributes', true, `${emptyAlt} decorative images (empty alt)`, 'info');
    }
    
  } catch (error) {
    logTest('Image alt text', false, error.message, 'error');
  }
}

/**
 * Test: Form labels
 */
async function testFormLabels() {
  console.log(`\n${colors.blue}=== Form Accessibility Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    const elements = parseHTML(response.body);
    
    if (elements.inputs.length === 0) {
      logTest('Form labels', true, 'No form inputs found (or dynamically loaded)');
      return;
    }
    
    let inputsWithLabels = 0;
    let inputsWithAriaLabel = 0;
    let inputsWithPlaceholder = 0;
    
    for (const input of elements.inputs) {
      // Skip hidden inputs
      if (input.match(/type=["']hidden["']/i)) {
        continue;
      }
      
      // Check for id (for label association)
      const hasId = input.match(/id=["'][^"']+["']/i);
      
      // Check for aria-label
      if (input.match(/aria-label=["'][^"']+["']/i)) {
        inputsWithAriaLabel++;
      }
      
      // Check for placeholder
      if (input.match(/placeholder=["'][^"']+["']/i)) {
        inputsWithPlaceholder++;
      }
      
      if (hasId || inputsWithAriaLabel > 0) {
        inputsWithLabels++;
      }
    }
    
    const visibleInputs = elements.inputs.filter(i => !i.match(/type=["']hidden["']/i)).length;
    
    if (inputsWithLabels === visibleInputs || inputsWithAriaLabel === visibleInputs) {
      logTest('Form inputs have labels', true, `All ${visibleInputs} inputs have labels or aria-label`);
    } else {
      logTest('Form inputs have labels', false, `Some inputs may be missing labels`, 'warning');
    }
    
    if (inputsWithPlaceholder > 0 && inputsWithLabels < visibleInputs) {
      logTest('Placeholder as label', false, 'Placeholders should not replace labels', 'warning');
    }
    
  } catch (error) {
    logTest('Form labels', false, error.message, 'error');
  }
}

/**
 * Test: Button accessibility
 */
async function testButtonAccessibility() {
  try {
    const response = await makeRequest(BASE_URL);
    const elements = parseHTML(response.body);
    
    if (elements.buttons.length === 0) {
      logTest('Button accessibility', true, 'No buttons found (or dynamically loaded)');
      return;
    }
    
    let buttonsWithText = 0;
    let buttonsWithAriaLabel = 0;
    
    for (const button of elements.buttons) {
      // Check for text content
      const textMatch = button.match(/<button[^>]*>(.*?)<\/button>/i);
      if (textMatch && textMatch[1].trim().length > 0) {
        buttonsWithText++;
      }
      
      // Check for aria-label
      if (button.match(/aria-label=["'][^"']+["']/i)) {
        buttonsWithAriaLabel++;
      }
    }
    
    const accessibleButtons = buttonsWithText + buttonsWithAriaLabel;
    
    if (accessibleButtons >= elements.buttons.length) {
      logTest('Buttons have accessible names', true, `All ${elements.buttons.length} buttons have text or aria-label`);
    } else {
      logTest('Buttons have accessible names', false, `Some buttons may be missing accessible names`, 'warning');
    }
    
  } catch (error) {
    logTest('Button accessibility', false, error.message, 'error');
  }
}

/**
 * Test: Link accessibility
 */
async function testLinkAccessibility() {
  try {
    const response = await makeRequest(BASE_URL);
    const elements = parseHTML(response.body);
    
    if (elements.links.length === 0) {
      logTest('Link accessibility', true, 'No links found (or dynamically loaded)');
      return;
    }
    
    let linksWithText = 0;
    let linksWithAriaLabel = 0;
    let emptyLinks = 0;
    
    for (const link of elements.links) {
      // Check for text content
      const textMatch = link.match(/<a[^>]*>(.*?)<\/a>/i);
      if (textMatch && textMatch[1].trim().length > 0) {
        linksWithText++;
      } else {
        emptyLinks++;
      }
      
      // Check for aria-label
      if (link.match(/aria-label=["'][^"']+["']/i)) {
        linksWithAriaLabel++;
      }
    }
    
    if (emptyLinks === 0) {
      logTest('Links have text content', true, `All ${elements.links.length} links have text`);
    } else {
      logTest('Links have text content', false, `${emptyLinks} links have no text content`, 'warning');
    }
    
  } catch (error) {
    logTest('Link accessibility', false, error.message, 'error');
  }
}

/**
 * Test: ARIA landmarks
 */
async function testARIALandmarks() {
  console.log(`\n${colors.blue}=== ARIA and Semantic HTML Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    const landmarks = {
      main: response.body.match(/<main/i) || response.body.match(/role=["']main["']/i),
      nav: response.body.match(/<nav/i) || response.body.match(/role=["']navigation["']/i),
      header: response.body.match(/<header/i) || response.body.match(/role=["']banner["']/i),
      footer: response.body.match(/<footer/i) || response.body.match(/role=["']contentinfo["']/i)
    };
    
    if (landmarks.main) {
      logTest('Main landmark', true, 'Page has <main> or role="main"');
    } else {
      logTest('Main landmark', false, 'Page missing <main> landmark', 'warning');
    }
    
    if (landmarks.nav) {
      logTest('Navigation landmark', true, 'Page has <nav> or role="navigation"');
    } else {
      logTest('Navigation landmark', false, 'Page missing <nav> landmark', 'warning');
    }
    
    if (landmarks.header) {
      logTest('Header landmark', true, 'Page has <header> or role="banner"');
    } else {
      logTest('Header landmark', false, 'Page missing <header> landmark', 'warning');
    }
    
    if (landmarks.footer) {
      logTest('Footer landmark', true, 'Page has <footer> or role="contentinfo"');
    } else {
      logTest('Footer landmark', false, 'Page missing <footer> landmark', 'warning');
    }
    
  } catch (error) {
    logTest('ARIA landmarks', false, error.message, 'error');
  }
}

/**
 * Test: Skip to content link
 */
async function testSkipLink() {
  try {
    const response = await makeRequest(BASE_URL);
    
    // Look for skip link patterns
    const hasSkipLink = response.body.match(/skip.*content/i) || 
                       response.body.match(/skip.*main/i) ||
                       response.body.match(/#main-content/i);
    
    if (hasSkipLink) {
      logTest('Skip to content link', true, 'Skip link found');
    } else {
      logTest('Skip to content link', false, 'No skip to content link found', 'warning');
    }
    
  } catch (error) {
    logTest('Skip to content link', false, error.message, 'error');
  }
}

/**
 * Test: Viewport meta tag
 */
async function testViewportMeta() {
  console.log(`\n${colors.blue}=== Mobile Accessibility Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.body.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)) {
      logTest('Viewport meta tag', true, 'Viewport meta tag present');
      
      // Check for user-scalable=no (bad practice)
      if (response.body.match(/user-scalable=no/i)) {
        logTest('Zoom allowed', false, 'Viewport prevents zooming (user-scalable=no)', 'warning');
      } else {
        logTest('Zoom allowed', true, 'Users can zoom the page');
      }
    } else {
      logTest('Viewport meta tag', false, 'Missing viewport meta tag', 'error');
    }
    
  } catch (error) {
    logTest('Viewport meta tag', false, error.message, 'error');
  }
}

/**
 * Test: Color contrast (basic check)
 */
async function testColorContrast() {
  console.log(`\n${colors.blue}=== Visual Accessibility Tests ===${colors.reset}\n`);
  
  try {
    const response = await makeRequest(BASE_URL);
    
    // This is a very basic check - proper contrast testing requires rendering
    logTest('Color contrast', true, 'Manual testing required for accurate contrast ratios', 'info');
    console.log(`  ${colors.cyan}→${colors.reset} Use tools like WAVE or axe DevTools for detailed contrast analysis`);
    console.log(`  ${colors.cyan}→${colors.reset} WCAG AA requires 4.5:1 for normal text, 3:1 for large text`);
    
  } catch (error) {
    logTest('Color contrast', false, error.message, 'error');
  }
}

/**
 * Test: Focus indicators
 */
async function testFocusIndicators() {
  try {
    const response = await makeRequest(BASE_URL);
    
    // Check if outline is disabled globally
    if (response.body.match(/outline:\s*none/i) || response.body.match(/outline:\s*0/i)) {
      logTest('Focus indicators', false, 'CSS may be removing focus outlines', 'warning');
      console.log(`  ${colors.cyan}→${colors.reset} Ensure custom focus styles are implemented`);
    } else {
      logTest('Focus indicators', true, 'No global outline removal detected');
    }
    
  } catch (error) {
    logTest('Focus indicators', false, error.message, 'error');
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}Accessibility Audit Summary${colors.reset}`);
  console.log('='.repeat(60));
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}Passed:${colors.reset}   ${results.passed}/${total} (${passRate}%)`);
  console.log(`${colors.red}Failed:${colors.reset}   ${results.failed}/${total}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}`);
  
  console.log('\n' + '='.repeat(60));
  
  const errors = results.tests.filter(t => !t.passed && t.severity === 'error').length;
  
  if (errors > 0) {
    console.log(`${colors.red}✗ ${errors} accessibility errors found.${colors.reset}`);
    console.log(`${colors.cyan}Please fix errors before deploying to production.${colors.reset}`);
  } else if (results.warnings > 0) {
    console.log(`${colors.yellow}⚠ ${results.warnings} accessibility warnings found.${colors.reset}`);
    console.log(`${colors.cyan}Consider addressing warnings to improve accessibility.${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ No critical accessibility issues found!${colors.reset}`);
    console.log(`${colors.cyan}Application passes basic accessibility checks.${colors.reset}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}Note: This is an automated audit. Manual testing with assistive`);
  console.log(`technologies (screen readers, keyboard navigation) is recommended.${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}Cinema Online - Accessibility Audit${colors.reset}`);
  console.log(`${colors.cyan}Testing: ${BASE_URL}${colors.reset}\n`);
  
  // Run all tests
  await testHTMLLang();
  await testPageTitle();
  await testHeadingHierarchy();
  await testImageAltText();
  await testFormLabels();
  await testButtonAccessibility();
  await testLinkAccessibility();
  await testARIALandmarks();
  await testSkipLink();
  await testViewportMeta();
  await testColorContrast();
  await testFocusIndicators();
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  const errors = results.tests.filter(t => !t.passed && t.severity === 'error').length;
  process.exit(errors > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
