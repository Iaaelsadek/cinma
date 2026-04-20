# Implementation Plan: Dynamic Filters and Categories System

## Overview

This implementation plan breaks down the dynamic filters and categories feature into discrete coding tasks. The system replaces hardcoded filters with database-driven genres from CockroachDB, removes illogical "Upcoming" filters, creates Islamic content pages, and implements comprehensive filtering with URL state management.

**Key Technologies**: TypeScript, React, Node.js/Express, CockroachDB, React Query

**Implementation Approach**: Backend-first (API endpoints and database), then frontend (components and hooks), then integration and testing.

## Tasks

- [x] 1. Backend: Genre Translation Service
  - Create `server/lib/genre-translations.js` with genre mapping objects
  - Implement `genreTranslations` object (Arabic → English)
  - Implement `categorySlugToGenre` object (English slug → Arabic)
  - Implement `parseGenreMapping(mapping)` function with validation
  - Implement `prettyPrintGenreMapping(mapping)` function
  - Implement `roundTripGenreMapping(mapping)` function
  - Implement `mapCategorySlugToGenre(slug)` function
  - Implement `getGenreLabel(arabicValue, lang)` function
  - Export all functions and mappings
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9_

- [ ]* 1.1 Write property test for genre mapping round-trip
  - **Property 1: Genre Mapping Round-Trip Preservation**
  - **Validates: Requirements 8.6**
  - Use fast-check to generate random genre mappings
  - Verify parseGenreMapping → prettyPrintGenreMapping → parseGenreMapping produces equivalent object
  - Test with 100 iterations

- [ ]* 1.2 Write property test for genre mapping uniqueness
  - **Property 9: Genre Mapping Key-Value Uniqueness**
  - **Validates: Requirements 8.7, 8.9**
  - Verify all keys are non-empty strings
  - Verify all values are unique (no duplicate translations)
  - Test with 100 iterations


- [x] 2. Backend: Database Indexes for Performance
  - Create migration file `server/migrations/add-genre-indexes.sql`
  - Add index on `movies.primary_genre` with WHERE clause for non-null values
  - Add index on `tv_series.primary_genre` with WHERE clause for non-null values
  - Add index on `games.primary_genre` with WHERE clause for non-null values
  - Add index on `software.primary_genre` with WHERE clause for non-null values
  - Add index on `anime.primary_genre` with WHERE clause for non-null values
  - Add composite index on `movies(primary_genre, vote_average, release_date)`
  - Add composite index on `tv_series(primary_genre, vote_average, first_air_date)`
  - Add index on `tv_series.category` for Islamic content filtering
  - Add index on `anime.category` with WHERE clause for category='anime'
  - Use `CREATE INDEX CONCURRENTLY` to avoid blocking production
  - _Requirements: 13.5, 13.6_

- [x] 3. Backend: Genre API Endpoint
  - Create `server/api/genres.js` file
  - Implement GET `/api/genres/:contentType` endpoint
  - Validate contentType parameter (movies, series, anime, gaming, software)
  - Map contentType to correct CockroachDB table name
  - Query DISTINCT primary_genre from appropriate table
  - Filter out NULL and empty string values
  - Add category='anime' filter for anime content type
  - Apply genre translations using genre-translations service
  - Sort results alphabetically by Arabic label
  - Limit results to 100 genres maximum
  - Return JSON with {genres, contentType, count} structure
  - Log warning if >10% of content has NULL primary_genre
  - Handle database connection errors with 503 status
  - Register routes in `server/index.js`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 13.1, 13.2, 13.3, 13.4, 13.5, 17.7_

- [ ]* 3.1 Write property test for Genre API table selection
  - **Property 2: Genre API Returns Correct Table Data**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.8**
  - Test all valid contentType values
  - Verify all returned genres are non-null, non-empty
  - Verify correct structure {value, labelAr, labelEn}
  - Test with 100 iterations

- [ ]* 3.2 Write property test for genre list sorting
  - **Property 3: Genre List Alphabetical Sorting**
  - **Validates: Requirements 2.9**
  - Verify genres sorted alphabetically by Arabic label
  - Test with all content types
  - Test with 100 iterations

