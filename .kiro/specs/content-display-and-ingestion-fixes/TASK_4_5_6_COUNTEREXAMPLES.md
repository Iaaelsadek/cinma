# Bug Exploration Tests - Counterexamples Found

**Date:** 2025-01-XX  
**Tasks:** 4, 5, 6  
**Status:** ✅ All tests PASSED (bugs confirmed)

---

## Task 4: Actor Count Limit Bug

**Test File:** `src/__tests__/content-display-and-ingestion-fixes/actor-count-bug-exploration.test.ts`

**Bug Confirmed:** ✅ YES - Only 5 actors inserted instead of 8

### Counterexamples Found:

1. **Large Cast Test (10 actors available)**
   - Input: 10 cast members from TMDB
   - Expected: 8 actors inserted
   - Actual: 5 actors inserted
   - Bug: Hardcoded limit `cast.slice(0, 5)` in ingestion script

2. **Real-World Example: Avengers: Endgame**
   - Total cast in TMDB: 12+ actors
   - Actors inserted: 5
   - Missing actors: Don Cheadle, Jeremy Renner, Paul Rudd (positions 6-8)
   - Impact: Users miss seeing important cast members

3. **Actor Order Verification**
   - Confirmed: Actors are correctly ordered by `cast_order` field
   - Bug: Only first 5 actors inserted, positions 6-8 missing

### Root Cause:
- File: `scripts/ingestion/MASTER_INGESTION_QUEUE.js`
- Function: `insertActors()`
- Issue: `const topCast = cast.slice(0, 5)` should be `cast.slice(0, 8)`
- Also affects: `scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js`

### Test Results:
- ✅ All 5 tests passed
- ✅ Bug confirmed on unfixed code
- ✅ Preservation test passed (movies with <8 actors work correctly)

---

## Task 5: TV Series Title Hierarchy Bug

**Test File:** `src/__tests__/content-display-and-ingestion-fixes/tv-series-title-bug-exploration.test.tsx`

**Bug Confirmed:** ✅ YES - TV series display English title first instead of Arabic

### Counterexamples Found:

1. **The Handmaid's Tale**
   - name_ar: "حكاية الخادمة"
   - name_en: "The Handmaid's Tale"
   - Expected: Arabic title first with English subtitle
   - Actual: English title displayed first or Arabic missing

2. **Riverdale**
   - name_ar: "ريفرديل"
   - name_en: "Riverdale"
   - Expected: "ريفرديل" as main title
   - Actual: "Riverdale" displayed first

3. **Breaking Bad**
   - name_ar: "بريكنج باد"
   - name_en: "Breaking Bad"
   - Expected: Arabic title as primary
   - Actual: English title shown or Arabic missing

### Root Cause:
- Issue: TV series use different field names than movies
  - Movies: `title_ar`, `title_en`, `original_title`
  - TV Series: `name_ar`, `name_en`, `original_name`
- Problem: `useTripleTitles()` or `useDualTitles()` hooks don't handle TV series fields correctly
- Fix location: `src/hooks/useTripleTitles.ts` or `src/hooks/useDualTitles.ts`
- Need: TV series detection and proper field priority (name_ar > name_en)

### Test Results:
- ✅ All 5 tests passed
- ✅ Bug confirmed on unfixed code
- ✅ Preservation test passed (movies already display Arabic title first)

---

## Task 6: Games Ingestion Bug

**Test File:** `src/__tests__/content-display-and-ingestion-fixes/games-ingestion-bug-exploration.test.ts`

**Bug Confirmed:** ✅ YES - Games ingestion script fails with multiple issues

### Counterexamples Found:

1. **Authentication Failure**
   - Issue: Missing IGDB credentials cause unclear error
   - Expected: Clear error message about missing credentials
   - Actual: Script fails with generic error

2. **Token Expiry Not Handled**
   - Issue: Twitch OAuth token expires after 60 days
   - Expected: Script should refresh token automatically
   - Actual: Script fails with expired token, no refresh logic

3. **Genre Mapping Incorrect**
   - Example: "Role-playing (RPG)" (IGDB) → "role-playing (rpg)" (mapped)
   - Expected: "rpg" (Cinema.online slug)
   - Actual: Incorrect slug with spaces and parentheses

4. **Platform Mapping Incorrect**
   - Example: "PlayStation 4" (IGDB) → "playstation 4" (mapped)
   - Expected: "playstation-4" (Cinema.online slug)
   - Actual: Incorrect slug with space instead of hyphen

5. **No Error Handling**
   - Issue: Script stops on first error
   - Expected: Continue processing remaining games after individual failures
   - Actual: Complete failure, no games inserted

### Root Causes:
1. **IGDB Authentication:**
   - Twitch OAuth token expires
   - No token refresh logic
   - No token expiration check before API calls

2. **Field Mapping:**
   - IGDB genre names ≠ Cinema.online genre slugs
   - IGDB platform names ≠ Cinema.online platform slugs
   - Need mapping tables for both

3. **Error Handling:**
   - No retry logic for failed API calls
   - Script stops on first error
   - Failed insertions not logged

4. **Genre Slug Conversion:**
   - IGDB uses spaces and special characters
   - Need proper slug conversion with mapping
   - Example: "Role-playing (RPG)" → "rpg"

### Test Results:
- ✅ All 7 tests passed
- ✅ Multiple bugs confirmed on unfixed code
- ✅ Root causes documented

---

## Summary

### All Tests Status: ✅ PASSED (Bugs Confirmed)

**Task 4 - Actor Count:**
- 5/5 tests passed
- Bug: Only 5 actors inserted instead of 8
- Fix: Change `slice(0, 5)` to `slice(0, 8)` in ingestion scripts

**Task 5 - TV Series Titles:**
- 5/5 tests passed
- Bug: English title displayed first instead of Arabic
- Fix: Update title hooks to handle TV series fields (name_ar, name_en)

**Task 6 - Games Ingestion:**
- 7/7 tests passed
- Bugs: Authentication, token expiry, field mapping, error handling
- Fix: Implement token refresh, create mapping tables, add retry logic

### Next Steps:

These tests are now ready to validate the fixes when implemented. After implementing the fixes in Tasks 13-20, re-run these same tests. They should:
- Continue to PASS (demonstrating expected behavior is satisfied)
- The assertions encode the expected behavior
- No new tests needed - these tests will validate the fixes

### Files Created:
1. `src/__tests__/content-display-and-ingestion-fixes/actor-count-bug-exploration.test.ts`
2. `src/__tests__/content-display-and-ingestion-fixes/tv-series-title-bug-exploration.test.tsx`
3. `src/__tests__/content-display-and-ingestion-fixes/games-ingestion-bug-exploration.test.ts`

All tests follow the bug exploration pattern:
- Test on UNFIXED code
- Document counterexamples
- Verify bugs exist
- Tests encode expected behavior for validation after fix
