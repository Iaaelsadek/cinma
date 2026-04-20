# وثيقة المتطلبات - إعادة هيكلة أقسام المحتوى

## المقدمة

هذه الميزة تهدف إلى إعادة هيكلة شاملة لجميع أقسام المحتوى في الموقع لضمان أن جميع البيانات تُسحب من CockroachDB فقط، مع إزالة أي استعلامات مباشرة من Supabase أو TMDB API للمحتوى. الهدف هو توحيد مصدر البيانات وتصحيح التصنيفات والفلاتر لكل قسم.

## المصطلحات

- **CockroachDB**: قاعدة البيانات الرئيسية لجميع بيانات المحتوى (أفلام، مسلسلات، ألعاب، برامج، ممثلين)
- **Supabase**: قاعدة بيانات المصادقة وبيانات المستخدم فقط (profiles, watchlist, history)
- **Content_API**: واجهة برمجة التطبيقات الموحدة للوصول إلى CockroachDB من خلال `/api/movies`, `/api/tv`, `/api/games`
- **Primary_Genre**: الصنف الرئيسي المخزن في جدول movies/tv_series لتصنيف المحتوى
- **Original_Language**: اللغة الأصلية للمحتوى (ar, en, hi, ko, zh, tr)
- **Summaries**: ملخصات الأفلام (نوع خاص من المحتوى)
- **Plays**: المسرحيات العربية (نوع خاص من الأفلام)
- **Classics**: الأفلام الكلاسيكية (أفلام قبل سنة 2000)

## المتطلبات

### المتطلب 1: توحيد مصدر البيانات

**قصة المستخدم:** كمطور، أريد أن تسحب جميع أقسام المحتوى البيانات من CockroachDB فقط، حتى يكون لدينا مصدر بيانات موحد وموثوق.

#### معايير القبول

1. THE Content_API SHALL fetch all movies data from CockroachDB movies table
2. THE Content_API SHALL fetch all TV series data from CockroachDB tv_series table
3. THE Content_API SHALL fetch all games data from CockroachDB games table
4. THE Content_API SHALL fetch all software data from CockroachDB software table
5. WHEN a page requests content, THE System SHALL use Content_API endpoints exclusively
6. THE System SHALL NOT query Supabase for any content tables (movies, tv_series, videos, dailymotion_videos)
7. THE System SHALL NOT make direct TMDB API calls for content display

### المتطلب 2: إصلاح قسم الملخصات (Summaries)

**قصة المستخدم:** كمستخدم، أريد أن يعرض قسم الملخصات محتوى ملخصات الأفلام الحقيقية من قاعدة البيانات، وليس فيديوهات YouTube.

#### معايير القبول

1. WHEN a user visits `/movies/summaries`, THE System SHALL display movies with category='summary' from CockroachDB
2. THE Summaries_Page SHALL filter movies by primary_genre='summary' OR a custom summaries flag
3. THE Summaries_Page SHALL support genre filtering through URL parameters
4. THE Summaries_Page SHALL support year filtering through URL parameters
5. THE Summaries_Page SHALL support rating filtering through URL parameters
6. THE System SHALL NOT fetch from videos table in Supabase
7. THE System SHALL NOT use FALLBACK_SUMMARIES constant from YouTube data

### المتطلب 3: إصلاح قسم المسرحيات (Plays)

**قصة المستخدم:** كمستخدم، أريد أن يعرض قسم المسرحيات مسرحيات عربية حقيقية من قاعدة البيانات، وليس نتائج بحث TMDB.

#### معايير القبول

1. WHEN a user visits `/plays`, THE System SHALL display movies with primary_genre='play' from CockroachDB
2. THE Plays_Page SHALL filter by original_language='ar' for Arabic plays
3. THE Plays_Page SHALL support sub-categories (adel-imam, classics, gulf, masrah-masr)
4. THE Plays_Page SHALL support genre filtering through URL parameters
5. THE Plays_Page SHALL support year filtering through URL parameters
6. THE System SHALL NOT use TMDB search API directly
7. THE System SHALL NOT use hardcoded query strings (ADEL_IMAM_QUERY, CLASSICS_QUERY)

### المتطلب 4: تصنيف الأفلام حسب اللغة

**قصة المستخدم:** كمستخدم، أريد أن أتصفح الأفلام حسب اللغة (عربية، أجنبية، هندية) بشكل دقيق.

#### معايير القبول

