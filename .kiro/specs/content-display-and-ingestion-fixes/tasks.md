# Implementation Plan

## Bug Condition Exploration Tests (BEFORE Fix)

- [x] 1. Write bug condition exploration test for Arabic text validation
  - **Property 1: Bug Condition** - Arabic Translation Contains English Text
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate TMDB returns English text in Arabic translation fields
  - **Scoped PBT Approach**: Test with known movies that have this issue (e.g., popular English movies with incomplete Arabic translations)
  - Test that `getTranslations()` accepts English text in `overview_ar` field (from Bug Condition 1 in design)
  - The test assertions should verify that text with >50% English characters is rejected
  - Run test on UNFIXED code in `scripts/ingestion/MASTER_INGESTION_QUEUE.js`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Movie X has English text stored in overview_ar")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [x] 2. Write bug condition exploration test for genre display in similar content
  - **Property 1: Bug Condition** - Genre Missing in Similar Content Section
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate genre is not displayed in "You Might Also Like" section
  - **Scoped PBT Approach**: Test MovieCard component rendering in similar content context
  - Test that MovieCard in similar content section does NOT display `primary_genre` (from Bug Condition 2 in design)
  - The test assertions should verify that genre is displayed when `primary_genre` exists
  - Run test on UNFIXED code in `src/components/features/media/MovieCard.tsx`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "MovieCard for 'Inception' shows no genre in similar section")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 2.3_

- [x] 3. Write bug condition exploration test for genre translation on Watch page
  - **Property 1: Bug Condition** - Genres Display in English on Arabic Watch Pages
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate genres are not translated to Arabic
  - **Scoped PBT Approach**: Test Watch page with Arabic language preference
  - Test that Watch page displays genres in English when `lang='ar'` (from Bug Condition 3 in design)
  - The test assertions should verify that genres are translated using genre mapping
  - Run test on UNFIXED code in `src/pages/media/Watch.tsx`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Watch page shows 'Action' instead of 'أكشن'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.5, 2.5_

- [x] 4. Write bug condition exploration test for actor count limit
  - **Property 1: Bug Condition** - Actor Count Limited to 5 Instead of 8
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate only 5 actors are inserted
  - **Scoped PBT Approach**: Test with movies that have 10+ cast members in TMDB
  - Test that `insertActors()` limits insertion to 5 actors (from Bug Condition 4 in design)
  - The test assertions should verify that 8 actors are inserted when cast has ≥8 members
  - Run test on UNFIXED code in `scripts/ingestion/MASTER_INGESTION_QUEUE.js`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Movie with 20 cast members only inserts 5")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.6, 2.6_

- [x] 5. Write bug condition exploration test for TV series title hierarchy
  - **Property 1: Bug Condition** - TV Series Display English Title First
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate TV series show English title as primary
  - **Scoped PBT Approach**: Test with TV series that have both `name_ar` and `name_en` fields
  - Test that TV series cards display English title as primary (from Bug Condition 5 in design)
  - The test assertions should verify that Arabic title is displayed first with English subtitle
  - Run test on UNFIXED code in TV series card components
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "'The Handmaid's Tale' shows English as primary")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.8, 2.8_

- [x] 6. Write bug condition exploration test for games ingestion
  - **Property 1: Bug Condition** - Games Ingestion Script Fails
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate games ingestion fails
  - **Scoped PBT Approach**: Run games ingestion script with valid IGDB credentials
  - Test that `MASTER_INGESTION_QUEUE_GAMES_IGDB.js` fails or inserts 0 games (from Bug Condition 6 in design)
  - The test assertions should verify that games are successfully ingested with correct field mappings
  - Run test on UNFIXED code in `scripts/ingestion/MASTER_INGESTION_QUEUE_GAMES_IGDB.js`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Script fails with authentication error")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.10, 2.10_

## Preservation Property Tests (BEFORE Fix)

