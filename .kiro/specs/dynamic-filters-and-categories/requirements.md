# Requirements Document - Dynamic Filters and Categories System
# مستند المتطلبات - نظام الفلاتر والتصنيفات الديناميكية

## Introduction | المقدمة

### English
This specification addresses critical issues in the current filtering and categorization system for content (movies, series, anime, gaming, software). The system currently has hardcoded filters that don't match the database structure, illogical filters like "Upcoming" for already-released content, and missing functionality for Islamic content pages. This feature will implement a dynamic, database-driven filtering system that matches the navigation structure and provides accurate categorization.

### العربية
تتناول هذه المواصفة المشاكل الحرجة في نظام الفلترة والتصنيف الحالي للمحتوى (أفلام، مسلسلات، أنمي، ألعاب، برمجيات). يحتوي النظام حالياً على فلاتر ثابتة لا تتطابق مع بنية قاعدة البيانات، وفلاتر غير منطقية مثل "قريباً" للمحتوى المنشور بالفعل، ووظائف مفقودة لصفحات المحتوى الإسلامي. ستقوم هذه الميزة بتطبيق نظام فلترة ديناميكي يعتمد على قاعدة البيانات ويتطابق مع بنية التنقل ويوفر تصنيفاً دقيقاً.

## Glossary | المصطلحات

- **Filter_System**: The component responsible for filtering and sorting content based on user selections
- **نظام_الفلترة**: المكون المسؤول عن فلترة وترتيب المحتوى بناءً على اختيارات المستخدم

- **Genre_API**: The backend service that fetches unique genre values from CockroachDB
- **واجهة_التصنيفات**: خدمة الخلفية التي تجلب قيم التصنيفات الفريدة من CockroachDB

- **FilterTabs_Component**: The UI component displaying filter tabs (Trending, Top Rated, Latest, etc.)
- **مكون_تبويبات_الفلترة**: مكون واجهة المستخدم الذي يعرض تبويبات الفلترة (الرائج، الأعلى تقييماً، الأحدث، إلخ)

- **AdvancedFilters_Component**: The UI component for genre, year, rating, and sort filters
- **مكون_الفلاتر_المتقدمة**: مكون واجهة المستخدم لفلاتر التصنيف والسنة والتقييم والترتيب

- **CockroachDB**: The primary database containing all content data (movies, series, games, software, anime)
- **قاعدة_بيانات_كوكروتش**: قاعدة البيانات الأساسية التي تحتوي على جميع بيانات المحتوى

- **Navbar**: The top navigation bar showing content categories and subcategories
- **شريط_التنقل**: شريط التنقل العلوي الذي يعرض فئات المحتوى والفئات الفرعية

- **Islamic_Content**: Religious content including Quran, Prophets Stories, Fatwas, and Religious Programs
- **المحتوى_الإسلامي**: المحتوى الديني بما في ذلك القرآن وقصص الأنبياء والفتاوى والبرامج الدينية


## Requirements | المتطلبات

### Requirement 1: Remove Illogical "Upcoming" Filter

**User Story (English):** As a user, I want to see only relevant filters for already-released content, so that I don't encounter empty or illogical filter options.

**User Story (العربية):** كمستخدم، أريد رؤية الفلاتر ذات الصلة فقط للمحتوى المنشور بالفعل، حتى لا أواجه خيارات فلترة فارغة أو غير منطقية.

#### Acceptance Criteria

1. THE Filter_System SHALL NOT display "Upcoming" filter option for movies content type
2. THE Filter_System SHALL NOT display "Upcoming" filter option for series content type
3. THE Filter_System SHALL NOT display "Upcoming" filter option for anime content type
4. THE Filter_System SHALL NOT display "Upcoming" filter option for gaming content type
5. WHEN a user navigates to any content section, THE FilterTabs_Component SHALL display only "All", "Trending", "Top Rated", and "Latest" options
6. THE Filter_System SHALL remove all routing logic for "/movies/upcoming", "/series/upcoming", "/anime/upcoming", and "/gaming/upcoming" paths
7. IF a user attempts to access an upcoming filter URL directly, THEN THE Filter_System SHALL redirect to the base content type path

---

### Requirement 2: Dynamic Genre Fetching from Database

**User Story (English):** As a user, I want to see actual genre options from the database, so that I can filter content by genres that actually exist in the system.

**User Story (العربية):** كمستخدم، أريد رؤية خيارات التصنيف الفعلية من قاعدة البيانات، حتى أتمكن من فلترة المحتوى حسب التصنيفات الموجودة فعلياً في النظام.

#### Acceptance Criteria

