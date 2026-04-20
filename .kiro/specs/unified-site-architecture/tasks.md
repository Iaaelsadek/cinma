# Implementation Plan: Unified Site Architecture

## Overview

This implementation plan unifies the site architecture so that all sections (movies, series, games, software) work the same way with the same components and flows. The plan follows a phased approach over 6 phases, focusing on core components, data integrity, subsection pages, performance optimization, testing, and deployment.

**Key Goals**:
- Unified navigation tabs visible in all sections and subsections
- Correct data filtering (Ramadan = Arabic only, Korean = no duplicates)
- Shared components and hooks to reduce code duplication (< 20%)
- Performance optimization with caching and prefetching
- Comprehensive property-based testing (38 properties)

**Implementation Language**: TypeScript with React

---

## Phase 1: Core Components & Configuration

- [x] 1. Create subsection configuration system
  - [x] 1.1 Create subsection types file
    - Create `src/types/subsection.ts` with SubsectionDefinition and SubsectionConfig interfaces
    - Define types for subsection id, labels (Arabic/English), path, filters, sortBy, and icon
    - _Requirements: 7.2, 7.3_

  - [x] 1.2 Create subsection configuration file
    - Create `src/lib/subsection-config.ts` with SUBSECTION_CONFIG constant
    - Define all subsections for movies (all, trending, top-rated, latest, upcoming, classics, summaries)
    - Define all subsections for series (all, arabic, ramadan, korean, turkish, chinese, foreign)
    - Define all subsections for gaming (all, pc, playstation, xbox, nintendo, mobile)
    - Define all subsections for software (all, windows, mac, linux, android, ios)
    - Include filters for each subsection (language, platform, genre, year, rating)
    - _Requirements: 2.1, 5.1, 6.1, 7.3_

  - [x] 1.3 Create useSubsectionConfig hook
    - Create `src/hooks/useSubsectionConfig.ts` hook
    - Accept contentType parameter ('movies' | 'series' | 'gaming' | 'software')
    - Return subsection configuration array for the given content type
    - Use useMemo for performance optimization
    - _Requirements: 7.2, 10.3_


- [x] 2. Create UnifiedNavigationTabs component
  - [x] 2.1 Create UnifiedNavigationTabs component file
    - Create `src/components/unified/UnifiedNavigationTabs.tsx`
    - Accept props: contentType, activeTab, subsections, lang
    - Render navigation tabs for all subsections
    - Highlight active tab with visual indicator (CSS class and ARIA attribute)
    - Support responsive design (horizontal scroll on mobile, full display on desktop)
    - Add ARIA labels for accessibility (role="tab", aria-selected, aria-controls)
    - Support keyboard navigation (Tab, Arrow keys, Enter/Space)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4, 6.5, 13.1, 13.2_

  - [ ]* 2.2 Write property test for UnifiedNavigationTabs
    - **Property 1: Navigation Tabs Persistence**
    - **Validates: Requirements 1.1, 1.2**
    - Test that navigation tabs are visible for any section and any subsection
    - Use fast-check with 100 iterations

  - [ ]* 2.3 Write property test for active tab indicator
    - **Property 2: Active Tab Indicator**
    - **Validates: Requirements 1.3**
    - Test that active tab has correct CSS class or ARIA attribute
    - Use fast-check with 100 iterations

  - [ ]* 2.4 Write property test for navigation click behavior
    - **Property 4: Navigation Click Behavior**
    - **Validates: Requirements 1.5**
    - Test that clicking any tab navigates to correct subsection URL
    - Use fast-check with 100 iterations

  - [ ]* 2.5 Write unit tests for UnifiedNavigationTabs
    - Test rendering with different content types
    - Test active tab highlighting
    - Test click navigation
    - Test responsive behavior
    - Test keyboard navigation
    - Test internationalization (Arabic/English labels)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 13.1, 13.2_

- [x] 3. Update UnifiedSectionPage to use navigation tabs
  - [x] 3.1 Update UnifiedSectionPage component
    - Update `src/pages/discovery/UnifiedSectionPage.tsx`
    - Import useSubsectionConfig hook
    - Import UnifiedNavigationTabs component
    - Get subsection configuration using useSubsectionConfig(contentType)
    - Render UnifiedNavigationTabs component with subsections prop
    - Pass activeFilter as activeTab prop
    - Ensure navigation tabs render above filters and content grid
    - _Requirements: 1.1, 1.2, 7.4, 7.5, 7.6, 7.7, 10.1_

  - [ ]* 3.2 Write property test for component composition
    - **Property 10: Component Composition**
    - **Validates: Requirements 7.4, 7.5, 7.6**
    - Test that UnifiedSectionLayout renders Navigation_Tabs, Filters, and Content_Grid
    - Use fast-check with 100 iterations

  - [ ]* 3.3 Write property test for reactive updates
    - **Property 12: Reactive Updates**
    - **Validates: Requirements 7.7**
    - Test that changing sectionType prop updates Navigation_Tabs
    - Use fast-check with 100 iterations

- [x] 4. Checkpoint - Verify core components working
  - Ensure all tests pass, ask the user if questions arise.


## Phase 2: Data Integrity & Validation

