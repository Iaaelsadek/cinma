# مستند المتطلبات: توحيد بنية الموقع بالكامل
# Requirements Document: Unified Site Architecture

## المقدمة / Introduction

هذا المشروع يهدف إلى توحيد كامل لبنية الموقع بحيث تعمل جميع الأقسام (أفلام، مسلسلات، ألعاب، برامج) بنفس الطريقة مع نفس الـ layout والـ navigation والـ filters. المشكلة الحالية هي أن قسم الأفلام يعمل بشكل صحيح مع navigation ثابت، لكن باقي الأقسام تفقد الـ navigation عند الدخول للأقسام الفرعية، بالإضافة إلى وجود محتوى غلط ومكرر في بعض الأقسام.

This project aims to completely unify the site architecture so that all sections (movies, series, games, software) work the same way with the same layout, navigation, and filters. The current problem is that the movies section works correctly with persistent navigation, but other sections lose navigation when entering subsections, plus there is incorrect and duplicate content in some sections.

## المصطلحات / Glossary

- **Section**: القسم الرئيسي (أفلام، مسلسلات، ألعاب، برامج) / Main section (movies, series, games, software)
- **Subsection**: القسم الفرعي داخل القسم الرئيسي / Subsection within main section
- **Navigation_Tabs**: روابط الأقسام الفرعية الثابتة / Persistent subsection navigation tabs
- **Content_Grid**: شبكة عرض المحتوى / Content display grid
- **Filters**: الفلاتر المتقدمة (التصنيف، السنة، التقييم) / Advanced filters (genre, year, rating)
- **Layout**: البنية العامة للصفحة / Page layout structure
- **CockroachDB**: قاعدة البيانات الرئيسية للمحتوى / Primary content database
- **Data_Integrity**: صحة البيانات وعدم التكرار / Data correctness and no duplication
- **Unified_Component**: مكون موحد مشترك / Shared unified component

## المتطلبات / Requirements

### Requirement 1: توحيد Navigation في كل الأقسام

**User Story:** كمستخدم، أريد أن أرى روابط الأقسام الفرعية دائماً في كل الأقسام، حتى أتمكن من التنقل بسهولة بين الأقسام الفرعية.

**User Story:** As a user, I want to see subsection navigation tabs always visible in all sections, so that I can easily navigate between subsections.

#### معايير القبول / Acceptance Criteria

1. WHEN a user visits any Section, THEN THE Navigation_Tabs SHALL be visible at the top
2. WHEN a user visits any Subsection, THEN THE Navigation_Tabs SHALL remain visible
3. THE Navigation_Tabs SHALL display the active Subsection with visual indicator
4. THE Navigation_Tabs SHALL be consistent across all Sections (movies, series, games, software)
5. WHEN a user clicks on a Navigation_Tab, THEN THE System SHALL navigate to the corresponding Subsection
6. THE Navigation_Tabs SHALL be responsive (horizontal scroll on mobile, full display on desktop)

### Requirement 2: توحيد الأقسام الفرعية للمسلسلات

**User Story:** كمستخدم، أريد أن أرى أقسام فرعية واضحة للمسلسلات (عربي، رمضان، كوري، تركي، صيني، أجنبي)، حتى أتمكن من تصفح المحتوى حسب اللغة والنوع.

**User Story:** As a user, I want to see clear subsections for TV series (Arabic, Ramadan, Korean, Turkish, Chinese, Foreign), so that I can browse content by language and type.

#### معايير القبول / Acceptance Criteria

1. THE Series_Section SHALL have Subsections: "الكل" (All), "عربي" (Arabic), "رمضان" (Ramadan), "كوري" (Korean), "تركي" (Turkish), "صيني" (Chinese), "أجنبي" (Foreign)
2. WHEN a user visits "/series", THEN THE Navigation_Tabs SHALL display all Subsections
3. WHEN a user visits "/series/ramadan", THEN THE Navigation_Tabs SHALL remain visible with "رمضان" as active
4. WHEN a user visits "/series/korean", THEN THE Navigation_Tabs SHALL remain visible with "كوري" as active
5. THE Navigation_Tabs SHALL use the same component as Movies_Section
6. THE Navigation_Tabs SHALL support both Arabic and English labels