1. THE Genre_API SHALL provide an endpoint at "/api/genres/:contentType" that accepts contentType parameter
2. WHEN Genre_API receives a request for movies, THE Genre_API SHALL query CockroachDB for DISTINCT primary_genre values from movies table
3. WHEN Genre_API receives a request for series, THE Genre_API SHALL query CockroachDB for DISTINCT primary_genre values from tv_series table
4. WHEN Genre_API receives a request for anime, THE Genre_API SHALL query CockroachDB for DISTINCT primary_genre values from anime table WHERE category = 'anime'
5. WHEN Genre_API receives a request for gaming, THE Genre_API SHALL query CockroachDB for DISTINCT primary_genre values from games table
6. WHEN Genre_API receives a request for software, THE Genre_API SHALL query CockroachDB for DISTINCT primary_genre values from software table
7. THE Genre_API SHALL return genre list with both Arabic value and English translation in format: {value: string, labelAr: string, labelEn: string}
8. THE Genre_API SHALL filter out NULL and empty string genre values from results
9. THE Genre_API SHALL sort genre results alphabetically by Arabic label
10. THE AdvancedFilters_Component SHALL fetch genres from Genre_API on component mount
11. THE AdvancedFilters_Component SHALL cache genre results for 1 hour using React Query
12. THE AdvancedFilters_Component SHALL display loading state while fetching genres
13. IF Genre_API request fails, THEN THE AdvancedFilters_Component SHALL display fallback hardcoded genres and log error

---

### Requirement 3: Optional Sort Filter with "All" Default

**User Story (English):** As a user, I want to view all content without mandatory sorting, so that I can see the natural database order or choose my preferred sorting.

**User Story (العربية):** كمستخدم، أريد عرض جميع المحتوى بدون ترتيب إلزامي، حتى أتمكن من رؤية الترتيب الطبيعي لقاعدة البيانات أو اختيار الترتيب المفضل لدي.

#### Acceptance Criteria

1. THE AdvancedFilters_Component SHALL include "All" option as first option in sort dropdown
2. WHEN AdvancedFilters_Component initializes, THE AdvancedFilters_Component SHALL set sort filter default value to NULL
3. WHEN user selects "All" sort option, THE Filter_System SHALL pass NULL value for sortBy parameter to API
4. WHEN sortBy parameter is NULL, THE Filter_System SHALL fetch content without explicit ORDER BY clause
5. THE AdvancedFilters_Component SHALL display "All" option with label "الكل" in Arabic and "All" in English
6. THE AdvancedFilters_Component SHALL maintain existing sort options: "Most Popular", "Highest Rated", "Newest", "Title (A-Z)"
7. WHEN user changes sort filter, THE Filter_System SHALL update URL query parameter "sort" accordingly
8. IF URL contains no sort parameter, THEN THE AdvancedFilters_Component SHALL default to "All" option


---

### Requirement 4: Islamic Content Dedicated Pages

**User Story (English):** As a user, I want dedicated pages for Islamic content categories, so that I can browse Fatwas and Prophets Stories without being redirected to search.

**User Story (العربية):** كمستخدم، أريد صفحات مخصصة لفئات المحتوى الإسلامي، حتى أتمكن من تصفح الفتاوى وقصص الأنبياء دون إعادة التوجيه إلى البحث.

#### Acceptance Criteria

1. THE Filter_System SHALL create route "/fatwas" for Fatwas content page
2. THE Filter_System SHALL create route "/prophets-stories" for Prophets Stories content page
3. WHEN user navigates to "/fatwas", THE Filter_System SHALL fetch content from CockroachDB WHERE category = 'fatwa'
4. WHEN user navigates to "/prophets-stories", THE Filter_System SHALL fetch content from CockroachDB WHERE category = 'prophets'
5. THE Filter_System SHALL display Fatwas content using UnifiedSection component with contentType = 'series'
6. THE Filter_System SHALL display Prophets Stories content using UnifiedSection component with contentType = 'series'
7. THE Navbar SHALL update Fatwas link from "/search?category=fatwa" to "/fatwas"
8. THE Navbar SHALL update Prophets Stories link from "/search?category=prophets" to "/prophets-stories"
9. THE Filter_System SHALL apply standard filters (genre, year, rating, sort) to Islamic content pages
10. THE Filter_System SHALL display page title "فتاوى" / "Fatwas" for Fatwas page
11. THE Filter_System SHALL display page title "قصص الأنبياء" / "Prophets Stories" for Prophets Stories page

---

### Requirement 5: Filter Tabs Match Navbar Structure

**User Story (English):** As a user, I want filter tabs to match the navigation menu structure, so that I have a consistent browsing experience.

**User Story (العربية):** كمستخدم، أريد أن تتطابق تبويبات الفلترة مع بنية قائمة التنقل، حتى أحصل على تجربة تصفح متسقة.

#### Acceptance Criteria

1. FOR movies content type, THE FilterTabs_Component SHALL display tabs: "All", "Trending", "Top Rated", "Latest", "Classics", "Summaries"
2. FOR series content type, THE FilterTabs_Component SHALL display tabs: "All", "Trending", "Top Rated", "Latest", "Ramadan Series"
3. FOR plays content type, THE FilterTabs_Component SHALL display tabs: "All", "Masrah Masr", "Adel Imam", "Gulf Plays", "Classics"
4. FOR anime content type, THE FilterTabs_Component SHALL display tabs: "All", "Trending", "Top Rated", "Latest", "Animation Movies", "Cartoon Series"
5. FOR gaming content type, THE FilterTabs_Component SHALL display tabs: "All", "Trending", "Top Rated", "Latest"
6. FOR software content type, THE FilterTabs_Component SHALL display tabs: "All", "Trending", "Top Rated", "Latest"
7. WHEN user clicks "Classics" tab in movies, THE Filter_System SHALL navigate to "/classics" route
8. WHEN user clicks "Summaries" tab in movies, THE Filter_System SHALL navigate to "/summaries" route
9. WHEN user clicks "Ramadan Series" tab in series, THE Filter_System SHALL navigate to "/ramadan" route
10. WHEN user clicks "Masrah Masr" tab in plays, THE Filter_System SHALL navigate to "/plays/masrah-masr" route
11. WHEN user clicks "Adel Imam" tab in plays, THE Filter_System SHALL navigate to "/plays/adel-imam" route
12. WHEN user clicks "Gulf Plays" tab in plays, THE Filter_System SHALL navigate to "/plays/gulf" route
13. THE FilterTabs_Component SHALL highlight active tab based on current route
14. THE FilterTabs_Component SHALL use same labels as Navbar subLinks for consistency