- [ ]* 3.3 Write unit tests for Genre API endpoint
  - Test valid content types return 200 with genres array
  - Test invalid content type returns 400 error
  - Test genre structure has required fields
  - Test NULL/empty genres are filtered out
  - Test database unavailable returns 503 error
  - _Requirements: 18.3_

- [x] 4. Backend: Enhanced Content Search API
  - Update `server/api/db.js` search endpoints
  - Add `genre` parameter to POST `/api/db/movies/search`
  - Add `genre` parameter to POST `/api/db/tv/search`
  - Add `genre` parameter to POST `/api/db/games/search`
  - Add `genre` parameter to POST `/api/db/software/search`
  - Add `genre` parameter to POST `/api/db/anime/search`
  - Add `category` parameter as alias for genre (for Islamic content)
  - Prefer `genre` over `category` when both provided
  - Make `sortBy` parameter nullable (NULL = no explicit sorting)
  - Build WHERE clause with parameterized query for genre filter
  - Build ORDER BY clause only when sortBy is not NULL
  - Validate year parameter (1900-2100 range)
  - Validate rating parameter (0-10 range)
  - Validate sortBy parameter against allowed values
  - Use parameterized queries to prevent SQL injection
  - Return 400 error for invalid parameters with descriptive messages
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

- [ ]* 4.1 Write property test for SQL injection prevention
  - **Property 10: SQL Injection Prevention**
  - **Validates: Requirements 9.11**
  - Test with malicious SQL strings as genre parameter
  - Verify queries use parameterized approach
  - Verify database remains intact after injection attempts
  - Test with 100 iterations

- [ ]* 4.2 Write unit tests for enhanced search API
  - Test genre filtering returns correct results
  - Test category parameter works as alias
  - Test sortBy=null returns unsorted results
  - Test invalid year returns 400 error
  - Test invalid rating returns 400 error
  - Test invalid sortBy returns 400 error
  - Test parameterized queries prevent SQL injection
  - _Requirements: 18.4_

- [x] 5. Backend: Server-Side Caching for Genre API
  - Install `node-cache` package if not present
  - Create cache instance in `server/api/genres.js`
  - Set cache TTL to 3600 seconds (1 hour)
  - Check cache before database query
  - Return cached result if available
  - Store query result in cache after database fetch
  - Use cache key format: `genres-{contentType}`
  - _Requirements: 11.4_

- [x] 6. Backend: Rate Limiting for API Endpoints
  - Install `express-rate-limit` package if not present
  - Create rate limiter for Genre API (100 requests per 15 minutes)
  - Apply rate limiter to `/api/genres/:contentType` endpoint
  - Create rate limiter for search endpoints (200 requests per 15 minutes)
  - Return 429 status with descriptive message when limit exceeded
  - _Requirements: 16.12_

- [x] 7. Frontend: Genre Types and Interfaces
  - Create `src/types/genre.ts` file
  - Define `GenreOption` interface {value, labelAr, labelEn}
  - Define `GenreResponse` interface {genres, contentType, count}
  - Define `GenreMapping` type (Record<string, string>)
  - Define `CategorySlugMapping` type (Record<string, string>)
  - Define `FilterState` interface {genre, year, rating, sortBy, page}
  - Update `ContentFetchParams` interface to include genre, category, nullable sortBy
  - Update `FilterType` to remove 'upcoming'
  - Define `MovieFilterType`, `SeriesFilterType`, `PlayFilterType`, `AnimeFilterType`
  - Export all types
  - _Requirements: 1.5_

- [x] 8. Frontend: Genre Translation Utilities
  - Create `src/lib/genre-utils.ts` file
  - Import genre mappings from backend (or duplicate for frontend)
  - Implement `mapCategorySlugToGenre(slug)` function
  - Implement `getGenreLabel(arabicValue, lang)` function
  - Implement `getFallbackGenres(contentType, lang)` function for error fallback
  - Export all functions
  - _Requirements: 7.6, 7.7, 7.10, 12.1, 12.13_

- [ ]* 8.1 Write property test for category slug mapping
  - **Property 4: Category Slug to Arabic Genre Mapping**
  - **Validates: Requirements 6.3, 6.4, 7.9**
  - Test all valid English category slugs
  - Verify Arabic value exists in translations
  - Verify round-trip: Arabic → English → Arabic preserves value
  - Test with 100 iterations

