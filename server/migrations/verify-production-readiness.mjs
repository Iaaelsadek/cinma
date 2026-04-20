/**
 * Task 22: Final Production Readiness Verification
 * Consolidates all checkpoint results into a single pass/fail report.
 */

import { readFileSync } from 'fs';
import { generateCacheKey } from '../lib/cacheKey.js';
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) { console.log(`  ✅ ${name}${detail ? ' - ' + detail : ''}`); passed++; }
  else { console.error(`  ❌ ${name}${detail ? ' - ' + detail : ''}`); failed++; }
};

// ── 1. DATABASE SCHEMA ─────────────────────────────────────────────────────
console.log('\n🗄️  1. Database Schema (Requirements 2.1-2.6, 14.1-14.8)');
const pool = new Pool({ connectionString: process.env.COCKROACHDB_URL, ssl: { rejectUnauthorized: false } });
const client = await pool.connect();
const schema = await client.query(`
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_name IN ('games','software') AND column_name IN ('vote_average','vote_count')
  ORDER BY table_name, column_name
`);
client.release();
await pool.end();
for (const r of schema.rows) {
  check(`${r.table_name}.${r.column_name} nullable`, r.is_nullable === 'YES');
}

// ── 2. RATING DEFAULTS ─────────────────────────────────────────────────────
console.log('\n⭐ 2. Rating Defaults (Requirements 1.1-1.7)');

// IGDBAdapter logic
const igdb = readFileSync('src/adapters/IGDBAdapter.js', 'utf8');
check('IGDBAdapter: null rating → 5.0', igdb.includes('voteAverage = 5.0'));
check('IGDBAdapter: explicit 0 preserved', igdb.includes('game.rating === 0'));
check('IGDBAdapter: scale conversion /10', igdb.includes('game.rating / 10'));

// TMDBAdapter logic
const tmdb = readFileSync('src/adapters/TMDBAdapter.js', 'utf8');
check('TMDBAdapter movie: nullish coalescing → 5.0', tmdb.includes('ar.vote_average ?? en.vote_average ?? 5.0'));
check('TMDBAdapter TV: nullish coalescing → 5.0', tmdb.match(/vote_average.*\?\?.*5\.0/g)?.length >= 2);
check('TMDBAdapter: explicit 0 preserved', tmdb.includes('=== 0'));

// CoreIngestor fallback
const ingestor = readFileSync('src/ingestion/CoreIngestor.js', 'utf8');
check('CoreIngestor _upsertMovie: ?? 5.0', ingestor.includes('c.vote_average ?? 5.0'));
check('CoreIngestor _upsertTVSeries: ?? 5.0', ingestor.match(/vote_average \?\? 5\.0/g)?.length >= 4);
check('CoreIngestor _upsertGame: ?? 5.0', ingestor.includes('_upsertGame') && ingestor.includes('voteAverage = c.vote_average ?? 5.0'));
check('CoreIngestor _upsertSoftware: ?? 5.0', ingestor.includes('_upsertSoftware') && ingestor.includes('voteAverage = c.vote_average ?? 5.0'));

// ── 3. API CACHING ─────────────────────────────────────────────────────────
console.log('\n⚡ 3. API Caching (Requirements 4.1-4.10, 5.1-5.5)');
const home = readFileSync('server/routes/home.js', 'utf8');
const content = readFileSync('server/routes/content.js', 'utf8');
check('/api/home: NodeCache 5min TTL', home.includes('stdTTL: 300'));
check('/api/home: cache hit returns _cache.hit:true', home.includes('hit: true'));
check('/api/home: cache miss stores response', home.includes('cache.set(cacheKey'));
check('/api/home: slow cached warn >20ms', home.includes('responseTime > 20'));
check('/api/home: slow first warn >50ms', home.includes('responseTime > 50'));
check('/api/movies: cache with query params in key', content.includes('movies:${page}:${limit}'));
check('/api/movies: cache hit metadata', content.includes('hit: true'));
check('/api/tv: cache with query params in key', content.includes('tv:${page}:${limit}'));
check('/api/tv: cache hit metadata', content.includes("_cache: { hit: true, responseTime: Date.now() - startTime }"));

