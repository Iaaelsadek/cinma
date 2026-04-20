# TMDB Slug Missing Bugfix Design

## Overview

The application throws "Missing slug for content" errors when displaying content on the home page. This occurs because `HomeBelowFoldSections.tsx` fetches data directly from TMDB API for several content categories (Korean series, Turkish series, Chinese series, documentaries, anime, classics, Bollywood fallback), and TMDB API responses do not include a `slug` field. When `MovieCard.tsx` attempts to generate URLs using `generateContentUrl()` or `generateWatchUrl()`, it throws an error because these functions require a valid slug.

The root cause is a data flow mismatch: content from TMDB API lacks slugs, but URL generation functions enforce slug presence as a requirement. This creates a broken user experience where content appears on the page but cannot be interacted with.

The fix strategy is to replace TMDB API calls with CockroachDB API calls that return content with valid slugs, or filter out items without slugs before rendering.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when content fetched from TMDB API lacks a slug field
- **Property (P)**: The desired behavior - all displayed content must have valid slugs for URL generation
- **Preservation**: Existing CockroachDB API fetching and slug-based URL generation that must remain unchanged
- **HomeBelowFoldSections**: The component in `src/components/features/home/HomeBelowFoldSections.tsx` that fetches below-fold content sections
- **generateContentUrl**: The function in `src/lib/utils.ts` that generates content detail page URLs and requires a valid slug
- **generateWatchUrl**: The function in `src/lib/utils.ts` that generates watch page URLs and requires a valid slug
- **MovieCard**: The component in `src/components/features/media/MovieCard.tsx` that renders content cards and uses URL generation functions
- **CockroachDB API**: The primary database API at `/api/db/*` that returns content with slugs
- **TMDB API**: The external API that returns content without slugs (causing the bug)

## Bug Details

### Bug Condition

The bug manifests when HomeBelowFoldSections fetches content from TMDB API for any of the seven affected categories. The TMDB API responses do not include a `slug` field, causing `generateContentUrl()` and `generateWatchUrl()` to throw errors when MovieCard attempts to render the content.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ContentItem
  OUTPUT: boolean
  
  RETURN input.source === 'TMDB_API'
         AND (input.slug === null OR input.slug === undefined OR input.slug === '')
         AND input.category IN ['korean-series', 'turkish-series', 'chinese-series', 
                                'documentaries', 'anime', 'classics', 'bollywood-fallback']
         AND contentIsRenderedInUI(input)
