# Implementation Plan: Production Perfection Protocol

## Overview

This implementation plan covers three critical production improvements for Cinema.online:
1. **Data Quality**: Neutral rating defaults (5.0) for unrated content across all adapters and ingestion pipeline
2. **Performance**: API response caching using node-cache to achieve sub-50ms response times
3. **User Experience**: Complete review editing and reporting functionality with reusable React components

The implementation follows an incremental approach, building from database schema changes through adapter modifications, API caching, frontend components, and comprehensive testing.

## Tasks

- [x] 1. Database schema migration for nullable ratings
  - Create migration script to make vote_average and vote_count nullable in games and software tables
  - Execute migration against CockroachDB with error handling
  - Verify schema changes with test queries
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [x] 2. Implement rating defaults in IGDBAdapter
  - [x] 2.1 Modify normalizeGameData to assign 5.0 for null/undefined ratings
    - Update rating normalization logic to check for null/undefined
    - Assign 5.0 default for missing ratings
    - Preserve explicit 0 ratings (do not convert to 5.0)
    - Add error handling with 5.0 fallback
    - _Requirements: 1.1, 1.6_

  - [ ]* 2.2 Write property test for IGDBAdapter rating defaults
    - **Property 1: Adapter Rating Default for Null Values**
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 Write unit tests for IGDBAdapter rating logic
    - Test null rating → 5.0
    - Test undefined rating → 5.0
    - Test explicit 0 → 0 (not 5.0)
    - Test valid ratings preserved
    - _Requirements: 1.1, 1.6_

- [x] 3. Implement rating defaults in TMDBAdapter
  - [x] 3.1 Modify _normalizeMovie to assign 5.0 for null ratings
    - Use nullish coalescing with 5.0 default
    - Check both ar and en vote_average fields
    - Preserve explicit 0 ratings
    - Add error handling
    - _Requirements: 1.2, 1.7_

  - [x] 3.2 Modify _normalizeTVSeries to assign 5.0 for null ratings
    - Use nullish coalescing with 5.0 default
    - Check both ar and en vote_average fields
    - Preserve explicit 0 ratings
    - Add error handling
    - _Requirements: 1.3, 1.7_

  - [ ]* 3.3 Write property tests for TMDBAdapter rating defaults
    - **Property 2: TMDB Movie Rating Default for Null Values**
    - **Property 3: TMDB TV Series Rating Default for Null Values**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 3.4 Write unit tests for TMDBAdapter rating logic
    - Test movie: both null → 5.0
    - Test movie: ar available → use ar
    - Test movie: fallback to en
    - Test movie: explicit 0 → 0
    - Test TV series: same scenarios
    - _Requirements: 1.2, 1.3, 1.7_

- [x] 4. Implement rating fallback in CoreIngestor
  - [x] 4.1 Add 5.0 fallback logic to _upsertMovie
    - Apply fallback if vote_average is null
    - Update SQL query to use fallback value
    - _Requirements: 1.4_

  - [x] 4.2 Add 5.0 fallback logic to _upsertTVSeries
    - Apply fallback if vote_average is null
    - Update SQL query to use fallback value
    - _Requirements: 1.4_

  - [x] 4.3 Add 5.0 fallback logic to _upsertGame
    - Apply fallback if vote_average is null
    - Update SQL query to use fallback value
    - _Requirements: 1.4_

  - [x] 4.4 Add 5.0 fallback logic to _upsertSoftware
    - Apply fallback if vote_average is null
    - Update SQL query to use fallback value
    - _Requirements: 1.4_

  - [ ]* 4.5 Write property test for CoreIngestor rating fallback
    - **Property 4: CoreIngestor Rating Fallback**
    - **Validates: Requirements 1.4**

  - [ ]* 4.6 Write unit tests for CoreIngestor fallback logic
    - Test null vote_average → 5.0 stored
    - Test valid vote_average preserved
    - Test round trip consistency
    - _Requirements: 1.4, 3.4_