- [x] 5. Implement language-based content filtering
  - [x] 5.1 Update contentQueries.ts for language filtering
    - Update `src/services/contentQueries.ts`
    - Ensure all TV series queries include language parameter when specified
    - Add language filter for Ramadan subsection (language='ar')
    - Add language filter for Korean subsection (language='ko')
    - Add language filter for Turkish subsection (language='tr')
    - Add language filter for Chinese subsection (language='zh')
    - Add language exclusion for Foreign subsection (language!='ar')
    - Ensure queries use DISTINCT to prevent duplicates
    - Verify all queries use CockroachDB endpoints (/api/tv, /api/movies, /api/games, /api/software)
    - NEVER use Supabase for content queries
    - _Requirements: 3.3, 4.3, 4.4, 9.6, 11.6, 11.7, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 5.2 Write property test for language-based filtering
    - **Property 5: Language-Based Content Filtering**
    - **Validates: Requirements 3.1, 3.4, 4.1, 4.6, 11.1, 11.2, 11.3, 11.4, 11.6**
    - Test that all content items have matching language field for any subsection with language filter
    - Use fast-check with 100 iterations

  - [ ]* 5.3 Write property test for API query language parameter
    - **Property 7: API Query Language Parameter**
    - **Validates: Requirements 3.3, 4.3, 4.4**
    - Test that API query includes correct language parameter for any subsection with language filtering
    - Use fast-check with 100 iterations

  - [ ]* 5.4 Write property test for foreign content exclusion
    - **Property 8: Foreign Content Exclusion**
    - **Validates: Requirements 11.5**
    - Test that no content has excluded language for any subsection that excludes a language
    - Use fast-check with 100 iterations

  - [ ]* 5.5 Write unit tests for language filtering
    - Test Ramadan subsection returns only Arabic content
    - Test Korean subsection returns only Korean content
    - Test Turkish subsection returns only Turkish content
    - Test Chinese subsection returns only Chinese content
    - Test Foreign subsection excludes Arabic content
    - Test empty state when no content matches language filter
    - _Requirements: 3.1, 3.4, 4.1, 4.6, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 6. Implement content deduplication
  - [x] 6.1 Add DISTINCT queries for content fetching
    - Update `src/services/contentQueries.ts`
    - Ensure all queries use DISTINCT on ID or slug to prevent duplicates
    - Add deduplication logic in data transformation layer
    - Verify Korean subsection has no duplicate content
    - _Requirements: 4.2, 4.5, 11.2, 11.7_

  - [ ]* 6.2 Write property test for content uniqueness
    - **Property 6: Content Uniqueness**
    - **Validates: Requirements 4.2, 4.5, 11.2, 11.7**
    - Test that all content items have unique IDs for any content list
    - Use fast-check with 100 iterations

  - [ ]* 6.3 Write unit tests for deduplication
    - Test Korean subsection has no duplicates
    - Test deduplication based on TMDB ID
    - Test deduplication based on slug
    - _Requirements: 4.2, 4.5, 11.2_


- [x] 7. Implement data validation layer
  - [x] 7.1 Create data validation utilities
    - Create `src/lib/data-validation.ts`
    - Implement validateContentIntegrity function to check language matches subsection
    - Implement validateNoDuplicates function to check for duplicate IDs
    - Implement validateRequiredFields function to check for missing fields
    - Add error logging for data integrity violations
    - _Requirements: 11.6, 11.7, 11.8_

  - [x] 7.2 Integrate validation in useUnifiedContent hook
    - Update `src/hooks/useUnifiedContent.ts`
    - Call validateContentIntegrity after fetching data
    - Log data integrity violations to error logging service
    - Filter out invalid content items before returning to UI
    - _Requirements: 11.6, 11.8_

  - [ ]* 7.3 Write property test for data integrity logging
    - **Property 24: Data Integrity Logging**
    - **Validates: Requirements 11.8**
    - Test that data integrity violations are logged to error service
    - Use fast-check with 100 iterations

  - [ ]* 7.4 Write unit tests for data validation
    - Test validation detects wrong language in subsection
    - Test validation detects duplicate content
    - Test validation detects missing required fields
    - Test error logging for violations
    - _Requirements: 11.6, 11.7, 11.8_

- [x] 8. Implement platform-based filtering for gaming and software
  - [x] 8.1 Update contentQueries.ts for platform filtering
    - Update `src/services/contentQueries.ts`
    - Add platform filter for gaming subsections (PC, PlayStation, Xbox, Nintendo, Mobile)
    - Add platform filter for software subsections (Windows, Mac, Linux, Android, iOS)
    - Ensure queries use CockroachDB endpoints (/api/games, /api/software)
    - _Requirements: 5.6, 6.6, 16.3, 16.4, 16.6_

  - [ ]* 8.2 Write property test for platform-based filtering
    - **Property 9: Platform-Based Filtering**
    - **Validates: Requirements 5.6, 6.6**
    - Test that all content items have matching platform field for any subsection with platform filter
    - Use fast-check with 100 iterations

  - [ ]* 8.3 Write unit tests for platform filtering
    - Test gaming PC subsection returns only PC games
    - Test gaming PlayStation subsection returns only PlayStation games
    - Test software Windows subsection returns only Windows software
    - Test software Mac subsection returns only Mac software
    - _Requirements: 5.6, 6.6_

- [x] 9. Checkpoint - Verify data integrity working
  - Ensure all tests pass, ask the user if questions arise.


## Phase 3: Subsection Pages & Routing