### Requirement 3: إصلاح محتوى قسم رمضان

**User Story:** كمستخدم، أريد أن أرى مسلسلات عربية فقط في قسم رمضان، حتى لا أرى محتوى أجنبي غير مناسب.

**User Story:** As a user, I want to see only Arabic series in the Ramadan section, so that I don't see inappropriate foreign content.

#### معايير القبول / Acceptance Criteria

1. THE Ramadan_Subsection SHALL display only TV series with language='ar'
2. THE Ramadan_Subsection SHALL display only TV series with genres containing 'رمضان' OR 'دراما'
3. WHEN fetching Ramadan content, THEN THE System SHALL query CockroachDB with filters: language='ar' AND (genre='رمضان' OR genre='دراما')
4. THE Ramadan_Subsection SHALL NOT display any content with language='en', 'ko', 'tr', or 'zh'
5. WHEN no Arabic series are available, THEN THE System SHALL display "لا توجد مسلسلات رمضانية" message
6. THE System SHALL validate data integrity before displaying Ramadan content

### Requirement 4: إصلاح محتوى قسم كوري (إزالة التكرار)

**User Story:** كمستخدم، أريد أن أرى مسلسلات كورية فريدة بدون تكرار، حتى لا أرى نفس المسلسل مرتين.

**User Story:** As a user, I want to see unique Korean series without duplicates, so that I don't see the same series twice.

#### معايير القبول / Acceptance Criteria

1. THE Korean_Subsection SHALL display only TV series with language='ko'
2. THE Korean_Subsection SHALL display each series only once (no duplicates)
3. WHEN fetching Korean content, THEN THE System SHALL use DISTINCT query on series ID
4. WHEN fetching Korean content, THEN THE System SHALL query CockroachDB with filter: language='ko'
5. THE System SHALL remove duplicate entries based on TMDB ID or slug
6. THE Korean_Subsection SHALL NOT display any content with language other than 'ko'

### Requirement 5: توحيد الأقسام الفرعية للألعاب

**User Story:** كمستخدم، أريد أن أرى أقسام فرعية للألعاب حسب المنصة، حتى أتمكن من تصفح الألعاب حسب الجهاز الذي أملكه.

**User Story:** As a user, I want to see game subsections by platform, so that I can browse games by the device I own.

#### معايير القبول / Acceptance Criteria

1. THE Gaming_Section SHALL have Subsections: "الكل" (All), "PC", "PlayStation", "Xbox", "Nintendo", "Mobile"
2. WHEN a user visits "/gaming", THEN THE Navigation_Tabs SHALL display all platform Subsections
3. WHEN a user visits "/gaming/pc", THEN THE Navigation_Tabs SHALL remain visible with "PC" as active
4. WHEN a user visits "/gaming/playstation", THEN THE Navigation_Tabs SHALL remain visible with "PlayStation" as active
5. THE Navigation_Tabs SHALL use the same Unified_Component as Movies and Series
6. WHEN fetching platform-specific games, THEN THE System SHALL filter by platform field in CockroachDB

### Requirement 6: توحيد الأقسام الفرعية للبرامج

**User Story:** كمستخدم، أريد أن أرى أقسام فرعية للبرامج حسب المنصة، حتى أتمكن من تصفح البرامج حسب نظام التشغيل الذي أستخدمه.

**User Story:** As a user, I want to see software subsections by platform, so that I can browse software by the operating system I use.

#### معايير القبول / Acceptance Criteria

1. THE Software_Section SHALL have Subsections: "الكل" (All), "Windows", "Mac", "Linux", "Android", "iOS"
2. WHEN a user visits "/software", THEN THE Navigation_Tabs SHALL display all platform Subsections
3. WHEN a user visits "/software/windows", THEN THE Navigation_Tabs SHALL remain visible with "Windows" as active
4. WHEN a user visits "/software/mac", THEN THE Navigation_Tabs SHALL remain visible with "Mac" as active
5. THE Navigation_Tabs SHALL use the same Unified_Component as other Sections
6. WHEN fetching platform-specific software, THEN THE System SHALL filter by platform field in CockroachDB

