# Content Display and Ingestion Fixes - Bugfix Design

## Overview

This bugfix addresses multiple critical issues affecting content display and ingestion across the Cinema.online platform. The bugs span Arabic/English language handling in both the TMDB API ingestion pipeline and frontend display logic, genre translation mapping, actor count limitations, TV series title hierarchy, and games ingestion pipeline failures.

The fix strategy involves:
1. **Ingestion Layer**: Enhance validation logic in `getTranslations()` to properly detect and reject incorrect language data from TMDB API
2. **Frontend Layer**: Add genre translation mapping to Watch page, fix MovieCard genre display logic
3. **Database Layer**: Update actor insertion limits from 5 to 8 in ingestion scripts
4. **Title Hierarchy**: Fix TV series cards to display Arabic title first with English subtitle
5. **Games Pipeline**: Fix IGDB API integration and error handling

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug
- **Property (P)**: The desired behavior when the bug condition is met
- **Preservation**: Existing functionality that must remain unchanged by the fix
- **getTranslations()**: Function in ingestion scripts that extracts Arabic/English translations from TMDB API response
- **isArabicText()**: Validation function that checks if text contains Arabic characters (U+0600 to U+06FF)
- **isEnglishText()**: Validation function that checks if text contains English characters (a-zA-Z)
- **overview_ar**: Database field storing Arabic description text
- **overview_en**: Database field storing English description text
- **primary_genre**: Database field storing the primary genre slug for filtering/display
- **useTripleTitles()**: Hook that determines title display hierarchy based on language preference

## Bug Details

### Bug Condition 1: Arabic Movie Descriptions Display in English

The bug manifests when the TMDB API returns English text in the Arabic translation field (`translations.translations[iso_639_1='ar'].data.overview`). The `getTranslations()` function blindly accepts this data without validation, storing English text in the `overview_ar` database field.

**Formal Specification:**
```
FUNCTION isBugCondition1(tmdbResponse)
  INPUT: tmdbResponse of type TMDBMovieDetails with translations
  OUTPUT: boolean
  
  LET arabicTranslation = tmdbResponse.translations.translations.find(t => t.iso_639_1 === 'ar')
  LET overview_ar = arabicTranslation?.data?.overview
  
  RETURN overview_ar EXISTS
         AND NOT containsArabicCharacters(overview_ar)
         AND containsEnglishCharacters(overview_ar)
END FUNCTION
```

**Examples:**
- Movie "The Matrix" fetches Arabic translation, but TMDB returns English text in `ar.data.overview`
- Current: `overview_ar = "A computer hacker learns..."` (English stored in Arabic field)
- Expected: `overview_ar = NULL` (reject invalid data, fallback to English)

### Bug Condition 2: Genre Missing in "You Might Also Like" Section

The bug manifests when MovieCard component renders in the similar content section. The component has logic to display `primary_genre` but the genre display is missing specifically in the "You Might Also Like" context.

**Formal Specification:**
```
FUNCTION isBugCondition2(movieCard, renderContext)
  INPUT: movieCard component instance, renderContext string
  OUTPUT: boolean
  
  RETURN renderContext === 'similar_content'
         AND movieCard.props.movie.primary_genre EXISTS
         AND NOT genreDisplayed(movieCard)
END FUNCTION
```

**Examples:**
- Similar movie card for "Inception" shows title, year, rating but no genre
- Expected: Display "Sci-Fi" or "خيال علمي" based on language preference

### Bug Condition 3: Genre Displays in English on Watch Pages

The bug manifests when the Watch page displays genre information from the `genres` array. The page shows English genre names instead of translating them to Arabic.

**Formal Specification:**
```
FUNCTION isBugCondition3(watchPage, userLang)
  INPUT: watchPage component, userLang preference
  OUTPUT: boolean
  
  RETURN userLang === 'ar'
         AND watchPage.genres.length > 0
         AND genreDisplayLanguage(watchPage) === 'en'
END FUNCTION
```

**Examples:**
- Watch page for Arabic movie shows "Action, Drama" instead of "أكشن، دراما"
- Genre translation mapping exists in MovieCard but not in Watch page


