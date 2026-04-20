# Implementation Plan: Remove TMDB API Direct Usage

## Overview

This implementation plan systematically removes all direct TMDB API usage for content discovery (discover/trending/search endpoints) and replaces them with CockroachDB API calls. The goal is to ensure all displayed content has valid slugs from our database, eliminating "Missing slug for content" errors.

The implementation follows a phased approach, starting with defensive filtering, then fixing discovery pages, category pages, and finally search functionality.

## Tasks

- [x] 1. Add defensive filtering to all display components
  - [x] 1.1 Add slug validation to QuantumTrain component
    - Filter out items without valid slugs before rendering
    - Check: `slug && slug.trim() !== '' && slug !== 'content'`
    - Handle empty arrays gracefully
    - File: `src/components/features/media/QuantumTrain.tsx`
    - _Requirements: R8_
  
  - [x] 1.2 Add slug validation to MovieCard component
    - Add early return if slug is invalid
    - Prevent rendering cards without valid slugs
    - File: `src/components/features/media/MovieCard.tsx`
    - _Requirements: R8_
  
  - [x] 1.3 Add slug validation to VideoCard component
    - Add early return if slug is invalid
    - Prevent rendering cards without valid slugs
    - File: `src/components/features/media/VideoCard.tsx`
    - _Requirements: R8_

- [x] 2. Enhance backend API endpoints for filtering support
  - [x] 2.1 Enhance `/api/movies` endpoint with comprehensive filters
    - Add query parameters: genre, language, yearFrom, yearTo, ratingFrom, ratingTo, sortBy, limit, page
    - Ensure all responses include valid slugs
    - Filter by `is_published = TRUE`
    - Add pagination support
    - File: `server/routes/movies.js` or create if missing
    - _Requirements: R2_
  
  - [x] 2.2 Enhance `/api/tv` endpoint with comprehensive filters
    - Add same query parameters as movies endpoint
    - Ensure all responses include valid slugs
    - Filter by `is_published = TRUE`
    - Add pagination support
    - File: `server/routes/tv.js` or create if missing
    - _Requirements: R2_
  
  - [x] 2.3 Create `/api/trending` endpoint for CockroachDB trending content
    - Support query parameters: type (movie, tv, all), timeWindow (day, week), limit
    - Query CockroachDB for trending content based on popularity or recent activity
    - Return content with valid slugs only
    - File: `server/routes/trending.js`
    - _Requirements: R2_

- [x] 3. Checkpoint - Test enhanced API endpoints
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Replace TMDB calls in discovery pages
  - [x] 4.1 Update Movies.tsx to use CockroachDB API
    - Replace `tmdb.get('/discover/movie')` with `fetch('/api/movies')`
    - Update query parameters to match new API format
    - Ensure filtering and sorting work correctly
    - File: `src/pages/discovery/Movies.tsx`
    - _Requirements: R3_
  
  - [x] 4.2 Update Series.tsx to use CockroachDB API
    - Replace `tmdb.get('/discover/tv')` with `fetch('/api/tv')`
    - Update query parameters to match new API format
    - Ensure filtering and sorting work correctly
    - File: `src/pages/discovery/Series.tsx`
    - _Requirements: R3_
  
  - [x] 4.3 Update TopWatched.tsx to use CockroachDB API
    - Replace TMDB trending calls with `fetch('/api/trending')`
    - Update to use CockroachDB popularity metrics
    - File: `src/pages/discovery/TopWatched.tsx`
    - _Requirements: R3_
  
  - [x] 4.4 Update AsianDrama.tsx to use CockroachDB API
    - Replace TMDB calls with `fetch('/api/tv?language=ko,zh,ja')`
    - Filter by original language for Asian content
    - File: `src/pages/discovery/AsianDrama.tsx`
    - _Requirements: R3_
  
  - [x] 4.5 Update Anime.tsx to use CockroachDB API
    - Replace TMDB calls with `fetch('/api/tv?language=ja&genre=16')`
    - Filter by Japanese language and animation genre
    - File: `src/pages/discovery/Anime.tsx`
    - _Requirements: R3_
  
  - [x] 4.6 Update Classics.tsx to use CockroachDB API
    - Replace TMDB calls with `fetch('/api/movies?yearTo=1990&sortBy=vote_average')`
    - Filter by release year for classic content
    - File: `src/pages/discovery/Classics.tsx`
    - _Requirements: R3_