END FUNCTION
```

### Examples

- **Korean Series**: User scrolls to K-Drama section → sees poster images → clicks on a card → error "Missing slug for content tv:12345 (사랑의 불시착)" is thrown
- **Turkish Series**: User scrolls to Turkish Drama section → sees poster images → hovers over card → error "Missing slug for content tv:67890 (Muhteşem Yüzyıl)" is thrown
- **Chinese Series**: User scrolls to Chinese Short Series section → sees poster images → clicks watch button → error "Missing slug for content tv:11111 (陈情令)" is thrown
- **Documentaries**: User scrolls to Documentaries section → sees poster images → clicks on a card → error "Missing slug for content movie:22222 (Planet Earth)" is thrown
- **Anime**: User scrolls to Anime section → sees poster images → clicks on a card → error "Missing slug for content tv:33333 (進撃の巨人)" is thrown
- **Classics**: User scrolls to Golden Era bento box → sees poster images → clicks on a card → error "Missing slug for content movie:44444 (Casablanca)" is thrown
- **Bollywood Fallback**: When CockroachDB returns no Bollywood movies → TMDB fallback is used → user clicks on a card → error "Missing slug for content movie:55555 (Dilwale Dulhania Le Jayenge)" is thrown

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Content fetched from CockroachDB API (`/api/db/home`) must continue to include slug fields and work correctly
- `generateContentUrl()` and `generateWatchUrl()` must continue to enforce slug requirements for content that should have slugs
- MovieCard rendering logic for content with valid slugs must remain unchanged
- Home page critical data (trending, Arabic series, kids, Bollywood from CockroachDB) must continue to work exactly as before
- URL generation for all existing slug-based content must produce the same URLs as before

**Scope:**
All inputs that already have valid slugs from CockroachDB API should be completely unaffected by this fix. This includes:
- Content from `/api/db/home` endpoint (trending, Arabic series, kids, Bollywood)
- Content from `/api/db/movies/*` endpoints
- Content from `/api/db/tv/*` endpoints
- Any other content that already has slugs in the database

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Direct TMDB API Usage**: HomeBelowFoldSections uses `tmdb.get()` directly for 7 content categories instead of using CockroachDB API endpoints
   - Korean series: `tmdb.get('/discover/tv', { params: { with_original_language: 'ko' } })`
   - Turkish series: `tmdb.get('/discover/tv', { params: { with_original_language: 'tr' } })`
   - Chinese series: `tmdb.get('/discover/tv', { params: { with_original_language: 'zh' } })`
   - Documentaries: `tmdb.get('/discover/movie', { params: { with_genres: '99' } })`
   - Anime: `tmdb.get('/discover/tv', { params: { with_genres: '16', with_original_language: 'ja' } })`
   - Classics: `tmdb.get('/discover/movie', { params: { 'release_date.lte': '1980-01-01' } })`
   - Bollywood fallback: `tmdb.get('/discover/movie', { params: { with_original_language: 'hi' } })`

2. **Missing CockroachDB API Endpoints**: The CockroachDB API (`server/api/db.js`) does not have discover endpoints for these specific categories
   - No `/api/db/discover/tv` endpoint with language filtering
   - No `/api/db/discover/movie` endpoint with genre or date filtering
   - The `/api/db/home` endpoint only covers 4 categories (trending, Arabic series, kids, Bollywood)

3. **No Slug Filtering**: Even if TMDB data is used temporarily, there's no filtering to remove items without slugs before rendering

4. **Architectural Mismatch**: The system architecture expects all content to come from CockroachDB with slugs, but HomeBelowFoldSections bypasses this for 7 categories

## Correctness Properties

Property 1: Bug Condition - All Displayed Content Has Valid Slugs

_For any_ content item that is displayed in HomeBelowFoldSections (Korean series, Turkish series, Chinese series, documentaries, anime, classics, Bollywood), the content SHALL have a valid slug field (non-null, non-empty, not equal to 'content'), enabling successful URL generation without errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - CockroachDB Content Unchanged

_For any_ content that is already fetched from CockroachDB API (trending, Arabic series, kids, Bollywood from `/api/db/home`), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing slug-based URL generation and rendering functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, we have two implementation strategies:

#### Strategy A: Add CockroachDB API Endpoints (Preferred)

**File**: `server/api/db.js`

**New Endpoints**:
1. **Add Korean Series Endpoint**: `GET /api/db/tv/korean`
   - Query: `SELECT * FROM tv_series WHERE original_language = 'ko' AND slug IS NOT NULL ORDER BY first_air_date DESC LIMIT 20`
   - Returns: TV series with valid slugs

2. **Add Turkish Series Endpoint**: `GET /api/db/tv/turkish`
   - Query: `SELECT * FROM tv_series WHERE original_language = 'tr' AND slug IS NOT NULL ORDER BY first_air_date DESC LIMIT 20`
   - Returns: TV series with valid slugs

3. **Add Chinese Series Endpoint**: `GET /api/db/tv/chinese`
   - Query: `SELECT * FROM tv_series WHERE original_language = 'zh' AND slug IS NOT NULL ORDER BY first_air_date DESC LIMIT 20`
   - Returns: TV series with valid slugs

4. **Add Documentaries Endpoint**: `GET /api/db/movies/documentaries`
   - Query: `SELECT * FROM movies WHERE genre_ids @> ARRAY[99] AND slug IS NOT NULL ORDER BY release_date DESC LIMIT 20`
   - Returns: Documentary movies with valid slugs

5. **Add Anime Endpoint**: `GET /api/db/tv/anime`
   - Query: `SELECT * FROM tv_series WHERE (genre_ids @> ARRAY[16] OR media_type = 'anime') AND original_language = 'ja' AND slug IS NOT NULL ORDER BY first_air_date DESC LIMIT 20`
   - Returns: Anime series with valid slugs

6. **Add Classics Endpoint**: `GET /api/db/movies/classics`
   - Query: `SELECT * FROM movies WHERE release_date <= '1980-01-01' AND slug IS NOT NULL ORDER BY popularity DESC LIMIT 20`
   - Returns: Classic movies with valid slugs

**File**: `src/components/features/home/HomeBelowFoldSections.tsx`

**Specific Changes**:
1. **Replace TMDB API calls with CockroachDB API calls**:
   - Replace `tmdb.get('/discover/tv', { params: { with_original_language: 'ko' } })` with `fetch('/api/db/tv/korean')`
   - Replace `tmdb.get('/discover/tv', { params: { with_original_language: 'tr' } })` with `fetch('/api/db/tv/turkish')`
   - Replace `tmdb.get('/discover/tv', { params: { with_original_language: 'zh' } })` with `fetch('/api/db/tv/chinese')`
   - Replace `tmdb.get('/discover/movie', { params: { with_genres: '99' } })` with `fetch('/api/db/movies/documentaries')`
   - Replace `tmdb.get('/discover/tv', { params: { with_genres: '16', with_original_language: 'ja' } })` with `fetch('/api/db/tv/anime')`
   - Replace `tmdb.get('/discover/movie', { params: { 'release_date.lte': '1980-01-01' } })` with `fetch('/api/db/movies/classics')`

2. **Update Bollywood fallback logic**:
   - Keep CockroachDB as primary source (`criticalHomeData?.bollywood`)
   - If fallback is needed, use CockroachDB endpoint instead of TMDB: `fetch('/api/db/movies/bollywood')`

#### Strategy B: Filter Content Without Slugs (Fallback)

If CockroachDB doesn't have enough content for these categories, implement client-side filtering:

**File**: `src/components/features/home/HomeBelowFoldSections.tsx`

**Specific Changes**:
1. **Add slug filtering helper**:
   ```typescript
   const filterValidSlugs = (items: TmdbMedia[] | undefined): TmdbMedia[] => {
     if (!items) return []
     return items.filter(item => item.slug && item.slug.trim() !== '' && item.slug !== 'content')
   }
   ```

2. **Apply filtering before rendering**:
   - Korean series: `sanitizeMediaItems(filterValidSlugs(translatedKorean.data))`
   - Turkish series: `sanitizeMediaItems(filterValidSlugs(translatedTurkish.data))`
   - Chinese series: `sanitizeMediaItems(filterValidSlugs(translatedChinese.data))`
   - Documentaries: `sanitizeMediaItems(filterValidSlugs(documentaries.data?.results))`
   - Anime: `sanitizeMediaItems(filterValidSlugs(tmdbAnime.data))`
   - Classics: `filterValidSlugs(tmdbClassics.data?.results || [])`
   - Bollywood: `sanitizeMediaItems(filterValidSlugs(bollywoodMovies.data?.results))`

3. **Handle empty results gracefully**:
   - If filtered list is empty, hide the section entirely or show a placeholder

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that fetch content from TMDB API for each affected category and attempt to generate URLs. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Korean Series Test**: Fetch Korean series from TMDB → attempt to call `generateWatchUrl()` → expect error "Missing slug for content" (will fail on unfixed code)
2. **Turkish Series Test**: Fetch Turkish series from TMDB → attempt to call `generateContentUrl()` → expect error "Missing slug for content" (will fail on unfixed code)
3. **Chinese Series Test**: Fetch Chinese series from TMDB → attempt to render MovieCard → expect error "Missing slug for content" (will fail on unfixed code)
4. **Documentaries Test**: Fetch documentaries from TMDB → attempt to call `generateWatchUrl()` → expect error "Missing slug for content" (will fail on unfixed code)
5. **Anime Test**: Fetch anime from TMDB → attempt to call `generateContentUrl()` → expect error "Missing slug for content" (will fail on unfixed code)
6. **Classics Test**: Fetch classics from TMDB → attempt to render in BentoBox → expect error "Missing slug for content" (will fail on unfixed code)
7. **Bollywood Fallback Test**: Force Bollywood fallback to TMDB → attempt to call `generateWatchUrl()` → expect error "Missing slug for content" (will fail on unfixed code)

**Expected Counterexamples**:
- URL generation functions throw "Missing slug for content" errors when given TMDB data
- Possible causes: TMDB API responses lack slug field, no filtering applied, no CockroachDB alternative

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL content WHERE isBugCondition(content) DO
  result := fetchContentFromCockroachDB(content.category)
  ASSERT result.every(item => item.slug !== null AND item.slug !== '' AND item.slug !== 'content')
  ASSERT generateWatchUrl(result[0]) does not throw error
  ASSERT generateContentUrl(result[0]) does not throw error
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL content WHERE NOT isBugCondition(content) DO
  ASSERT fetchOriginal(content) = fetchFixed(content)
  ASSERT generateWatchUrl(content) produces same URL before and after fix
  ASSERT generateContentUrl(content) produces same URL before and after fix
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for CockroachDB content, then write property-based tests capturing that behavior.

**Test Cases**:
1. **CockroachDB Home Data Preservation**: Fetch `/api/db/home` before and after fix → verify identical responses and URL generation
2. **Trending Content Preservation**: Verify trending movies/series continue to work with slugs
3. **Arabic Series Preservation**: Verify Arabic series from CockroachDB continue to work
4. **Kids Content Preservation**: Verify kids movies from CockroachDB continue to work
5. **Bollywood Primary Source Preservation**: Verify Bollywood from CockroachDB continues to work when available

### Unit Tests

- Test each new CockroachDB API endpoint returns content with valid slugs
- Test slug filtering function correctly removes items without slugs
- Test URL generation functions work with CockroachDB content
- Test MovieCard renders correctly with slug-validated content
- Test empty result handling when no content has valid slugs

### Property-Based Tests

- Generate random content items with and without slugs → verify filtering works correctly
- Generate random CockroachDB responses → verify all items have valid slugs
- Generate random category selections → verify correct API endpoint is called
- Test that all displayed content passes slug validation across many scenarios

### Integration Tests

- Test full home page load with all sections rendering without errors
- Test clicking on cards in each section navigates to correct URLs
- Test hovering over cards in each section does not throw errors
- Test that sections with no content are hidden gracefully
- Test that CockroachDB fallback works when TMDB would have been used
