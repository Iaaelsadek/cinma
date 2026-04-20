# Requirements Document

## Introduction

هذا المستند يحدد متطلبات بناء هيكل هرمي كامل للموقع (Hierarchical Site Architecture) لتنظيم المحتوى بشكل منطقي وقابل للتوسع. الهدف الرئيسي هو بناء بنية تحتية كاملة تستقبل المحتوى من TMDB لاحقاً وتصنفه تلقائياً في الصفحات الصحيحة.

**السياق الحالي:**
- قاعدة البيانات تحتوي على ~20 فيلم + 1 مسلسل فقط
- المحتوى سيُضاف لاحقاً من TMDB بواسطة المستخدم (ليس جزء من هذا الـ spec)
- نحتاج فقط بناء الأساسات: DB schema + website structure
- لا نحتاج migration للمحتوى أو جلب بيانات من APIs

## Glossary

- **Hierarchical_Site_Architecture**: البنية الهرمية للموقع التي تنظم المحتوى في مستويات متعددة (نوع المحتوى → التصنيف → السنة → العنصر)
- **Primary_Genre**: التصنيف الرئيسي للمحتوى (أول genre في قائمة genres)
- **Primary_Platform**: المنصة الرئيسية للألعاب والبرمجيات (أول platform في قائمة platforms)
- **HierarchicalPage_Component**: مكون React ذكي يقرأ من قاعدة البيانات ويعرض المحتوى حسب الفلاتر
- **CockroachDB**: قاعدة البيانات الأساسية لكل المحتوى (movies, tv_series, games, software, anime, actors)
- **Content_Type**: نوع المحتوى (movies, series, anime, gaming, software, quran)
- **Route**: مسار URL في الموقع (مثال: /movies/action/2024)
- **API_Endpoint**: نقطة نهاية API في الـ backend (مثال: /api/movies)
- **Filter**: معيار تصفية البيانات (genre, year, platform, rating)
- **Slug**: معرف نصي فريد للمحتوى في URL (مثال: avatar-2009)
- **SEO**: تحسين محركات البحث (title, description, breadcrumbs)
- **Infinite_Scroll**: تحميل المحتوى تدريجياً عند التمرير
- **Index**: فهرس قاعدة البيانات لتسريع الاستعلامات

## Requirements

### Requirement 1: Database Schema Enhancement

**User Story:** كمطور، أريد إضافة columns جديدة لقاعدة البيانات، حتى أتمكن من تصنيف المحتوى بشكل هرمي

#### Acceptance Criteria

1. THE Database_Migration_Script SHALL add primary_genre column to movies table
2. THE Database_Migration_Script SHALL add primary_genre column to tv_series table
3. THE Database_Migration_Script SHALL add primary_genre column to anime table
4. THE Database_Migration_Script SHALL add primary_genre column to games table
5. THE Database_Migration_Script SHALL add primary_platform column to games table
6. THE Database_Migration_Script SHALL add primary_platform column to software table
7. THE Database_Migration_Script SHALL add nationality column to actors table
8. WHEN primary_genre is NULL AND genres JSONB array has elements, THE Migration_Script SHALL populate primary_genre from first genre in array
9. WHEN primary_platform is NULL AND platform JSONB array has elements, THE Migration_Script SHALL populate primary_platform from first platform in array
10. THE Migration_Script SHALL create index idx_movies_primary_genre on movies(primary_genre)
11. THE Migration_Script SHALL create index idx_tv_primary_genre on tv_series(primary_genre)
12. THE Migration_Script SHALL create index idx_games_primary_genre on games(primary_genre)
13. THE Migration_Script SHALL create index idx_games_primary_platform on games(primary_platform)
14. THE Migration_Script SHALL create index idx_software_primary_platform on software(primary_platform)
15. THE Migration_Script SHALL create index idx_actors_nationality on actors(nationality)
16. THE Migration_Script SHALL create composite index idx_movies_lang_genre_year on movies(original_language, primary_genre, release_date DESC)
17. THE Migration_Script SHALL create composite index idx_tv_lang_genre_year on tv_series(original_language, primary_genre, first_air_date DESC)
18. FOR ALL existing movies, parsing then extracting primary_genre then storing SHALL preserve data integrity (round-trip property)