- [x] 5. Checkpoint - Verify rating defaults work correctly
  - Run verification test for "The Witcher 3" (IGDB ID: 1942)
  - Confirm 5.0 rating assigned if IGDB returns null
  - Query CockroachDB to verify stored value
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Implement API caching infrastructure
  - [x] 6.1 Install and configure node-cache
    - Add node-cache dependency to package.json
    - Create cache instance with 5-minute TTL (300 seconds)
    - Configure checkperiod and useClones options
    - _Requirements: 4.9_

  - [x] 6.2 Implement cache key generation utility
    - Create generateCacheKey function
    - Sort query parameters for consistency
    - Handle different parameter combinations
    - _Requirements: 4.8_

  - [ ]* 6.3 Write property test for cache key uniqueness
    - **Property 9: Cache Key Uniqueness**
    - **Validates: Requirements 4.8**

  - [ ]* 6.4 Write unit tests for cache key generation
    - Test different params → different keys
    - Test same params different order → same key
    - Test empty params
    - _Requirements: 4.8_

- [x] 7. Implement caching for /api/home endpoint
  - [x] 7.1 Add cache middleware to home route
    - Check cache before database query
    - Store response with 5-minute TTL on cache miss
    - Add cache metadata to response (_cache object)
    - Log performance warnings for slow responses
    - _Requirements: 4.1, 4.2, 4.7, 4.10, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property test for cached response performance
    - **Property 8: Cached Response Performance**
    - **Validates: Requirements 4.2**

  - [ ]* 7.3 Write unit tests for home endpoint caching
    - Test first request caches response
    - Test second request hits cache
    - Test cache metadata included
    - Test cache miss behavior
    - _Requirements: 4.1, 4.2, 4.7, 4.10_

- [x] 8. Implement caching for /api/movies endpoint
  - [x] 8.1 Add cache middleware to movies route
    - Check cache with query parameters in key
    - Store response with 5-minute TTL
    - Add cache metadata to response
    - Log performance warnings
    - _Requirements: 4.3, 4.4, 4.7, 4.8, 4.10, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.2 Write unit tests for movies endpoint caching
    - Test caching with different query params
    - Test cache hit performance
    - Test cache metadata
    - _Requirements: 4.3, 4.4, 4.8, 4.10_

- [x] 9. Implement caching for /api/tv endpoint
  - [x] 9.1 Add cache middleware to TV route
    - Check cache with query parameters in key
    - Store response with 5-minute TTL
    - Add cache metadata to response
    - Log performance warnings
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.10, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 9.2 Write unit tests for TV endpoint caching
    - Test caching with different query params
    - Test cache hit performance
    - Test cache metadata
    - _Requirements: 4.5, 4.6, 4.8, 4.10_

- [x] 10. Checkpoint - Verify API caching performance
  - Run integration tests for all cached endpoints
  - Verify sub-20ms response times for cached requests
  - Verify sub-50ms response times for first requests
  - Check cache hit/miss metadata
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 11. Create Edit Review Modal component
  - [x] 11.1 Create EditReviewModal.tsx component file
    - Define component interface (EditReviewModalProps)
    - Set up form state management
    - Implement form pre-population from review prop
    - Add bilingual support (Arabic/English)
    - _Requirements: 6.2, 11.1, 11.2, 11.3, 11.4_

  - [x] 11.2 Implement form validation logic
    - Validate review text length (10-5000 chars)
    - Validate title length (max 200 chars)
    - Validate rating range (1-10, integer)
    - Display validation errors
    - _Requirements: 6.3, 6.4, 6.5, 6.10_

  - [x] 11.3 Implement form submission handler
    - Send PUT request to /api/reviews/:id
    - Include authentication token in headers
    - Handle success response (close modal, refresh list, show toast)
    - Handle error responses with specific error codes
    - Disable submit button during request
    - Show loading spinner
    - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.12, 11.8, 11.9_

  - [x] 11.4 Style component with design system
    - Match existing design system styling
    - Ensure responsive layout (mobile/desktop)
    - Add proper spacing and typography
    - _Requirements: 11.6, 11.7_

  - [ ]* 11.5 Write property tests for Edit Review Modal
    - **Property 11: Edit Modal Form Pre-population**
    - **Property 12: Review Text Length Validation**
    - **Property 13: Rating Value Validation**
    - **Property 14: Edit Request API Integration**
    - **Property 15: Edit Modal Error Handling**
    - **Property 16: Title Field Length Validation**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.9, 6.10**

  - [ ]* 11.6 Write unit tests for Edit Review Modal
    - Test form pre-population
    - Test validation errors
    - Test successful submission
    - Test error handling
    - Test loading states
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.12_

