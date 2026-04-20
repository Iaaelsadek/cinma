# مستند المتطلبات: توحيد بنية الأقسام والصفحات
# Requirements Document: Unified Section Architecture

## المقدمة / Introduction

هذا المشروع يهدف إلى إعادة تصميم شاملة لكل صفحات الأقسام في الموقع (الأفلام، المسلسلات، الأنمي، الألعاب، البرامج) لتوحيد البنية والعرض. المشكلة الحالية هي أن المحتوى موجود في الأقسام الفرعية (QuantumTrain) لكن غير معروض بشكل كامل في الصفحات الرئيسية للأقسام.

This project aims to comprehensively redesign all section pages on the site (movies, series, anime, gaming, software) to unify the structure and display. The current problem is that content exists in subsections (QuantumTrain) but is not fully displayed on the main section pages.

## المصطلحات / Glossary

- **Section_Page**: الصفحة الرئيسية لقسم معين (مثل /movies، /series)
- **Subsection_Page**: الصفحة الفرعية داخل قسم (مثل /movies/trending، /series/top-rated)
- **Home_Page**: الصفحة الرئيسية للموقع (/)
- **Hero_Cards**: البطاقات الكبيرة المعروضة في أعلى الصفحة
- **Filter_Tabs**: روابط الأقسام الفرعية المعروضة في أعلى الصفحة
- **Content_Grid**: شبكة عرض المحتوى (الأفلام/المسلسلات)
- **Advanced_Filters**: الفلاتر المتقدمة (التصنيف، السنة، التقييم، الترتيب)
- **QuantumTrain**: مكون عرض المحتوى الأفقي الحالي
- **UnifiedSectionPage**: المكون الموحد الجديد لعرض الأقسام
- **CockroachDB_API**: واجهة برمجة التطبيقات للوصول إلى قاعدة البيانات الرئيسية

## المتطلبات / Requirements

### Requirement 1: الحفاظ على الصفحة الرئيسية / Preserve Home Page

**User Story:** كمستخدم، أريد أن تبقى الصفحة الرئيسية كما هي، حتى أتمكن من رؤية Hero Cards والأقسام المتنوعة.

**User Story:** As a user, I want the home page to remain as is, so that I can see Hero Cards and diverse sections.

#### معايير القبول / Acceptance Criteria

1. THE Home_Page SHALL display Hero_Cards at the top
2. THE Home_Page SHALL display diverse content sections from all categories
3. THE Home_Page SHALL NOT be modified by this feature implementation
4. WHEN a user visits "/", THEN THE Home_Page SHALL render with existing Hero_Cards component
5. WHEN a user visits "/", THEN THE Home_Page SHALL render with existing QuantumTrain sections

### Requirement 2: إزالة Hero Cards من صفحات الأقسام / Remove Hero Cards from Section Pages

**User Story:** كمستخدم، أريد أن أرى كل محتوى القسم مباشرة بدون Hero Cards، حتى أتمكن من تصفح المحتوى بشكل أسرع.

**User Story:** As a user, I want to see all section content directly without Hero Cards, so that I can browse content faster.

#### معايير القبول / Acceptance Criteria

1. THE Section_Page SHALL NOT display Hero_Cards component
2. WHEN a user visits "/movies", THEN THE Section_Page SHALL NOT render QuantumHero component
3. WHEN a user visits "/series", THEN THE Section_Page SHALL NOT render QuantumHero component
4. WHEN a user visits "/anime", THEN THE Section_Page SHALL NOT render QuantumHero component
5. WHEN a user visits "/gaming", THEN THE Section_Page SHALL NOT render QuantumHero component
6. WHEN a user visits "/software", THEN THE Section_Page SHALL NOT render QuantumHero component

### Requirement 3: عرض Filter Tabs في صفحات الأقسام / Display Filter Tabs in Section Pages

**User Story:** كمستخدم، أريد أن أرى روابط الأقسام الفرعية في أعلى الصفحة، حتى أتمكن من التنقل بسهولة بين الأقسام.

**User Story:** As a user, I want to see subsection links at the top of the page, so that I can easily navigate between sections.

#### معايير القبول / Acceptance Criteria

1. THE Section_Page SHALL display Filter_Tabs at the top
2. THE Filter_Tabs SHALL include options: "الكل" (All), "الرائج" (Trending), "الأعلى تقييماً" (Top Rated), "الأحدث" (Latest), "قريباً" (Upcoming)
3. WHEN a user visits "/movies", THEN THE Filter_Tabs SHALL display with "الكل" as active
4. WHEN a user clicks on a Filter_Tab, THEN THE Section_Page SHALL navigate to the corresponding Subsection_Page
5. THE Filter_Tabs SHALL be visually consistent across all Section_Pages