### Requirement 2: HierarchicalPage Component Creation

**User Story:** كمطور، أريد إنشاء component ذكي يعرض المحتوى بشكل هرمي، حتى يتمكن المستخدمون من تصفح المحتوى بسهولة

#### Acceptance Criteria

1. THE HierarchicalPage_Component SHALL accept contentType prop with values: movies, series, anime, gaming, software
2. THE HierarchicalPage_Component SHALL accept optional genre prop for filtering by primary_genre
3. THE HierarchicalPage_Component SHALL accept optional year prop for filtering by release year
4. THE HierarchicalPage_Component SHALL accept optional platform prop for filtering by primary_platform
5. THE HierarchicalPage_Component SHALL accept optional preset prop with values: trending, popular, top-rated, latest, upcoming
6. WHEN genre prop is provided, THE Component SHALL fetch content WHERE primary_genre matches genre
7. WHEN year prop is provided, THE Component SHALL fetch content WHERE EXTRACT(YEAR FROM release_date) equals year
8. WHEN platform prop is provided, THE Component SHALL fetch content WHERE primary_platform matches platform
9. WHEN multiple filters are provided, THE Component SHALL combine them with AND logic
10. THE Component SHALL display results in responsive grid layout (2 cols mobile, 4 cols tablet, 6 cols desktop)
11. THE Component SHALL implement infinite scroll for pagination
12. THE Component SHALL display loading skeletons WHILE fetching data
13. IF no results found, THEN THE Component SHALL display empty state with helpful message
14. THE Component SHALL generate SEO-optimized title based on filters
15. THE Component SHALL generate SEO-optimized description based on filters
16. THE Component SHALL display breadcrumbs navigation showing current location in hierarchy
17. THE Component SHALL use MovieCard component for displaying individual items
18. FOR ALL filter combinations, fetching then displaying then re-fetching SHALL return consistent results (idempotence property)

### Requirement 3: Hierarchical Routes Creation

**User Story:** كمستخدم، أريد الوصول إلى صفحات محتوى منظمة بشكل هرمي، حتى أتمكن من تصفح المحتوى بسهولة

#### Acceptance Criteria

1. THE Routing_System SHALL create 20 genre routes for movies (/movies/action, /movies/comedy, etc.)
2. THE Routing_System SHALL create 47 year routes for movies (/movies/2026, /movies/2025, ..., /movies/1980)
3. THE Routing_System SHALL create 940 combined routes for movies (/movies/action/2026, etc.)
4. THE Routing_System SHALL create 5 special routes for movies (/movies/trending, /movies/popular, /movies/top-rated, /movies/latest, /movies/upcoming)
5. THE Routing_System SHALL create 15 genre routes for series
6. THE Routing_System SHALL create 47 year routes for series
7. THE Routing_System SHALL create 705 combined routes for series
8. THE Routing_System SHALL create 5 special routes for series
9. THE Routing_System SHALL create 15 genre routes for anime
10. THE Routing_System SHALL create 27 year routes for anime (2026-2000)
11. THE Routing_System SHALL create 405 combined routes for anime
12. THE Routing_System SHALL create 5 special routes for anime
13. THE Routing_System SHALL create 6 platform routes for gaming (/gaming/pc, /gaming/playstation, etc.)
14. THE Routing_System SHALL create 15 genre routes for gaming
15. THE Routing_System SHALL create 90 combined platform-genre routes for gaming
16. THE Routing_System SHALL create 17 year routes for gaming (2026-2010)
17. THE Routing_System SHALL create 5 special routes for gaming
18. THE Routing_System SHALL create 7 platform routes for software
19. THE Routing_System SHALL create 10 category routes for software
20. THE Routing_System SHALL create 70 combined routes for software
21. THE Routing_System SHALL create 6 special routes for software
22. THE Routing_System SHALL create 4 rewaya routes for quran
23. THE Routing_System SHALL create 114 surah routes for quran
24. THE Routing_System SHALL create 5 special routes for quran
25. WHEN user navigates to any hierarchical route, THE System SHALL render HierarchicalPage_Component with appropriate props
26. WHEN user navigates to invalid route, THE System SHALL display 404 page
27. THE Routing_System SHALL preserve existing content detail routes (/movies/:genre/:year/:slug)
28. THE Routing_System SHALL NOT break existing slugs or URLs
29. FOR ALL routes, navigating then refreshing SHALL display same content (route stability property)