- [ ]* 8.2 Write property test for Arabic genre values in queries
  - **Property 8: Arabic Genre Values in Database Queries**
  - **Validates: Requirements 7.8, 7.9**
  - Test search queries with Arabic genre values
  - Verify results have matching primary_genre
  - Test with all content types
  - Test with 100 iterations

- [x] 9. Frontend: useGenres Hook
  - Create `src/hooks/useGenres.ts` file
  - Implement `useGenres(contentType, lang)` hook using React Query
  - Fetch from `/api/genres/:contentType` endpoint
  - Set staleTime to 3600000 (1 hour)
  - Set gcTime to 7200000 (2 hours)
  - Set retry to 2 attempts
  - Return {data, isLoading, error, refetch}
  - Handle loading state
  - Handle error state with fallback
  - _Requirements: 2.10, 2.11, 11.1, 11.4_

- [x] 10. Frontend: URL State Management Utilities
  - Create `src/lib/url-state.ts` file
  - Implement `parseFiltersFromURL(searchParams)` function
  - Implement `serializeFiltersToURL(filters)` function
  - Implement `updateURLWithFilter(key, value)` function
  - Implement `clearFilterFromURL(key)` function
  - Use URLSearchParams API for parsing/serialization
  - Preserve existing query parameters when updating
  - Handle null values by removing parameter
  - Export all functions
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [ ]* 10.1 Write property test for URL state synchronization
  - **Property 5: URL State Synchronization**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.6**
  - Generate random filter combinations
  - Verify filters → URL → filters round-trip
  - Test with 100 iterations

- [ ]* 10.2 Write property test for query parameter preservation
  - **Property 6: Query Parameter Preservation**
  - **Validates: Requirements 10.8**
  - Test updating single parameter preserves others
  - Generate random initial parameters
  - Test with 100 iterations

- [ ]* 10.3 Write unit tests for URL state utilities
  - Test parseFiltersFromURL with various query strings
  - Test serializeFiltersToURL produces correct URLs
  - Test updateURLWithFilter preserves other params
  - Test clearFilterFromURL removes only target param
  - Test null values remove parameters
  - _Requirements: 18.2_

- [x] 11. Frontend: Update FilterTabs Component
  - Update `src/components/features/filters/FilterTabs.tsx`
  - Remove "Upcoming" tab from all content types
  - Implement `getTabsForContentType(contentType)` function
  - Add "Classics" and "Summaries" tabs for movies
  - Add "Ramadan Series" tab for series
  - Add "Masrah Masr", "Adel Imam", "Gulf Plays", "Classics" tabs for plays
  - Add "Animation Movies" and "Cartoon Series" tabs for anime
  - Keep only base tabs (All, Trending, Top Rated, Latest) for gaming and software
  - Highlight active tab with aria-current="page"
  - Use same labels as Navbar for consistency
  - Wrap in React.memo for performance
  - Add semantic nav element with aria-label="Content filters"
  - Ensure keyboard navigation with Tab key
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.13, 5.14, 14.1, 14.2, 14.7_

- [ ]* 11.1 Write property test for active tab highlighting
  - **Property 11: Active Tab Highlighting Consistency**
  - **Validates: Requirements 5.13**
  - Test all route paths
  - Verify exactly one tab highlighted
  - Test with all content types
  - Test with 100 iterations

- [ ]* 11.2 Write unit tests for FilterTabs component
  - Test "Upcoming" tab not rendered for any content type
  - Test "Classics" tab rendered for movies
  - Test "Ramadan Series" tab rendered for series
  - Test active tab has aria-current="page"
  - Test nav element has correct aria-label
  - _Requirements: 18.5_

- [x] 12. Frontend: Update AdvancedFilters Component
  - Update `src/components/features/filters/AdvancedFilters.tsx`
  - Add `useGenres` hook to fetch dynamic genres
  - Display loading skeleton while fetching genres
  - Fall back to hardcoded genres on error
  - Add "All" option as first option in sort dropdown with NULL value
  - Update sort dropdown to include {value: null, labelAr: 'الكل', labelEn: 'All'}
  - Make sortBy prop nullable in interface
  - Associate all select elements with visible labels using htmlFor
  - Add aria-label to each filter dropdown
  - Ensure minimum 44x44px touch target size for mobile
  - Wrap in React.memo for performance
  - Debounce filter changes by 300ms
  - _Requirements: 2.10, 2.11, 2.12, 2.13, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.1, 12.2, 12.13, 13.2, 14.3, 14.4, 14.9_