### Bug Condition 4: Actor Count Limited to 5

The bug manifests when ingestion scripts fetch cast data from TMDB API. The `insertActors()` function limits insertion to 5 actors instead of the intended 8.

**Formal Specification:**
```
FUNCTION isBugCondition4(castData)
  INPUT: castData array from TMDB API
  OUTPUT: boolean
  
  RETURN castData.length >= 8
         AND actorsInserted(castData) === 5
         AND NOT actorsInserted(castData) === 8
END FUNCTION
```

**Examples:**
- Movie has 20 cast members in TMDB
- Current: Only 5 actors inserted into `movie_cast` table
- Expected: 8 actors inserted (top cast by `cast_order`)

### Bug Condition 5: TV Series Titles Display in Wrong Language Hierarchy

The bug manifests when TV series cards render with both Arabic and English titles available. The display logic shows English title as primary or only English, violating the Arabic-first convention.

**Formal Specification:**
```
FUNCTION isBugCondition5(tvSeriesCard)
  INPUT: tvSeriesCard with name_ar and name_en fields
  OUTPUT: boolean
  
  RETURN tvSeriesCard.name_ar EXISTS
         AND tvSeriesCard.name_en EXISTS
         AND primaryTitleDisplayed(tvSeriesCard) === tvSeriesCard.name_en
         AND NOT primaryTitleDisplayed(tvSeriesCard) === tvSeriesCard.name_ar
END FUNCTION
```

**Examples:**
- "The Handmaid's Tale" card shows "The Handmaid's Tale" as main title
- Expected: "حكاية الخادمة" as main title with "The Handmaid's Tale" as subtitle

### Bug Condition 6: Games Pages Broken

The bug manifests when the games ingestion script (`MASTER_INGESTION_QUEUE_GAMES_IGDB.js`) runs. The script fails to properly ingest game data from IGDB API due to authentication issues, incorrect field mappings, or error handling failures.

**Formal Specification:**
```
FUNCTION isBugCondition6(gamesIngestion)
  INPUT: gamesIngestion script execution
  OUTPUT: boolean
  
  RETURN igdbApiCall(gamesIngestion) FAILS
         OR gameDataMapping(gamesIngestion) INCORRECT
         OR gamesInserted(gamesIngestion) === 0
END FUNCTION
```

**Examples:**
- Running `node scripts/ingestion/MASTER_INGESTION_QUEUE_GAMES_IGDB.js` results in API errors
- Games discovery page shows no content or errors
- Expected: Successful ingestion of game data with proper field mapping

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

1. **Movie Ingestion for Non-Arabic Content**: When a movie with English as original language is ingested, the system SHALL CONTINUE TO fetch and store English overview correctly in `overview_en` field

2. **Title Extraction Logic**: When extracting titles from TMDB translations, the system SHALL CONTINUE TO use the existing fallback logic (`title_ar || original_title` for Arabic content)

3. **Genre Display in Other Sections**: When MovieCard component renders in sections where genre currently displays correctly (home page, discovery pages), the system SHALL CONTINUE TO show genre information without regression

4. **Movie Title Display**: When movie cards are rendered with Arabic and English titles, the system SHALL CONTINUE TO display titles using the existing dual-title logic without changes (movies already follow correct hierarchy)

5. **Actor Display for Movies**: When movie cast is displayed on Watch pages, the system SHALL CONTINUE TO show actors with profile images, names, and character information

6. **TV Series Ingestion**: When TV series are ingested from TMDB API, the system SHALL CONTINUE TO fetch seasons, episodes, and metadata correctly

7. **Slug Generation**: When generating slugs for content, the system SHALL CONTINUE TO use `title_en` or `name_en` to ensure SEO-friendly URLs

8. **Content Filtering**: When ingesting content, the system SHALL CONTINUE TO apply existing filters (adult content, runtime, release date, poster requirements)