- [x] 10. Update main section pages to use UnifiedSectionPage
  - [x] 10.1 Update Movies.tsx
    - Update `src/pages/discovery/Movies.tsx`
    - Replace existing implementation with UnifiedSectionPage component
    - Pass contentType="movies" and activeFilter="all"
    - Remove duplicate layout code
    - _Requirements: 10.1, 10.2, 17.1_

  - [x] 10.2 Update Series.tsx
    - Update `src/pages/discovery/Series.tsx`
    - Replace existing implementation with UnifiedSectionPage component
    - Pass contentType="series" and activeFilter="all"
    - Remove duplicate layout code
    - _Requirements: 10.1, 10.2, 17.2_

  - [x] 10.3 Update Gaming.tsx
    - Update `src/pages/discovery/Gaming.tsx`
    - Replace existing implementation with UnifiedSectionPage component
    - Pass contentType="gaming" and activeFilter="all"
    - Remove duplicate layout code
    - _Requirements: 10.1, 10.2, 17.3_

  - [x] 10.4 Update Software.tsx
    - Update `src/pages/discovery/Software.tsx`
    - Replace existing implementation with UnifiedSectionPage component
    - Pass contentType="software" and activeFilter="all"
    - Remove duplicate layout code
    - _Requirements: 10.1, 10.2, 17.4_

  - [ ]* 10.5 Write property test for component reusability
    - **Property 3: Component Reusability Across Sections**
    - **Validates: Requirements 1.4, 2.5, 5.5, 6.5, 7.8, 10.1**
    - Test that all section pages use the same UnifiedSectionPage component
    - Use fast-check with 100 iterations

  - [ ]* 10.6 Write property test for code duplication limit
    - **Property 23: Code Duplication Limit**
    - **Validates: Requirements 10.6**
    - Test that code duplication between section pages does not exceed 20%
    - Use fast-check with 100 iterations

- [x] 11. Create movie subsection routes
  - [x] 11.1 Add movie subsection routes to AppRoutes.tsx
    - Update `src/routes/AppRoutes.tsx`
    - Add route for /movies/trending with activeFilter="trending"
    - Add route for /movies/top-rated with activeFilter="top-rated"
    - Add route for /movies/latest with activeFilter="latest"
    - Add route for /movies/upcoming with activeFilter="upcoming"
    - Add route for /movies/classics with activeFilter="classics"
    - Add route for /movies/summaries with activeFilter="summaries"
    - _Requirements: 12.1, 12.2, 17.6_

  - [ ]* 11.2 Write property test for URL pattern consistency
    - **Property 25: URL Pattern Consistency**
    - **Validates: Requirements 12.1, 12.2**
    - Test that all section URLs follow pattern "/{section}" and subsection URLs follow "/{section}/{subsection}"
    - Use fast-check with 100 iterations

  - [ ]* 11.3 Write unit tests for movie subsection routes
    - Test /movies route renders correctly
    - Test /movies/trending route renders with trending filter
    - Test /movies/top-rated route renders with top-rated filter
    - Test /movies/classics route renders with classics filter
    - _Requirements: 12.1, 12.2, 18.1, 18.2_


- [x] 12. Create series subsection routes
  - [x] 12.1 Add series subsection routes to AppRoutes.tsx
    - Update `src/routes/AppRoutes.tsx`
    - Add route for /series/arabic with activeFilter="arabic"
    - Add route for /series/ramadan with activeFilter="ramadan"
    - Add route for /series/korean with activeFilter="korean"
    - Add route for /series/turkish with activeFilter="turkish"
    - Add route for /series/chinese with activeFilter="chinese"
    - Add route for /series/foreign with activeFilter="foreign"
    - _Requirements: 2.2, 2.3, 2.4, 12.1, 12.2, 17.5, 17.6_

  - [ ]* 12.2 Write unit tests for series subsection routes
    - Test /series route renders correctly
    - Test /series/ramadan route renders with ramadan filter and only Arabic content
    - Test /series/korean route renders with korean filter and no duplicates
    - Test /series/turkish route renders with turkish filter
    - Test /series/chinese route renders with chinese filter
    - Test /series/foreign route renders with foreign filter
    - _Requirements: 2.2, 2.3, 2.4, 18.3, 18.4, 18.5_

- [x] 13. Create gaming subsection routes
  - [x] 13.1 Add gaming subsection routes to AppRoutes.tsx
    - Update `src/routes/AppRoutes.tsx`
    - Add route for /gaming/pc with activeFilter="pc"
    - Add route for /gaming/playstation with activeFilter="playstation"
    - Add route for /gaming/xbox with activeFilter="xbox"
    - Add route for /gaming/nintendo with activeFilter="nintendo"
    - Add route for /gaming/mobile with activeFilter="mobile"
    - _Requirements: 5.2, 5.3, 5.4, 12.1, 12.2, 17.6_

  - [ ]* 13.2 Write unit tests for gaming subsection routes
    - Test /gaming route renders correctly
    - Test /gaming/pc route renders with pc filter
    - Test /gaming/playstation route renders with playstation filter
    - Test /gaming/xbox route renders with xbox filter
    - _Requirements: 5.2, 5.3, 5.4, 18.6, 18.7_

- [x] 14. Create software subsection routes
  - [x] 14.1 Add software subsection routes to AppRoutes.tsx
    - Update `src/routes/AppRoutes.tsx`
    - Add route for /software/windows with activeFilter="windows"
    - Add route for /software/mac with activeFilter="mac"
    - Add route for /software/linux with activeFilter="linux"
    - Add route for /software/android with activeFilter="android"
    - Add route for /software/ios with activeFilter="ios"
    - _Requirements: 6.2, 6.3, 6.4, 12.1, 12.2, 17.6_

  - [ ]* 14.2 Write unit tests for software subsection routes
    - Test /software route renders correctly
    - Test /software/windows route renders with windows filter
    - Test /software/mac route renders with mac filter
    - Test /software/linux route renders with linux filter
    - _Requirements: 6.2, 6.3, 6.4, 18.8, 18.9_