- [ ]* 12.1 Write unit tests for AdvancedFilters component
  - Test genres fetched from API on mount
  - Test loading state displayed while fetching
  - Test fallback genres displayed on error
  - Test "All" option in sort dropdown
  - Test sortBy=null when "All" selected
  - Test all dropdowns have aria-labels
  - Test debounced filter changes
  - _Requirements: 18.6_

- [x] 13. Frontend: Update useUnifiedContent Hook
  - Update `src/hooks/useUnifiedContent.ts`
  - Add genre parameter to ContentFetchParams
  - Add category parameter to ContentFetchParams
  - Make sortBy parameter nullable
  - Update query key to include genre, year, rating, sortBy, page
  - Pass genre parameter to API request
  - Pass category parameter to API request
  - Pass sortBy=null when "All" sort option selected
  - Set staleTime to 300000 (5 minutes)
  - Set gcTime to 600000 (10 minutes)
  - Set retry to 2 attempts
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.10, 11.1, 11.2, 11.3_

- [ ]* 13.1 Write property test for React Query key uniqueness
  - **Property 7: React Query Key Uniqueness**
  - **Validates: Requirements 11.2**
  - Generate two different filter combinations
  - Verify query keys are different
  - Test with 100 iterations

- [x] 14. Frontend: CategoryPage Component
  - Create `src/pages/discovery/CategoryPage.tsx`
  - Accept contentType and category props from route params
  - Use `mapCategorySlugToGenre` to convert slug to Arabic genre
  - Redirect to base content page if invalid category
  - Use `getGenreLabel` to get category display name
  - Render UnifiedSectionPage with pre-selected genre
  - Set page title to "{ContentType} - {CategoryName}"
  - Add route definitions in `src/routes/DiscoveryRoutes.tsx`
  - Create routes: `/:contentType/:category` for all content types
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 12.9_

- [ ]* 14.1 Write unit tests for CategoryPage component
  - Test valid category renders UnifiedSectionPage
  - Test invalid category redirects to base page
  - Test genre pre-selected in filters
  - Test page title includes category name
  - _Requirements: 18.6_

- [x] 15. Frontend: Islamic Content Pages
  - Create `src/pages/discovery/FatwasPage.tsx`
  - Render UnifiedSectionPage with contentType="series" and categoryFilter="fatwa"
  - Set page title to "فتاوى" / "Fatwas"
  - Create `src/pages/discovery/ProphetsStoriesPage.tsx`
  - Render UnifiedSectionPage with contentType="series" and categoryFilter="prophets"
  - Set page title to "قصص الأنبياء" / "Prophets Stories"
  - Add routes in `src/routes/DiscoveryRoutes.tsx`: `/fatwas` and `/prophets-stories`
  - Update Navbar links from search to dedicated pages
  - Update `src/components/layout/Navbar.tsx` Islamic links
  - Change Fatwas link from `/search?category=fatwa` to `/fatwas`
  - Change Prophets Stories link from `/search?category=prophets` to `/prophets-stories`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

- [ ]* 15.1 Write unit tests for Islamic content pages
  - Test FatwasPage renders with correct title
  - Test ProphetsStoriesPage renders with correct title
  - Test category filter applied correctly
  - Test Navbar links updated to new routes
  - _Requirements: 18.6_

- [x] 16. Frontend: Update UnifiedSectionPage
  - Update `src/pages/discovery/UnifiedSectionPage.tsx`
  - Accept initialGenre prop for pre-selected genre
  - Accept categoryFilter prop for Islamic content
  - Initialize filter state from URL parameters
  - Update URL when filters change using url-state utilities
  - Pass genre parameter to useUnifiedContent hook
  - Pass category parameter to useUnifiedContent hook
  - Handle browser back button to restore filter state
  - Display error message with retry button on fetch failure
  - Display loading skeleton only on initial fetch
  - Display "Updating..." indicator when refetching stale data
  - _Requirements: 10.6, 10.10, 11.5, 11.9, 12.2, 12.3, 12.4_