### Requirement 7: توحيد مكون Layout

**User Story:** كمطور، أريد استخدام نفس مكون الـ layout في كل الأقسام، حتى يكون الكود نظيفاً وقابلاً للصيانة.

**User Story:** As a developer, I want to use the same layout component in all sections, so that the code is clean and maintainable.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL create UnifiedSectionLayout component
2. THE UnifiedSectionLayout SHALL accept sectionType prop ('movies' | 'series' | 'gaming' | 'software')
3. THE UnifiedSectionLayout SHALL accept subsections prop (array of subsection definitions)
4. THE UnifiedSectionLayout SHALL render Navigation_Tabs component
5. THE UnifiedSectionLayout SHALL render Content_Grid component
6. THE UnifiedSectionLayout SHALL render Filters component
7. WHEN sectionType changes, THEN THE UnifiedSectionLayout SHALL update Navigation_Tabs accordingly
8. THE UnifiedSectionLayout SHALL replace all existing section-specific layout components

### Requirement 8: توحيد مكون Filters

**User Story:** كمستخدم، أريد أن أرى نفس الفلاتر في كل الأقسام، حتى أتمكن من تصفية المحتوى بنفس الطريقة.

**User Story:** As a user, I want to see the same filters in all sections, so that I can filter content the same way.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL create UnifiedFilters component
2. THE UnifiedFilters SHALL display genre filter dropdown
3. THE UnifiedFilters SHALL display year filter dropdown
4. THE UnifiedFilters SHALL display rating filter dropdown
5. THE UnifiedFilters SHALL display sort order dropdown
6. WHEN a user selects a filter, THEN THE Content_Grid SHALL update to show filtered results
7. THE UnifiedFilters SHALL work consistently across all Sections
8. THE UnifiedFilters SHALL update URL query parameters to reflect filter state

### Requirement 9: توحيد مكون Content Grid

**User Story:** كمستخدم، أريد أن أرى المحتوى معروضاً بنفس الطريقة في كل الأقسام، حتى تكون تجربة الاستخدام متسقة.

**User Story:** As a user, I want to see content displayed the same way in all sections, so that the user experience is consistent.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL use the same Content_Grid component for all Sections
2. THE Content_Grid SHALL display items in responsive grid (2 columns mobile, 4 tablet, 6 desktop)
3. THE Content_Grid SHALL support pagination with 40 items per page
4. THE Content_Grid SHALL display loading skeletons while fetching data
5. THE Content_Grid SHALL display "لا توجد نتائج" when no items found
6. THE Content_Grid SHALL fetch data from CockroachDB only (NOT Supabase)
7. THE Content_Grid SHALL display aggregate ratings for each item

### Requirement 10: إزالة التكرار في الكود

**User Story:** كمطور، أريد إزالة كل الكود المكرر، حتى يكون المشروع أسهل في الصيانة.

**User Story:** As a developer, I want to remove all duplicate code, so that the project is easier to maintain.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL use UnifiedSectionPage component for all Sections
2. THE System SHALL remove duplicate layout code from Movies.tsx, Series.tsx, Gaming.tsx, Software.tsx
3. THE System SHALL use shared hooks (useUnifiedContent, usePrefetchNextPage)
4. THE System SHALL use shared utilities (getPageTitle, getPageDescription, mapFilterToAPIParams)
5. WHEN adding new features, THEN THE System SHALL add them to Unified_Component (not section-specific files)
6. THE System SHALL have maximum 20% code duplication across section pages

### Requirement 11: ضمان صحة البيانات (Data Integrity)

**User Story:** كمستخدم، أريد أن أرى المحتوى الصحيح فقط في كل قسم، حتى لا أرى محتوى غلط أو مكرر.

**User Story:** As a user, I want to see only correct content in each section, so that I don't see wrong or duplicate content.

#### معايير القبول / Acceptance Criteria

