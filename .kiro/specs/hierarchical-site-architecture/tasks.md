# Implementation Plan: Hierarchical Site Architecture

## Overview

هذا المستند يحدد خطة التنفيذ الكاملة لبناء البنية الهرمية للموقع. الهدف هو بناء أساسات قوية تستقبل المحتوى من TMDB لاحقاً وتصنفه تلقائياً في 2,585 صفحة هرمية.

**النهج:**
- تحديث قاعدة البيانات بإضافة columns جديدة (primary_genre, primary_platform, nationality)
- إنشاء HierarchicalPage component ذكي يعرض المحتوى بشكل ديناميكي
- إضافة 2,585 route للصفحات الهرمية
- تحديث API endpoints لدعم الفلاتر الجديدة
- اختبار شامل مع المحتوى الموجود (20 فيلم + 1 مسلسل)

**اللغة المستخدمة:** TypeScript/React

**الوقت المتوقع:** 3.5 ساعة

---

## Tasks

- [x] 1. Database Schema Enhancement
  - [x] 1.1 Review and update migration script
    - Review `scripts/migration/add-hierarchical-structure.sql`
    - Verify all ALTER TABLE statements use IF NOT EXISTS
    - Verify all indexes are created with proper naming
    - Verify data population logic for existing content
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.3_
  
  - [x] 1.2 Execute migration on CockroachDB
    - Connect to CockroachDB using connection string from .env
    - Execute migration script in transaction
    - Monitor execution for errors
    - Verify transaction commits successfully
    - _Requirements: 1.8, 1.9, 6.4, 6.5_
  
  - [x] 1.3 Verify database changes
    - Query information_schema to verify new columns exist
    - Verify indexes created: idx_movies_primary_genre, idx_tv_primary_genre, idx_games_primary_genre, idx_games_primary_platform, idx_software_primary_platform, idx_actors_nationality
    - Verify composite indexes: idx_movies_lang_genre_year, idx_tv_lang_genre_year, idx_games_platform_genre_year
    - Run verification queries from migration script
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17_
  
  - [x] 1.4 Verify data population for existing content
    - Query movies table to verify all 20 movies have primary_genre populated
    - Query tv_series table to verify existing series have primary_genre
    - Verify genre names are normalized (lowercase with hyphens)
    - Verify no data loss occurred during migration
    - _Requirements: 6.6, 6.7, 6.12, 6.15_
  
  - [ ]* 1.5 Write property test for JSONB data extraction
    - **Property 1: JSONB Data Extraction Preserves Structure**
    - **Validates: Requirements 1.18**
    - Test that extracting primary_genre from genres JSONB preserves data integrity
    - Use fast-check to generate random JSONB arrays
    - Verify round-trip consistency (JSONB → extract → query returns same value)

- [ ] 2. Checkpoint - Verify database migration success
  - Ensure all database changes applied successfully
  - Ensure no errors in migration log
  - Ask user if questions arise