---

### Requirement 6: Category-Based Filtering from Navbar

**User Story (English):** As a user, I want to click genre categories in the navigation menu and see filtered content, so that I can quickly browse content by genre.

**User Story (العربية):** كمستخدم، أريد النقر على فئات التصنيف في قائمة التنقل ورؤية المحتوى المفلتر، حتى أتمكن من تصفح المحتوى حسب التصنيف بسرعة.

#### Acceptance Criteria

1. THE Filter_System SHALL create route pattern "/:contentType/:category" for category-based filtering
2. WHEN user clicks "Action" category in movies Navbar, THE Filter_System SHALL navigate to "/movies/action"
3. WHEN user navigates to "/movies/action", THE Filter_System SHALL fetch movies WHERE primary_genre = 'حركة' (Action in Arabic)
4. THE Filter_System SHALL map English category slugs to Arabic genre values using translation mapping
5. THE Filter_System SHALL support category routes for all content types: movies, series, anime, gaming, software
6. WHEN user navigates to category route, THE AdvancedFilters_Component SHALL pre-select corresponding genre in genre dropdown
7. THE Filter_System SHALL display category name in page title (e.g., "أفلام - أكشن" / "Movies - Action")
8. THE Filter_System SHALL allow users to apply additional filters (year, rating, sort) on category pages
9. IF category slug is invalid, THEN THE Filter_System SHALL redirect to base content type page
10. THE Filter_System SHALL maintain category filter when user changes page number


---

### Requirement 7: Genre Translation Mapping System

**User Story (English):** As a user, I want to see genre names in my preferred language, so that I can understand content categories regardless of database storage format.

**User Story (العربية):** كمستخدم، أريد رؤية أسماء التصنيفات باللغة المفضلة لدي، حتى أتمكن من فهم فئات المحتوى بغض النظر عن تنسيق تخزين قاعدة البيانات.

#### Acceptance Criteria

1. THE Filter_System SHALL maintain a genre translation mapping object with Arabic-to-English translations
2. THE Filter_System SHALL include translations for all movie/series genres: حركة→Action, كوميديا→Comedy, دراما→Drama, رعب→Horror, خيال-علمي→Sci-Fi, رومانسي→Romance, إثارة→Thriller, مغامرة→Adventure, جريمة→Crime, غموض→Mystery, فانتازيا→Fantasy, رسوم-متحركة→Animation, وثائقي→Documentary, عائلي→Family, موسيقي→Music, تاريخي→History, حرب→War, غربي→Western
3. THE Filter_System SHALL include translations for gaming genres: أكشن→Action, مغامرة→Adventure, آر-بي-جي→RPG, استراتيجية→Strategy, رياضة→Sports, سباق→Racing, محاكاة→Simulation
4. THE Filter_System SHALL include translations for software categories: إنتاجية→Productivity, تصميم→Design, تطوير→Development, وسائط-متعددة→Multimedia, أمان→Security, أدوات→Utilities
5. WHEN Genre_API returns genres, THE Genre_API SHALL apply translation mapping to provide both Arabic and English labels
6. WHEN user interface language is Arabic, THE AdvancedFilters_Component SHALL display Arabic genre labels
7. WHEN user interface language is English, THE AdvancedFilters_Component SHALL display English genre labels
8. THE Filter_System SHALL use Arabic genre values for all API queries to CockroachDB
9. THE Filter_System SHALL convert English category slugs from URLs to Arabic genre values before querying database
10. IF a genre has no translation mapping, THEN THE Filter_System SHALL display original Arabic value and log warning

---

### Requirement 8: Parser and Pretty Printer for Genre Mapping

**User Story (English):** As a developer, I want reliable parsing and formatting of genre mappings, so that genre translations are consistent and maintainable.

**User Story (العربية):** كمطور، أريد تحليل وتنسيق موثوق لتعيينات التصنيفات، حتى تكون ترجمات التصنيفات متسقة وقابلة للصيانة.

#### Acceptance Criteria

1. THE Filter_System SHALL provide parseGenreMapping function that accepts genre mapping object and validates structure
2. WHEN parseGenreMapping receives valid mapping object, THE Filter_System SHALL return normalized GenreMapping type
3. WHEN parseGenreMapping receives invalid mapping, THE Filter_System SHALL return descriptive error with invalid keys
4. THE Filter_System SHALL provide prettyPrintGenreMapping function that formats GenreMapping object to readable JSON string
5. THE Filter_System SHALL provide roundTripGenreMapping function that parses then pretty prints then parses genre mapping
6. FOR ALL valid GenreMapping objects, THE Filter_System SHALL ensure parseGenreMapping(JSON.parse(prettyPrintGenreMapping(mapping))) produces equivalent object (round-trip property)
7. THE Filter_System SHALL validate that all genre mapping keys are non-empty strings
8. THE Filter_System SHALL validate that all genre mapping values are non-empty strings
9. THE Filter_System SHALL validate that genre mapping contains no duplicate values
10. IF round-trip test fails, THEN THE Filter_System SHALL throw error indicating data corruption

