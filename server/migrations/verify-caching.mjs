/**
 * Checkpoint 10: Verify API caching implementation
 * Requirements: 13.1-13.7, 4.1-4.10
 */

import { readFileSync } from 'fs';
import { generateCacheKey } from '../lib/cacheKey.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name}`); failed++; }
}

const home = readFileSync('server/routes/home.js', 'utf8');
const content = readFileSync('server/routes/content.js', 'utf8');
const cacheKeyFile = readFileSync('server/lib/cacheKey.js', 'utf8');

console.log('📋 Test 1: home.js caching (Requirements 4.1, 4.2, 4.7, 4.10, 5.1-5.5)');
check('NodeCache imported', home.includes("import NodeCache from 'node-cache'"));
check('5-minute TTL (stdTTL: 300)', home.includes('stdTTL: 300'));
check('cache.get check on request', home.includes('cache.get(cacheKey)'));
check('cache.set on cache miss', home.includes('cache.set(cacheKey'));
check('_cache.hit: true on cache hit', home.includes('hit: true'));
check('_cache.hit: false on cache miss', home.includes('hit: false'));
check('responseTime in _cache metadata', home.includes('responseTime'));
check('ttl in _cache metadata', home.includes('cache.getTtl'));
check('warn on slow cached response (>20ms)', home.includes('responseTime > 20'));
check('warn on slow first request (>50ms)', home.includes('responseTime > 50'));

console.log('\n📋 Test 2: content.js /api/movies caching (Requirements 4.3, 4.4, 4.8, 4.10)');
check('NodeCache imported in content.js', content.includes("import NodeCache from 'node-cache'"));
check('movies cache key includes query params', content.includes('movies:${page}:${limit}'));
check('movies cache.get check', content.includes('cache.get(cacheKey)'));
check('movies cache.set on miss', content.includes('cache.set(cacheKey'));
check('movies _cache hit metadata', content.includes('hit: true'));
check('movies _cache miss with responseTime', content.includes('responseTime: Date.now() - startTime'));

console.log('\n📋 Test 3: content.js /api/tv caching (Requirements 4.5, 4.6, 4.8, 4.10)');
check('tv cache key includes query params', content.includes('tv:${page}:${limit}'));
check('tv cache hit returned', content.includes("_cache: { hit: true, responseTime: Date.now() - startTime }"));

console.log('\n📋 Test 4: generateCacheKey utility (Requirement 4.8)');
check('function exported', cacheKeyFile.includes('export function generateCacheKey'));
check('sorts params alphabetically', cacheKeyFile.includes('.sort()'));
check('joins with pipe separator', cacheKeyFile.includes(".join('|')"));
check('returns endpoint:params format', cacheKeyFile.includes('`${endpoint}:${sortedParams}`'));

// Functional tests
check('same params diff order -> same key',
  generateCacheKey('movies', { page: 1, genre: 'action' }) ===
  generateCacheKey('movies', { genre: 'action', page: 1 })
);
check('diff params -> diff keys',
  generateCacheKey('movies', { page: 1 }) !== generateCacheKey('movies', { page: 2 })
);
check('empty params -> "home:"', generateCacheKey('home', {}) === 'home:');
check('single param format correct', generateCacheKey('movies', { page: 1 }) === 'movies:page:1');
check('multi param sorted format',
  generateCacheKey('movies', { genre: 'action', page: 1 }) === 'movies:genre:action|page:1'
);

console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✨ Checkpoint 10 PASSED - API caching fully verified!');
} else {
  console.error(`❌ Checkpoint 10 FAILED - ${failed} test(s) failed`);
  process.exit(1);
}