- [x] 3. HierarchicalPage Component Creation
  - [x] 3.1 Create component file and props interface
    - Create `src/pages/discovery/HierarchicalPage.tsx`
    - Define HierarchicalPageProps interface with contentType, genre, year, platform, preset
    - Add TypeScript types for all props
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 3.2 Implement API query construction logic
    - Build URLSearchParams based on props
    - Add primary_genre filter when genre prop provided
    - Add yearFrom/yearTo filters when year prop provided
    - Add primary_platform filter when platform prop provided
    - Add sort parameter based on preset prop
    - Combine multiple filters with AND logic
    - _Requirements: 2.6, 2.7, 2.8, 2.9_
  
  - [x] 3.3 Implement data fetching with React Query
    - Use useQuery hook with proper queryKey
    - Determine correct API endpoint based on contentType
    - Implement pagination state management
    - Add loading and error states
    - _Requirements: 2.6, 2.7, 2.8, 2.9_
  
  - [x] 3.4 Implement SEO metadata generation
    - Create generateTitle helper function
    - Create generateDescription helper function
    - Use Helmet component to set title and meta tags
    - Support Arabic and English content
    - _Requirements: 2.14, 2.15, 5.4, 5.9_
  
  - [x] 3.5 Implement breadcrumbs generation
    - Create generateBreadcrumbs helper function
    - Build breadcrumb hierarchy: الرئيسية > {contentType} > {genre} > {year}
    - Use existing Breadcrumbs component
    - _Requirements: 2.16, 5.5_
  
  - [x] 3.6 Implement grid rendering with infinite scroll
    - Use InfiniteScroll component from react-infinite-scroll-component
    - Render responsive grid (2 cols mobile, 4 tablet, 6 desktop)
    - Use existing MovieCard component for items
    - Implement next page loading on scroll
    - _Requirements: 2.10, 2.11, 5.1, 5.2_
  
  - [x] 3.7 Implement loading and empty states
    - Display SkeletonGrid while loading
    - Display empty state with helpful message when no results
    - Add proper loading indicators for infinite scroll
    - _Requirements: 2.12, 2.13, 5.3, 5.6_
  
  - [x] 3.8 Add error handling
    - Display user-friendly error message on API failure
    - Add retry button for failed requests
    - Implement error boundary for component crashes
    - _Requirements: 5.7, 9.2, 9.9, 9.10_
  
  - [ ]* 3.9 Write unit tests for HierarchicalPage component
    - Test rendering with different prop combinations
    - Test empty state display
    - Test error handling
    - Test loading states
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ]* 3.10 Write property test for query idempotence
    - **Property 8: Query Idempotence**
    - **Validates: Requirements 2.18, 4.24**
    - Test that executing same query multiple times returns identical results
    - Use fast-check to generate random filter combinations

- [ ] 4. Checkpoint - Verify component functionality
  - Ensure HierarchicalPage component renders correctly
  - Ensure no TypeScript errors
  - Ask user if questions arise

- [x] 5. Route Configuration
  - [x] 5.1 Add static genre routes for movies
    - Update `src/routes/DiscoveryRoutes.tsx`
    - Add 20 genre routes: /movies/action, /movies/comedy, /movies/drama, etc.
    - Each route renders HierarchicalPage with appropriate props
    - _Requirements: 3.1_
  
  - [x] 5.2 Add static year routes for movies
    - Add 47 year routes: /movies/2026, /movies/2025, ..., /movies/1980
    - Each route renders HierarchicalPage with year prop
    - _Requirements: 3.2_
  
  - [x] 5.3 Add dynamic combined routes for movies
    - Add dynamic route: /movies/:genre/:year
    - Create DynamicMoviePage component to extract params
    - Pass genre and year to HierarchicalPage
    - _Requirements: 3.3_
  
  - [x] 5.4 Add special routes for movies
    - Add 5 special routes: /movies/trending, /movies/popular, /movies/top-rated, /movies/latest, /movies/upcoming
    - Each route uses preset prop
    - _Requirements: 3.4_
  
  - [x] 5.5 Add routes for series (genre, year, combined, special)
    - Add 15 genre routes for series
    - Add 47 year routes for series
    - Add dynamic combined route: /series/:genre/:year
    - Add 5 special routes for series
    - _Requirements: 3.5, 3.6, 3.7, 3.8_
  
  - [x] 5.6 Add routes for anime (genre, year, combined, special)
    - Add 15 genre routes for anime
    - Add 27 year routes for anime (2026-2000)
    - Add dynamic combined route: /anime/:genre/:year
    - Add 5 special routes for anime
    - _Requirements: 3.9, 3.10, 3.11, 3.12_
  
  - [x] 5.7 Add routes for gaming (platform, genre, combined, special)
    - Add 6 platform routes: /gaming/pc, /gaming/playstation, etc.
    - Add 15 genre routes for gaming
    - Add dynamic combined route: /gaming/:platform/:genre
    - Add 17 year routes for gaming (2026-2010)
    - Add 5 special routes for gaming
    - _Requirements: 3.13, 3.14, 3.15, 3.16, 3.17_
  
  - [x] 5.8 Add routes for software (platform, category, combined, special)
    - Add 7 platform routes for software
    - Add 10 category routes for software
    - Add dynamic combined route: /software/:platform/:category
    - Add 6 special routes for software
    - _Requirements: 3.18, 3.19, 3.20, 3.21_
  
  - [x] 5.9 Verify route configuration
    - Verify no conflicts with existing routes
    - Verify existing content detail routes still work
    - Test route matching with sample URLs
    - Verify 404 handling for invalid routes
    - _Requirements: 3.25, 3.26, 3.27, 3.28_
  
  - [ ]* 5.10 Write property test for route stability
    - **Property 10: Route Stability**
    - **Validates: Requirements 3.29**
    - Test that navigating to route and refreshing displays same content
    - Use fast-check to generate random valid routes