- [x] 7. Write preservation property tests for valid Arabic translations
  - **Property 2: Preservation** - Valid Arabic Text Acceptance
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run `getTranslations()` on UNFIXED code with movies that have valid Arabic translations
  - Observe: Verify that valid Arabic text (>50% Arabic characters) is accepted and stored correctly
  - Write property-based test: for all TMDB responses with valid Arabic text, `overview_ar` should be stored (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.1, 3.2_

- [x] 8. Write preservation property tests for genre display in other sections
  - **Property 2: Preservation** - Genre Display in Non-Similar Sections
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Render MovieCard on UNFIXED code in home page and discovery pages
  - Observe: Verify that genre displays correctly in these sections
  - Write property-based test: for all MovieCard instances in non-similar sections, genre should display (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.3_

- [x] 9. Write preservation property tests for movie title display
  - **Property 2: Preservation** - Movie Title Hierarchy Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Render movie cards on UNFIXED code with Arabic and English titles
  - Observe: Verify that title hierarchy is correct (already working for movies)
  - Write property-based test: for all movie cards, title display should follow existing logic (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.4_

- [x] 10. Write preservation property tests for actor display
  - **Property 2: Preservation** - Actor Display Features Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Render Watch page cast section on UNFIXED code
  - Observe: Verify that actors display with profile images, names, and character information
  - Write property-based test: for all cast displays, actor information should be complete (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.5_

- [x] 11. Write preservation property tests for TV series ingestion
  - **Property 2: Preservation** - TV Series Metadata Ingestion Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run TV series ingestion on UNFIXED code for a sample series
  - Observe: Verify that seasons, episodes, and metadata are fetched correctly
  - Write property-based test: for all TV series ingestion, seasons and episodes should be stored correctly (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.6, 3.7_

- [x] 12. Write preservation property tests for small cast movies
  - **Property 2: Preservation** - Small Cast Insertion Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run ingestion on UNFIXED code for movies with <8 cast members
  - Observe: Verify that all available actors are inserted correctly
  - Write property-based test: for all movies with <8 cast members, all actors should be inserted (from Preservation Requirements in design)
  - Verify test passes on UNFIXED code
  - _Requirements: 3.5_

## Implementation

- [ ] 13. Fix Arabic text validation in movie ingestion script

  - [ ] 13.1 Enhance `isArabicText()` validation function
    - Replace simple regex test with percentage-based validation
    - Count Arabic characters (U+0600 to U+06FF) in the text
    - Calculate percentage of Arabic characters vs total characters
    - Require >50% Arabic characters to consider text as Arabic
    - Reject text with <50% Arabic characters even if some Arabic exists
    - Add logging for rejected translations
    - _Bug_Condition: isBugCondition1(tmdbResponse) where Arabic translation field contains >50% English characters_
    - _Expected_Behavior: getTranslations() SHALL reject English text in Arabic field and set overview_ar to NULL_
    - _Preservation: Valid Arabic translations (>50% Arabic) SHALL continue to be accepted and stored_
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [ ] 13.2 Enhance `isEnglishText()` validation function
    - Replace simple regex test with percentage-based validation
    - Count English characters (a-zA-Z) in the text
    - Calculate percentage of English characters vs total characters
    - Require >50% English characters to consider text as English
    - Reject text with <50% English characters even if some English exists
    - _Bug_Condition: isBugCondition1(tmdbResponse) where English translation field contains >50% Arabic characters_
    - _Expected_Behavior: getTranslations() SHALL reject Arabic text in English field and set overview_en to NULL_
    - _Preservation: Valid English translations (>50% English) SHALL continue to be accepted and stored_
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ] 13.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Arabic Text Validation Works
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 13.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Arabic Text Acceptance
    - **IMPORTANT**: Re-run the SAME tests from task 7 - do NOT write new tests
    - Run preservation property tests from step 7
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 14. Fix Arabic text validation in TV series ingestion script

  - [ ] 14.1 Duplicate enhanced validation logic from movie script
    - Copy `isArabicText()` and `isEnglishText()` functions from MASTER_INGESTION_QUEUE.js
    - Apply same percentage-based validation (>50% threshold)
    - Add logging for rejected translations
    - _Bug_Condition: isBugCondition1(tmdbResponse) for TV series translations_
    - _Expected_Behavior: getTranslations() SHALL reject invalid language data for TV series_
    - _Preservation: Valid TV series translations SHALL continue to be accepted_
    - _Requirements: 1.1, 2.1, 3.6, 3.7_

  - [ ] 14.2 Verify preservation tests still pass
    - **Property 2: Preservation** - TV Series Ingestion Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 11 - do NOT write new tests
    - Run preservation property tests from step 11
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm TV series ingestion still works correctly

- [ ] 15. Increase actor count from 5 to 8 in movie ingestion script

  - [ ] 15.1 Update actor limit in `insertActors()` function
    - Change `cast.slice(0, 5)` to `cast.slice(0, 8)`
    - Update comment to reflect new limit
    - Verify actors are ordered by `cast_order` field
    - _Bug_Condition: isBugCondition4(castData) where castData.length >= 8_
    - _Expected_Behavior: insertActors() SHALL insert up to 8 actors for movies with ≥8 cast members_
    - _Preservation: Movies with <8 cast members SHALL continue to insert all available actors_
    - _Requirements: 1.6, 2.6, 3.5_

  - [ ] 15.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Actor Count Increased to 8
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.6, 2.7_

  - [ ] 15.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Small Cast Insertion Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 12 - do NOT write new tests
    - Run preservation property tests from step 12
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm movies with <8 actors still work correctly

- [ ] 16. Increase actor count from 5 to 8 in TV series ingestion script

  - [ ] 16.1 Update actor limit in `insertActors()` function
    - Change `cast.slice(0, 5)` to `cast.slice(0, 8)`
    - Update comment to reflect new limit
    - Verify actors are ordered by `cast_order` field
    - _Bug_Condition: isBugCondition4(castData) for TV series_
    - _Expected_Behavior: insertActors() SHALL insert up to 8 actors for TV series with ≥8 cast members_
    - _Preservation: TV series with <8 cast members SHALL continue to insert all available actors_
    - _Requirements: 1.6, 2.6, 3.5_

  - [ ] 16.2 Verify preservation tests still pass
    - **Property 2: Preservation** - TV Series Actor Display Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 10 - do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm TV series cast display still works correctly

- [ ] 17. Add genre translation to Watch page

  - [ ] 17.1 Create shared genre translation utility
    - Extract genre translation mapping from MovieCard.tsx
    - Create `src/lib/genres.ts` or similar utility file
    - Export `translateGenre()` function with comprehensive mapping
    - Include all genre translations (Action → أكشن, Drama → دراما, etc.)
    - _Bug_Condition: isBugCondition3(watchPage, userLang) where userLang === 'ar'_
    - _Expected_Behavior: Watch page SHALL display genre names translated to Arabic_
    - _Preservation: English Watch pages SHALL continue to display English genre names_
    - _Requirements: 1.5, 2.5, 3.3_

  - [ ] 17.2 Apply genre translation in Watch page
    - Import `translateGenre()` function in Watch.tsx
    - Update genre rendering logic: `genres.map(g => lang === 'ar' ? translateGenre(g.name) : g.name)`
    - Verify translation is applied when `lang='ar'`
    - Verify English genres display when `lang='en'`
    - _Bug_Condition: isBugCondition3(watchPage, userLang)_
    - _Expected_Behavior: Genres SHALL be translated based on language preference_
    - _Preservation: English language preference SHALL continue to show English genres_
    - _Requirements: 1.5, 2.5_

  - [ ] 17.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Genre Translation Works on Watch Page
    - **IMPORTANT**: Re-run the SAME test from task 3 - do NOT write a new test
    - The test from task 3 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 3
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.5_

  - [ ] 17.4 Verify preservation tests still pass
    - **Property 2: Preservation** - English Watch Page Unchanged
    - **IMPORTANT**: Re-run preservation tests - do NOT write new tests
    - Verify English Watch pages still display English genres
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm English language preference works correctly

- [x] 18. Fix genre display in MovieCard similar content section

  - [x] 18.1 Verify and fix genre display logic in MovieCard
    - Check if genre display is conditionally hidden in similar content section
    - Remove any conditional logic that hides genre in specific contexts
    - Ensure `primary_genre` is displayed in all render contexts
    - Ensure genre translation is applied consistently using shared utility
    - _Bug_Condition: isBugCondition2(movieCard, renderContext) where renderContext === 'similar_content'_
    - _Expected_Behavior: MovieCard SHALL display genre in all sections including similar content_
    - _Preservation: Genre display in other sections SHALL remain unchanged_
    - _Requirements: 1.3, 2.3, 3.3_

  - [x] 18.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Genre Displays in Similar Content
    - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
    - The test from task 2 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3, 2.4_

  - [x] 18.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Genre Display in Other Sections Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 8 - do NOT write new tests
    - Run preservation property tests from step 8
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm genre display in home page and discovery pages works correctly

- [ ] 19. Fix TV series title hierarchy

  - [ ] 19.1 Fix TV series field handling in title hooks
    - Locate `useTripleTitles.ts` or `useDualTitles.ts` hook
    - Ensure hook handles `name_ar`, `name_en`, `original_name` fields for TV series
    - Ensure Arabic title (`name_ar`) is prioritized over English (`name_en`)
    - Add fallback logic: `name_ar || original_name (if Arabic) || name_en`
    - Add TV series detection based on presence of `name` field vs `title` field
    - _Bug_Condition: isBugCondition5(tvSeriesCard) where name_ar and name_en both exist_
    - _Expected_Behavior: TV series cards SHALL display Arabic title as primary with English subtitle_
    - _Preservation: Movie title hierarchy SHALL remain unchanged_
    - _Requirements: 1.8, 2.8, 3.4_

  - [ ] 19.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - TV Series Show Arabic Title First
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.8, 2.9_

  - [ ] 19.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Movie Title Display Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 9 - do NOT write new tests
    - Run preservation property tests from step 9
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm movie title hierarchy still works correctly

- [ ] 20. Fix games ingestion pipeline

  - [ ] 20.1 Fix IGDB authentication
    - Check token expiration before each API call
    - Implement token refresh logic if expired
    - Add error handling for authentication failures
    - Store token with expiration timestamp
    - _Bug_Condition: isBugCondition6(gamesIngestion) where IGDB API authentication fails_
    - _Expected_Behavior: Games ingestion SHALL successfully authenticate with IGDB API_
    - _Preservation: N/A (new functionality)_
    - _Requirements: 1.10, 2.10_

  - [ ] 20.2 Fix field mapping from IGDB to CockroachDB
    - Review `primary_genre` mapping from IGDB genre slugs
    - Review `primary_platform` mapping from IGDB platform slugs
    - Add validation for required fields before insertion
    - Ensure all IGDB fields map correctly to CockroachDB schema
    - _Bug_Condition: isBugCondition6(gamesIngestion) where field mappings are incorrect_
    - _Expected_Behavior: Games SHALL be inserted with correct field mappings_
    - _Preservation: N/A (new functionality)_
    - _Requirements: 1.10, 2.10_

  - [ ] 20.3 Add error handling and retry logic
    - Implement retry logic with exponential backoff for failed API calls
    - Log failed game insertions for manual review
    - Continue processing remaining games if one fails
    - Add comprehensive error logging
    - _Bug_Condition: isBugCondition6(gamesIngestion) where individual game insertions fail_
    - _Expected_Behavior: Script SHALL continue processing after individual failures_
    - _Preservation: N/A (new functionality)_
    - _Requirements: 1.10, 2.10_

  - [ ] 20.4 Fix genre slug conversion
    - Map IGDB genre names to Cinema.online genre slugs
    - Use `toSlugLike()` function consistently
    - Handle genre names with special characters
    - Add fallback for unmapped genres
    - _Bug_Condition: isBugCondition6(gamesIngestion) where genre slugs are invalid_
    - _Expected_Behavior: IGDB genres SHALL convert to valid Cinema.online slugs_
    - _Preservation: N/A (new functionality)_
    - _Requirements: 1.10, 2.10_

  - [ ] 20.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Games Ingestion Succeeds
    - **IMPORTANT**: Re-run the SAME test from task 6 - do NOT write a new test
    - The test from task 6 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 6
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.10, 2.11_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Run all bug condition exploration tests - all should PASS
  - Run all preservation property tests - all should PASS
  - Run integration tests for full ingestion flows
  - Run frontend display tests for Watch page and TV series cards
  - Verify no regressions in existing functionality
  - Ask the user if questions arise