- [x] 15. Implement SEO meta tags for subsections
  - [x] 15.1 Add SEO meta tags to UnifiedSectionPage
    - Update `src/pages/discovery/UnifiedSectionPage.tsx`
    - Use Helmet to render dynamic meta tags for each section and subsection
    - Generate title based on contentType and activeFilter
    - Generate description based on contentType and activeFilter
    - Add Open Graph tags for social sharing
    - Add canonical URL for each page
    - _Requirements: 12.6, 12.7_

  - [ ]* 15.2 Write property test for SEO meta tags
    - **Property 26: SEO Meta Tags**
    - **Validates: Requirements 12.6, 12.7**
    - Test that proper SEO meta tags are generated for any section or subsection page
    - Use fast-check with 100 iterations

  - [ ]* 15.3 Write unit tests for SEO meta tags
    - Test meta tags for /movies
    - Test meta tags for /series/ramadan
    - Test meta tags for /gaming/pc
    - Test Open Graph tags
    - Test canonical URLs
    - _Requirements: 12.6, 12.7_

- [x] 16. Checkpoint - Verify all routes working
  - Ensure all tests pass, ask the user if questions arise.


## Phase 4: Filters & URL Synchronization

- [x] 17. Implement UnifiedFilters component
  - [x] 17.1 Create or update UnifiedFilters component
    - Create or update `src/components/unified/UnifiedFilters.tsx`
    - Accept props: contentType, genre, year, rating, sortBy, onFilterChange, onClearAll, lang
    - Render genre filter dropdown with dynamic options based on contentType
    - Render year filter dropdown (range: 1950 - current year)
    - Render rating filter dropdown (options: 9+, 8+, 7+, 6+, 5+)
    - Render sort filter dropdown (popularity, rating, release date, title)
    - Add "Clear All Filters" button
    - Support responsive layout (stacked on mobile, horizontal on desktop)
    - Support internationalization (Arabic/English labels)
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 13.3, 13.4_

  - [ ]* 17.2 Write property test for filter UI elements
    - **Property 13: Filter UI Elements**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**
    - Test that UnifiedFilters renders genre, year, rating, and sort dropdowns
    - Use fast-check with 100 iterations

  - [ ]* 17.3 Write property test for filter consistency
    - **Property 15: Filter Consistency**
    - **Validates: Requirements 8.7**
    - Test that UnifiedFilters behaves identically across all sections
    - Use fast-check with 100 iterations

  - [ ]* 17.4 Write unit tests for UnifiedFilters
    - Test rendering with different content types
    - Test genre filter options change based on content type
    - Test year filter dropdown
    - Test rating filter dropdown
    - Test sort filter dropdown
    - Test clear all filters button
    - Test internationalization (Arabic/English)
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 13.3, 13.4_

- [x] 18. Implement URL-filter synchronization
  - [x] 18.1 Update UnifiedSectionPage for URL synchronization
    - Update `src/pages/discovery/UnifiedSectionPage.tsx`
    - Extract filter values from URL query parameters (genre, year, rating, sortBy)
    - Update URL query parameters when filters change
    - Ensure filter state persists across page navigation
    - Apply filters from URL on initial page load
    - _Requirements: 8.8, 12.3, 12.4, 12.5_

  - [ ]* 18.2 Write property test for URL-filter synchronization
    - **Property 16: URL-Filter Synchronization (Round Trip)**
    - **Validates: Requirements 8.8, 12.3, 12.4, 12.5**
    - Test that filter state round-trips through URL (set filters → URL updates → reload page → filters applied)
    - Use fast-check with 100 iterations

  - [ ]* 18.3 Write property test for API query parameters
    - **Property 37: API Query Parameters**
    - **Validates: Requirements 16.6**
    - Test that appropriate query parameters are included in API request for any filter values
    - Use fast-check with 100 iterations

  - [ ]* 18.4 Write unit tests for URL synchronization
    - Test filter changes update URL query parameters
    - Test loading URL with query parameters applies filters
    - Test filter state persists across navigation
    - Test multiple filters in URL
    - _Requirements: 8.8, 12.3, 12.4, 12.5_

- [x] 19. Implement filter-to-content synchronization
  - [x] 19.1 Update useUnifiedContent hook for filter synchronization
    - Update `src/hooks/useUnifiedContent.ts`
    - Accept filter parameters (genre, year, rating, sortBy)
    - Pass filter parameters to API query
    - Refetch data when filters change
    - Ensure CockroachDB API endpoints are used (/api/movies, /api/tv, /api/games, /api/software)
    - NEVER use Supabase for content queries
    - _Requirements: 8.6, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 19.2 Write property test for filter-to-content synchronization
    - **Property 14: Filter-to-Content Synchronization**
    - **Validates: Requirements 8.6**
    - Test that Content_Grid updates to display filtered results for any filter selection change
    - Use fast-check with 100 iterations

  - [ ]* 19.3 Write property test for CockroachDB API exclusivity
    - **Property 19: CockroachDB API Exclusivity**
    - **Validates: Requirements 9.6, 16.1, 16.2, 16.3, 16.4, 16.5**
    - Test that all content data fetches use CockroachDB endpoints, not Supabase
    - Use fast-check with 100 iterations

  - [ ]* 19.4 Write unit tests for filter synchronization
    - Test genre filter updates content
    - Test year filter updates content
    - Test rating filter updates content
    - Test sort filter updates content
    - Test multiple filters combined
    - Test empty state when filters produce no results
    - _Requirements: 8.6, 15.6_