- [x] 17. Frontend: Prefetch Next Page
  - Update `src/hooks/usePrefetchNextPage.ts` or create if not exists
  - Implement scroll listener to detect 80% scroll position
  - Prefetch next page content when threshold reached
  - Use queryClient.prefetchQuery with next page params
  - Clean up scroll listener on unmount
  - _Requirements: 11.7_

- [x] 18. Frontend: Mobile Responsive Filters
  - Update FilterTabs for horizontal scrolling on mobile (width < 768px)
  - Hide scrollbar while maintaining scroll functionality
  - Add snap-to-tab behavior on mobile
  - Stack AdvancedFilters vertically on mobile
  - Expand filter dropdowns to full width on mobile
  - Use native select UI on iOS/Android
  - Collapse AdvancedFilters into "Filters" button on screens < 640px
  - Create bottom sheet modal for filters on mobile
  - Add "Apply Filters" button to close bottom sheet
  - Prevent body scroll when filter modal open
  - Ensure minimum 48px height for all controls on mobile
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12_

- [ ]* 18.1 Write unit tests for mobile responsive behavior
  - Test horizontal scrolling on mobile viewport
  - Test filters collapse into button on small screens
  - Test bottom sheet opens on button click
  - Test native select used on mobile devices
  - _Requirements: 18.6_

- [x] 19. Frontend: Accessibility Enhancements
  - Add aria-live="polite" for loading announcements
  - Announce result count to screen readers when filters update
  - Ensure all filter controls keyboard navigable
  - Support Enter key to activate filter tabs
  - Add skip link to bypass filters and jump to content
  - Use aria-expanded for expandable filter sections
  - Maintain focus management when filters update content
  - Run axe accessibility tests on filter components
  - _Requirements: 14.5, 14.6, 14.8, 14.10, 14.11, 14.12_

- [ ]* 19.1 Write property test for keyboard navigation
  - **Property 12: Keyboard Navigation Accessibility**
  - **Validates: Requirements 14.7**
  - Test all filter controls are keyboard navigable
  - Verify Tab key navigation works
  - Test with all content types
  - Test with 100 iterations

- [ ]* 19.2 Write accessibility tests for filter components
  - Test FilterTabs has no axe violations
  - Test AdvancedFilters has no axe violations
  - Test proper ARIA labels present
  - Test nav element has aria-label
  - _Requirements: 18.10_

- [x] 20. Checkpoint - Backend and Core Frontend Complete
  - Ensure all backend endpoints working correctly
  - Verify Genre API returns correct data for all content types
  - Verify enhanced search API accepts genre parameter
  - Verify FilterTabs renders without "Upcoming" tab
  - Verify AdvancedFilters fetches dynamic genres
  - Verify Islamic content pages accessible
  - Run all unit tests and verify passing
  - Ask the user if questions arise

- [x] 21. Integration: Filter Workflow Testing
  - Create `src/__tests__/integration/filter-workflow.test.ts`
  - Test selecting genre updates URL and filters content
  - Test selecting year filter updates URL and filters content
  - Test selecting rating filter updates URL and filters content
  - Test selecting sort option updates URL and sorts content
  - Test clearing filters removes URL parameters
  - Test browser back button restores previous filter state
  - Test multiple filters applied together
  - _Requirements: 18.7_

- [x] 22. Integration: Category Navigation Testing
  - Create `src/__tests__/integration/category-navigation.test.ts`
  - Test clicking category in Navbar navigates to category page
  - Test category page pre-selects genre in filters
  - Test category page displays correct content
  - Test invalid category redirects to base page
  - _Requirements: 18.7_

- [x] 23. Integration: Islamic Content Testing
  - Create `src/__tests__/integration/islamic-content.test.ts`
  - Test /fatwas route renders Fatwas content
  - Test /prophets-stories route renders Prophets Stories content
  - Test Navbar links navigate to correct pages
  - Test filters work on Islamic content pages
  - _Requirements: 18.7_