**Scope:**
All inputs that do NOT involve the specific bug conditions should be completely unaffected by this fix. This includes:
- Content with correct language data from TMDB
- Movie cards (which already have correct title hierarchy)
- Genre display in non-Watch page contexts
- Other content types (anime, software) that don't have the specific bugs


## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

### 1. **Insufficient Validation in getTranslations()**
The `getTranslations()` function in ingestion scripts extracts Arabic/English translations from TMDB API but has weak validation logic. The current implementation:
- Uses regex patterns that are too permissive (`/[\u0600-\u06FF]/` for Arabic, `/[a-zA-Z]/` for English)
- Accepts text as "Arabic" if it contains ANY Arabic character, even if 99% is English
- Accepts text as "English" if it contains ANY English character, even if it's mostly Arabic
- Does not validate the PREDOMINANT language of the text

**Evidence:**
```javascript
// Current validation (too weak)
function isArabicText(text) {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text); // Returns true if ANY Arabic char exists
}
```

### 2. **Missing Genre Translation in Watch Page**
The Watch page component displays genres directly from the `genres` array without translation. The MovieCard component has a `translateGenre()` function with a comprehensive mapping, but this logic is not shared or reused in the Watch page.

**Evidence:**
- `MovieCard.tsx` has `translateGenre()` function with 20+ genre mappings
- `Watch.tsx` displays `genres.map(g => g.name)` without translation
- No shared genre translation utility exists

### 3. **Hardcoded Actor Limit**
The `insertActors()` function in both `MASTER_INGESTION_QUEUE.js` and `MASTER_INGESTION_QUEUE_SERIES.js` has a hardcoded slice operation:
```javascript
const topCast = cast.slice(0, 5); // Should be 8
```

**Evidence:**
- Line found in both movie and TV series ingestion scripts
- Comment in requirements mentions "increase from 5 to 8"
- Database schema supports unlimited actors via junction tables

### 4. **Incorrect Title Hierarchy Logic for TV Series**
The `useTripleTitles()` or `useDualTitles()` hooks may not be properly handling TV series name fields (`name_ar`, `name_en`, `original_name`) vs movie title fields (`title_ar`, `title_en`, `original_title`). The logic might be defaulting to English for TV series.

**Evidence:**
- Requirements state "TV series title hierarchy not following Arabic-first convention"
- Movies display correctly, suggesting the issue is specific to TV series field handling
- TV series use `name` field while movies use `title` field

### 5. **Games Ingestion Pipeline Issues**
The `MASTER_INGESTION_QUEUE_GAMES_IGDB.js` script has multiple potential failure points:
- IGDB API authentication (Twitch OAuth token)
- Field mapping from IGDB to CockroachDB schema
- Genre slug conversion (IGDB uses different genre names)
- Platform slug conversion
- Error handling for API rate limits

**Evidence:**
- Script uses Twitch OAuth which expires
- Complex field mapping with multiple transformations
- No retry logic for failed game insertions


## Correctness Properties

Property 1: Bug Condition - Arabic Text Validation

_For any_ TMDB API response where the Arabic translation field (`translations[iso_639_1='ar'].data.overview`) contains text that is predominantly English (>50% English characters), the fixed `getTranslations()` function SHALL reject this data and set `overview_ar` to NULL, allowing the system to fallback to English overview display.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Genre Display in Similar Content

_For any_ MovieCard component rendered in the "You Might Also Like" section where `primary_genre` field exists in the movie data, the fixed component SHALL display the genre name (translated to Arabic if `lang === 'ar'`) consistently with other MovieCard instances.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition - Genre Translation on Watch Page

_For any_ Watch page where the user language preference is Arabic (`lang === 'ar'`) and genre data exists, the fixed Watch page SHALL display genre names translated to Arabic using the same genre translation mapping as MovieCard.

**Validates: Requirements 2.5**

Property 4: Bug Condition - Actor Count Increase

_For any_ content ingestion where TMDB API returns cast data with 8 or more actors, the fixed `insertActors()` function SHALL insert up to 8 actors (ordered by `cast_order`) into the database, not 5.

**Validates: Requirements 2.6, 2.7**

Property 5: Bug Condition - TV Series Title Hierarchy

