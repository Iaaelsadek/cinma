# خطة التنفيذ

- [x] 1. كتابة اختبار استكشاف شرط الخلل
  - **Property 1: Bug Condition** - Home Aggregated & Recommendations Missing Slugs
  - **مهم جداً**: يجب أن يفشل هذا الاختبار على الكود غير المصلح - الفشل يؤكد وجود الخلل
  - **لا تحاول إصلاح الاختبار أو الكود عندما يفشل**
  - **ملاحظة**: هذا الاختبار يشفر السلوك المتوقع - سيتحقق من الإصلاح عندما ينجح بعد التنفيذ
  - **الهدف**: إظهار أمثلة مضادة تثبت وجود الخلل
  - **نهج PBT محدد النطاق**: للأخطاء الحتمية، حدد نطاق الخاصية للحالات الفاشلة الملموسة لضمان إمكانية التكرار
  - اختبار أن `homeAggregated` query يرجع بيانات TMDB بدون slugs عندما يفشل `/api/home` endpoint
  - اختبار أن `topRatedMovies` و `trendingItems` من TMDB API تفتقر إلى slugs صالحة
  - اختبار أن جميع دوال `recommendations.ts` (`tmdbFallback`, `searchTitles`, `summarizeGenres`, ultimate fallback) تستخدم TMDB API بدون slugs
  - اختبار أن `generateWatchUrl()` و `generateContentUrl()` يطرحان أخطاء "Missing slug for content" عند استخدام بيانات TMDB
  - تشغيل الاختبار على الكود غير المصلح
  - **النتيجة المتوقعة**: فشل الاختبار (هذا صحيح - يثبت وجود الخلل)
  - توثيق الأمثلة المضادة الموجودة (مثل: "Missing slug for content movie:1523145")
  - وضع علامة على المهمة كمكتملة عند كتابة الاختبار وتشغيله وتوثيق الفشل
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. كتابة اختبارات خصائص الحفاظ (قبل تنفيذ الإصلاح)
  - **Property 2: Preservation** - CockroachDB Content & URL Generation Unchanged
  - **مهم**: اتبع منهجية الملاحظة أولاً
  - ملاحظة السلوك على الكود غير المصلح لمحتوى CockroachDB (البيانات الحرجة من `/api/db/home`)
  - كتابة اختبارات قائمة على الخصائص تلتقط أنماط السلوك الملاحظة من متطلبات الحفاظ
  - الاختبار القائم على الخصائص يولد العديد من حالات الاختبار لضمانات أقوى
  - التحقق من أن `criticalHomeData` من `/api/db/home` يحتوي على slugs صالحة (trending, arabicSeries, kids, bollywood)
  - التحقق من أن `diverseHero` من `/api/db/home` يحتوي على slugs صالحة
  - التحقق من أن `HomeBelowFoldSections` مع محتوى CockroachDB (korean, turkish, chinese, documentaries, anime, classics) يعمل بشكل صحيح
  - التحقق من أن `generateWatchUrl()` و `generateContentUrl()` تعمل بشكل صحيح مع محتوى CockroachDB
  - التحقق من أن `MovieCard` يعرض بطاقات تفاعلية صحيحة مع slugs صالحة
  - تشغيل الاختبارات على الكود غير المصلح
  - **النتيجة المتوقعة**: نجاح الاختبارات (يؤكد السلوك الأساسي للحفاظ عليه)
  - وضع علامة على المهمة كمكتملة عند كتابة الاختبارات وتشغيلها ونجاحها على الكود غير المصلح
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. إصلاح مشكلة slugs المفقودة في Home Aggregated و Recommendations

  - [x] 3.1 إصلاح homeAggregated query في Home.tsx
    - استبدال fallback من TMDB API (`tmdb.get('/movie/popular')`) بـ CockroachDB API (`/api/db/home`)
    - التأكد من أن جميع البيانات المرجعة تحتوي على slugs صالحة
    - إزالة الاعتماد على `/api/home` endpoint غير الموجود
    - استخدام `/api/db/home` كمصدر أساسي للبيانات
    - _Bug_Condition: isBugCondition(input) where homeAggregated uses TMDB API fallback without slugs_
    - _Expected_Behavior: homeAggregated fetches from CockroachDB API with valid slugs (non-null, non-empty, not 'content')_
    - _Preservation: criticalHomeData and diverseHero from /api/db/home must remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 إصلاح topRatedMovies و trendingItems في Home.tsx
    - استبدال `topRatedMovies` من `homeAggregated.data?.tmdb?.topRatedMovies?.results` بـ CockroachDB API
    - استبدال `trendingItems` من `homeAggregated.data?.tmdb?.popularMovies?.results` بـ CockroachDB API
    - إضافة تصفية للعناصر بدون slugs قبل تمريرها لـ `QuantumTrain` و `HomeBelowFoldSections`
    - التأكد من أن جميع البيانات المعروضة تحتوي على slugs صالحة
    - _Bug_Condition: isBugCondition(input) where topRatedMovies/trendingItems from TMDB lack slugs_
    - _Expected_Behavior: All displayed content has valid slugs from CockroachDB_
    - _Preservation: Existing QuantumTrain and HomeBelowFoldSections rendering must remain unchanged_
    - _Requirements: 2.2, 2.3_

  - [x] 3.3 إصلاح tmdbFallback() في recommendations.ts
    - استبدال `tmdb.get('/movie/{id}/similar')` بـ CockroachDB API endpoint للمحتوى المشابه
    - استبدال `tmdb.get('/tv/{id}/similar')` بـ CockroachDB API endpoint للمحتوى المشابه
    - استبدال `tmdb.get('/discover/movie')` بـ CockroachDB API endpoint للاكتشاف
    - استبدال `tmdb.get('/discover/tv')` بـ CockroachDB API endpoint للاكتشاف
    - التأكد من أن جميع النتائج تحتوي على slugs صالحة
    - _Bug_Condition: isBugCondition(input) where tmdbFallback uses TMDB API without slugs_
    - _Expected_Behavior: tmdbFallback fetches from CockroachDB API with valid slugs_
    - _Preservation: Recommendation logic and caching must remain unchanged_
    - _Requirements: 2.4_

  - [x] 3.4 إصلاح searchTitles() في recommendations.ts
    - استبدال `tmdb.get('/search/movie')` بـ `/api/db/search` من CockroachDB API
    - استبدال `tmdb.get('/search/tv')` بـ `/api/db/search` من CockroachDB API
    - التأكد من أن نتائج البحث تحتوي على slugs صالحة
    - _Bug_Condition: isBugCondition(input) where searchTitles uses TMDB search without slugs_
    - _Expected_Behavior: searchTitles uses CockroachDB search API with valid slugs_
    - _Preservation: Search ranking and filtering logic must remain unchanged_
    - _Requirements: 2.5_

  - [x] 3.5 إصلاح summarizeGenres() في recommendations.ts
    - استبدال `tmdb.get('/movie/{id}')` بـ `/api/db/movies/:id` من CockroachDB API
    - استبدال `tmdb.get('/tv/{id}')` بـ `/api/db/tv/:id` من CockroachDB API
    - التأكد من أن تفاصيل المحتوى تحتوي على slugs صالحة
    - _Bug_Condition: isBugCondition(input) where summarizeGenres uses TMDB API without slugs_
    - _Expected_Behavior: summarizeGenres fetches from CockroachDB API with valid slugs_
    - _Preservation: Genre summarization logic must remain unchanged_
    - _Requirements: 2.6_

  - [x] 3.6 إصلاح ultimate fallback في recommendations.ts
    - استبدال `tmdb.get('/trending/all/week')` بـ `/api/db/movies/trending` أو `/api/db/tv/trending` من CockroachDB API
    - التأكد من أن المحتوى الاحتياطي يحتوي على slugs صالحة
    - _Bug_Condition: isBugCondition(input) where ultimate fallback uses TMDB trending without slugs_
    - _Expected_Behavior: Ultimate fallback uses CockroachDB trending API with valid slugs_
    - _Preservation: Fallback behavior and error handling must remain unchanged_
    - _Requirements: 2.7_

  - [x] 3.7 التحقق من نجاح اختبار استكشاف شرط الخلل الآن
    - **Property 1: Expected Behavior** - All Content Has Valid Slugs
    - **مهم**: إعادة تشغيل نفس الاختبار من المهمة 1 - لا تكتب اختباراً جديداً
    - الاختبار من المهمة 1 يشفر السلوك المتوقع
    - عندما ينجح هذا الاختبار، يؤكد أن السلوك المتوقع محقق
    - تشغيل اختبار استكشاف شرط الخلل من الخطوة 1
    - **النتيجة المتوقعة**: نجاح الاختبار (يؤكد إصلاح الخلل)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.8 التحقق من استمرار نجاح اختبارات الحفاظ
    - **Property 2: Preservation** - CockroachDB Content & URL Generation Unchanged
    - **مهم**: إعادة تشغيل نفس الاختبارات من المهمة 2 - لا تكتب اختبارات جديدة
    - تشغيل اختبارات خصائص الحفاظ من الخطوة 2
    - **النتيجة المتوقعة**: نجاح الاختبارات (يؤكد عدم وجود انحدارات)
    - التأكد من استمرار نجاح جميع الاختبارات بعد الإصلاح (لا انحدارات)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. نقطة تفتيش - التأكد من نجاح جميع الاختبارات
  - التأكد من نجاح جميع الاختبارات، اسأل المستخدم إذا ظهرت أسئلة
  - التحقق من عدم وجود أخطاء "Missing slug for content" في المتصفح
  - التحقق من أن جميع أقسام الصفحة الرئيسية تعرض المحتوى بشكل صحيح
  - التحقق من أن قسم "مقترح لك" (AI Recommendations) يعمل بدون أخطاء