- [x] 24. End-to-End: Filter Selection Flow
  - Create `tests/e2e/filter-selection.spec.ts` (Playwright)
  - Test filtering movies by genre from navbar
  - Test genre filter pre-selected on category page
  - Test filters persist in URL
  - Test page reload restores filters from URL
  - Test bookmarking filtered page works
  - _Requirements: 18.7_

- [x] 25. End-to-End: Mobile Filter Experience
  - Create `tests/e2e/mobile-filters.spec.ts` (Playwright)
  - Test filters collapse into button on mobile viewport
  - Test bottom sheet opens when button clicked
  - Test native select UI on mobile devices
  - Test horizontal tab scrolling on mobile
  - Test touch targets meet 48px minimum
  - _Requirements: 18.7_

- [x] 26. Performance: Database Query Optimization
  - Run EXPLAIN ANALYZE on genre queries
  - Verify indexes are being used
  - Measure query response times
  - Optimize slow queries if needed
  - Add query performance logging
  - _Requirements: 13.5, 13.6_

- [x] 27. Performance: Frontend Optimization
  - Measure FilterTabs render time (target < 100ms)
  - Measure AdvancedFilters render time (target < 100ms)
  - Implement virtualization if genre list > 50 items
  - Verify React.memo preventing unnecessary re-renders
  - Verify debouncing reducing API calls
  - Measure cache hit rate (target > 70%)
  - _Requirements: 13.1, 13.2, 13.3, 13.7, 13.8, 13.9, 13.10_

- [x] 28. Analytics: Filter Usage Tracking
  - Implement filter selection event tracking
  - Track most frequently used genres per content type
  - Track average time between filter changes
  - Track filter abandonment rate
  - Track filter combination patterns
  - Batch analytics events (send every 30 seconds)
  - Respect user privacy settings
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.9_

- [x] 29. Monitoring: Error Tracking and Alerts
  - Add error logging for Genre API failures
  - Add error logging for search API failures
  - Track API response times
  - Set up alert for average response time > 2 seconds
  - Track error rate and display maintenance notice if > 50%
  - Log all API errors with request details
  - _Requirements: 12.5, 12.8, 16.11, 16.12_

- [x] 30. Documentation: Update Developer Docs
  - Create `docs/DYNAMIC_FILTERS.md` with system overview
  - Document Genre API endpoint usage
  - Document how to add new genres
  - Document genre translation mapping
  - Document filter state management
  - Document troubleshooting common issues
  - Update API.md with Genre API documentation
  - Update CHANGELOG.md with feature changes

- [x] 31. Final Checkpoint - Complete System Verification
  - Run full test suite (unit, property, integration, e2e)
  - Verify all tests passing
  - Test on multiple browsers (Chrome, Firefox, Safari)
  - Test on mobile devices (iOS, Android)
  - Verify accessibility with screen reader
  - Check performance metrics meet targets
  - Verify error handling works correctly
  - Test with slow network conditions
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All content data MUST come from CockroachDB API (NO Supabase)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests verify component interactions
- E2E tests validate complete user workflows
- Performance tasks ensure system meets speed targets
- Analytics and monitoring provide production insights

## Implementation Order

1. **Backend Foundation** (Tasks 1-6): Genre translation, database indexes, API endpoints
2. **Frontend Types & Utilities** (Tasks 7-10): TypeScript interfaces, genre utils, URL state
3. **Frontend Components** (Tasks 11-19): FilterTabs, AdvancedFilters, CategoryPage, Islamic pages
4. **Integration & Testing** (Tasks 20-25): Workflow tests, E2E tests
5. **Optimization** (Tasks 26-27): Performance tuning
6. **Production Readiness** (Tasks 28-31): Analytics, monitoring, documentation

## Success Criteria

- ✅ No "Upcoming" filter displayed for any content type
- ✅ Genres fetched dynamically from CockroachDB
- ✅ "All" sort option available (no mandatory sorting)
- ✅ Islamic content pages accessible at /fatwas and /prophets-stories
- ✅ Category filtering works from Navbar links
- ✅ Filter state synchronized with URL
- ✅ All property tests passing (100 iterations each)
- ✅ All unit tests passing (>90% coverage for utilities)
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Accessibility tests passing (no axe violations)
- ✅ Performance targets met (API < 500ms, render < 100ms)
- ✅ Mobile responsive design working correctly
- ✅ Error handling graceful with fallbacks