_For any_ TV series card where both `name_ar` and `name_en` fields exist, the fixed title display logic SHALL show `name_ar` as the primary title and `name_en` as the secondary subtitle, following the Arabic-first convention.

**Validates: Requirements 2.8, 2.9**

Property 6: Bug Condition - Games Ingestion Success

_For any_ execution of the games ingestion script with valid IGDB API credentials, the fixed script SHALL successfully authenticate, fetch game data, map fields correctly to CockroachDB schema, and insert games without errors.

**Validates: Requirements 2.10, 2.11**

Property 7: Preservation - Non-Buggy Content Ingestion

_For any_ TMDB API response where the Arabic translation field contains valid Arabic text (>50% Arabic characters), the fixed `getTranslations()` function SHALL accept and store this data in `overview_ar`, preserving the existing correct behavior.

**Validates: Requirements 3.1, 3.2**

Property 8: Preservation - Existing Genre Display

_For any_ MovieCard component rendered in sections other than "You Might Also Like" (home page, discovery pages), the fixed component SHALL continue to display genre information exactly as before, with no regression.

**Validates: Requirements 3.3**

Property 9: Preservation - Movie Title Display

_For any_ movie card with Arabic and English titles, the fixed system SHALL continue to use the existing dual-title display logic without changes, as movies already follow the correct hierarchy.

**Validates: Requirements 3.4**

Property 10: Preservation - TV Series Ingestion

_For any_ TV series ingestion from TMDB API, the fixed system SHALL continue to fetch seasons, episodes, and metadata correctly, with no changes to the ingestion logic beyond title field handling.

**Validates: Requirements 3.6, 3.7**


## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `scripts/ingestion/MASTER_INGESTION_QUEUE.js`

**Function**: `isArabicText()` and `isEnglishText()`

**Specific Changes**:
1. **Enhance Arabic Text Validation**: Replace simple regex test with percentage-based validation
   - Count Arabic characters (U+0600 to U+06FF) in the text
   - Calculate percentage of Arabic characters vs total characters
   - Require >50% Arabic characters to consider text as Arabic
   - Reject text with <50% Arabic characters even if some Arabic exists

2. **Enhance English Text Validation**: Replace simple regex test with percentage-based validation
   - Count English characters (a-zA-Z) in the text
   - Calculate percentage of English characters vs total characters
   - Require >50% English characters to consider text as English
   - Reject text with <50% English characters even if some English exists

3. **Add Logging**: Log rejected translations for debugging
   - Log when Arabic translation is rejected due to insufficient Arabic content
   - Log when English translation is rejected due to insufficient English content

**File 2**: `scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js`

**Function**: `isArabicText()` and `isEnglishText()`

**Specific Changes**:
Same as File 1 - duplicate the enhanced validation logic for TV series ingestion

**File 3**: `scripts/ingestion/MASTER_INGESTION_QUEUE.js`

**Function**: `insertActors()`

**Specific Changes**:
1. **Update Actor Limit**: Change `cast.slice(0, 5)` to `cast.slice(0, 8)`
   - Line: `const topCast = cast.slice(0, 8);`
   - Update comment to reflect new limit

**File 4**: `scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js`

**Function**: `insertActors()`

**Specific Changes**:
Same as File 3 - change actor limit from 5 to 8

**File 5**: `src/pages/media/Watch.tsx`

**Component**: Watch page genre display

**Specific Changes**:
1. **Add Genre Translation Function**: Create or import `translateGenre()` function
   - Extract the genre translation mapping from MovieCard.tsx
   - Create a shared utility function in `src/lib/genres.ts` or similar
   - Import and use in Watch.tsx

2. **Apply Translation to Genre Display**: Update genre rendering logic
   - Current: `genres.map(g => g.name)`
   - Fixed: `genres.map(g => lang === 'ar' ? translateGenre(g.name) : g.name)`

**File 6**: `src/components/features/media/MovieCard.tsx`

**Component**: MovieCard genre display