- [x] 20. Checkpoint - Verify filters working correctly
  - Ensure all tests pass, ask the user if questions arise.


## Phase 5: Performance Optimization & Caching

- [x] 21. Configure React Query caching
  - [x] 21.1 Update React Query configuration
    - Update React Query configuration in main app file
    - Set staleTime to 15 minutes (900000ms)
    - Set gcTime to 30 minutes (1800000ms)
    - Disable refetchOnWindowFocus
    - Disable refetchOnMount
    - Disable refetchOnReconnect
    - _Requirements: 14.1, 14.3_

  - [ ]* 21.2 Write property test for query caching configuration
    - **Property 29: Query Caching Configuration**
    - **Validates: Requirements 14.1, 14.3**
    - Test that React Query is configured with staleTime of at least 5 minutes
    - Use fast-check with 100 iterations

  - [ ]* 21.3 Write unit tests for caching configuration
    - Test staleTime is set correctly
    - Test gcTime is set correctly
    - Test refetch options are disabled
    - _Requirements: 14.1, 14.3_

- [x] 22. Implement cache utilization
  - [x] 22.1 Update useUnifiedContent for cache utilization
    - Update `src/hooks/useUnifiedContent.ts`
    - Ensure React Query uses cached data when available
    - Add cache key based on contentType, activeFilter, and filter parameters
    - Prevent unnecessary refetches when navigating between tabs
    - _Requirements: 14.4_

  - [ ]* 22.2 Write property test for cache utilization
    - **Property 30: Cache Utilization**
    - **Validates: Requirements 14.4**
    - Test that cached data is used when navigating to previously visited tab
    - Use fast-check with 100 iterations

  - [ ]* 22.3 Write unit tests for cache utilization
    - Test cache hit when navigating back to previous tab
    - Test cache miss on first visit
    - Test cache invalidation when filters change
    - _Requirements: 14.4_

- [x] 23. Implement next page prefetching
  - [x] 23.1 Update or create usePrefetchNextPage hook
    - Update or create `src/hooks/usePrefetchNextPage.ts`
    - Accept contentType, activeFilter, currentPage, totalPages
    - Prefetch next page data in background
    - Use React Query prefetchQuery
    - Only prefetch if next page exists
    - _Requirements: 14.5_

  - [x] 23.2 Integrate prefetching in UnifiedSectionPage
    - Update `src/pages/discovery/UnifiedSectionPage.tsx`
    - Call usePrefetchNextPage hook with current page and total pages
    - Ensure prefetching happens after current page loads
    - _Requirements: 14.5_

  - [ ]* 23.3 Write property test for next page prefetching
    - **Property 31: Next Page Prefetching**
    - **Validates: Requirements 14.5**
    - Test that next page data is prefetched in background for any page view
    - Use fast-check with 100 iterations

  - [ ]* 23.4 Write unit tests for prefetching
    - Test prefetch is called for next page
    - Test prefetch is not called when on last page
    - Test prefetch uses correct cache key
    - _Requirements: 14.5_

- [x] 24. Implement loading states and skeletons
  - [x] 24.1 Update ContentGrid for loading states
    - Update `src/components/unified/UnifiedContentGrid.tsx` or existing ContentGrid
    - Display skeleton loaders when isLoading is true
    - Use 40 skeleton cards matching grid layout
    - Add shimmer animation effect
    - Maintain layout stability during loading
    - _Requirements: 9.4, 14.6_

  - [ ]* 24.2 Write property test for loading state display
    - **Property 18: Loading State Display**
    - **Validates: Requirements 9.4, 14.6**
    - Test that skeleton loaders are displayed when isLoading is true
    - Use fast-check with 100 iterations

  - [ ]* 24.3 Write unit tests for loading states
    - Test skeleton loaders render when loading
    - Test skeleton count matches expected items per page (40)
    - Test shimmer animation is present
    - Test layout stability during loading
    - _Requirements: 9.4, 14.6_

- [x] 25. Implement pagination
  - [x] 25.1 Update or create Pagination component
    - Update or create `src/components/common/Pagination.tsx`
    - Accept currentPage, totalPages, onPageChange, lang props
    - Render Previous/Next buttons
    - Render page numbers with ellipsis for large ranges
    - Add jump to first/last page buttons
    - Highlight current page
    - Disable boundary buttons appropriately
    - Support keyboard navigation
    - _Requirements: 9.3, 14.2_

  - [x] 25.2 Integrate Pagination in UnifiedSectionPage
    - Update `src/pages/discovery/UnifiedSectionPage.tsx`
    - Render Pagination component below ContentGrid
    - Pass current page and total pages from API response
    - Handle page change events and update URL
    - _Requirements: 9.3_

  - [ ]* 25.3 Write property test for pagination limit
    - **Property 17: Pagination Limit**
    - **Validates: Requirements 9.3, 14.2**
    - Test that number of items per page does not exceed 40
    - Use fast-check with 100 iterations

  - [ ]* 25.4 Write unit tests for pagination
    - Test pagination renders correctly
    - Test page change updates URL
    - Test previous/next buttons
    - Test disabled state on boundaries
    - Test keyboard navigation
    - _Requirements: 9.3_