---

### Requirement 9: Content API Enhancement for Genre Filtering

**User Story (English):** As a developer, I want the content API to support genre filtering, so that frontend can fetch genre-specific content efficiently.

**User Story (العربية):** كمطور، أريد أن تدعم واجهة برمجة تطبيقات المحتوى فلترة التصنيفات، حتى تتمكن الواجهة الأمامية من جلب المحتوى الخاص بالتصنيف بكفاءة.

#### Acceptance Criteria

1. THE Genre_API SHALL accept "genre" query parameter in content search endpoints
2. WHEN genre parameter is provided, THE Genre_API SHALL add WHERE clause "primary_genre = :genre" to database query
3. THE Genre_API SHALL accept "category" query parameter as alias for "genre" parameter
4. WHEN both genre and category parameters are provided, THE Genre_API SHALL use genre parameter and ignore category
5. THE Genre_API SHALL support genre filtering for /api/db/movies/search endpoint
6. THE Genre_API SHALL support genre filtering for /api/db/tv/search endpoint
7. THE Genre_API SHALL support genre filtering for /api/db/games/search endpoint
8. THE Genre_API SHALL support genre filtering for /api/db/software/search endpoint
9. THE Genre_API SHALL support genre filtering for /api/db/anime/search endpoint
10. WHEN genre parameter is NULL or empty string, THE Genre_API SHALL return all content without genre filtering
11. THE Genre_API SHALL use parameterized queries to prevent SQL injection in genre filtering
12. THE Genre_API SHALL return empty array if no content matches genre filter


---

### Requirement 10: URL State Management for Filters

**User Story (English):** As a user, I want filter selections to be reflected in the URL, so that I can bookmark and share filtered content pages.

**User Story (العربية):** كمستخدم، أريد أن تنعكس اختيارات الفلترة في عنوان URL، حتى أتمكن من حفظ ومشاركة صفحات المحتوى المفلتر.

#### Acceptance Criteria

1. WHEN user selects a genre filter, THE Filter_System SHALL update URL query parameter "genre" with selected genre value
2. WHEN user selects a year filter, THE Filter_System SHALL update URL query parameter "year" with selected year value
3. WHEN user selects a rating filter, THE Filter_System SHALL update URL query parameter "rating" with selected rating value
4. WHEN user selects a sort option, THE Filter_System SHALL update URL query parameter "sort" with selected sort value
5. WHEN user changes page, THE Filter_System SHALL update URL query parameter "page" with current page number
6. WHEN user navigates to URL with query parameters, THE AdvancedFilters_Component SHALL initialize filters from URL parameters
7. WHEN user clears filters, THE Filter_System SHALL remove corresponding query parameters from URL
8. THE Filter_System SHALL preserve existing query parameters when updating single filter
9. THE Filter_System SHALL use browser history API to update URL without page reload
10. WHEN user clicks browser back button, THE Filter_System SHALL restore previous filter state from URL

---

### Requirement 11: Filter State Persistence with React Query

**User Story (English):** As a user, I want fast filter responses with cached data, so that I don't wait for repeated API calls when switching between filters.

**User Story (العربية):** كمستخدم، أريد استجابات فلترة سريعة مع بيانات مخزنة مؤقتاً، حتى لا أنتظر استدعاءات API المتكررة عند التبديل بين الفلاتر.

#### Acceptance Criteria

1. THE Filter_System SHALL use React Query for all content fetching operations
2. THE Filter_System SHALL generate unique query keys based on contentType, filter, genre, year, rating, sort, and page
3. THE Filter_System SHALL cache content query results for 5 minutes (staleTime: 300000)
4. THE Filter_System SHALL cache genre list results for 1 hour (staleTime: 3600000)
5. WHEN user switches between filters, THE Filter_System SHALL serve cached data immediately if available
6. WHEN cached data is stale, THE Filter_System SHALL refetch in background and update UI when complete
7. THE Filter_System SHALL prefetch next page content when user reaches 80% of current page scroll
8. THE Filter_System SHALL invalidate content cache when user performs content-modifying action (admin only)
9. THE Filter_System SHALL display loading skeleton only on initial fetch, not when serving cached data
10. THE Filter_System SHALL display "Updating..." indicator when refetching stale data in background

---

### Requirement 12: Error Handling and Fallback Behavior

**User Story (English):** As a user, I want graceful error handling when filters fail, so that I can continue browsing even if some features are unavailable.

**User Story (العربية):** كمستخدم، أريد معالجة أخطاء سلسة عند فشل الفلاتر، حتى أتمكن من مواصلة التصفح حتى لو كانت بعض الميزات غير متاحة.

#### Acceptance Criteria