**Specific Changes**:
1. **Verify Genre Display Logic**: Ensure `primary_genre` is displayed in all render contexts
   - Check if genre display is conditionally hidden in similar content section
   - Remove any conditional logic that hides genre in specific contexts
   - Ensure genre translation is applied consistently

**File 7**: `src/hooks/useTripleTitles.ts` or `src/hooks/useDualTitles.ts`

**Hook**: Title hierarchy logic

**Specific Changes**:
1. **Fix TV Series Field Handling**: Ensure TV series name fields are prioritized correctly
   - Check if hook handles `name_ar`, `name_en`, `original_name` fields
   - Ensure Arabic title (`name_ar`) is prioritized over English (`name_en`)
   - Add fallback logic: `name_ar || original_name (if Arabic) || name_en`

2. **Add TV Series Detection**: Detect if content is TV series vs movie
   - Check for presence of `name` field vs `title` field
   - Apply appropriate field priority based on content type

**File 8**: `scripts/ingestion/MASTER_INGESTION_QUEUE_GAMES_IGDB.js`

**Script**: Games ingestion pipeline

**Specific Changes**:
1. **Fix IGDB Authentication**: Ensure OAuth token is refreshed properly
   - Check token expiration before each API call
   - Implement token refresh logic if expired
   - Add error handling for authentication failures

2. **Fix Field Mapping**: Verify all IGDB fields map correctly to CockroachDB schema
   - Review `primary_genre` mapping from IGDB genre slugs
   - Review `primary_platform` mapping from IGDB platform slugs
   - Add validation for required fields before insertion

3. **Add Error Handling**: Implement retry logic and error recovery
   - Retry failed API calls with exponential backoff
   - Log failed game insertions for manual review
   - Continue processing remaining games if one fails

4. **Fix Genre Slug Conversion**: Ensure IGDB genre names convert to correct slugs
   - Map IGDB genre names to Cinema.online genre slugs
   - Use `toSlugLike()` function consistently
   - Handle genre names with special characters


## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that check for each bug condition on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:

1. **Arabic Text Validation Test**: Fetch a movie from TMDB that has English text in the Arabic translation field (will fail on unfixed code)
   - Select a movie known to have this issue (e.g., popular English movie with incomplete Arabic translation)
   - Call `getTranslations()` on unfixed code
   - Assert that `overview_ar` contains English text (demonstrates the bug)
   - Expected: Test passes, confirming the bug exists

2. **Genre Display Test**: Render MovieCard in similar content section (will fail on unfixed code)
   - Create a test that renders MovieCard with `primary_genre` set
   - Render in "You Might Also Like" context
   - Assert that genre is NOT displayed (demonstrates the bug)
   - Expected: Test passes, confirming genre is missing

3. **Genre Translation Test**: Render Watch page with Arabic language preference (will fail on unfixed code)
   - Set `lang = 'ar'`
   - Render Watch page with genres array
   - Assert that genres display in English (demonstrates the bug)
   - Expected: Test passes, confirming genres are not translated

4. **Actor Count Test**: Run ingestion on a movie with 10+ cast members (will fail on unfixed code)
   - Select a movie with large cast
   - Run `insertActors()` on unfixed code
   - Query database and count inserted actors
   - Assert that count === 5 (demonstrates the bug)
   - Expected: Test passes, confirming only 5 actors inserted

5. **TV Series Title Test**: Render TV series card with both Arabic and English names (will fail on unfixed code)
   - Create test data with `name_ar` and `name_en`
   - Render TV series card
   - Assert that primary title is English (demonstrates the bug)
   - Expected: Test passes, confirming wrong title hierarchy

6. **Games Ingestion Test**: Run games ingestion script (will fail on unfixed code)
   - Execute `MASTER_INGESTION_QUEUE_GAMES_IGDB.js`
   - Observe API errors or zero insertions (demonstrates the bug)
   - Expected: Script fails or inserts 0 games