### Requirement 4: عرض كل محتوى القسم في Grid / Display All Section Content in Grid

**User Story:** كمستخدم، أريد أن أرى كل محتوى القسم في شبكة كاملة، حتى أتمكن من تصفح جميع الخيارات المتاحة.

**User Story:** As a user, I want to see all section content in a full grid, so that I can browse all available options.

#### معايير القبول / Acceptance Criteria

1. THE Section_Page SHALL display all content in Content_Grid format
2. THE Content_Grid SHALL fetch data from CockroachDB_API
3. WHEN a user visits "/movies", THEN THE Content_Grid SHALL display all movies from CockroachDB_API
4. WHEN a user visits "/series", THEN THE Content_Grid SHALL display all TV series from CockroachDB_API
5. THE Content_Grid SHALL support pagination for large datasets
6. THE Content_Grid SHALL display at least 40 items per page
7. THE Content_Grid SHALL be responsive (2 columns on mobile, 4 on tablet, 6 on desktop)

### Requirement 5: إضافة فلاتر متقدمة / Add Advanced Filters

**User Story:** كمستخدم، أريد أن أفلتر المحتوى حسب التصنيف والسنة والتقييم، حتى أتمكن من العثور على ما أبحث عنه بسرعة.

**User Story:** As a user, I want to filter content by genre, year, and rating, so that I can quickly find what I'm looking for.

#### معايير القبول / Acceptance Criteria

1. THE Section_Page SHALL display Advanced_Filters component
2. THE Advanced_Filters SHALL include genre filter dropdown
3. THE Advanced_Filters SHALL include year filter dropdown
4. THE Advanced_Filters SHALL include rating filter dropdown
5. THE Advanced_Filters SHALL include sort order dropdown (popularity, rating, release date)
6. WHEN a user selects a genre filter, THEN THE Content_Grid SHALL update to show only items matching that genre
7. WHEN a user selects a year filter, THEN THE Content_Grid SHALL update to show only items from that year
8. WHEN a user selects a rating filter, THEN THE Content_Grid SHALL update to show only items with rating >= selected value
9. WHEN a user selects a sort order, THEN THE Content_Grid SHALL reorder items accordingly
10. THE Advanced_Filters SHALL update URL query parameters to reflect current filter state

### Requirement 6: إنشاء صفحات فرعية فعلية / Create Actual Subsection Pages

**User Story:** كمستخدم، أريد أن أزور صفحات فرعية مخصصة (مثل /movies/trending)، حتى أتمكن من رؤية محتوى محدد فقط.

**User Story:** As a user, I want to visit dedicated subsection pages (like /movies/trending), so that I can see only specific content.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL create route "/movies/trending" for trending movies
2. THE System SHALL create route "/movies/top-rated" for top rated movies
3. THE System SHALL create route "/movies/latest" for latest movies
4. THE System SHALL create route "/movies/upcoming" for upcoming movies
5. THE System SHALL create equivalent routes for "/series/*", "/anime/*", "/gaming/*", "/software/*"
6. WHEN a user visits a Subsection_Page, THEN THE Filter_Tabs SHALL display with the corresponding tab as active
7. WHEN a user visits a Subsection_Page, THEN THE Content_Grid SHALL display only content matching that subsection filter
8. THE Subsection_Page SHALL support the same Advanced_Filters as Section_Page

### Requirement 7: توحيد المكونات / Unify Components

**User Story:** كمطور، أريد استخدام نفس المكون لكل الأقسام، حتى يكون الكود نظيفاً وقابلاً للصيانة.

**User Story:** As a developer, I want to use the same component for all sections, so that the code is clean and maintainable.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL create UnifiedSectionPage component
2. THE UnifiedSectionPage SHALL accept contentType prop ('movies' | 'series' | 'anime' | 'gaming' | 'software')
3. THE UnifiedSectionPage SHALL accept activeFilter prop ('all' | 'trending' | 'top-rated' | 'latest' | 'upcoming')
4. THE UnifiedSectionPage SHALL accept optional genre prop
5. THE UnifiedSectionPage SHALL accept optional year prop
6. THE UnifiedSectionPage SHALL render Filter_Tabs component
7. THE UnifiedSectionPage SHALL render Content_Grid component
8. THE UnifiedSectionPage SHALL render Advanced_Filters component
9. WHEN contentType changes, THEN THE UnifiedSectionPage SHALL fetch appropriate data from CockroachDB_API
10. THE UnifiedSectionPage SHALL replace existing Movies.tsx, Series.tsx, Anime.tsx pages