- [ ] 6. Checkpoint - Verify routing configuration
  - Ensure all routes added successfully
  - Ensure no route conflicts
  - Ask user if questions arise

- [x] 7. API Endpoints Enhancement
  - [x] 7.1 Update Movies API endpoint
    - Update `/api/movies` in backend
    - Add primary_genre query parameter support
    - Add yearFrom and yearTo query parameters
    - Add ratingFrom and ratingTo query parameters
    - Add sort parameter (popularity.desc, vote_average.desc, release_date.desc)
    - Implement filter combination with AND logic
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.10, 4.11, 4.18_
  
  - [x] 7.2 Update TV Series API endpoint
    - Update `/api/tv` in backend
    - Add same filters as Movies API
    - Support primary_genre filtering
    - Support year range filtering
    - _Requirements: 4.12_
  
  - [x] 7.3 Update Anime API endpoint
    - Update `/api/anime` in backend
    - Add same filters as Movies API
    - _Requirements: 4.13_
  
  - [x] 7.4 Update Games API endpoint
    - Update `/api/games` in backend
    - Add primary_genre filter support
    - Add primary_platform filter support
    - _Requirements: 4.14, 4.15_
  
  - [x] 7.5 Update Software API endpoint
    - Update `/api/software` in backend
    - Add primary_platform filter support
    - Add category filter support
    - _Requirements: 4.16, 4.17_
  
  - [x] 7.6 Implement input validation
    - Validate all query parameters before database queries
    - Validate genre against allowed list
    - Validate year range (1900-2100)
    - Validate rating range (0-10)
    - Return 400 error with descriptive message for invalid inputs
    - _Requirements: 4.21, 9.5, 9.12, 9.13, 9.14_
  
  - [x] 7.7 Implement SQL injection prevention
    - Use parameterized queries exclusively
    - Never use string concatenation for SQL queries
    - Sanitize all user inputs
    - _Requirements: 4.22, 9.6_
  
  - [x] 7.8 Implement error handling and logging
    - Add try-catch blocks for all async operations
    - Log errors with context (route, filters, error message)
    - Return appropriate HTTP status codes
    - Handle database connection failures with retry logic
    - _Requirements: 9.1, 9.7, 9.8_
  
  - [ ]* 7.9 Write unit tests for API endpoints
    - Test filtering by primary_genre
    - Test filtering by year range
    - Test filtering by platform
    - Test filter combination
    - Test input validation
    - Test error handling
    - _Requirements: 10.7, 10.8_
  
  - [ ]* 7.10 Write property test for filter accuracy
    - **Property 4: Genre Filtering Accuracy**
    - **Property 5: Year Range Filtering Accuracy**
    - **Property 6: Platform Filtering Accuracy**
    - **Validates: Requirements 2.6, 2.7, 2.8, 4.9, 4.10, 4.15**
    - Test that filters return only matching content
    - Use fast-check to generate random filter values

- [ ] 8. Checkpoint - Verify API functionality
  - Ensure all API endpoints updated successfully
  - Ensure filters work correctly
  - Ask user if questions arise