### Requirement 4: API Endpoints Enhancement

**User Story:** كمطور، أريد تحديث API endpoints لدعم الفلاتر الجديدة، حتى يتمكن الـ frontend من جلب البيانات المصنفة

#### Acceptance Criteria

1. THE Movies_API_Endpoint SHALL accept primary_genre query parameter
2. THE Movies_API_Endpoint SHALL accept yearFrom query parameter
3. THE Movies_API_Endpoint SHALL accept yearTo query parameter
4. THE Movies_API_Endpoint SHALL accept ratingFrom query parameter
5. THE Movies_API_Endpoint SHALL accept ratingTo query parameter
6. THE Movies_API_Endpoint SHALL accept sort query parameter with values: popularity.desc, vote_average.desc, release_date.desc
7. THE Movies_API_Endpoint SHALL accept page query parameter for pagination
8. THE Movies_API_Endpoint SHALL accept limit query parameter for page size
9. WHEN primary_genre parameter is provided, THE API SHALL filter results WHERE primary_genre matches parameter
10. WHEN yearFrom AND yearTo parameters are provided, THE API SHALL filter results WHERE EXTRACT(YEAR FROM release_date) BETWEEN yearFrom AND yearTo
11. WHEN ratingFrom parameter is provided, THE API SHALL filter results WHERE vote_average >= ratingFrom
12. THE TV_API_Endpoint SHALL support same filters as Movies_API_Endpoint
13. THE Anime_API_Endpoint SHALL support same filters as Movies_API_Endpoint
14. THE Games_API_Endpoint SHALL accept primary_platform query parameter
15. THE Games_API_Endpoint SHALL support primary_genre filter
16. THE Software_API_Endpoint SHALL accept primary_platform query parameter
17. THE Software_API_Endpoint SHALL accept category query parameter
18. WHEN multiple filters are provided, THE API SHALL combine them with AND logic
19. THE API SHALL return results in JSON format with structure: {results: [], page: number, total_pages: number}
20. THE API SHALL return empty array IF no results match filters
21. IF invalid filter value provided, THEN THE API SHALL return 400 error with descriptive message
22. THE API SHALL use prepared statements to prevent SQL injection
23. THE API SHALL use indexes for optimal query performance
24. FOR ALL valid filter combinations, querying twice SHALL return identical results (query determinism property)

### Requirement 5: Content Display and User Experience

**User Story:** كمستخدم، أريد تجربة تصفح سلسة ومنظمة، حتى أتمكن من العثور على المحتوى بسهولة

#### Acceptance Criteria

1. THE System SHALL display content in responsive grid (2 cols mobile, 4 cols tablet, 6 cols desktop)
2. THE System SHALL implement infinite scroll with threshold 0.8
3. WHILE loading more content, THE System SHALL display skeleton loaders
4. THE System SHALL display page title in format: "{genre} {year} | سينما أونلاين"
5. THE System SHALL display breadcrumbs showing: الرئيسية > {contentType} > {genre} > {year}
6. THE System SHALL display empty state with icon WHEN no results found
7. THE System SHALL display error message IF API request fails
8. THE System SHALL preserve scroll position WHEN navigating back
9. THE System SHALL update browser title and meta description for SEO
10. THE System SHALL use lazy loading for images
11. THE System SHALL display vote_average as star rating
12. THE System SHALL display release_date in localized format
13. THE System SHALL support RTL layout for Arabic content
14. THE System SHALL maintain consistent card design across all content types
15. WHEN user clicks on content card, THE System SHALL navigate to detail page with slug URL
16. THE System SHALL display loading state immediately WHEN filter changes
17. THE System SHALL debounce filter changes to avoid excessive API calls
18. FOR ALL user interactions, clicking then navigating back SHALL preserve previous state (navigation consistency property)