1. THE Ramadan_Subsection SHALL display ONLY Arabic series (language='ar')
2. THE Korean_Subsection SHALL display ONLY Korean series (language='ko') with NO duplicates
3. THE Turkish_Subsection SHALL display ONLY Turkish series (language='tr')
4. THE Chinese_Subsection SHALL display ONLY Chinese series (language='zh')
5. THE Foreign_Subsection SHALL display ONLY non-Arabic series (language!='ar')
6. WHEN fetching content, THEN THE System SHALL validate language field matches Subsection
7. WHEN fetching content, THEN THE System SHALL use DISTINCT query to prevent duplicates
8. THE System SHALL log data integrity violations to error logging service

### Requirement 12: توحيد Routes والـ URLs

**User Story:** كمستخدم، أريد أن تكون الروابط واضحة ومتسقة، حتى أتمكن من مشاركتها بسهولة.

**User Story:** As a user, I want URLs to be clear and consistent, so that I can easily share them.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL use pattern "/{section}" for main Section (e.g., /movies, /series)
2. THE System SHALL use pattern "/{section}/{subsection}" for Subsections (e.g., /series/ramadan, /gaming/pc)
3. THE System SHALL support query parameters for filters (e.g., ?genre=action&year=2024)
4. WHEN a user visits a URL with filters, THEN THE System SHALL apply those filters automatically
5. WHEN a user changes filters, THEN THE System SHALL update URL query parameters
6. THE System SHALL generate proper SEO meta tags for each Section and Subsection
7. THE System SHALL use Helmet for dynamic meta tags

### Requirement 13: دعم اللغتين العربية والإنجليزية

**User Story:** كمستخدم، أريد أن أرى واجهة المستخدم بلغتي المفضلة، حتى أتمكن من فهم المحتوى بسهولة.

**User Story:** As a user, I want to see the UI in my preferred language, so that I can easily understand the content.

#### معايير القبول / Acceptance Criteria

1. THE Navigation_Tabs SHALL display labels in Arabic when lang='ar'
2. THE Navigation_Tabs SHALL display labels in English when lang='en'
3. THE Filters SHALL display labels in Arabic when lang='ar'
4. THE Filters SHALL display labels in English when lang='en'
5. THE Content_Grid SHALL display "لا توجد نتائج" when no results and lang='ar'
6. THE Content_Grid SHALL display "No results found" when no results and lang='en'
7. THE System SHALL use useLang hook to determine current language
8. THE System SHALL persist language preference across page navigation

### Requirement 14: الحفاظ على الأداء

**User Story:** كمستخدم، أريد أن تحمل الصفحات بسرعة، حتى لا أضطر للانتظار طويلاً.

**User Story:** As a user, I want pages to load quickly, so that I don't have to wait long.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL implement query caching with staleTime of 5 minutes
2. THE System SHALL implement pagination to limit initial data load (40 items per page)
3. THE System SHALL use React Query for data fetching and caching
4. WHEN a user navigates between Navigation_Tabs, THEN THE System SHALL use cached data if available
5. THE System SHALL prefetch next page data for better UX
6. WHEN initial page load occurs, THEN THE System SHALL display skeleton loaders
7. THE System SHALL achieve page load time < 2 seconds on 3G connection

### Requirement 15: معالجة الأخطاء

**User Story:** كمستخدم، أريد أن أرى رسائل خطأ واضحة عند حدوث مشكلة، حتى أعرف ما يحدث.

**User Story:** As a user, I want to see clear error messages when something goes wrong, so that I know what's happening.

#### معايير القبول / Acceptance Criteria

1. WHEN CockroachDB API request fails, THEN THE System SHALL display error message to user
2. WHEN CockroachDB API request fails, THEN THE System SHALL log error to error logging service
3. WHEN no content is available, THEN THE System SHALL display "لا توجد نتائج" message
4. WHEN network error occurs, THEN THE System SHALL display retry button
5. THE System SHALL implement error boundaries to prevent full page crashes
6. WHEN filter produces no results, THEN THE System SHALL suggest removing filters

### Requirement 16: جلب البيانات من CockroachDB فقط