1. WHEN a user visits `/arabic-movies`, THE System SHALL display movies WHERE original_language='ar'
2. WHEN a user visits `/foreign-movies`, THE System SHALL display movies WHERE original_language NOT IN ('ar', 'hi')
3. WHEN a user visits `/indian`, THE System SHALL display movies WHERE original_language='hi'
4. THE System SHALL support pagination for all language-filtered sections
5. THE System SHALL support sorting by popularity, rating, and release_date
6. THE System SHALL display accurate movie counts for each language category

### المتطلب 5: تصنيف المسلسلات حسب اللغة والنوع

**قصة المستخدم:** كمستخدم، أريد أن أتصفح المسلسلات حسب اللغة والنوع (عربية، كورية، صينية، تركية، هندية).

#### معايير القبول

1. WHEN a user visits `/arabic-series`, THE System SHALL display tv_series WHERE original_language='ar'
2. WHEN a user visits `/foreign-series`, THE System SHALL display tv_series WHERE original_language NOT IN ('ar', 'hi', 'ko', 'zh', 'tr')
3. WHEN a user visits `/k-drama`, THE System SHALL display tv_series WHERE original_language='ko'
4. WHEN a user visits `/chinese`, THE System SHALL display tv_series WHERE original_language='zh'
5. WHEN a user visits `/turkish`, THE System SHALL display tv_series WHERE original_language='tr'
6. WHEN a user visits `/bollywood`, THE System SHALL display tv_series WHERE original_language='hi'
7. THE System SHALL support genre and year filtering for all series categories

### المتطلب 6: قسم مسلسلات رمضان

**قصة المستخدم:** كمستخدم، أريد أن يعرض قسم رمضان مسلسلات عربية رمضانية فقط.

#### معايير القبول

1. WHEN a user visits `/series/ramadan`, THE System SHALL display tv_series WHERE original_language='ar' AND primary_genre='ramadan'
2. THE Ramadan_Section SHALL support year filtering to show specific Ramadan seasons
3. THE Ramadan_Section SHALL sort by first_air_date DESC by default
4. THE System SHALL NOT display non-Arabic content in ramadan section
5. THE System SHALL support filtering by rating and popularity

### المتطلب 7: أقسام الأنمي والكرتون

**قصة المستخدم:** كمستخدم، أريد أن أتصفح محتوى الأنمي والكرتون بشكل منظم.

#### معايير القبول

1. WHEN a user visits `/anime`, THE System SHALL display content with primary_genre='anime' from movies AND tv_series tables
2. WHEN a user visits `/disney`, THE System SHALL display content with primary_genre='disney' OR keywords containing 'Disney'
3. WHEN a user visits `/spacetoon`, THE System SHALL display content with primary_genre='spacetoon' OR keywords containing 'Spacetoon'
4. WHEN a user visits `/cartoons`, THE System SHALL display content with primary_genre='animation' AND target_audience='kids'
5. THE System SHALL support filtering by age rating for kids content

### المتطلب 8: قسم الأفلام الكلاسيكية

**قصة المستخدم:** كمستخدم، أريد أن أتصفح الأفلام الكلاسيكية القديمة.

#### معايير القبول

1. WHEN a user visits `/classics`, THE System SHALL display movies WHERE EXTRACT(YEAR FROM release_date) < 2000
2. THE Classics_Section SHALL support filtering by decade (1950s, 1960s, 1970s, 1980s, 1990s)
3. THE Classics_Section SHALL support filtering by original_language
4. THE Classics_Section SHALL sort by vote_average DESC by default
5. THE System SHALL display movies with minimum vote_count >= 50 for quality

### المتطلب 9: واجهة برمجة التطبيقات الموحدة

**قصة المستخدم:** كمطور، أريد واجهة برمجة تطبيقات موحدة وواضحة للوصول إلى جميع أنواع المحتوى.

#### معايير القبول

1. THE Content_API SHALL provide endpoint `/api/movies` with filters (genre, language, yearFrom, yearTo, ratingFrom, ratingTo)
2. THE Content_API SHALL provide endpoint `/api/tv` with same filter capabilities
3. THE Content_API SHALL provide endpoint `/api/games` with filters (genre, platform)
4. THE Content_API SHALL provide endpoint `/api/software` with filters (platform, category)
5. THE Content_API SHALL support sortBy parameter (popularity, vote_average, release_date, trending)
6. THE Content_API SHALL return paginated results with metadata (page, limit, total, totalPages)
7. THE Content_API SHALL use parameterized queries to prevent SQL injection

### المتطلب 10: إضافة محتوى مناسب لكل قسم

