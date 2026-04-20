# خطة التنفيذ

- [x] 1. كتابة اختبار استكشاف شرط الخلل
  - **Property 1: Bug Condition** - TMDB Content Missing Slugs
  - **مهم جداً**: يجب أن يفشل هذا الاختبار على الكود غير المصلح - الفشل يؤكد وجود الخلل
  - **لا تحاول إصلاح الاختبار أو الكود عندما يفشل**
  - **ملاحظة**: هذا الاختبار يشفر السلوك المتوقع - سيتحقق من الإصلاح عندما ينجح بعد التنفيذ
  - **الهدف**: إظهار أمثلة مضادة تثبت وجود الخلل
  - **نهج PBT محدد النطاق**: للأخطاء الحتمية، حدد نطاق الخاصية للحالات الفاشلة الملموسة لضمان إمكانية التكرار
  - اختبار أن محتوى TMDB يفتقر إلى slugs صالحة للفئات السبع (المسلسلات الكورية، التركية، الصينية، الوثائقيات، الأنمي، الكلاسيكيات، بوليوود الاحتياطي)
  - اختبار أن `generateWatchUrl()` و `generateContentUrl()` يطرحان أخطاء "Missing slug for content" عند استخدام بيانات TMDB
  - تشغيل الاختبار على الكود غير المصلح
  - **النتيجة المتوقعة**: فشل الاختبار (هذا صحيح - يثبت وجود الخلل)
  - توثيق الأمثلة المضادة الموجودة لفهم السبب الجذري
  - وضع علامة على المهمة كمكتملة عند كتابة الاختبار وتشغيله وتوثيق الفشل
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. كتابة اختبارات خصائص الحفاظ (قبل تنفيذ الإصلاح)
  - **Property 2: Preservation** - CockroachDB Content Unchanged
  - **مهم**: اتبع منهجية الملاحظة أولاً
  - ملاحظة السلوك على الكود غير المصلح لمحتوى CockroachDB (البيانات الحرجة من `/api/db/home`)
  - كتابة اختبارات قائمة على الخصائص تلتقط أنماط السلوك الملاحظة من متطلبات الحفاظ
  - الاختبار القائم على الخصائص يولد العديد من حالات الاختبار لضمانات أقوى
  - التحقق من أن محتوى CockroachDB (الترندينغ، المسلسلات العربية، محتوى الأطفال، بوليوود) يحتوي على slugs صالحة
  - التحقق من أن `generateWatchUrl()` و `generateContentUrl()` تعمل بشكل صحيح مع محتوى CockroachDB
  - تشغيل الاختبارات على الكود غير المصلح
  - **النتيجة المتوقعة**: نجاح الاختبارات (يؤكد السلوك الأساسي للحفاظ عليه)
  - وضع علامة على المهمة كمكتملة عند كتابة الاختبارات وتشغيلها ونجاحها على الكود غير المصلح
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. إصلاح مشكلة slugs المفقودة في محتوى TMDB

  - [x] 3.1 إضافة نقاط نهاية CockroachDB API الجديدة
    - إضافة نقطة نهاية `/api/db/tv/korean` لجلب المسلسلات الكورية مع slugs
    - إضافة نقطة نهاية `/api/db/tv/turkish` لجلب المسلسلات التركية مع slugs
    - إضافة نقطة نهاية `/api/db/tv/chinese` لجلب المسلسلات الصينية مع slugs
    - إضافة نقطة نهاية `/api/db/movies/documentaries` لجلب الوثائقيات مع slugs
    - إضافة نقطة نهاية `/api/db/tv/anime` لجلب الأنمي مع slugs
    - إضافة نقطة نهاية `/api/db/movies/classics` لجلب الكلاسيكيات مع slugs
    - التأكد من أن جميع الاستعلامات تتضمن `WHERE slug IS NOT NULL` لتصفية المحتوى بدون slugs
    - _Bug_Condition: isBugCondition(input) where input.source === 'TMDB_API' AND input.slug is missing_
    - _Expected_Behavior: All content fetched from CockroachDB API has valid slugs (non-null, non-empty, not 'content')_
    - _Preservation: CockroachDB API endpoints must return same data structure as existing endpoints_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 تحديث HomeBelowFoldSections لاستخدام CockroachDB API
    - استبدال استدعاء TMDB API للمسلسلات الكورية بـ `fetch('/api/db/tv/korean')`
    - استبدال استدعاء TMDB API للمسلسلات التركية بـ `fetch('/api/db/tv/turkish')`
    - استبدال استدعاء TMDB API للمسلسلات الصينية بـ `fetch('/api/db/tv/chinese')`
    - استبدال استدعاء TMDB API للوثائقيات بـ `fetch('/api/db/movies/documentaries')`
    - استبدال استدعاء TMDB API للأنمي بـ `fetch('/api/db/tv/anime')`
    - استبدال استدعاء TMDB API للكلاسيكيات بـ `fetch('/api/db/movies/classics')`
    - تحديث منطق بوليوود الاحتياطي لاستخدام CockroachDB بدلاً من TMDB
    - _Bug_Condition: isBugCondition(input) where HomeBelowFoldSections fetches from TMDB_
    - _Expected_Behavior: All sections fetch from CockroachDB with valid slugs_
    - _Preservation: Existing CockroachDB fetching logic (criticalHomeData) must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2_

  - [x] 3.3 التحقق من نجاح اختبار استكشاف شرط الخلل الآن
    - **Property 1: Expected Behavior** - All Content Has Valid Slugs
    - **مهم**: إعادة تشغيل نفس الاختبار من المهمة 1 - لا تكتب اختباراً جديداً
    - الاختبار من المهمة 1 يشفر السلوك المتوقع
    - عندما ينجح هذا الاختبار، يؤكد أن السلوك المتوقع محقق
    - تشغيل اختبار استكشاف شرط الخلل من الخطوة 1
    - **النتيجة المتوقعة**: نجاح الاختبار (يؤكد إصلاح الخلل)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 التحقق من استمرار نجاح اختبارات الحفاظ
    - **Property 2: Preservation** - CockroachDB Content Unchanged
    - **مهم**: إعادة تشغيل نفس الاختبارات من المهمة 2 - لا تكتب اختبارات جديدة
    - تشغيل اختبارات خصائص الحفاظ من الخطوة 2
    - **النتيجة المتوقعة**: نجاح الاختبارات (يؤكد عدم وجود انحدارات)
    - التأكد من استمرار نجاح جميع الاختبارات بعد الإصلاح (لا انحدارات)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. نقطة تفتيش - التأكد من نجاح جميع الاختبارات
  - التأكد من نجاح جميع الاختبارات، اسأل المستخدم إذا ظهرت أسئلة