**User Story:** كمطور، أريد جلب كل البيانات من CockroachDB فقط، حتى أتجنب التعارضات مع Supabase.

**User Story:** As a developer, I want to fetch all data from CockroachDB only, so that I avoid conflicts with Supabase.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL fetch all movie data from CockroachDB API endpoint "/api/movies"
2. THE System SHALL fetch all TV series data from CockroachDB API endpoint "/api/tv"
3. THE System SHALL fetch all game data from CockroachDB API endpoint "/api/games"
4. THE System SHALL fetch all software data from CockroachDB API endpoint "/api/software"
5. THE System SHALL NOT fetch content data from Supabase
6. WHEN fetching data, THEN THE System SHALL use appropriate query parameters for filtering
7. THE System SHALL handle API errors gracefully with retry logic

### Requirement 17: تحديث الملفات المتأثرة

**User Story:** كمطور، أريد تحديث كل الملفات المتأثرة بالتوحيد، حتى يعمل الموقع بشكل صحيح.

**User Story:** As a developer, I want to update all affected files, so that the site works correctly.

#### معايير القبول / Acceptance Criteria

1. THE System SHALL update src/pages/discovery/Movies.tsx to use UnifiedSectionPage
2. THE System SHALL update src/pages/discovery/Series.tsx to use UnifiedSectionPage
3. THE System SHALL update src/pages/discovery/Gaming.tsx to use UnifiedSectionPage
4. THE System SHALL update src/pages/discovery/Software.tsx to use UnifiedSectionPage
5. THE System SHALL create subsection pages for all Sections (e.g., /series/ramadan, /gaming/pc)
6. THE System SHALL update routing configuration to support new subsection URLs
7. THE System SHALL update src/services/contentQueries.ts to ensure correct API queries

### Requirement 18: اختبار صحة التوحيد

**User Story:** كمطور، أريد التأكد من أن التوحيد يعمل بشكل صحيح في كل الأقسام، حتى لا توجد مشاكل في الإنتاج.

**User Story:** As a developer, I want to ensure unification works correctly in all sections, so that there are no production issues.

#### معايير القبول / Acceptance Criteria

1. WHEN a user visits /movies, THEN THE Navigation_Tabs SHALL be visible
2. WHEN a user visits /movies/trending, THEN THE Navigation_Tabs SHALL remain visible
3. WHEN a user visits /series, THEN THE Navigation_Tabs SHALL be visible
4. WHEN a user visits /series/ramadan, THEN THE Navigation_Tabs SHALL remain visible AND display only Arabic content
5. WHEN a user visits /series/korean, THEN THE Navigation_Tabs SHALL remain visible AND display only Korean content with no duplicates
6. WHEN a user visits /gaming, THEN THE Navigation_Tabs SHALL be visible
7. WHEN a user visits /gaming/pc, THEN THE Navigation_Tabs SHALL remain visible
8. WHEN a user visits /software, THEN THE Navigation_Tabs SHALL be visible
9. WHEN a user visits /software/windows, THEN THE Navigation_Tabs SHALL remain visible
10. THE System SHALL pass all manual testing scenarios before deployment

## معايير النجاح / Success Criteria

1. ✅ كل الأقسام تستخدم نفس الـ layout والـ navigation
2. ✅ الـ Navigation يظهر دائماً في كل الأقسام والأقسام الفرعية
3. ✅ لا يوجد محتوى غلط أو مكرر في أي قسم
4. ✅ قسم رمضان يعرض مسلسلات عربية فقط
5. ✅ قسم كوري يعرض مسلسلات كورية فريدة بدون تكرار
6. ✅ الكود موحد ومشترك بين كل الأقسام (< 20% تكرار)
7. ✅ تجربة مستخدم متسقة في كل الموقع
8. ✅ الأداء ممتاز (< 2 ثانية تحميل)
9. ✅ معالجة الأخطاء واضحة وفعالة
10. ✅ كل البيانات تُجلب من CockroachDB فقط

---

**تاريخ الإنشاء / Created:** 2026-04-07  
**الحالة / Status:** Requirements Phase  
**الإصدار / Version:** 1.0.0