**قصة المستخدم:** كمسؤول محتوى، أريد أن تحتوي قاعدة البيانات على محتوى كافٍ ومناسب لكل قسم.

#### معايير القبول

1. THE Database SHALL contain at least 50 movies with primary_genre='play' for plays section
2. THE Database SHALL contain at least 30 movies with category='summary' for summaries section
3. THE Database SHALL contain at least 100 Arabic movies (original_language='ar')
4. THE Database SHALL contain at least 50 Arabic series (original_language='ar')
5. THE Database SHALL contain at least 30 Korean dramas (original_language='ko')
6. THE Database SHALL contain at least 20 Turkish series (original_language='tr')
7. THE Database SHALL contain at least 50 classic movies (release_date < 2000)
8. THE Database SHALL contain at least 30 anime titles (primary_genre='anime')

### المتطلب 11: تحديث مكونات الواجهة الأمامية

**قصة المستخدم:** كمطور، أريد أن تستخدم جميع مكونات الواجهة الأمامية الخدمات الموحدة للوصول إلى البيانات.

#### معايير القبول

1. THE Summaries_Page SHALL use contentQueries.getMovies() with appropriate filters
2. THE Plays_Page SHALL use contentQueries.getMovies() with genre='play' filter
3. THE Classics_Page SHALL use contentQueries.getMovies() with yearTo=1999 filter
4. THE Arabic_Movies_Page SHALL use contentQueries.getMovies() with language='ar' filter
5. THE K_Drama_Page SHALL use contentQueries.getTVSeries() with language='ko' filter
6. THE System SHALL remove all useCategoryVideos() hooks from content pages
7. THE System SHALL remove all direct Supabase queries from content pages

### المتطلب 12: إزالة البيانات المؤقتة والثوابت

**قصة المستخدم:** كمطور، أريد إزالة جميع البيانات المؤقتة والثوابت المستخدمة كحلول مؤقتة.

#### معايير القبول

1. THE System SHALL remove FALLBACK_SUMMARIES constant from codebase
2. THE System SHALL remove hardcoded query strings (ADEL_IMAM_QUERY, CLASSICS_QUERY, GULF_QUERY)
3. THE System SHALL remove fetchPlays() function that uses TMDB search
4. THE System SHALL remove all references to homepage_cache.json for content data
5. THE System SHALL remove useCategoryVideos hook for content pages
6. THE System SHALL keep only authentication and user data queries in Supabase

### المتطلب 13: التعامل مع الأخطاء والحالات الفارغة

**قصة المستخدم:** كمستخدم، أريد أن يعرض النظام رسائل واضحة عندما لا يوجد محتوى متاح.

#### معايير القبول

1. WHEN no content is found for a filter, THE System SHALL display "لا توجد نتائج" message
2. WHEN API request fails, THE System SHALL display error message and retry option
3. WHEN loading content, THE System SHALL display PageLoader component
4. THE System SHALL log all API errors to console for debugging
5. THE System SHALL provide fallback poster images for missing posters
6. THE System SHALL handle network timeouts gracefully

### المتطلب 14: سكريبت ملء قاعدة البيانات

**قصة المستخدم:** كمسؤول نظام، أريد سكريبت آلي لملء قاعدة البيانات بالمحتوى المناسب لكل قسم.

#### معايير القبول

1. THE Populate_Script SHALL fetch Arabic movies from TMDB with original_language='ar'
2. THE Populate_Script SHALL fetch Arabic plays and tag them with primary_genre='play'
3. THE Populate_Script SHALL fetch Korean dramas with original_language='ko'
4. THE Populate_Script SHALL fetch Turkish series with original_language='tr'
5. THE Populate_Script SHALL fetch classic movies with release_date < 2000
6. THE Populate_Script SHALL fetch anime content and tag with primary_genre='anime'
7. THE Populate_Script SHALL use TMDB API with proper rate limiting
8. THE Populate_Script SHALL log progress and errors to console
9. THE Populate_Script SHALL support dry-run mode for testing

### المتطلب 15: توثيق البنية الجديدة

**قصة المستخدم:** كمطور جديد، أريد توثيقاً واضحاً يشرح كيفية عمل أقسام المحتوى.

#### معايير القبول

1. THE Documentation SHALL explain the CockroachDB-only architecture
2. THE Documentation SHALL provide examples for each content section
3. THE Documentation SHALL list all available API endpoints with parameters
4. THE Documentation SHALL explain filtering and sorting options
5. THE Documentation SHALL include troubleshooting guide for common issues
6. THE Documentation SHALL be written in both Arabic and English