### Requirement 6: Data Integrity and Migration

**User Story:** كمطور، أريد التأكد من سلامة البيانات الموجودة، حتى لا يتأثر المحتوى الحالي

#### Acceptance Criteria

1. THE Migration_Script SHALL NOT delete any existing content
2. THE Migration_Script SHALL NOT modify existing columns except adding new ones
3. THE Migration_Script SHALL use IF NOT EXISTS clause for all ALTER TABLE statements
4. THE Migration_Script SHALL use transactions to ensure atomicity
5. WHEN migration fails, THE System SHALL rollback all changes
6. THE Migration_Script SHALL populate primary_genre for all 20 existing movies
7. THE Migration_Script SHALL populate primary_genre for existing tv_series
8. THE Migration_Script SHALL log all operations for audit trail
9. THE Migration_Script SHALL verify data integrity after completion
10. THE Migration_Script SHALL provide rollback script for reverting changes
11. IF genres JSONB is NULL OR empty, THEN THE Migration_Script SHALL set primary_genre to NULL
12. THE Migration_Script SHALL normalize genre names to lowercase with hyphens (e.g., "Sci-Fi" → "sci-fi")
13. THE Migration_Script SHALL normalize platform names to lowercase with hyphens
14. THE Migration_Script SHALL handle special characters in genre names correctly
15. FOR ALL existing content, migrating then querying SHALL return same content with additional fields (data preservation property)

### Requirement 7: Compatibility and Integration

**User Story:** كمطور، أريد التأكد من توافق التغييرات مع الكود الموجود، حتى لا تحدث أخطاء

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with existing MovieCard component
2. THE System SHALL maintain compatibility with existing SkeletonGrid component
3. THE System SHALL maintain compatibility with existing SeoHead component
4. THE System SHALL maintain compatibility with existing Breadcrumbs component
5. THE System SHALL NOT break existing routes in DiscoveryRoutes.tsx
6. THE System SHALL NOT break existing API endpoints
7. THE System SHALL maintain i18n support for Arabic and English
8. THE System SHALL use existing useLang hook for language detection
9. THE System SHALL use existing useQuery hook from @tanstack/react-query
10. THE System SHALL use existing InfiniteScroll component from react-infinite-scroll-component
11. THE System SHALL follow existing code style and conventions
12. THE System SHALL use existing logger utility for error logging
13. THE System SHALL use existing CONFIG constants
14. THE System SHALL maintain TypeScript type safety
15. THE System SHALL pass existing ESLint rules
16. THE System SHALL NOT introduce new dependencies unless absolutely necessary
17. IF new dependency required, THEN THE System SHALL document reason in requirements
18. THE System SHALL use CockroachDB API exclusively for content queries (NO Supabase for content)
19. THE System SHALL use Supabase ONLY for auth and user-related data
20. FOR ALL existing features, adding new routes SHALL NOT break existing functionality (backward compatibility property)

### Requirement 8: Performance and Optimization

**User Story:** كمستخدم، أريد تجربة سريعة وسلسة، حتى أتمكن من تصفح المحتوى بدون تأخير

#### Acceptance Criteria