1. IF Genre_API request fails, THEN THE AdvancedFilters_Component SHALL display fallback hardcoded genre list
2. IF content fetch request fails, THEN THE Filter_System SHALL display error message with retry button
3. IF content fetch request times out after 30 seconds, THEN THE Filter_System SHALL display timeout error message
4. WHEN user clicks retry button, THE Filter_System SHALL re-attempt failed request
5. THE Filter_System SHALL log all API errors to console with request details for debugging
6. IF invalid genre parameter is provided, THEN THE Genre_API SHALL return 400 error with descriptive message
7. IF database connection fails, THEN THE Genre_API SHALL return 503 error with "Service Unavailable" message
8. THE Filter_System SHALL display user-friendly error messages in current UI language (Arabic/English)
9. IF category route is invalid, THEN THE Filter_System SHALL redirect to base content page instead of showing error
10. THE Filter_System SHALL track error rate and display maintenance notice if error rate exceeds 50%

---

### Requirement 13: Performance Optimization for Large Genre Lists

**User Story (English):** As a user, I want fast filter dropdown rendering even with many genres, so that the UI remains responsive.

**User Story (العربية):** كمستخدم، أريد عرض قائمة الفلاتر المنسدلة بسرعة حتى مع وجود العديد من التصنيفات، حتى تظل واجهة المستخدم سريعة الاستجابة.

#### Acceptance Criteria

1. THE AdvancedFilters_Component SHALL use React.memo to prevent unnecessary re-renders
2. THE AdvancedFilters_Component SHALL virtualize genre dropdown if genre list exceeds 50 items
3. THE AdvancedFilters_Component SHALL debounce filter change events by 300ms to reduce API calls
4. THE Filter_System SHALL limit genre API response to maximum 100 genres per content type
5. THE Genre_API SHALL add database index on primary_genre column for fast DISTINCT queries
6. THE Genre_API SHALL execute genre query with LIMIT 100 clause
7. WHEN genre list is virtualized, THE AdvancedFilters_Component SHALL render only visible items plus 10 buffer items
8. THE Filter_System SHALL measure and log filter dropdown render time in development mode
9. IF filter dropdown render time exceeds 100ms, THEN THE Filter_System SHALL log performance warning
10. THE AdvancedFilters_Component SHALL use native HTML select element for best mobile performance


---

### Requirement 14: Accessibility Compliance for Filter Components

**User Story (English):** As a user with disabilities, I want accessible filter controls, so that I can navigate and filter content using assistive technologies.

**User Story (العربية):** كمستخدم من ذوي الإعاقة، أريد عناصر تحكم فلترة يمكن الوصول إليها، حتى أتمكن من التنقل وفلترة المحتوى باستخدام التقنيات المساعدة.

#### Acceptance Criteria

1. THE FilterTabs_Component SHALL use semantic HTML nav element with aria-label="Content filters"
2. THE FilterTabs_Component SHALL mark active tab with aria-current="page" attribute
3. THE AdvancedFilters_Component SHALL associate all select elements with visible label elements using htmlFor attribute
4. THE AdvancedFilters_Component SHALL provide aria-label for each filter dropdown describing its purpose
5. WHEN filter is loading, THE Filter_System SHALL announce "Loading filters" to screen readers using aria-live="polite"
6. WHEN filter results update, THE Filter_System SHALL announce result count to screen readers
7. THE Filter_System SHALL ensure all filter controls are keyboard navigable with Tab key
8. THE Filter_System SHALL support Enter key to activate filter tabs
9. THE Filter_System SHALL ensure filter dropdowns have minimum 44x44px touch target size for mobile
10. THE Filter_System SHALL maintain focus management when filters update content
11. THE AdvancedFilters_Component SHALL use aria-expanded attribute for expandable filter sections
12. THE Filter_System SHALL provide skip link to bypass filters and jump to content

---

### Requirement 15: Mobile-Responsive Filter Interface

**User Story (English):** As a mobile user, I want touch-friendly filters that work well on small screens, so that I can filter content comfortably on my phone.

**User Story (العربية):** كمستخدم للهاتف المحمول، أريد فلاتر سهلة اللمس تعمل بشكل جيد على الشاشات الصغيرة، حتى أتمكن من فلترة المحتوى بشكل مريح على هاتفي.

#### Acceptance Criteria

1. THE FilterTabs_Component SHALL display horizontally scrollable tabs on mobile screens (width < 768px)
2. THE FilterTabs_Component SHALL hide scrollbar on mobile while maintaining scroll functionality
3. THE AdvancedFilters_Component SHALL stack filter dropdowns vertically on mobile screens
4. THE AdvancedFilters_Component SHALL expand filter dropdowns to full width on mobile screens
5. THE AdvancedFilters_Component SHALL use native mobile select UI on iOS and Android devices
6. WHEN user opens filter dropdown on mobile, THE Filter_System SHALL prevent body scroll
7. THE Filter_System SHALL add bottom sheet UI for advanced filters on mobile screens
8. THE Filter_System SHALL provide "Apply Filters" button on mobile that closes bottom sheet
9. THE FilterTabs_Component SHALL snap to tab boundaries when scrolling on mobile
10. THE Filter_System SHALL ensure minimum 48px height for all filter controls on mobile
11. THE AdvancedFilters_Component SHALL collapse into "Filters" button on screens smaller than 640px
12. WHEN "Filters" button is clicked, THE AdvancedFilters_Component SHALL open modal with all filter options

---

### Requirement 16: Analytics and Monitoring for Filter Usage

**User Story (English):** As a product manager, I want to track filter usage patterns, so that I can understand user behavior and optimize the filtering experience.