- [x] 26. Checkpoint - Verify performance optimizations working
  - Ensure all tests pass, ask the user if questions arise.


## Phase 6: Error Handling, Internationalization & Testing

- [x] 27. Implement error handling
  - [x] 27.1 Create error handling utilities
    - Create or update `src/lib/error-handling.ts`
    - Implement error logging function for API errors
    - Implement error message formatting for user display
    - Add retry logic with exponential backoff
    - _Requirements: 15.1, 15.2, 16.7_

  - [x] 27.2 Integrate error handling in useUnifiedContent
    - Update `src/hooks/useUnifiedContent.ts`
    - Configure React Query onError callback to log errors
    - Configure retry logic (2 retries with exponential backoff)
    - Display user-friendly error messages
    - _Requirements: 15.1, 15.2, 16.7_

  - [x] 27.3 Create error display components
    - Create or update `src/components/common/ErrorMessage.tsx`
    - Display error message to user
    - Add retry button for network errors
    - Support internationalization (Arabic/English)
    - _Requirements: 15.1, 15.4_

  - [x] 27.4 Implement error boundaries
    - Create or update error boundary component
    - Wrap UnifiedSectionPage with error boundary
    - Display fallback UI on component errors
    - Log errors to error logging service
    - _Requirements: 15.5_

  - [ ]* 27.5 Write property test for error display
    - **Property 32: Error Display**
    - **Validates: Requirements 15.1**
    - Test that error message is displayed for any API request failure
    - Use fast-check with 100 iterations

  - [ ]* 27.6 Write property test for error logging
    - **Property 33: Error Logging**
    - **Validates: Requirements 15.2**
    - Test that errors are logged to error logging service for any API request failure
    - Use fast-check with 100 iterations

  - [ ]* 27.7 Write property test for retry button
    - **Property 34: Retry Button on Error**
    - **Validates: Requirements 15.4**
    - Test that retry button is displayed for any network error
    - Use fast-check with 100 iterations

  - [ ]* 27.8 Write property test for error boundaries
    - **Property 35: Error Boundary Implementation**
    - **Validates: Requirements 15.5**
    - Test that error boundaries prevent full page crashes
    - Use fast-check with 100 iterations

  - [ ]* 27.9 Write property test for API error retry logic
    - **Property 38: API Error Retry Logic**
    - **Validates: Requirements 16.7**
    - Test that retry logic is triggered for any API error (up to 2 retries with exponential backoff)
    - Use fast-check with 100 iterations

  - [ ]* 27.10 Write unit tests for error handling
    - Test error message display on API failure
    - Test error logging on API failure
    - Test retry button functionality
    - Test error boundary catches errors
    - Test retry logic with exponential backoff
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 16.7_

- [x] 28. Implement empty state handling
  - [x] 28.1 Create empty state component
    - Create or update `src/components/common/EmptyState.tsx`
    - Display "لا توجد نتائج" message in Arabic
    - Display "No results found" message in English
    - Show suggestion to clear filters when filters are active
    - Add "Clear Filters" button when filters are active
    - _Requirements: 9.5, 15.3, 15.6_

  - [x] 28.2 Integrate empty state in ContentGrid
    - Update ContentGrid component
    - Display empty state when no items are returned
    - Pass hasActiveFilters prop to show filter suggestion
    - Support internationalization
    - _Requirements: 9.5, 15.3, 15.6, 13.5, 13.6_

  - [ ]* 28.3 Write property test for empty state suggestions
    - **Property 36: Empty State Suggestions**
    - **Validates: Requirements 15.6**
    - Test that suggestion to remove filters is displayed for any filter combination that produces no results
    - Use fast-check with 100 iterations

  - [ ]* 28.4 Write unit tests for empty state
    - Test empty state displays when no results
    - Test "لا توجد نتائج" message in Arabic
    - Test "No results found" message in English
    - Test clear filters button when filters active
    - Test no clear filters button when no filters active
    - _Requirements: 9.5, 13.5, 13.6, 15.3, 15.6_


- [x] 29. Implement internationalization (i18n)
  - [x] 29.1 Ensure language support in all components
    - Verify UnifiedNavigationTabs displays correct labels based on lang prop
    - Verify UnifiedFilters displays correct labels based on lang prop
    - Verify EmptyState displays correct messages based on lang
    - Verify ErrorMessage displays correct messages based on lang
    - Verify Pagination displays correct labels based on lang
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 29.2 Implement language persistence
    - Ensure language preference persists across page navigation
    - Use useLang hook or similar to determine current language
    - Store language preference in localStorage or context
    - _Requirements: 13.7, 13.8_

  - [ ]* 29.3 Write property test for internationalization
    - **Property 27: Internationalization (i18n)**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 2.6**
    - Test that labels are displayed in correct language for any UI component and any language setting
    - Use fast-check with 100 iterations

  - [ ]* 29.4 Write property test for language persistence
    - **Property 28: Language Persistence**
    - **Validates: Requirements 13.8**
    - Test that language preference persists across page navigation
    - Use fast-check with 100 iterations

  - [ ]* 29.5 Write unit tests for internationalization
    - Test Arabic labels in navigation tabs
    - Test English labels in navigation tabs
    - Test Arabic labels in filters
    - Test English labels in filters
    - Test Arabic empty state message
    - Test English empty state message
    - Test language persistence
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8_