1. THE System SHALL use database indexes for all filter queries
2. THE System SHALL limit API responses to 20 items per page by default
3. THE System SHALL implement query result caching with React Query
4. THE System SHALL use stale-while-revalidate caching strategy
5. THE System SHALL prefetch next page WHEN user scrolls to 80% of current content
6. THE System SHALL lazy load images with loading="lazy" attribute
7. THE System SHALL use optimized image formats (WebP with fallback)
8. THE System SHALL minimize bundle size by code splitting routes
9. THE System SHALL use React.lazy for route components
10. THE System SHALL debounce filter changes with 300ms delay
11. THE System SHALL cancel pending requests WHEN filter changes
12. THE System SHALL use connection pooling for database connections
13. THE System SHALL implement proper error boundaries for graceful degradation
14. WHEN database query takes longer than 5 seconds, THE System SHALL timeout and show error
15. THE System SHALL log slow queries for performance monitoring
16. THE System SHALL use EXPLAIN ANALYZE to verify index usage
17. FOR ALL queries, adding index SHALL reduce query time by at least 50% (performance improvement property)

### Requirement 9: Error Handling and Validation

**User Story:** كمطور، أريد معالجة شاملة للأخطاء، حتى يكون النظام مستقراً وموثوقاً

#### Acceptance Criteria

1. IF database connection fails, THEN THE System SHALL retry 3 times with exponential backoff
2. IF API request fails, THEN THE System SHALL display user-friendly error message
3. IF invalid genre provided in URL, THEN THE System SHALL redirect to 404 page
4. IF invalid year provided in URL, THEN THE System SHALL redirect to 404 page
5. THE System SHALL validate all query parameters before executing database queries
6. THE System SHALL sanitize all user inputs to prevent SQL injection
7. THE System SHALL log all errors with context (user_id, route, filters, error_message)
8. THE System SHALL use try-catch blocks for all async operations
9. THE System SHALL display error boundary WHEN component crashes
10. THE System SHALL provide fallback UI WHEN error occurs
11. IF migration script fails, THEN THE System SHALL rollback transaction and log error
12. THE System SHALL validate primary_genre values against allowed list
13. THE System SHALL validate year values to be between 1900 and 2100
14. THE System SHALL validate rating values to be between 0 and 10
15. IF invalid sort parameter provided, THEN THE System SHALL default to popularity.desc
16. THE System SHALL handle empty result sets gracefully
17. THE System SHALL handle network timeouts gracefully
18. FOR ALL error scenarios, system SHALL recover without data loss (error recovery property)

### Requirement 10: Testing and Verification

**User Story:** كمطور، أريد التحقق من صحة التنفيذ، حتى أضمن جودة الكود

#### Acceptance Criteria

1. THE Developer SHALL verify migration script execution on test database before production
2. THE Developer SHALL verify all 20 existing movies have primary_genre populated
3. THE Developer SHALL verify all indexes created successfully
4. THE Developer SHALL test /movies/action route displays correct content
5. THE Developer SHALL test /movies/2024 route displays correct content
6. THE Developer SHALL test /movies/action/2024 route displays correct content
7. THE Developer SHALL test API endpoint /api/movies?primary_genre=action returns filtered results
8. THE Developer SHALL test API endpoint /api/movies?yearFrom=2024&yearTo=2024 returns filtered results
9. THE Developer SHALL verify SEO meta tags render correctly
10. THE Developer SHALL verify breadcrumbs display correct hierarchy
11. THE Developer SHALL verify infinite scroll loads more content
12. THE Developer SHALL verify empty state displays when no results
13. THE Developer SHALL verify error handling works for failed API requests
14. THE Developer SHALL verify mobile responsive layout works correctly
15. THE Developer SHALL verify RTL layout works for Arabic content
16. THE Developer SHALL verify no console errors in browser
17. THE Developer SHALL verify no TypeScript compilation errors
18. THE Developer SHALL verify no ESLint warnings
19. THE Developer SHALL run EXPLAIN ANALYZE on all new queries to verify index usage
20. THE Developer SHALL verify backward compatibility with existing routes
21. FOR ALL test cases, running test twice SHALL produce same result (test determinism property)