**Expected Counterexamples**:
- Arabic translation fields contain English text
- Genre missing in similar content section
- Genres display in English on Arabic Watch pages
- Only 5 actors inserted instead of 8
- TV series show English title first
- Games ingestion fails with API errors

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL tmdbResponse WHERE isBugCondition1(tmdbResponse) DO
  result := getTranslations_fixed(tmdbResponse)
  ASSERT result.overview_ar === NULL OR isValidArabic(result.overview_ar)
END FOR

FOR ALL movieCard WHERE isBugCondition2(movieCard) DO
  result := renderMovieCard_fixed(movieCard)
  ASSERT genreDisplayed(result) === TRUE
END FOR

FOR ALL watchPage WHERE isBugCondition3(watchPage) DO
  result := renderWatchPage_fixed(watchPage)
  ASSERT genreLanguage(result) === 'ar'
END FOR

FOR ALL castData WHERE isBugCondition4(castData) DO
  result := insertActors_fixed(castData)
  ASSERT actorCount(result) === 8
END FOR

FOR ALL tvSeriesCard WHERE isBugCondition5(tvSeriesCard) DO
  result := renderTVSeriesCard_fixed(tvSeriesCard)
  ASSERT primaryTitle(result) === tvSeriesCard.name_ar
END FOR

FOR ALL gamesIngestion WHERE isBugCondition6(gamesIngestion) DO
  result := runGamesIngestion_fixed()
  ASSERT result.success === TRUE AND result.gamesInserted > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL tmdbResponse WHERE NOT isBugCondition1(tmdbResponse) DO
  ASSERT getTranslations_original(tmdbResponse) = getTranslations_fixed(tmdbResponse)
END FOR

FOR ALL movieCard WHERE NOT isBugCondition2(movieCard) DO
  ASSERT renderMovieCard_original(movieCard) = renderMovieCard_fixed(movieCard)
END FOR

FOR ALL watchPage WHERE NOT isBugCondition3(watchPage) DO
  ASSERT renderWatchPage_original(watchPage) = renderWatchPage_fixed(watchPage)
END FOR

FOR ALL castData WHERE NOT isBugCondition4(castData) DO
  ASSERT insertActors_original(castData) = insertActors_fixed(castData)
END FOR

FOR ALL movieCard WHERE contentType === 'movie' DO
  ASSERT renderMovieCard_original(movieCard) = renderMovieCard_fixed(movieCard)
END FOR

FOR ALL tvSeriesIngestion WHERE NOT isBugCondition5(tvSeriesIngestion) DO
  ASSERT ingestTVSeries_original(tvSeriesIngestion) = ingestTVSeries_fixed(tvSeriesIngestion)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for valid translations, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Valid Arabic Translation Preservation**: Verify that valid Arabic text is still accepted
   - Test with movies that have correct Arabic translations
   - Assert that `overview_ar` is stored correctly after fix

2. **Genre Display Preservation**: Verify that genre displays correctly in other sections
   - Test MovieCard in home page, discovery pages
   - Assert that genre display is unchanged

3. **English Watch Page Preservation**: Verify that English Watch pages show English genres
   - Set `lang = 'en'`
   - Assert that genres display in English (unchanged)

4. **Small Cast Preservation**: Verify that movies with <8 actors work correctly
   - Test with movies that have 3-5 cast members
   - Assert that all available actors are inserted

5. **Movie Title Preservation**: Verify that movie cards still display correctly
   - Test movie cards with Arabic/English titles
   - Assert that title hierarchy is unchanged (already correct)

6. **TV Series Ingestion Preservation**: Verify that TV series seasons/episodes ingest correctly
   - Run TV series ingestion on fixed code
   - Assert that seasons and episodes are inserted correctly


### Unit Tests

**Arabic Text Validation:**
- Test `isArabicText()` with 100% Arabic text → should return true
- Test `isArabicText()` with 100% English text → should return false
- Test `isArabicText()` with 60% Arabic, 40% English → should return true
- Test `isArabicText()` with 40% Arabic, 60% English → should return false
- Test `isArabicText()` with empty string → should return false
- Test `isArabicText()` with null → should return false