**User Story (العربية):** كمدير منتج، أريد تتبع أنماط استخدام الفلاتر، حتى أتمكن من فهم سلوك المستخدم وتحسين تجربة الفلترة.

#### Acceptance Criteria

1. THE Filter_System SHALL log filter selection events with filter type, value, and timestamp
2. THE Filter_System SHALL track most frequently used genre filters per content type
3. THE Filter_System SHALL track average time between filter changes
4. THE Filter_System SHALL track filter abandonment rate (filters applied but no content clicked)
5. THE Filter_System SHALL track filter combination patterns (e.g., genre + year + rating)
6. THE Filter_System SHALL send analytics events to monitoring service without blocking UI
7. THE Filter_System SHALL batch analytics events and send every 30 seconds to reduce network requests
8. THE Filter_System SHALL include user session ID in analytics events for session tracking
9. THE Filter_System SHALL respect user privacy settings and disable analytics if user opts out
10. THE Filter_System SHALL provide admin dashboard showing top 10 most used filters per content type
11. THE Filter_System SHALL track API response times for genre fetching and content filtering
12. IF average API response time exceeds 2 seconds, THEN THE Filter_System SHALL trigger performance alert

---

### Requirement 17: Database Schema Validation for Genre Data

**User Story (English):** As a database administrator, I want to ensure genre data integrity, so that filtering works reliably across all content types.

**User Story (العربية):** كمسؤول قاعدة بيانات، أريد ضمان سلامة بيانات التصنيفات، حتى تعمل الفلترة بشكل موثوق عبر جميع أنواع المحتوى.

#### Acceptance Criteria

1. THE Genre_API SHALL validate that primary_genre column exists in movies table before querying
2. THE Genre_API SHALL validate that primary_genre column exists in tv_series table before querying
3. THE Genre_API SHALL validate that primary_genre column exists in games table before querying
4. THE Genre_API SHALL validate that primary_genre column exists in software table before querying
5. THE Genre_API SHALL validate that primary_genre column exists in anime table before querying
6. THE Genre_API SHALL create database index on primary_genre column if not exists
7. THE Genre_API SHALL log warning if more than 10% of content has NULL primary_genre value
8. THE Genre_API SHALL provide migration script to populate missing primary_genre values
9. THE Genre_API SHALL validate genre values against allowed genre list before inserting new content
10. THE Genre_API SHALL normalize genre values to remove extra whitespace and standardize format
11. THE Genre_API SHALL provide admin endpoint to bulk update genre values for data cleanup
12. THE Genre_API SHALL maintain audit log of genre value changes for content items


---

### Requirement 18: Testing Requirements for Filter System

**User Story (English):** As a quality assurance engineer, I want comprehensive tests for the filter system, so that I can ensure reliability and catch regressions early.

**User Story (العربية):** كمهندس ضمان الجودة، أريد اختبارات شاملة لنظام الفلترة، حتى أتمكن من ضمان الموثوقية واكتشاف الأخطاء مبكراً.

#### Acceptance Criteria

1. THE Filter_System SHALL include unit tests for genre translation mapping functions
2. THE Filter_System SHALL include unit tests for URL parameter parsing and serialization
3. THE Filter_System SHALL include integration tests for Genre_API endpoints
4. THE Filter_System SHALL include integration tests for content filtering with genre parameter
5. THE Filter_System SHALL include component tests for FilterTabs_Component rendering
6. THE Filter_System SHALL include component tests for AdvancedFilters_Component user interactions
7. THE Filter_System SHALL include end-to-end tests for complete filter workflow (select genre → see filtered results)
8. THE Filter_System SHALL include property-based tests for genre mapping round-trip validation
9. THE Filter_System SHALL include performance tests ensuring filter API responds within 500ms
10. THE Filter_System SHALL include accessibility tests validating ARIA attributes and keyboard navigation
11. THE Filter_System SHALL achieve minimum 80% code coverage for filter-related modules
12. THE Filter_System SHALL include visual regression tests for filter UI components
13. THE Filter_System SHALL include tests for error scenarios (API failure, invalid parameters, network timeout)
14. THE Filter_System SHALL include tests for mobile responsive behavior
15. THE Filter_System SHALL run all filter tests in CI/CD pipeline before deployment

---

## Technical Architecture | البنية التقنية

### Backend Components | مكونات الخلفية

1. **Genre API Endpoint** (`/api/genres/:contentType`)
   - Fetches distinct genre values from CockroachDB
   - Returns bilingual genre list (Arabic + English)
   - Implements caching with 1-hour TTL
   - Handles errors gracefully with fallback data

2. **Enhanced Content Search API**
   - Accepts genre/category filter parameter
   - Supports optional sort parameter (NULL for "All")
   - Uses parameterized queries for security
   - Returns paginated results with metadata

3. **Genre Translation Service**
   - Maintains Arabic-to-English genre mapping
   - Provides parsing and validation functions
   - Implements round-trip testing for data integrity
   - Supports extensibility for new genres

### Frontend Components | مكونات الواجهة الأمامية

1. **FilterTabs Component** (Updated)
   - Removes "Upcoming" tab from all content types
   - Matches Navbar structure exactly
   - Supports content-specific tabs (Classics, Summaries, etc.)
   - Implements active state highlighting