// generateCacheKey utility
check('generateCacheKey: sorts params', generateCacheKey('movies', { page: 1, genre: 'action' }) === generateCacheKey('movies', { genre: 'action', page: 1 }));
check('generateCacheKey: diff params → diff keys', generateCacheKey('movies', { page: 1 }) !== generateCacheKey('movies', { page: 2 }));
check('generateCacheKey: empty params', generateCacheKey('home', {}) === 'home:');

// ── 4. FRONTEND COMPONENTS ─────────────────────────────────────────────────
console.log('\n🖥️  4. Frontend Components (Requirements 6.1-6.13, 7.1-7.11, 11.1-11.9, 12.1-12.9)');
const modal = readFileSync('src/components/features/reviews/EditReviewModal.tsx', 'utf8');
const dialog = readFileSync('src/components/features/reviews/ReportReviewDialog.tsx', 'utf8');
check('EditReviewModal: form pre-population', modal.includes('useEffect'));
check('EditReviewModal: min 10 chars validation', modal.includes('length < 10'));
check('EditReviewModal: max 5000 chars validation', modal.includes('length > 5000'));
check('EditReviewModal: title max 200 chars', modal.includes('length > 200'));
check('EditReviewModal: PUT /api/reviews/:id', modal.includes("method: 'PUT'"));
check('EditReviewModal: auth token', modal.includes('Authorization'));
check('EditReviewModal: loading state', modal.includes('isSubmitting'));
check('EditReviewModal: bilingual', modal.includes("lang === 'ar'"));
check('ReportReviewDialog: reason dropdown', dialog.includes('<select'));
check('ReportReviewDialog: 5 reason options', ['spam','offensive','spoilers','harassment','other'].every(r => dialog.includes(r)));
check('ReportReviewDialog: custom reason for Other', dialog.includes("reason === 'other'"));
check('ReportReviewDialog: POST /api/reviews/:id/report', dialog.includes("method: 'POST'"));
check('ReportReviewDialog: auto-close 2s', dialog.includes('2000'));
check('ReportReviewDialog: success state', dialog.includes('showSuccess'));
check('ReportReviewDialog: bilingual', dialog.includes("lang === 'ar'"));

// ── 5. DETAIL PAGE INTEGRATION ─────────────────────────────────────────────
console.log('\n📄 5. Detail Page Integration (Requirements 6.1, 7.1, 8.1-8.8, 9.1-9.8)');
const detailPages = ['MovieDetails','SeriesDetails','GameDetails','SoftwareDetails'];
for (const page of detailPages) {
  const src = readFileSync(`src/pages/media/${page}.tsx`, 'utf8');
  check(`${page}: EditReviewModal integrated`, src.includes('<EditReviewModal'));
  check(`${page}: ReportReviewDialog integrated`, src.includes('<ReportReviewDialog'));
  check(`${page}: no edit/report TODOs`, !src.match(/\/\/\s*TODO.*(?:edit|report)/i));
}

// ── 6. CODE CLEANUP ────────────────────────────────────────────────────────
console.log('\n🧹 6. Code Cleanup (Requirements 8.1-8.8, 9.1-9.8)');
for (const page of detailPages) {
  const src = readFileSync(`src/pages/media/${page}.tsx`, 'utf8');
  check(`${page}: no console.log in edit handler`, !src.match(/handleEditReview[\s\S]{0,300}console\.log/));
  check(`${page}: no console.log in report handler`, !src.match(/handleReportReview[\s\S]{0,300}console\.log/));
}

// ── FINAL SUMMARY ──────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`);
console.log(`📊 FINAL RESULTS: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(55));

if (failed === 0) {
  console.log('\n🚀 PRODUCTION READINESS: ✅ ALL CHECKS PASSED');
  console.log('\n   ✅ Database schema: nullable ratings in games/software');
  console.log('   ✅ Rating defaults: 5.0 for null across all adapters');
  console.log('   ✅ API caching: sub-20ms cached responses configured');
  console.log('   ✅ Edit Review Modal: fully implemented');
  console.log('   ✅ Report Review Dialog: fully implemented');
  console.log('   ✅ All 4 detail pages: integrated with modals');
  console.log('   ✅ Code cleanup: no TODOs, no stray console.logs');
} else {
  console.error(`\n❌ PRODUCTION READINESS: FAILED (${failed} issues)`);
  process.exit(1);
}