**English Text Validation:**
- Test `isEnglishText()` with 100% English text → should return true
- Test `isEnglishText()` with 100% Arabic text → should return false
- Test `isEnglishText()` with 60% English, 40% Arabic → should return true
- Test `isEnglishText()` with 40% English, 60% Arabic → should return false

**Actor Insertion:**
- Test `insertActors()` with 10 cast members → should insert 8
- Test `insertActors()` with 5 cast members → should insert 5
- Test `insertActors()` with 0 cast members → should insert 0
- Test `insertActors()` with duplicate actors → should handle conflicts

**Genre Translation:**
- Test `translateGenre('action')` with `lang='ar'` → should return 'أكشن'
- Test `translateGenre('action')` with `lang='en'` → should return 'action'
- Test `translateGenre('unknown-genre')` → should return original value
- Test genre display in MovieCard → should show translated genre
- Test genre display in Watch page → should show translated genre

**Title Hierarchy:**
- Test TV series card with `name_ar` and `name_en` → should show `name_ar` first
- Test TV series card with only `name_en` → should show `name_en`
- Test TV series card with only `name_ar` → should show `name_ar`
- Test movie card with `title_ar` and `title_en` → should maintain existing behavior

**Games Ingestion:**
- Test IGDB authentication → should obtain valid token
- Test game field mapping → should map all required fields
- Test genre slug conversion → should convert IGDB genres to Cinema.online slugs
- Test platform slug conversion → should convert IGDB platforms to Cinema.online slugs
- Test error handling → should continue on individual game failures

### Property-Based Tests

**Translation Validation Properties:**
- Generate random TMDB responses with varying Arabic/English ratios
- Verify that `getTranslations()` only accepts text with >50% target language characters
- Verify that rejected translations result in NULL values
- Verify that valid translations are stored correctly

**Genre Display Properties:**
- Generate random movie data with various `primary_genre` values
- Verify that genre is displayed in all MovieCard render contexts
- Verify that genre translation is applied when `lang='ar'`
- Verify that genre display is consistent across all sections

**Actor Insertion Properties:**
- Generate random cast arrays of varying sizes (0-50 actors)
- Verify that up to 8 actors are inserted for arrays with ≥8 members
- Verify that all actors are inserted for arrays with <8 members
- Verify that actor order is preserved (by `cast_order` field)

**Title Hierarchy Properties:**
- Generate random TV series data with various combinations of `name_ar`, `name_en`, `original_name`
- Verify that Arabic title is always prioritized when available
- Verify that English title is used as fallback when Arabic is missing
- Verify that movie title hierarchy is unchanged

**Games Ingestion Properties:**
- Generate random game data from IGDB API
- Verify that all games with valid data are inserted successfully
- Verify that field mappings are correct for all games
- Verify that genre and platform slugs are valid

### Integration Tests

**Full Ingestion Flow:**
- Run movie ingestion script on a small sample (10 movies)
- Verify that Arabic translations are validated correctly
- Verify that 8 actors are inserted per movie
- Verify that all data is stored in CockroachDB correctly

**Full TV Series Ingestion Flow:**
- Run TV series ingestion script on a small sample (5 series)
- Verify that Arabic translations are validated correctly
- Verify that 8 actors are inserted per series
- Verify that seasons and episodes are ingested correctly
- Verify that title hierarchy is correct in database

**Full Games Ingestion Flow:**
- Run games ingestion script on a small sample (10 games)
- Verify that IGDB authentication works
- Verify that games are inserted with correct field mappings
- Verify that genre and platform slugs are correct

**Frontend Display Flow:**
- Render Watch page for a movie with Arabic language preference
- Verify that genres display in Arabic
- Verify that overview displays in Arabic (if available)
- Verify that cast shows 8 actors

**TV Series Display Flow:**
- Render TV series card with both Arabic and English names
- Verify that Arabic name is displayed as primary title
- Verify that English name is displayed as subtitle
- Verify that genre is displayed and translated

**Similar Content Display Flow:**
- Render "You Might Also Like" section on Watch page
- Verify that MovieCard components display genre
- Verify that genre is translated to Arabic when `lang='ar'`
- Verify that all other MovieCard features work correctly

