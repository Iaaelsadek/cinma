# Implementation Plan

## Phase 1: Exploration Tests (BEFORE Fix)

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Card Links Navigate to Details Instead of Watch Page
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - Test 1.1: MovieCard click navigates to watch page (not details page)
    - Render MovieCard with movie data (e.g., Spider-Man with slug "spider-man")
    - Simulate click event on card
    - Assert navigation target is `/watch/movie/spider-man` (not `/movie/spider-man`)
    - **EXPECTED OUTCOME**: Test FAILS (navigates to details page instead)
  - Test 1.2: TV series card click navigates to watch page with S1E1
    - Render MovieCard with TV series data (e.g., Breaking Bad with slug "breaking-bad")
    - Simulate click event on card
    - Assert navigation target is `/watch/tv/breaking-bad/s1/ep1` (not `/series/breaking-bad`)
    - **EXPECTED OUTCOME**: Test FAILS (navigates to details page instead)
  - Test 1.3: TMDB 404 errors are suppressed silently
    - Mock TMDB API to return 404 for non-existent content ID (e.g., 1171145)
    - Make request to `/api/tmdb/movie/1171145`
    - Assert no error is logged to console
    - Assert response returns null or empty data gracefully
    - **EXPECTED OUTCOME**: Test FAILS (error is logged to terminal)
  - Test 1.4: Database queries don't reference missing columns
    - Execute `/api/db/home` endpoint request
    - Assert no "column does not exist" errors for `origin_country` or `category`
    - Assert response returns valid data
    - **EXPECTED OUTCOME**: Test FAILS (column errors thrown)
  - Test 1.5: Connection timeouts retry with exponential backoff
    - Mock CockroachDB connection to timeout on first attempt, succeed on second
    - Execute slug resolution query
    - Assert retry was attempted with exponential backoff
    - Assert query eventually succeeds
    - **EXPECTED OUTCOME**: Test FAILS (no retry, immediate error)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Behaviors Remain Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Test 2.1: Direct navigation to details page still works
    - Navigate directly to `/movie/spider-man` via URL
    - Assert details page renders correctly
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Test 2.2: TMDB successful requests (200) return data correctly
    - Mock TMDB API to return 200 with valid movie data
    - Make request to `/api/tmdb/movie/550` (Fight Club)
    - Assert response contains expected movie data
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Test 2.3: TMDB non-404 errors (500, 429) are logged and retried
    - Mock TMDB API to return 500 error
    - Make request and observe error handling
    - Assert error is logged to console
    - Assert retry with exponential backoff is attempted
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Test 2.4: Database queries for existing columns return correct data
    - Execute query that references valid columns (e.g., `title`, `tmdb_id`)
    - Assert query succeeds and returns expected data
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Test 2.5: Successful database connections complete without retry delay
    - Execute database query that succeeds on first attempt
    - Assert no retry delay is added
    - Assert query completes immediately
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Test 2.6: Cached slug resolutions return immediately
    - Populate slug cache with test data
    - Request cached slug resolution
    - Assert no database query is made
    - Assert cached result is returned immediately
    - **EXPECTED OUTCOME**: Test PASSES on unfixed code
  - Run tests on UNFIXED code
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

## Phase 2: Implementation

- [x] 3. Fix card links to navigate to watch page

  - [x] 3.1 Update MovieCard component to use watchUrl instead of contentUrl
    - Open `src/components/features/media/MovieCard.tsx`
    - Locate PrefetchLink component (around line 212)
    - Change `to={contentUrl}` to `to={watchUrl}`
    - Preserve contentUrl generation for potential future use (breadcrumbs, metadata)
    - _Bug_Condition: isBugCondition1(event) where event.target IS MovieCard AND navigationTarget IS contentUrl_
    - _Expected_Behavior: Navigate to watchUrl (e.g., `/watch/movie/{slug}` or `/watch/tv/{slug}/s1/ep1`)_
    - _Preservation: Direct navigation to details pages via URL or search continues to work (Property 5)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Card Links Navigate to Watch Page
    - **IMPORTANT**: Re-run the SAME tests from task 1 (tests 1.1 and 1.2) - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run tests 1.1 and 1.2 from task 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms card links navigate to watch page)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Details Page Access Preserved
    - **IMPORTANT**: Re-run the SAME test from task 2 (test 2.1) - do NOT write new tests
    - Run test 2.1 from task 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms details page access preserved)
    - _Requirements: 3.1, 3.2_