### Requirement 8: جلب البيانات من CockroachDB / Fetch Data from CockroachDB

**User Story:** كمطور، أريد جلب كل البيانات من CockroachDB فقط، حتى أتجنب التعارضات مع Supabase.

**User Story:** As a developer, I want to fetch all data from CockroachDB only, so that I avoid conflicts with Supabase.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL fetch all movie data from CockroachDB_API endpoint "/api/movies"
2. THE System SHALL fetch all TV series data from CockroachDB_API endpoint "/api/tv"
3. THE System SHALL fetch all anime data from CockroachDB_API endpoint "/api/tv?language=ja"
4. THE System SHALL NOT fetch content data from Supabase
5. WHEN fetching trending content, THEN THE System SHALL use "sortBy=trending" query parameter
6. WHEN fetching top rated content, THEN THE System SHALL use "sortBy=vote_average&ratingFrom=8" query parameters
7. WHEN fetching latest content, THEN THE System SHALL use "sortBy=release_date" query parameter
8. WHEN fetching by genre, THEN THE System SHALL use "genre={genre_name}" query parameter
9. WHEN fetching by year, THEN THE System SHALL use "yearFrom={year}&yearTo={year}" query parameters

### Requirement 9: دعم اللغتين العربية والإنجليزية / Support Arabic and English Languages

**User Story:** كمستخدم، أريد أن أرى واجهة المستخدم بلغتي المفضلة، حتى أتمكن من فهم المحتوى بسهولة.

**User Story:** As a user, I want to see the UI in my preferred language, so that I can easily understand the content.

#### معايير القبول / Acceptance Criteria

1. THE Filter_Tabs SHALL display labels in Arabic when lang='ar'
2. THE Filter_Tabs SHALL display labels in English when lang='en'
3. THE Advanced_Filters SHALL display labels in Arabic when lang='ar'
4. THE Advanced_Filters SHALL display labels in English when lang='en'
5. THE Content_Grid SHALL display "لا توجد نتائج" when no results and lang='ar'
6. THE Content_Grid SHALL display "No results found" when no results and lang='en'
7. THE System SHALL use useLang hook to determine current language

### Requirement 10: الحفاظ على الأداء / Maintain Performance

**User Story:** كمستخدم، أريد أن تحمل الصفحات بسرعة، حتى لا أضطر للانتظار طويلاً.

**User Story:** As a user, I want pages to load quickly, so that I don't have to wait long.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL implement query caching with staleTime of 5 minutes
2. THE System SHALL implement pagination to limit initial data load
3. THE System SHALL use React Query for data fetching and caching
4. WHEN a user navigates between Filter_Tabs, THEN THE System SHALL use cached data if available
5. THE Content_Grid SHALL implement virtual scrolling for large datasets
6. THE System SHALL prefetch data for adjacent pages
7. WHEN initial page load occurs, THEN THE System SHALL display skeleton loaders while fetching data

### Requirement 11: معالجة الأخطاء / Error Handling

**User Story:** كمستخدم، أريد أن أرى رسائل خطأ واضحة عند حدوث مشكلة، حتى أعرف ما يحدث.

**User Story:** As a user, I want to see clear error messages when something goes wrong, so that I know what's happening.

#### معايير القبول / Acceptance Criteria

1. WHEN CockroachDB_API request fails, THEN THE System SHALL display error message to user
2. WHEN CockroachDB_API request fails, THEN THE System SHALL log error to error logging service
3. WHEN no content is available, THEN THE System SHALL display "لا توجد نتائج" / "No results found" message
4. WHEN network error occurs, THEN THE System SHALL display retry button
5. THE System SHALL implement error boundaries to prevent full page crashes
6. WHEN filter produces no results, THEN THE System SHALL suggest removing filters

### Requirement 12: SEO والروابط / SEO and URLs

**User Story:** كمستخدم، أريد أن أشارك روابط محددة مع أصدقائي، حتى يروا نفس المحتوى الذي أراه.

**User Story:** As a user, I want to share specific links with friends, so that they see the same content I see.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL update URL when user changes filters
2. THE System SHALL parse URL parameters on page load to restore filter state
3. WHEN a user selects genre "action", THEN THE URL SHALL update to include "?genre=action"
4. WHEN a user selects year "2024", THEN THE URL SHALL update to include "?year=2024"
5. WHEN a user visits URL with query parameters, THEN THE System SHALL apply those filters automatically
6. THE System SHALL generate proper meta tags for each Subsection_Page
7. THE System SHALL use Helmet for dynamic SEO meta tags

