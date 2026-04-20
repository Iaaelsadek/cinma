# Implementation Plan

## Overview
Fix the `bulkInsertSEOKeywords` function across all 5 ULTRA_FAST ingestion scripts to handle missing partial index `keywords_name_seo_idx` by implementing a try-catch fallback mechanism.

---

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Partial Index Missing Error
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with database state where partial index `keywords_name_seo_idx` does not exist
  - Create test database without partial index `keywords_name_seo_idx`
  - Test that `bulkInsertSEOKeywords` with 10 SEO keywords throws error "there is no unique or exclusion constraint"
  - Verify zero keywords inserted into database despite non-empty keywords array
  - Verify keywordCache remains empty for the attempted keywords
  - Verify movie_keywords table has no entries for the content
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Optimal Path When Index Exists
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code with partial index present
  - Test that when partial index exists, INSERT with `ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING` succeeds
  - Test that keywordCache is updated correctly after successful insertion
  - Test that movie_keywords entries are created correctly
  - Test that empty keywords array returns early without queries
  - Write property-based tests capturing observed behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for bulkInsertSEOKeywords partial index fallback

  - [x] 3.1 Implement the fix in all 5 ULTRA_FAST scripts
    - Update `scripts/ingestion/02_seed_movies_arabic_ULTRA_FAST.js`
    - Update `scripts/ingestion/03_seed_movies_foreign_ULTRA_FAST.js`
    - Update `scripts/ingestion/04_seed_tv_series_ULTRA_FAST.js`
    - Update `scripts/ingestion/05_seed_anime_ULTRA_FAST.js`
    - Update `scripts/ingestion/00_SPEED_TEST.js`
    - Wrap INSERT query with `ON CONFLICT (name) WHERE tmdb_id IS NULL` in try block
    - Add catch block to detect "there is no unique or exclusion constraint" error
    - Implement fallback: `ON CONFLICT (name) DO UPDATE SET updated_at = NOW()`
    - Rethrow other errors to preserve error handling
    - Maintain existing cache and linking logic unchanged
    - _Bug_Condition: isBugCondition(input) where NOT indexExists('keywords_name_seo_idx') AND queryContains('ON CONFLICT (name) WHERE tmdb_id IS NULL') AND NOT keywordsInserted()_
    - _Expected_Behavior: For any database state where partial index does not exist, catch error and successfully retry INSERT using ON CONFLICT (name) DO UPDATE SET updated_at = NOW()_
    - _Preservation: When partial index exists, execute INSERT without entering catch block, preserve cache update logic, preserve linking logic, preserve early return for empty arrays_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Write unit tests for the fix
    - Test with partial index present: verify try block succeeds, catch block not entered
    - Test with partial index missing: verify catch block executes fallback query
    - Test with empty keywords array: verify early return without queries
    - Test with all cached keywords: verify no INSERT query executed
    - Test with mixed cached/uncached keywords: verify only uncached keywords inserted
    - Test error message detection: verify correct identification of partial index error
    - Test other database errors: verify they are rethrown correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Fallback Strategy Success
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that with missing partial index, keywords are inserted successfully via fallback
    - Verify keywordCache is updated correctly
    - Verify movie_keywords entries are created correctly
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Optimal Path When Index Exists
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify that with partial index present, optimal path is used (no catch block)
    - Verify cache behavior is identical to original function
    - Verify linking behavior is identical to original function
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.5 Write property-based tests for comprehensive validation
    - Generate random keyword arrays (0-50 keywords) and verify successful insertion regardless of index presence
    - Generate random database states (with/without partial index) and verify correct behavior
    - Generate random cache states and verify cache is updated correctly after insertion
    - Test that all keywords are eventually linked to content across many scenarios
    - Verify fallback strategy works for all edge cases
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 3.6 Write integration tests for full ingestion flow
    - Test full movie ingestion flow with SEO keywords in database without partial index
    - Test full TV series ingestion flow with SEO keywords in database without partial index
    - Test switching between databases with and without partial index (verify no errors)
    - Test that ingestion scripts complete successfully on fresh database installations
    - Test that performance is identical when partial index exists (no regression)
    - Verify all 5 ULTRA_FAST scripts work correctly with and without partial index
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Verify bug condition exploration test passes (confirms fix works)
  - Verify preservation tests pass (confirms no regressions)
  - Verify unit tests pass (confirms all scenarios covered)
  - Verify property-based tests pass (confirms comprehensive validation)
  - Verify integration tests pass (confirms full flow works)
  - Ask the user if questions arise

---

## Files to Modify

1. `scripts/ingestion/02_seed_movies_arabic_ULTRA_FAST.js` - Update bulkInsertSEOKeywords function
2. `scripts/ingestion/03_seed_movies_foreign_ULTRA_FAST.js` - Update bulkInsertSEOKeywords function
3. `scripts/ingestion/04_seed_tv_series_ULTRA_FAST.js` - Update bulkInsertSEOKeywords function
4. `scripts/ingestion/05_seed_anime_ULTRA_FAST.js` - Update bulkInsertSEOKeywords function
5. `scripts/ingestion/00_SPEED_TEST.js` - Update bulkInsertSEOKeywords function

## Test Files to Create

1. `tests/ingestion/bulkInsertSEOKeywords.bug-condition.test.js` - Bug condition exploration test (Property 1)
2. `tests/ingestion/bulkInsertSEOKeywords.preservation.test.js` - Preservation property tests (Property 2)
3. `tests/ingestion/bulkInsertSEOKeywords.unit.test.js` - Unit tests for the fix
4. `tests/ingestion/bulkInsertSEOKeywords.property.test.js` - Property-based tests
5. `tests/ingestion/bulkInsertSEOKeywords.integration.test.js` - Integration tests

---

## Success Criteria

- [ ] All 5 ULTRA_FAST scripts handle missing partial index gracefully
- [ ] SEO keywords are inserted successfully regardless of index presence
- [ ] Optimal path is preserved when partial index exists (no performance regression)
- [ ] Cache and linking logic remain unchanged
- [ ] All tests pass (bug condition, preservation, unit, property-based, integration)
- [ ] No silent failures or unhandled errors
- [ ] Error messages are clear and actionable