- [x] 4. Suppress TMDB 404 errors silently

  - [x] 4.1 Add 404 suppression to tmdb axios interceptor
    - Open `src/lib/tmdb.ts`
    - Locate response interceptor error handler (around lines 23-36)
    - Add check: if status is 404, return resolved promise with empty data structure
    - Return `{ data: { results: [] } }` for 404s to match expected TMDB response shape
    - Preserve retry logic for non-404 errors (500, 429, etc.)
    - _Bug_Condition: isBugCondition2(response) where response.status === 404 AND errorIsLogged === true_
    - _Expected_Behavior: Suppress 404 errors silently, return null or empty data gracefully_
    - _Preservation: Non-404 errors continue to be logged and retried with exponential backoff (Property 6)_
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [x] 4.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - TMDB 404 Errors Suppressed
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1.3) - do NOT write new test
    - Run test 1.3 from task 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms 404 errors suppressed)
    - _Requirements: 2.3, 2.4_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-404 TMDB Errors Preserved
    - **IMPORTANT**: Re-run the SAME tests from task 2 (tests 2.2 and 2.3) - do NOT write new tests
    - Run tests 2.2 and 2.3 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms non-404 error handling preserved)
    - _Requirements: 3.3, 3.4_

- [x] 5. Fix database column errors in /api/db/home endpoint

  - [x] 5.1 Remove references to missing columns in database queries
    - Open `server/api/db.js`
    - Locate `/api/db/home` endpoint queries
    - **Arabic Series Query** (around line 1007):
      - Remove `OR origin_country && ARRAY['EG','SA','SY','AE','KW']`
      - Keep only `original_language = 'ar'` filter
    - **Kids Movies Query** (around line 1017):
      - Remove `WHERE category IN ('kids-family', 'kids', 'family', 'animation')`
      - Use alternative filtering: check if `genre_ids` column exists
      - If exists, use `WHERE genre_ids && ARRAY[16, 10751]` (Animation, Family genres)
      - If not, remove filter entirely and rely on language-based filtering
    - **Bollywood Movies Query** (around line 1027):
      - Remove `category = 'bollywood' OR`
      - Remove `origin_country && ARRAY['IN']` (column doesn't exist)
      - Keep only `original_language = 'hi'` filter
    - _Bug_Condition: isBugCondition3(query) where query CONTAINS 'origin_country' OR 'category' AND columns don't exist_
    - _Expected_Behavior: Queries use only existing columns or alternative filtering methods_
    - _Preservation: Queries for existing columns continue to return correct data (Property 7)_
    - _Requirements: 2.5, 2.6, 3.5, 3.6_

  - [x] 5.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Database Queries Use Valid Columns
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1.4) - do NOT write new test
    - Run test 1.4 from task 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms no column errors)
    - _Requirements: 2.5, 2.6_

  - [x] 5.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Database Queries Preserved
    - **IMPORTANT**: Re-run the SAME test from task 2 (test 2.4) - do NOT write new test
    - Run test 2.4 from task 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms valid queries still work)
    - _Requirements: 3.5, 3.6_

- [x] 6. Add connection retry logic for CockroachDB timeouts

  - [x] 6.1 Implement retry wrapper for database queries
    - Open `server/lib/db.js`
    - Locate query function (database query wrapper)
    - Add retry wrapper function:
      ```javascript
      async function queryWithRetry(text, params, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await pool.query(text, params)
          } catch (error) {
            const isTimeout = error.message?.includes('connection timeout') || 
                             error.message?.includes('ETIMEDOUT')
            if (isTimeout && attempt < maxRetries) {
              const delay = 100 * Math.pow(2, attempt - 1) // 100ms, 200ms, 400ms
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
            throw error
          }
        }
      }
      ```
    - Replace existing query calls with queryWithRetry
    - Preserve existing behavior: only retry on connection timeout errors, not SQL syntax errors
    - _Bug_Condition: isBugCondition4(error) where error.message CONTAINS 'connection timeout' AND retryAttempted === false_
    - _Expected_Behavior: Retry operation with exponential backoff (3 attempts: 100ms, 200ms, 400ms)_
    - _Preservation: Successful connections complete without retry delay (Property 8)_
    - _Requirements: 2.7, 3.7, 3.8_

  - [x] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Connection Timeouts Retry
    - **IMPORTANT**: Re-run the SAME test from task 1 (test 1.5) - do NOT write new test
    - Run test 1.5 from task 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms retry logic works)
    - _Requirements: 2.7_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Successful Connections Preserved
    - **IMPORTANT**: Re-run the SAME tests from task 2 (tests 2.5 and 2.6) - do NOT write new tests
    - Run tests 2.5 and 2.6 from task 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no unnecessary retry delays)
    - _Requirements: 3.7, 3.8_

## Phase 3: Final Validation

- [x] 7. Checkpoint - Ensure all tests pass
  - Run all exploration tests from task 1 - all should now PASS
  - Run all preservation tests from task 2 - all should still PASS
  - Verify no regressions in existing functionality
  - Test manually:
    - Click on movie cards → should navigate to watch page
    - Click on TV series cards → should navigate to watch page with S1E1
    - Check terminal for TMDB 404 spam → should be silent
    - Load homepage → should work without database column errors
    - Test under high load → connection timeouts should retry automatically
  - Ask the user if questions arise or if additional testing is needed