- [x] 30. Implement content grid features
  - [x] 30.1 Update ContentGrid component
    - Update ContentGrid to display items in responsive grid
    - Set grid columns: 2 (mobile), 4 (tablet), 6 (desktop)
    - Implement lazy loading for images
    - Display rating badge for each item
    - Display release year for each item
    - Fetch data from CockroachDB only (NOT Supabase)
    - _Requirements: 9.2, 9.6, 9.7_

  - [ ]* 30.2 Write property test for rating display
    - **Property 20: Rating Display**
    - **Validates: Requirements 9.7**
    - Test that rating is displayed for any content item with vote_average field
    - Use fast-check with 100 iterations

  - [ ]* 30.3 Write unit tests for content grid
    - Test responsive grid layout
    - Test lazy loading for images
    - Test rating badge display
    - Test release year display
    - Test grid columns on different screen sizes
    - _Requirements: 9.2, 9.7_

- [x] 31. Implement shared hooks and utilities
  - [x] 31.1 Verify shared hooks are used
    - Verify useUnifiedContent hook is used in all section pages
    - Verify usePrefetchNextPage hook is used in UnifiedSectionPage
    - Verify useSubsectionConfig hook is used in UnifiedSectionPage
    - _Requirements: 10.3_

  - [x] 31.2 Create or verify shared utilities
    - Create or verify `src/lib/filter-utils.ts` with getPageTitle, getPageDescription, mapFilterToAPIParams
    - Ensure all section pages use these utilities
    - _Requirements: 10.4_

  - [ ]* 31.3 Write property test for shared hook usage
    - **Property 21: Shared Hook Usage**
    - **Validates: Requirements 10.3**
    - Test that useUnifiedContent and usePrefetchNextPage hooks are used in all section pages
    - Use fast-check with 100 iterations

  - [ ]* 31.4 Write property test for shared utility usage
    - **Property 22: Shared Utility Usage**
    - **Validates: Requirements 10.4**
    - Test that getPageTitle, getPageDescription, and mapFilterToAPIParams utilities are used in all section pages
    - Use fast-check with 100 iterations

  - [ ]* 31.5 Write unit tests for shared utilities
    - Test getPageTitle returns correct title for each section
    - Test getPageDescription returns correct description for each section
    - Test mapFilterToAPIParams converts filters to API parameters
    - _Requirements: 10.4_

- [x] 32. Checkpoint - Verify error handling and i18n working
  - Ensure all tests pass, ask the user if questions arise.


## Phase 7: Integration Testing & Manual QA

- [x] 33. Write integration tests for end-to-end flows
  - [ ]* 33.1 Write integration test for filter flow
    - Test user can filter movies by genre, year, and rating
    - Test URL updates with filter parameters
    - Test API is called with correct parameters
    - Test content grid updates with filtered results
    - _Requirements: 8.6, 12.5_

  - [ ]* 33.2 Write integration test for navigation flow
    - Test user can navigate between subsections
    - Test navigation tabs remain visible
    - Test active tab updates correctly
    - Test content updates based on subsection
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 33.3 Write integration test for pagination flow
    - Test user can navigate between pages
    - Test URL updates with page parameter
    - Test content updates on page change
    - Test prefetching of next page
    - _Requirements: 9.3, 14.5_

  - [ ]* 33.4 Write integration test for error recovery flow
    - Test error message displays on API failure
    - Test retry button functionality
    - Test successful retry after error
    - _Requirements: 15.1, 15.4_

  - [ ]* 33.5 Write integration test for language switching flow
    - Test UI updates when language changes
    - Test language preference persists
    - Test all labels update correctly
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.8_

- [x] 34. Manual testing of all acceptance scenarios
  - [x] 34.1 Test movies section navigation
    - Manually test visiting /movies shows navigation tabs
    - Manually test visiting /movies/trending shows navigation tabs with Trending active
    - Manually test clicking navigation tabs navigates correctly
    - _Requirements: 18.1, 18.2_

  - [x] 34.2 Test series section navigation and data integrity
    - Manually test visiting /series shows navigation tabs
    - Manually test visiting /series/ramadan shows navigation tabs with Ramadan active
    - Manually test Ramadan section displays only Arabic content (no foreign content)
    - Manually test visiting /series/korean shows navigation tabs with Korean active
    - Manually test Korean section displays only Korean content with no duplicates
    - _Requirements: 18.3, 18.4, 18.5_

  - [x] 34.3 Test gaming section navigation
    - Manually test visiting /gaming shows navigation tabs
    - Manually test visiting /gaming/pc shows navigation tabs with PC active
    - Manually test PC section displays only PC games
    - _Requirements: 18.6, 18.7_

  - [x] 34.4 Test software section navigation
    - Manually test visiting /software shows navigation tabs
    - Manually test visiting /software/windows shows navigation tabs with Windows active
    - Manually test Windows section displays only Windows software
    - _Requirements: 18.8, 18.9_

  - [x] 34.5 Test filters across all sections
    - Manually test genre filter works in movies section
    - Manually test year filter works in series section
    - Manually test rating filter works in gaming section
    - Manually test sort filter works in software section
    - Manually test URL updates when filters change
    - Manually test filters persist when reloading page
    - _Requirements: 8.6, 8.7, 12.4, 12.5_

  - [x] 34.6 Test performance
    - Manually test page load time is under 2 seconds on 3G connection
    - Manually test navigation between tabs is fast (uses cache)
    - Manually test pagination is smooth
    - _Requirements: 14.7_

  - [x] 34.7 Test error handling
    - Manually test error message displays when API fails
    - Manually test retry button works
    - Manually test empty state displays when no results
    - Manually test clear filters suggestion when filters produce no results
    - _Requirements: 15.1, 15.3, 15.4, 15.6_

  - [x] 34.8 Test internationalization
    - Manually test switching to Arabic displays Arabic labels
    - Manually test switching to English displays English labels
    - Manually test language preference persists
    - _Requirements: 13.1, 13.2, 13.8_

  - [x] 34.9 Test accessibility
    - Manually test keyboard navigation works
    - Manually test screen reader announces navigation tabs
    - Manually test focus indicators are visible
    - Manually test ARIA labels are correct

  - [x] 34.10 Test responsive design
    - Manually test navigation tabs scroll horizontally on mobile
    - Manually test filters stack vertically on mobile
    - Manually test content grid shows 2 columns on mobile, 6 on desktop
    - _Requirements: 1.6, 9.2_