2. **AdvancedFilters Component** (Enhanced)
   - Fetches genres dynamically from API
   - Adds "All" option to sort dropdown
   - Implements React Query caching
   - Provides loading and error states

3. **Category Route Handler** (New)
   - Handles `/:contentType/:category` routes
   - Maps category slugs to genre values
   - Pre-selects genre in filter dropdown
   - Updates page title with category name

4. **Islamic Content Pages** (New)
   - Dedicated routes for `/fatwas` and `/prophets-stories`
   - Fetches content by category from CockroachDB
   - Applies standard filtering and pagination
   - Updates Navbar links accordingly

### Database Schema | مخطط قاعدة البيانات

**CockroachDB Tables** (No changes required, using existing schema):
- `movies` table with `primary_genre` column (VARCHAR)
- `tv_series` table with `primary_genre` column (VARCHAR)
- `games` table with `primary_genre` column (VARCHAR)
- `software` table with `primary_genre` column (VARCHAR)
- `anime` table with `primary_genre` and `category` columns

**Recommended Indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_movies_primary_genre ON movies(primary_genre);
CREATE INDEX IF NOT EXISTS idx_tv_series_primary_genre ON tv_series(primary_genre);
CREATE INDEX IF NOT EXISTS idx_games_primary_genre ON games(primary_genre);
CREATE INDEX IF NOT EXISTS idx_software_primary_genre ON software(primary_genre);
CREATE INDEX IF NOT EXISTS idx_anime_primary_genre ON anime(primary_genre);
```

### Data Flow | تدفق البيانات

1. **Genre Fetching Flow**:
   ```
   User opens page → AdvancedFilters mounts → Fetch /api/genres/:contentType
   → Query CockroachDB for DISTINCT primary_genre → Apply translations
   → Cache for 1 hour → Display in dropdown
   ```

2. **Category Filtering Flow**:
   ```
   User clicks category in Navbar → Navigate to /:contentType/:category
   → Map category slug to Arabic genre → Fetch content with genre filter
   → Pre-select genre in dropdown → Display filtered results
   ```

3. **Filter Application Flow**:
   ```
   User selects filters → Update URL parameters → Generate React Query key
   → Check cache → If miss, fetch from API → Update UI → Cache results
   ```

### API Endpoints Summary | ملخص نقاط النهاية

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/api/genres/:contentType` | GET | Fetch genre list | contentType: movies\|series\|anime\|gaming\|software |
| `/api/db/movies/search` | POST | Search movies | genre, year, rating, sort, page, limit |
| `/api/db/tv/search` | POST | Search series | genre, year, rating, sort, page, limit |
| `/api/db/games/search` | POST | Search games | genre, year, rating, sort, page, limit |
| `/api/db/software/search` | POST | Search software | genre, year, rating, sort, page, limit |
| `/api/db/anime/search` | POST | Search anime | genre, year, rating, sort, page, limit |


---

## Implementation Priority | أولوية التنفيذ

### Phase 1: Critical Fixes (High Priority)
1. Remove "Upcoming" filter from all content types
2. Create Genre API endpoint for dynamic genre fetching
3. Add "All" option to sort filter with NULL default
4. Update FilterTabs to match Navbar structure

### Phase 2: Core Features (High Priority)
5. Implement genre translation mapping system
6. Create Islamic content dedicated pages (/fatwas, /prophets-stories)
7. Implement category-based filtering from Navbar
8. Add URL state management for filters

### Phase 3: Enhancement (Medium Priority)
9. Implement React Query caching for performance
10. Add error handling and fallback behavior
11. Optimize performance for large genre lists
12. Implement mobile-responsive filter interface

### Phase 4: Quality & Monitoring (Medium Priority)
13. Add accessibility compliance features
14. Implement analytics and monitoring
15. Add database schema validation
16. Create comprehensive test suite

---

## Success Metrics | مقاييس النجاح

### Functional Metrics
- ✅ Zero "Upcoming" filter instances across all pages
- ✅ 100% genre accuracy (filters match database genres)
- ✅ All Islamic content pages accessible without search redirect
- ✅ Filter tabs match Navbar structure exactly
- ✅ Category links from Navbar work correctly

### Performance Metrics
- ⚡ Genre API response time < 500ms (95th percentile)
- ⚡ Content filtering response time < 1000ms (95th percentile)
- ⚡ Filter dropdown render time < 100ms
- ⚡ Cache hit rate > 70% for repeated filter queries
- ⚡ Page load time improvement of 20% with caching

### User Experience Metrics
- 📊 Filter usage rate increase by 30%
- 📊 Filter abandonment rate decrease by 40%
- 📊 Mobile filter interaction rate increase by 25%
- 📊 Error rate < 1% for filter operations
- 📊 Accessibility score 100/100 on Lighthouse

### Quality Metrics
- 🧪 Test coverage > 80% for filter modules
- 🧪 Zero critical bugs in production
- 🧪 All EARS patterns validated
- 🧪 All INCOSE quality rules satisfied
- 🧪 Round-trip property tests passing

---

## Dependencies and Constraints | التبعيات والقيود

### Technical Dependencies
- CockroachDB with existing schema (movies, tv_series, games, software, anime tables)
- React Query for caching and state management
- React Router for URL-based routing
- Existing API infrastructure for content queries