- [x] 12. Create Report Review Dialog component
  - [x] 12.1 Create ReportReviewDialog.tsx component file
    - Define component interface (ReportReviewDialogProps)
    - Set up form state management
    - Implement reason dropdown with predefined options
    - Add conditional custom reason text input
    - Add bilingual support (Arabic/English)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 12.1, 12.2, 12.3, 12.4_

  - [x] 12.2 Implement form validation and submission
    - Validate reason selection
    - Validate custom reason text if "Other" selected
    - Send POST request to /api/reviews/:id/report
    - Include authentication token in headers
    - Handle success response (show confirmation, auto-close after 2s)
    - Handle error responses (duplicate report, etc.)
    - Disable submit button during request
    - Show loading spinner
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 12.8, 12.9_

  - [x] 12.3 Style component with design system
    - Match existing design system styling
    - Ensure responsive layout (mobile/desktop)
    - Add proper spacing and typography
    - _Requirements: 12.6, 12.7_

  - [ ]* 12.4 Write property tests for Report Review Dialog
    - **Property 18: Report Reason Validation**
    - **Property 19: Report Request API Integration**
    - **Property 20: Report Dialog Error Handling**
    - **Property 21: Duplicate Report Prevention**
    - **Validates: Requirements 7.5, 7.6, 7.9, 7.10**

  - [ ]* 12.5 Write unit tests for Report Review Dialog
    - Test reason dropdown display
    - Test custom reason input visibility
    - Test validation errors
    - Test successful submission
    - Test duplicate report handling
    - Test auto-close behavior
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

- [x] 13. Integrate Edit and Report components with MovieDetails.tsx
  - [x] 13.1 Add state management for modals
    - Add showEditModal and editingReview state
    - Add showReportDialog and reportingReviewId state
    - _Requirements: 6.1, 7.1_

  - [x] 13.2 Implement edit and report handlers
    - Replace TODO comment with handleEditReview function
    - Replace TODO comment with handleReportReview function
    - Implement success callbacks (refresh reviews, close modals)
    - _Requirements: 6.1, 6.7, 7.1, 7.7_

  - [x] 13.3 Add modal components to JSX
    - Add EditReviewModal with proper props
    - Add ReportReviewDialog with proper props
    - Pass handlers to ReviewList component
    - _Requirements: 6.1, 6.13, 7.1_

  - [x] 13.4 Remove TODO comments and console.log statements
    - Remove all TODO comments related to edit functionality
    - Remove all TODO comments related to report functionality
    - Remove all console.log statements in edit/report handlers
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [x] 14. Integrate Edit and Report components with SeriesDetails.tsx
  - [x] 14.1 Add state management and handlers
    - Add modal state management
    - Implement edit and report handlers
    - Implement success callbacks
    - _Requirements: 6.1, 6.7, 7.1, 7.7_

  - [x] 14.2 Add modal components and update ReviewList
    - Add EditReviewModal and ReportReviewDialog
    - Pass handlers to ReviewList
    - _Requirements: 6.1, 6.13, 7.1_

  - [x] 14.3 Remove TODO comments and console.log statements
    - Remove all TODO comments
    - Remove all console.log statements
    - _Requirements: 8.3, 8.4, 9.3, 9.4_

- [x] 15. Integrate Edit and Report components with GameDetails.tsx
  - [x] 15.1 Add state management and handlers
    - Add modal state management
    - Implement edit and report handlers
    - Implement success callbacks
    - _Requirements: 6.1, 6.7, 7.1, 7.7_

  - [x] 15.2 Add modal components and update ReviewList
    - Add EditReviewModal and ReportReviewDialog
    - Pass handlers to ReviewList
    - _Requirements: 6.1, 6.13, 7.1_

  - [x] 15.3 Remove TODO comments and console.log statements
    - Remove all TODO comments
    - Remove all console.log statements
    - _Requirements: 8.5, 8.6, 9.5, 9.6_

- [x] 16. Integrate Edit and Report components with SoftwareDetails.tsx
  - [x] 16.1 Add state management and handlers
    - Add modal state management
    - Implement edit and report handlers
    - Implement success callbacks
    - _Requirements: 6.1, 6.7, 7.1, 7.7_

  - [x] 16.2 Add modal components and update ReviewList
    - Add EditReviewModal and ReportReviewDialog
    - Pass handlers to ReviewList
    - _Requirements: 6.1, 6.13, 7.1_

  - [x] 16.3 Remove TODO comments and console.log statements
    - Remove all TODO comments
    - Remove all console.log statements
    - _Requirements: 8.7, 8.8, 9.7, 9.8_