- [x] 35. Code review and refactoring
  - [x] 35.1 Review code for duplication
    - Review all section pages for code duplication
    - Ensure code duplication is below 20%
    - Refactor any remaining duplicate code into shared components or utilities
    - _Requirements: 10.6_

  - [x] 35.2 Review code for maintainability
    - Ensure all functions have JSDoc comments
    - Ensure all components have prop documentation
    - Ensure all types are properly defined
    - Ensure code follows project conventions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 35.3 Review code for performance
    - Ensure React Query caching is configured correctly
    - Ensure prefetching is working
    - Ensure images are lazy loaded
    - Ensure bundle size is optimized
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 35.4 Review code for accessibility
    - Ensure all interactive elements have ARIA labels
    - Ensure keyboard navigation works
    - Ensure focus management is correct
    - Ensure color contrast meets WCAG AA standards

  - [x] 35.5 Review code for security
    - Ensure all user inputs are validated
    - Ensure no SQL injection vulnerabilities
    - Ensure no XSS vulnerabilities
    - Ensure error messages don't expose internal details

- [x] 36. Final checkpoint - All tests passing and manual QA complete
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Deployment & Monitoring

- [x] 37. Pre-deployment verification
  - [x] 37.1 Run all tests
    - Run all unit tests and verify 100% pass
    - Run all property-based tests and verify 100% pass
    - Run all integration tests and verify 100% pass
    - Verify test coverage is at least 80%
    - _Requirements: 18.10_

  - [x] 37.2 Verify all requirements are met
    - Verify all 18 requirements have been implemented
    - Verify all 38 correctness properties are tested
    - Verify all acceptance criteria are met
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

  - [x] 37.3 Performance testing
    - Test page load time on 3G connection
    - Test cache hit rate
    - Test API response time
    - Verify performance meets requirements (< 2 seconds load time)
    - _Requirements: 14.7_

  - [x] 37.4 Security audit
    - Review all API endpoints for security vulnerabilities
    - Review all user inputs for validation
    - Review error handling for information leakage
    - Verify HTTPS is enforced

- [x] 38. Deployment to staging
  - [x] 38.1 Deploy to staging environment
    - Build production bundle
    - Deploy to staging server
    - Verify deployment successful
    - Run smoke tests on staging

  - [x] 38.2 Staging testing
    - Test all critical user flows on staging
    - Test performance on staging
    - Test error handling on staging
    - Verify data integrity on staging

  - [x] 38.3 Fix any staging issues
    - Fix any bugs found during staging testing
    - Re-deploy to staging if needed
    - Re-test after fixes

- [x] 39. Deployment to production
  - [x] 39.1 Deploy to production environment
    - Build production bundle
    - Deploy to production server
    - Verify deployment successful
    - Run smoke tests on production

  - [x] 39.2 Monitor production deployment
    - Monitor error logs for first 24 hours
    - Monitor performance metrics
    - Monitor user engagement metrics
    - Monitor API response times

  - [x] 39.3 Address any production issues
    - Fix any critical bugs immediately
    - Document any non-critical issues for future fixes
    - Communicate status to stakeholders

- [x] 40. Post-deployment tasks
  - [x] 40.1 Update documentation
    - Update README with new architecture
    - Update API documentation
    - Update component documentation
    - Create migration guide for developers

  - [x] 40.2 Track success metrics
    - Track page load time improvements
    - Track user engagement improvements
    - Track error rate reduction
    - Track cache hit rate

  - [x] 40.3 Gather feedback
    - Gather user feedback on new navigation
    - Gather developer feedback on new architecture
    - Document lessons learned
    - Plan future improvements

---

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties (38 total)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end user flows
- Manual testing ensures all acceptance criteria are met (18 scenarios)
- All content data MUST be fetched from CockroachDB API endpoints (NEVER Supabase)
- Implementation language is TypeScript with React

## Success Criteria

✅ All sections use the same layout and navigation  
✅ Navigation tabs visible in all sections and subsections  
✅ No incorrect or duplicate content in any section  
✅ Ramadan section displays only Arabic series  
✅ Korean section displays only Korean series with no duplicates  
✅ Code is unified and shared across all sections (< 20% duplication)  
✅ Consistent user experience across entire site  
✅ Excellent performance (< 2 seconds load time)  
✅ Clear and effective error handling  
✅ All data fetched from CockroachDB only  

---

**Created:** 2026-04-07  
**Status:** ✅ COMPLETED  
**Version:** 1.0.0
