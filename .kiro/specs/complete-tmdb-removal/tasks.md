# Implementation Plan: Complete TMDB Removal

## Overview

هذه الخطة تحدد المهام المطلوبة لإزالة جميع استدعاءات TMDB API المتبقية في المشروع واستبدالها بـ CockroachDB API. سيتم تنفيذ كل مهمة بشكل تدريجي مع التأكد من عمل الوظائف بشكل صحيح بعد كل خطوة.

## Tasks

- [x] 1. إنشاء دوال مساعدة للتحقق من صحة البيانات
  - [x] 1.1 إنشاء دوال slug validation و data extraction helpers
    - إنشاء ملف `src/lib/dataHelpers.ts` يحتوي على:
      - `isValidSlug(slug)`: للتحقق من صحة slug
      - `filterValidSlugs(items)`: لتصفية العناصر بدون slugs صالحة
      - `extractUsCertification(movie)`: لاستخراج US certification من بيانات الفيلم
      - `extractUsTvRating(series)`: لاستخراج US rating من بيانات المسلسل
    - _Requirements: 2.4, 2.5, 4.3, 4.4, 4.5, 5.3, 5.4, 5.5, 6.6_

  - [x]* 1.2 كتابة property tests للدوال المساعدة
    - **Property 1: Valid Slug Filtering**
    - **Property 2: Certification Extraction and Normalization**
    - **Property 3: TV Rating Extraction and Normalization**
    - **Validates: Requirements 2.4, 2.5, 4.3, 4.4, 4.5, 5.3, 5.4, 5.5**

  - [x]* 1.3 كتابة unit tests للدوال المساعدة
    - اختبار `isValidSlug` مع قيم null, empty, 'content', وقيم صالحة
    - اختبار `extractUsCertification` مع بيانات بدون US certification
    - اختبار `extractUsTvRating` مع بيانات بدون US rating
    - _Requirements: 4.4, 5.4_

- [x] 2. تنظيف ملف src/lib/api.ts
  - [x] 2.1 حذف دوال TMDB غير المستخدمة من api.ts
    - حذف `tmdbAPI.search` من ملف `src/lib/api.ts`
    - حذف `tmdbAPI.getDetails` من ملف `src/lib/api.ts`
    - التأكد من عدم وجود أي استيراد لهذه الدوال في أي ملف آخر
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 2.2 كتابة unit test للتحقق من عدم وجود استيرادات TMDB
    - اختبار عدم وجود `tmdbAPI.search` في أي ملف
    - اختبار عدم وجود `tmdbAPI.getDetails` في أي ملف
    - _Requirements: 1.3_

- [x] 3. استبدال fetchTrending في جميع الملفات
  - [x] 3.1 استبدال fetchTrending في Home.tsx
    - استبدال `fetchTrending('movie')` بـ `fetch('/api/trending?type=movie&limit=20')`
    - تطبيق `filterValidSlugs` على النتائج
    - إضافة error handling مع fallback data
    - _Requirements: 2.1, 2.4, 2.5, 8.5_

  - [x] 3.2 استبدال fetchTrending في TopWatched.tsx
    - استبدال `fetchTrending('movie')` و `fetchTrending('tv')` بـ `/api/trending`
    - تطبيق `filterValidSlugs` على النتائج
    - إضافة error handling مع fallback data
    - _Requirements: 2.2, 2.4, 2.5, 8.5_

  - [x] 3.3 استبدال fetchTrending في adminActions.ts
    - استبدال `fetchTrending` بـ `/api/trending`
    - تطبيق `filterValidSlugs` على النتائج
    - إضافة error handling مع fallback data
    - _Requirements: 2.3, 2.4, 2.5, 8.5_

  - [x]* 3.4 كتابة unit tests لصفحات trending
    - اختبار تحميل Home.tsx وعرض trending movies
    - اختبار تحميل TopWatched.tsx وعرض trending content
    - اختبار عدم وجود استدعاءات TMDB في console
    - _Requirements: 9.1, 9.2, 8.1_

- [x] 4. Checkpoint - التأكد من عمل trending بشكل صحيح
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. استبدال fetchGenres في جميع الملفات
  - [x] 5.1 إنشاء دالة fetchGenres جديدة مع caching
    - إنشاء دالة `fetchGenresFromAPI(type)` في `src/lib/dataHelpers.ts`
    - إضافة caching mechanism لمدة 5 دقائق
    - إضافة error handling مع fallback إلى قائمة فارغة
    - _Requirements: 3.4, 3.5, 8.5_

  - [x] 5.2 استبدال fetchGenres في CategoryHub.tsx
    - استبدال `fetchGenres` بـ `fetchGenresFromAPI`
    - استخدام `/api/genres?type=movie` أو `/api/genres?type=tv`
    - _Requirements: 3.1_

  - [x] 5.3 استبدال fetchGenres في Search.tsx
    - استبدال `fetchGenres` بـ `fetchGenresFromAPI`
    - استخدام `/api/genres` مع المعامل المناسب
    - _Requirements: 3.2_

  - [x] 5.4 استبدال fetchGenres في Anime.tsx
    - استبدال `fetchGenres('tv')` بـ `fetchGenresFromAPI('tv')`
    - استخدام `/api/genres?type=tv`
    - _Requirements: 3.3_

  - [x]* 5.5 كتابة property test لـ genre caching
    - **Property 4: Genre Caching Behavior**
    - **Validates: Requirements 3.4**

  - [x]* 5.6 كتابة unit tests لصفحات genres
    - اختبار تحميل CategoryHub.tsx وعرض genres
    - اختبار تحميل Anime.tsx وعرض anime genres
    - اختبار fallback عند فشل genres API
    - _Requirements: 9.4, 9.5, 3.5_