- [x] 9. Testing and Verification
  - [x] 9.1 Test hierarchical routes with existing content
    - Navigate to /movies/action and verify it displays action movies from 20 existing movies
    - Navigate to /movies/2024 and verify it displays movies from 2024
    - Navigate to /movies/action/2024 and verify combined filter works
    - Test with different genre/year combinations
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [x] 9.2 Verify SEO metadata
    - Check page title format: "{genre} {year} | سينما أونلاين"
    - Check meta description is generated correctly
    - Verify Open Graph tags if implemented
    - _Requirements: 10.9_
  
  - [x] 9.3 Verify breadcrumbs display
    - Check breadcrumbs show correct hierarchy
    - Verify breadcrumb links work correctly
    - Test on different hierarchical levels
    - _Requirements: 10.10_
  
  - [x] 9.4 Test infinite scroll
    - Scroll to bottom of page
    - Verify next page loads automatically
    - Verify loading indicators display
    - _Requirements: 10.11_
  
  - [x] 9.5 Test empty state handling
    - Navigate to route with no matching content
    - Verify empty state message displays
    - Verify no errors in console
    - _Requirements: 10.12_
  
  - [x] 9.6 Test error handling
    - Simulate API failure
    - Verify error message displays
    - Verify retry button works
    - _Requirements: 10.13_
  
  - [x] 9.7 Test responsive layout
    - Test on mobile viewport (2 columns)
    - Test on tablet viewport (4 columns)
    - Test on desktop viewport (6 columns)
    - Verify RTL layout for Arabic content
    - _Requirements: 10.14, 10.15_
  
  - [x] 9.8 Verify no console errors
    - Open browser console
    - Navigate through multiple hierarchical pages
    - Verify no JavaScript errors
    - Verify no React warnings
    - _Requirements: 10.16_
  
  - [x] 9.9 Verify TypeScript compilation
    - Run TypeScript compiler
    - Verify no compilation errors
    - Verify all types are correct
    - _Requirements: 10.17_
  
  - [x] 9.10 Verify ESLint compliance
    - Run ESLint on modified files
    - Fix any warnings or errors
    - Ensure code follows project conventions
    - _Requirements: 10.18_
  
  - [x] 9.11 Run EXPLAIN ANALYZE on queries
    - Execute EXPLAIN ANALYZE on hierarchical queries
    - Verify indexes are being used (Index Scan, not Seq Scan)
    - Verify query execution time is acceptable (<100ms)
    - _Requirements: 10.19, 8.16, 8.17_
  
  - [x] 9.12 Test backward compatibility
    - Test existing routes still work
    - Test existing slugs still resolve correctly
    - Verify no breaking changes to existing functionality
    - _Requirements: 10.20, 7.20_

- [x] 10. Final checkpoint - Complete verification
  - Ensure all tests pass
  - Ensure no errors or warnings
  - Ensure backward compatibility maintained
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from design document
- Unit tests validate specific examples and edge cases
- All code must use CockroachDB API exclusively (NO Supabase for content)
- Supabase is ONLY for authentication and user data
- Migration script must use transactions to ensure atomicity
- All routes must preserve existing functionality (backward compatibility)
- Component must support both Arabic and English content with RTL layout
- API endpoints must use parameterized queries to prevent SQL injection
- Checkpoints ensure incremental validation and allow for user feedback

## Implementation Order

1. **Database First:** Start with schema changes to establish data foundation
2. **Component Second:** Build HierarchicalPage component to consume data
3. **Routes Third:** Add routes to expose component at different URLs
4. **API Fourth:** Enhance API endpoints to support new filters
5. **Testing Last:** Comprehensive testing to verify everything works

This order ensures each phase builds on the previous one, minimizing rework and integration issues.

## Success Criteria

- ✅ All 20 existing movies have primary_genre populated
- ✅ All database indexes created successfully
- ✅ HierarchicalPage component renders without errors
- ✅ 2,585 routes accessible and functional
- ✅ API endpoints support all required filters
- ✅ SEO metadata generated correctly
- ✅ Breadcrumbs display correct hierarchy
- ✅ Infinite scroll works smoothly
- ✅ No console errors or TypeScript warnings
- ✅ Backward compatibility maintained
- ✅ Query performance acceptable (<100ms with indexes)