### Database Constraints
- ⚠️ All content data MUST be fetched from CockroachDB (NOT Supabase)
- ⚠️ Genre values stored in Arabic in database
- ⚠️ primary_genre column must exist in all content tables
- ⚠️ Database indexes required for optimal performance

### UI/UX Constraints
- Must maintain existing design system and styling
- Must support both Arabic (RTL) and English (LTR) layouts
- Must work on mobile, tablet, and desktop screens
- Must maintain accessibility standards (WCAG 2.1 AA)

### Performance Constraints
- API response time must not exceed 2 seconds
- Filter UI must remain responsive with 100+ genres
- Cache must not exceed 50MB in browser storage
- Mobile data usage must be minimized

---

## Risk Assessment | تقييم المخاطر

### High Risk
1. **Database Performance**: Large DISTINCT queries on primary_genre may be slow
   - Mitigation: Add database indexes, implement query optimization, cache results

2. **Genre Data Quality**: Inconsistent or NULL genre values in database
   - Mitigation: Data validation, cleanup scripts, fallback handling

### Medium Risk
3. **Breaking Changes**: Removing "Upcoming" filter may affect user bookmarks
   - Mitigation: Implement redirects, show user-friendly messages

4. **Translation Accuracy**: Genre translations may not match user expectations
   - Mitigation: User testing, feedback collection, iterative improvements

### Low Risk
5. **Cache Invalidation**: Stale genre data if new genres added
   - Mitigation: 1-hour cache TTL, manual cache invalidation endpoint

6. **Mobile Performance**: Complex filters may be slow on low-end devices
   - Mitigation: Progressive enhancement, native select elements, virtualization

---

## Rollout Strategy | استراتيجية الإطلاق

### Stage 1: Development (Week 1-2)
- Implement backend Genre API endpoint
- Create genre translation mapping
- Update FilterTabs and AdvancedFilters components
- Add Islamic content pages

### Stage 2: Testing (Week 3)
- Unit testing for all new functions
- Integration testing for API endpoints
- Component testing for UI changes
- End-to-end testing for complete workflows
- Accessibility testing with screen readers
- Performance testing with large datasets

### Stage 3: Staging Deployment (Week 4)
- Deploy to staging environment
- Internal QA testing
- User acceptance testing with sample users
- Performance monitoring and optimization
- Bug fixes and refinements

### Stage 4: Production Rollout (Week 5)
- Deploy to production with feature flag
- Enable for 10% of users (canary deployment)
- Monitor error rates and performance metrics
- Gradually increase to 50%, then 100%
- Collect user feedback and analytics

### Stage 5: Post-Launch (Week 6+)
- Monitor analytics and user behavior
- Address user feedback and bug reports
- Optimize based on performance data
- Plan future enhancements

---

## Appendix: Genre Translation Reference | ملحق: مرجع ترجمة التصنيفات

### Movies & Series Genres | تصنيفات الأفلام والمسلسلات
| Arabic (Database) | English (Display) | Category Slug |
|-------------------|-------------------|---------------|
| حركة | Action | action |
| كوميديا | Comedy | comedy |
| دراما | Drama | drama |
| رعب | Horror | horror |
| خيال-علمي | Sci-Fi | science-fiction |
| رومانسي | Romance | romance |
| إثارة | Thriller | thriller |
| مغامرة | Adventure | adventure |
| جريمة | Crime | crime |
| غموض | Mystery | mystery |
| فانتازيا | Fantasy | fantasy |
| رسوم-متحركة | Animation | animation |
| وثائقي | Documentary | documentary |
| عائلي | Family | family |
| موسيقي | Music | music |
| تاريخي | History | history |
| حرب | War | war |
| غربي | Western | western |

### Gaming Genres | تصنيفات الألعاب
| Arabic (Database) | English (Display) | Category Slug |
|-------------------|-------------------|---------------|
| أكشن | Action | action |
| مغامرة | Adventure | adventure |
| آر-بي-جي | RPG | rpg |
| استراتيجية | Strategy | strategy |
| رياضة | Sports | sports |
| سباق | Racing | racing |
| محاكاة | Simulation | simulation |

### Software Categories | فئات البرمجيات
| Arabic (Database) | English (Display) | Category Slug |
|-------------------|-------------------|---------------|
| إنتاجية | Productivity | productivity |
| تصميم | Design | design |
| تطوير | Development | development |
| وسائط-متعددة | Multimedia | multimedia |
| أمان | Security | security |
| أدوات | Utilities | utilities |

---

## Document Metadata | بيانات المستند

- **Spec ID**: 4b1adbd8-8304-468a-9977-99943417703e
- **Workflow Type**: Requirements-First
- **Spec Type**: Feature
- **Feature Name**: dynamic-filters-and-categories
- **Created**: 2026-04-04
- **Last Updated**: 2026-04-04
- **Status**: Requirements Phase - Awaiting Review
- **Total Requirements**: 18
- **Total Acceptance Criteria**: 217

---

## Next Steps | الخطوات التالية

1. **User Review**: Review requirements document for completeness and accuracy
2. **Feedback Integration**: Incorporate any user feedback or requested changes
3. **Design Phase**: Proceed to create design document with technical specifications
4. **Task Breakdown**: Create detailed implementation tasks from design
5. **Development**: Begin implementation following task list

---

**End of Requirements Document**

