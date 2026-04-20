# Requirements Document

## Introduction

هذا المستند يحدد المتطلبات الكاملة لإزالة جميع استدعاءات TMDB API المتبقية في المشروع واستبدالها بـ CockroachDB API. المشروع قد أكمل معظم عملية الترحيل، لكن لا تزال هناك استدعاءات TMDB متبقية تسبب أخطاء 403 Forbidden في الكونسول.

## Glossary

- **TMDB_API**: The Movie Database API - خدمة خارجية لبيانات الأفلام والمسلسلات
- **CockroachDB_API**: قاعدة البيانات الرئيسية للمشروع التي تحتوي على جميع بيانات المحتوى
- **Frontend_Component**: مكونات React في مجلد src/pages و src/components
- **Backend_Route**: نقاط النهاية (endpoints) في مجلد server/routes
- **Helper_Function**: دوال مساعدة في مجلد src/lib
- **Console_Error**: أخطاء 403 Forbidden التي تظهر في console المتصفح

## Requirements

### Requirement 1: إزالة دوال TMDB غير المستخدمة من src/lib/api.ts

**User Story:** كمطور، أريد إزالة الدوال غير المستخدمة من ملف API، حتى لا يكون هناك كود ميت في المشروع.

#### Acceptance Criteria

1. THE System SHALL حذف دالة `tmdbAPI.search` من ملف src/lib/api.ts
2. THE System SHALL حذف دالة `tmdbAPI.getDetails` من ملف src/lib/api.ts
3. WHEN يتم فحص الكود، THE System SHALL التأكد من عدم وجود أي استيراد لهذه الدوال في أي ملف آخر

### Requirement 2: استبدال fetchTrending في جميع الملفات

**User Story:** كمطور، أريد استبدال جميع استدعاءات `fetchTrending` بـ CockroachDB API، حتى لا تظهر أخطاء 403 في الكونسول.

#### Acceptance Criteria

1. WHEN يتم استدعاء trending movies في Home.tsx، THE System SHALL استخدام `/api/trending?type=movie` بدلاً من `fetchTrending('movie')`
2. WHEN يتم استدعاء trending في TopWatched.tsx، THE System SHALL استخدام `/api/trending` بدلاً من `fetchTrending`
3. WHEN يتم استدعاء trending في adminActions.ts، THE System SHALL استخدام `/api/trending` بدلاً من `fetchTrending`
4. THE System SHALL التأكد من أن جميع البيانات المسترجعة تحتوي على حقل `slug` صالح
5. THE System SHALL تصفية أي عناصر بدون `slug` أو بـ `slug` فارغ أو يساوي 'content'

### Requirement 3: استبدال fetchGenres في جميع الملفات

**User Story:** كمطور، أريد استبدال جميع استدعاءات `fetchGenres` بـ CockroachDB API، حتى تأتي بيانات التصنيفات من قاعدة البيانات الخاصة بنا.

#### Acceptance Criteria

1. WHEN يتم طلب genres في CategoryHub.tsx، THE System SHALL استخدام `/api/genres?type=movie` أو `/api/genres?type=tv`
2. WHEN يتم طلب genres في Search.tsx، THE System SHALL استخدام `/api/genres` مع المعامل المناسب
3. WHEN يتم طلب genres في Anime.tsx، THE System SHALL استخدام `/api/genres?type=tv`
4. THE System SHALL حفظ genres في cache لمدة 5 دقائق لتحسين الأداء
5. IF فشل طلب genres، THEN THE System SHALL إرجاع قائمة فارغة بدلاً من إظهار خطأ

### Requirement 4: استبدال getUsMovieCertification في MovieDetails.tsx و adminActions.ts

**User Story:** كمطور، أريد الحصول على تصنيف الأفلام من CockroachDB بدلاً من TMDB، حتى لا تظهر أخطاء 403.

#### Acceptance Criteria

1. WHEN يتم عرض تفاصيل فيلم في MovieDetails.tsx، THE System SHALL استخراج certification من بيانات الفيلم المخزنة في CockroachDB
2. WHEN يتم استخدام certification في adminActions.ts، THE System SHALL استخدام البيانات من `/api/movies/:id` بدلاً من استدعاء TMDB مباشرة
3. THE System SHALL استخراج US certification من حقل `release_dates.results` في بيانات الفيلم
4. IF لم يتم العثور على US certification، THEN THE System SHALL إرجاع سلسلة نصية فارغة
5. THE System SHALL تحويل certification إلى أحرف كبيرة (uppercase)

### Requirement 5: استبدال getUsTvRating في SeriesDetails.tsx و adminActions.ts

**User Story:** كمطور، أريد الحصول على تصنيف المسلسلات من CockroachDB بدلاً من TMDB، حتى لا تظهر أخطاء 403.

#### Acceptance Criteria