- [x] 6. Checkpoint - التأكد من عمل genres بشكل صحيح
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. استبدال certification و rating extraction
  - [x] 7.1 استبدال getUsMovieCertification في MovieDetails.tsx
    - استبدال `getUsMovieCertification` بـ `extractUsCertification`
    - استخراج certification من بيانات الفيلم المسترجعة من `/api/movies/:slug`
    - إضافة error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.2 استبدال getUsMovieCertification في adminActions.ts
    - استبدال `getUsMovieCertification` بـ `extractUsCertification`
    - استخدام البيانات من `/api/movies/:id`
    - _Requirements: 4.2_

  - [x] 7.3 استبدال getUsTvRating في SeriesDetails.tsx
    - استبدال `getUsTvRating` بـ `extractUsTvRating`
    - استخراج rating من بيانات المسلسل المسترجعة من `/api/tv/:slug`
    - إضافة error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.4 استبدال getUsTvRating في adminActions.ts
    - استبدال `getUsTvRating` بـ `extractUsTvRating`
    - استخدام البيانات من `/api/tv/:id`
    - _Requirements: 5.2_

  - [x]* 7.5 كتابة unit tests لصفحات details
    - اختبار تحميل MovieDetails.tsx وعرض certification
    - اختبار تحميل SeriesDetails.tsx وعرض rating
    - _Requirements: 9.6, 9.7_

- [x] 8. استبدال advancedSearch في Search.tsx
  - [x] 8.1 إنشاء دالة advancedSearchFromAPI
    - إنشاء دالة `advancedSearchFromAPI` في `src/lib/dataHelpers.ts`
    - دعم جميع معاملات البحث: query, genres, yearFrom, yearTo, ratingFrom, ratingTo, language, keywords, sort
    - استخدام `/api/movies` و `/api/tv` مع المعاملات المناسبة
    - دمج نتائج movies و tv عند البحث في كلا النوعين
    - ترتيب النتائج حسب popularity بشكل افتراضي
    - تطبيق `filterValidSlugs` على النتائج
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 استبدال advancedSearch في Search.tsx
    - استبدال `advancedSearch` بـ `advancedSearchFromAPI`
    - إضافة error handling مع fallback data
    - _Requirements: 6.1, 6.2, 8.5_

  - [x]* 8.3 كتابة property tests للبحث
    - **Property 5: Search Parameter Support**
    - **Property 6: Search Results Merging**
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [x]* 8.4 كتابة unit tests لصفحة البحث
    - اختبار تحميل Search.tsx وعمل البحث والفلترة
    - اختبار دمج نتائج movies و tv
    - اختبار ترتيب النتائج
    - _Requirements: 9.3_

- [x] 9. Checkpoint - التأكد من عمل البحث بشكل صحيح
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. تنظيف ملف src/lib/tmdb.ts
  - [x] 10.1 إضافة @deprecated على الدوال غير المستخدمة
    - إضافة `@deprecated` على دالة `fetchTrending`
    - إضافة `@deprecated` على دالة `fetchGenres`
    - إضافة `@deprecated` على دالة `getUsMovieCertification`
    - إضافة `@deprecated` على دالة `getUsTvRating`
    - إضافة `@deprecated` على دالة `advancedSearch`
    - إضافة تعليق يوضح استخدام CockroachDB API بدلاً منها
    - الاحتفاظ بـ `tmdb` axios instance للاستخدام المستقبلي
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 11. التحقق من عدم وجود أخطاء Console
  - [x] 11.1 اختبار جميع الصفحات والتحقق من console
    - فتح كل صفحة في المتصفح والتحقق من console
    - التأكد من عدم وجود أخطاء 403 Forbidden من TMDB
    - التأكد من عدم وجود طلبات فاشلة إلى `/api/tmdb`
    - التأكد من تسجيل الأخطاء في errorLogger بدلاً من console
    - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 11.2 كتابة property tests للتحقق من console errors
    - **Property 7: No TMDB Console Errors**
    - **Property 8: Error Logging Behavior**
    - **Property 9: Fallback Data on API Failure**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

  - [x]* 11.3 كتابة integration tests لجميع الصفحات
    - اختبار تحميل جميع الصفحات المتأثرة (8 صفحات)
    - التأكد من عمل جميع الروابط وصحة slugs
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 12. Checkpoint - التأكد من عدم وجود أخطاء
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. توثيق التغييرات
  - [x] 13.1 إنشاء ملف MIGRATION_REPORT.md
    - توثيق جميع الملفات التي تم تعديلها
    - شرح التغييرات في كل ملف
    - توثيق أي breaking changes محتملة
    - إضافة أمثلة على استخدام CockroachDB API
    - تحديث أي documentation موجود
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14. Final Checkpoint - مراجعة نهائية
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- المهام المعلمة بـ `*` اختيارية ويمكن تخطيها للحصول على MVP أسرع
- كل مهمة تشير إلى المتطلبات المحددة لتتبع التغطية
- Checkpoints تضمن التحقق التدريجي من صحة العمل
- Property tests تتحقق من الخصائص العامة عبر مدخلات متعددة
- Unit tests تتحقق من أمثلة محددة وحالات edge cases
- جميع التغييرات يجب أن تحافظ على الوظائف الحالية مع إزالة اعتماد TMDB