- [x] 17. Checkpoint - Verify frontend integration
  - Test edit functionality on all detail pages
  - Test report functionality on all detail pages
  - Verify bilingual support (Arabic/English)
  - Verify responsive design (mobile/desktop)
  - Verify edit button only shows for review owner
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 6.13, 11.4, 11.6, 11.7, 12.4, 12.6, 12.7_

- [ ]* 18. Write integration tests for cache performance
  - [ ]* 18.1 Create integration test suite for /api/home caching
    - Measure first request response time
    - Measure second request response time
    - Verify second request under 20ms
    - Verify cache hit metadata present
    - **Property 27: Cache Performance Threshold**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**

  - [ ]* 18.2 Create integration test suite for /api/movies caching
    - Test same methodology as home endpoint
    - Verify performance thresholds
    - **Validates: Requirements 13.5**

  - [ ]* 18.3 Create integration test suite for /api/tv caching
    - Test same methodology as home endpoint
    - Verify performance thresholds
    - **Validates: Requirements 13.6**

  - [ ]* 18.4 Add failure reporting for slow cached requests
    - Fail test with descriptive error if cached request exceeds 20ms
    - **Validates: Requirements 13.7**

- [ ]* 19. Write property-based tests for rating defaults
  - [ ]* 19.1 Write property test for neutral rating position in sorting
    - **Property 5: Neutral Rating Position in Sorting**
    - **Validates: Requirements 1.5**

  - [ ]* 19.2 Write property test for database schema accepts null ratings
    - **Property 6: Database Schema Accepts Null Ratings**
    - **Validates: Requirements 2.6**

  - [ ]* 19.3 Write property test for rating storage round trip
    - **Property 7: Rating Storage Round Trip**
    - **Validates: Requirements 3.4**

  - [ ]* 19.4 Write property test for cache metadata inclusion
    - **Property 10: Cache Metadata Inclusion**
    - **Validates: Requirements 4.10, 5.4**

- [ ]* 20. Write property-based tests for review API
  - [ ]* 20.1 Write property test for edit button authorization
    - **Property 17: Edit Button Authorization**
    - **Validates: Requirements 6.13**

  - [ ]* 20.2 Write property test for review update round trip
    - **Property 22: Review Update Round Trip**
    - **Validates: Requirements 10.3**

  - [ ]* 20.3 Write property test for review update authorization
    - **Property 23: Review Update Authorization**
    - **Validates: Requirements 10.4**

  - [ ]* 20.4 Write property test for report creation round trip
    - **Property 24: Report Creation Round Trip**
    - **Validates: Requirements 10.5**

  - [ ]* 20.5 Write property test for API authentication validation
    - **Property 25: API Authentication Validation**
    - **Validates: Requirements 10.6**

  - [ ]* 20.6 Write property test for API error message format
    - **Property 26: API Error Message Format**
    - **Validates: Requirements 10.7**

- [x] 21. Final verification testing
  - [x] 21.1 Run complete test suite
    - Execute all unit tests
    - Execute all property-based tests
    - Execute all integration tests
    - Verify all tests pass

  - [x] 21.2 Verify rating defaults in production data
    - Query games table for null ratings
    - Query software table for null ratings
    - Verify 5.0 defaults applied correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 21.3 Verify API caching performance in production
    - Test /api/home response times
    - Test /api/movies response times
    - Test /api/tv response times
    - Verify sub-20ms cached responses
    - Verify sub-50ms first requests
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 21.4 Verify review edit and report functionality
    - Test edit review on all content types
    - Test report review on all content types
    - Verify validation works correctly
    - Verify error handling works correctly
    - Verify bilingual support
    - _Requirements: 6.1-6.13, 7.1-7.11_

  - [x] 21.5 Verify code cleanup
    - Confirm no TODO comments remain in detail pages
    - Confirm no console.log statements remain in detail pages
    - _Requirements: 8.1-8.8, 9.1-9.8_

- [x] 22. Final checkpoint - Production readiness verification
  - All tests passing (unit, property, integration)
  - All requirements validated
  - Performance targets met (sub-20ms cached, sub-50ms first)
  - Code cleanup complete (no TODOs, no console.logs)
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across input space
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end performance requirements
- Implementation uses TypeScript for frontend and JavaScript for backend
- Database operations use CockroachDB for content, Supabase for user data
- Caching uses node-cache library with 5-minute TTL
- All components support bilingual (Arabic/English) interface