1. WHEN يتم عرض تفاصيل مسلسل في SeriesDetails.tsx، THE System SHALL استخراج rating من بيانات المسلسل المخزنة في CockroachDB
2. WHEN يتم استخدام rating في adminActions.ts، THE System SHALL استخدام البيانات من `/api/tv/:id` بدلاً من استدعاء TMDB مباشرة
3. THE System SHALL استخراج US rating من حقل `content_ratings.results` في بيانات المسلسل
4. IF لم يتم العثور على US rating، THEN THE System SHALL إرجاع سلسلة نصية فارغة
5. THE System SHALL تحويل rating إلى أحرف كبيرة (uppercase)

### Requirement 6: استبدال advancedSearch في Search.tsx

**User Story:** كمطور، أريد استبدال دالة `advancedSearch` بـ CockroachDB API، حتى تعمل صفحة البحث بدون استدعاءات TMDB.

#### Acceptance Criteria

1. WHEN يتم البحث عن أفلام، THE System SHALL استخدام `/api/movies` مع معاملات البحث المناسبة
2. WHEN يتم البحث عن مسلسلات، THE System SHALL استخدام `/api/tv` مع معاملات البحث المناسبة
3. THE System SHALL دعم جميع معاملات البحث: query, genres, yearFrom, yearTo, ratingFrom, ratingTo, language, keywords, sort
4. THE System SHALL دمج نتائج movies و tv عند البحث في كلا النوعين
5. THE System SHALL ترتيب النتائج حسب popularity بشكل افتراضي
6. THE System SHALL تصفية العناصر بدون slug صالح قبل عرضها

### Requirement 7: تنظيف ملف src/lib/tmdb.ts

**User Story:** كمطور، أريد إزالة أو تعطيل الدوال غير المستخدمة في tmdb.ts، حتى يكون الكود نظيفاً وواضحاً.

#### Acceptance Criteria

1. THE System SHALL وضع علامة @deprecated على دالة `fetchTrending`
2. THE System SHALL وضع علامة @deprecated على دالة `fetchGenres`
3. THE System SHALL وضع علامة @deprecated على دالة `getUsMovieCertification`
4. THE System SHALL وضع علامة @deprecated على دالة `getUsTvRating`
5. THE System SHALL وضع علامة @deprecated على دالة `advancedSearch`
6. THE System SHALL إضافة تعليق يوضح أن هذه الدوال يجب استخدام CockroachDB API بدلاً منها
7. THE System SHALL الاحتفاظ بدالة `tmdb` axios instance للاستخدامات المستقبلية المحتملة

### Requirement 8: التحقق من عدم وجود أخطاء Console

**User Story:** كمستخدم، أريد تصفح الموقع بدون رؤية أخطاء 403 Forbidden في console، حتى تكون التجربة سلسة.

#### Acceptance Criteria

1. WHEN يتم تحميل أي صفحة في الموقع، THE System SHALL عدم إظهار أخطاء 403 Forbidden من TMDB في console
2. WHEN يتم فتح console في المتصفح، THE System SHALL عدم وجود أي طلبات فاشلة إلى `/api/tmdb`
3. THE System SHALL تسجيل جميع الأخطاء في errorLogger بدلاً من console
4. THE System SHALL عرض رسائل خطأ واضحة للمستخدم عند فشل تحميل البيانات
5. THE System SHALL استخدام fallback data عند فشل API calls

### Requirement 9: اختبار جميع الصفحات المتأثرة

**User Story:** كمطور، أريد التأكد من أن جميع الصفحات تعمل بشكل صحيح بعد التغييرات، حتى لا تتأثر تجربة المستخدم.

#### Acceptance Criteria

1. WHEN يتم تحميل صفحة Home.tsx، THE System SHALL عرض trending movies بشكل صحيح
2. WHEN يتم تحميل صفحة TopWatched.tsx، THE System SHALL عرض trending content بشكل صحيح
3. WHEN يتم تحميل صفحة Search.tsx، THE System SHALL عمل البحث والفلترة بشكل صحيح
4. WHEN يتم تحميل صفحة CategoryHub.tsx، THE System SHALL عرض genres بشكل صحيح
5. WHEN يتم تحميل صفحة Anime.tsx، THE System SHALL عرض anime genres بشكل صحيح
6. WHEN يتم تحميل صفحة MovieDetails.tsx، THE System SHALL عرض certification بشكل صحيح
7. WHEN يتم تحميل صفحة SeriesDetails.tsx، THE System SHALL عرض rating بشكل صحيح
8. THE System SHALL التأكد من أن جميع الروابط تعمل وتحتوي على slugs صالحة

### Requirement 10: توثيق التغييرات

**User Story:** كمطور، أريد توثيق جميع التغييرات التي تمت، حتى يسهل فهم ما تم عمله في المستقبل.

#### Acceptance Criteria

1. THE System SHALL إنشاء ملف MIGRATION_REPORT.md يوضح جميع التغييرات
2. THE System SHALL توثيق كل ملف تم تعديله مع شرح التغيير
3. THE System SHALL توثيق أي breaking changes محتملة
4. THE System SHALL إضافة أمثلة على كيفية استخدام CockroachDB API بدلاً من TMDB
5. THE System SHALL تحديث أي documentation موجود ليعكس التغييرات الجديدة