- [x] 5. Checkpoint - Test discovery pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Replace TMDB calls in category pages
  - [x] 6.1 Update CategoryHub.tsx to use CockroachDB API
    - Replace TMDB discover calls with CockroachDB endpoints
    - Ensure genre filtering works with CockroachDB data
    - File: `src/pages/CategoryHub.tsx`
    - _Requirements: R5_
  
  - [x] 6.2 Update Category.tsx to use CockroachDB API
    - Replace TMDB calls with `fetch('/api/movies?genre={id}')` or `fetch('/api/tv?genre={id}')`
    - Update genre filtering logic
    - File: `src/pages/discovery/Category.tsx`
    - _Requirements: R3, R5_
  
  - [x] 6.3 Update DynamicContent.tsx to use CockroachDB API
    - Replace TMDB calls with appropriate CockroachDB endpoints
    - Ensure dynamic content loading works correctly
    - File: `src/pages/discovery/DynamicContent.tsx`
    - _Requirements: R3_

- [x] 7. Update search functionality to use CockroachDB
  - [x] 7.1 Rewrite advancedSearch function in tmdb.ts
    - Replace TMDB discover/search calls with CockroachDB API calls
    - Use `/api/movies?search={query}` and `/api/tv?search={query}`
    - Support all advanced filters (genre, year, rating, language)
    - Merge results from multiple content types
    - File: `src/lib/tmdb.ts`
    - _Requirements: R6_
  
  - [x] 7.2 Update Search.tsx to use new advancedSearch implementation
    - Verify search page works with CockroachDB backend
    - Test all filter combinations
    - Ensure results have valid slugs
    - File: `src/pages/discovery/Search.tsx`
    - _Requirements: R6_
  
  - [x] 7.3 Update Plays.tsx to use CockroachDB API
    - Replace any TMDB calls with CockroachDB endpoints
    - File: `src/pages/discovery/Plays.tsx`
    - _Requirements: R3_

- [x] 8. Checkpoint - Test search and special pages
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Verify and document TMDB proxy blocking
  - [x] 9.1 Verify TMDB proxy blocks forbidden endpoints
    - Confirm `/discover/*` requests return 403
    - Confirm `/trending/*` requests return 403
    - Confirm `/search/*` requests return 403
    - Confirm detail endpoints (`/movie/{id}`, `/tv/{id}`) still work
    - File: `server/api/tmdb-proxy.js`
    - _Requirements: R9_
  
  - [x] 9.2 Document allowed vs forbidden TMDB usage
    - Create or update documentation listing allowed endpoints
    - List forbidden endpoints with CockroachDB alternatives
    - Add examples of correct usage patterns
    - _Requirements: R7_

- [x] 10. Comprehensive testing and validation
  - [x] 10.1 Test all pages for TMDB API leaks
    - Open browser DevTools Network tab
    - Visit all discovery pages, category pages, search page
    - Verify NO `/api/tmdb/discover` or `/api/tmdb/trending` requests
    - Verify only allowed TMDB detail endpoints are called
    - _Requirements: R10_
  
  - [x] 10.2 Verify no "Missing slug" errors
    - Check browser console on all pages
    - Verify no "Missing slug for content" errors appear
    - Test clicking on all displayed content items
    - _Requirements: R10_
  
  - [x] 10.3 Test filtering and sorting functionality
    - Test genre filters on all pages
    - Test year range filters
    - Test rating filters
    - Test language filters
    - Test sorting options (popularity, rating, date)
    - _Requirements: R10_
  
  - [x] 10.4 Performance testing
    - Measure page load times for all pages
    - Verify CockroachDB responses are fast enough (< 2 seconds)
    - Check for any performance regressions
    - _Requirements: R10_

- [x] 11. Final checkpoint - Complete validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks reference specific requirements for traceability
- Checkpoints ensure incremental validation after major phases
- TMDB API is preserved ONLY for fetching details of specific content by ID (cast, crew, videos)
- All content discovery must use CockroachDB API endpoints
- Defensive filtering in components provides last line of defense against invalid content
- Each page replacement follows the same pattern: identify TMDB calls → replace with CockroachDB API → test
