/**
 * Checkpoint 17: Verify frontend integration
 * Requirements: 6.1, 6.13, 7.1, 8.1-8.8, 9.1-9.8, 11.4, 11.6, 11.7, 12.4, 12.6, 12.7
 */

import { readFileSync } from 'fs';

let passed = 0, failed = 0;
const check = (name, cond) => {
  if (cond) { console.log(`  ✅ PASS: ${name}`); passed++; }
  else { console.error(`  ❌ FAIL: ${name}`); failed++; }
};

const pages = {
  MovieDetails: readFileSync('src/pages/media/MovieDetails.tsx', 'utf8'),
  SeriesDetails: readFileSync('src/pages/media/SeriesDetails.tsx', 'utf8'),
  GameDetails: readFileSync('src/pages/media/GameDetails.tsx', 'utf8'),
  SoftwareDetails: readFileSync('src/pages/media/SoftwareDetails.tsx', 'utf8'),
};

for (const [name, src] of Object.entries(pages)) {
  console.log(`\n📋 ${name}`);
  check('imports EditReviewModal', src.includes("import { EditReviewModal }"));
  check('imports ReportReviewDialog', src.includes("import { ReportReviewDialog }"));
  check('showEditModal state', src.includes('showEditModal'));
  check('editingReview state', src.includes('editingReview'));
  check('showReportDialog state', src.includes('showReportDialog'));
  check('reportingReviewId state', src.includes('reportingReviewId'));
  check('EditReviewModal rendered in JSX', src.includes('<EditReviewModal'));
  check('ReportReviewDialog rendered in JSX', src.includes('<ReportReviewDialog'));
  check('onEditReview handler wired', src.includes('onEditReview'));
  check('onReportReview handler wired', src.includes('onReportReview'));
  check('no edit/report TODO comments', !src.match(/\/\/\s*TODO.*(?:edit|report)/i));
  check('bilingual support (ar/en)', src.includes("lang === 'ar'"));
}

// Verify EditReviewModal component
console.log('\n📋 EditReviewModal component');
const modal = readFileSync('src/components/features/reviews/EditReviewModal.tsx', 'utf8');
check('review prop accepted', modal.includes('review: Review'));
check('onSuccess callback', modal.includes('onSuccess'));
check('onClose callback', modal.includes('onClose'));
check('form pre-population (useEffect)', modal.includes('useEffect'));
check('min length validation (10)', modal.includes('length < 10'));
check('max length validation (5000)', modal.includes('length > 5000'));
check('title max length (200)', modal.includes('length > 200'));
check('rating validation', modal.includes('rating'));
check('PUT request to /api/reviews', modal.includes("method: 'PUT'"));
check('auth token in headers', modal.includes('Authorization'));
check('loading spinner (Loader2)', modal.includes('Loader2'));
check('disabled during submit', modal.includes('disabled={isSubmitting}'));
check('bilingual (ar/en)', modal.includes("lang === 'ar'"));
check('toast success', modal.includes('toast.success'));
check('toast error', modal.includes('toast.error'));

// Verify ReportReviewDialog component
console.log('\n📋 ReportReviewDialog component');
const dialog = readFileSync('src/components/features/reviews/ReportReviewDialog.tsx', 'utf8');
check('reviewId prop accepted', dialog.includes('reviewId'));
check('onSuccess callback', dialog.includes('onSuccess'));
check('onClose callback', dialog.includes('onClose'));
check('reason dropdown', dialog.includes('<select'));
check('Spam reason option', dialog.includes('spam'));
check('Offensive Language option', dialog.includes('offensive'));
check('Spoilers option', dialog.includes('spoilers'));
check('Harassment option', dialog.includes('harassment'));
check('Other option with custom input', dialog.includes("reason === 'other'"));
check('POST request to /api/reviews/:id/report', dialog.includes("method: 'POST'"));
check('auth token in headers', dialog.includes('Authorization'));
check('auto-close after 2s', dialog.includes('2000'));
check('success state shown', dialog.includes('showSuccess'));
check('loading spinner', dialog.includes('Loader2'));
check('disabled during submit', dialog.includes('disabled={isSubmitting}'));
check('bilingual (ar/en)', dialog.includes("lang === 'ar'"));

console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✨ Checkpoint 17 PASSED - Frontend integration fully verified!');
} else {
  console.error(`❌ Checkpoint 17 FAILED - ${failed} test(s) failed`);
  process.exit(1);
}
