# خطة التنفيذ: تحسينات SEO وحالات التحميل وحدود الأخطاء

## نظرة عامة

تنفيذ تحسينات شاملة على صفحات الاكتشاف في Cinema Online تشمل:
- **Error Boundaries**: معالجة أخطاء React بشكل احترافي
- **Skeleton Loaders**: استبدال PageLoader البسيط بـ skeleton loaders مفصلة
- **SEO Meta Tags**: استبدال Helmet بـ SeoHead الشامل
- **Dynamic SEO**: تحديث meta tags ديناميكياً للصفحات المفلترة

جميع المكونات المطلوبة موجودة بالفعل: `SeoHead`, `ErrorBoundary`, `ErrorMessage`, `Skeletons`.

## المهام

- [x] 1. إنشاء PageErrorBoundary wrapper component
  - إنشاء `src/components/common/PageErrorBoundary.tsx`
  - تضمين ErrorBoundary مع fallback UI يستخدم ErrorMessage
  - إضافة onError callback لتسجيل الأخطاء في Logger
  - إضافة onReset callback لإعادة تعيين query cache
  - _المتطلبات: 15.6, 15.7, 15.8, 15.9, 15.10_

- [x] 2. تطبيق Error Boundaries على جميع صفحات الاكتشاف
  - [x] 2.1 تغليف PlaysPage بـ PageErrorBoundary في route configuration
    - تعديل `src/App.tsx` أو ملف routes
    - تمرير pageName="المسرحيات"
    - _المتطلبات: 15.1_

  - [x] 2.2 تغليف ClassicsPage بـ PageErrorBoundary
    - تمرير pageName="الكلاسيكيات"
    - _المتطلبات: 15.2_

  - [x] 2.3 تغليف SummariesPage بـ PageErrorBoundary
    - تمرير pageName="الملخصات"
    - _المتطلبات: 15.3_

  - [x] 2.4 تغليف QuranPage بـ PageErrorBoundary
    - تمرير pageName="القرآن الكريم"
    - _المتطلبات: 15.4_

  - [x] 2.5 تغليف QuranRadio بـ PageErrorBoundary
    - تمرير pageName="راديو القرآن"
    - _المتطلبات: 15.5_


  - [x] 2.6 تغليف PlaysWithFilters بـ PageErrorBoundary
    - تمرير pageName="المسرحيات المفلترة"
    - _المتطلبات: 16.1_

  - [x] 2.7 تغليف ClassicsWithFilters بـ PageErrorBoundary
    - تمرير pageName="الكلاسيكيات المفلترة"
    - _المتطلبات: 16.2_

  - [x] 2.8 تغليف SummariesWithFilters بـ PageErrorBoundary
    - تمرير pageName="الملخصات المفلترة"
    - _المتطلبات: 16.3_

  - [ ]*  2.9 كتابة property test للتحقق من Error Boundary يلتقط أخطاء React
    - **Property 15: Error Boundary Catches React Errors**
    - **يتحقق من: المتطلبات 15.6, 15.7**

- [x] 3. Checkpoint - التحقق من Error Boundaries
  - التأكد من أن جميع الصفحات ملفوفة بـ ErrorBoundary
  - اختبار التقاط الأخطاء بإلقاء خطأ متعمد
  - التحقق من تسجيل الأخطاء في Logger
  - سؤال المستخدم إذا كانت هناك أسئلة

- [x] 4. تحديث Plays page بـ skeleton loaders
  - [x] 4.1 استبدال PageLoader بـ SkeletonHero و SkeletonGrid في حالة التحميل
    - استخدام `<SkeletonHero />` بدلاً من hero content
    - استخدام `<SkeletonGrid count={12} variant="video" />`
    - الحفاظ على نفس layout container classes
    - _المتطلبات: 6.1, 6.2, 6.4_

  - [x] 4.2 إضافة معالجة أخطاء API باستخدام ErrorMessage
    - عرض ErrorMessage عند فشل getPlays API
    - تحديد error type (network, server) بناءً على نوع الخطأ
    - إضافة onRetry callback يستدعي refetch()
    - إضافة showHomeButton و showBackButton
    - _المتطلبات: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]*  4.3 كتابة property test للتحقق من عرض skeleton loaders أثناء التحميل
    - **Property 7: Skeleton Loaders Display During Loading**
    - **يتحقق من: المتطلبات 6.1, 6.2, 6.6**

- [x] 5. تحديث PlaysWithFilters page بـ skeleton loaders ومعالجة أخطاء
  - استبدال PageLoader بـ SkeletonHero و SkeletonGrid
  - إضافة ErrorMessage لمعالجة أخطاء API
  - الحفاظ على query parameters عند حدوث خطأ
  - _المتطلبات: 6.3, 6.9, 10.8_

- [x] 6. تحديث Classics page بـ skeleton loaders
  - [x] 6.1 استبدال PageLoader بـ SkeletonHero و SkeletonGrid في حالة التحميل
    - استخدام `<SkeletonGrid count={18} variant="poster" />` للأفلام
    - استخدام SkeletonPosterCard (aspect ratio 2:3)
    - _المتطلبات: 7.1, 7.2, 7.3_

  - [x] 6.2 إضافة معالجة أخطاء API باستخدام ErrorMessage
    - عرض ErrorMessage عند فشل getClassics API
    - رسالة بالعربية: "فشل في تحميل الأفلام الكلاسيكية"
    - _المتطلبات: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]*  6.3 كتابة property test للتحقق من Skeleton Loader Variant Matching
    - **Property 8: Skeleton Loader Variant Matching**
    - **يتحقق من: المتطلبات 6.4, 7.3**

- [x] 7. تحديث ClassicsWithFilters page بـ skeleton loaders ومعالجة أخطاء
  - استبدال PageLoader بـ SkeletonHero و SkeletonGrid
  - إضافة ErrorMessage لمعالجة أخطاء API
  - الحفاظ على حالة الفلاتر عند حدوث خطأ
  - _المتطلبات: 7.5, 11.7_

- [x] 8. تحديث Summaries page بـ skeleton loaders
  - [x] 8.1 استبدال PageLoader بـ SkeletonHero و SkeletonGrid في حالة التحميل
    - استخدام `<SkeletonGrid count={12} variant="video" />` للملخصات
    - _المتطلبات: 8.1, 8.2, 8.3_

  - [x] 8.2 إضافة معالجة أخطاء API باستخدام ErrorMessage
    - عرض ErrorMessage عند فشل getSummaries API
    - رسالة بالعربية: "فشل في تحميل الملخصات"
    - _المتطلبات: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]*  8.3 كتابة property test للتحقق من إخفاء skeleton loaders عند اكتمال التحميل
    - **Property 9: Skeleton Loaders Hide on Load Complete**
    - **يتحقق من: المتطلبات 6.7, 7.8, 8.8**

- [x] 9. تحديث SummariesWithFilters page بـ skeleton loaders ومعالجة أخطاء
  - استبدال PageLoader بـ SkeletonHero و SkeletonGrid
  - إضافة ErrorMessage لمعالجة أخطاء API
  - الحفاظ على query parameters عند حدوث خطأ
  - _المتطلبات: 8.5, 12.8_

- [x] 10. تحديث Quran page بـ skeleton loaders
  - [x] 10.1 إضافة skeleton loaders لقائمة القراء والسور
    - عرض 8 skeleton items في الشريط الجانبي للقراء
    - عرض SkeletonGrid في المنطقة الرئيسية للسور
    - عرض skeleton loader لـ ReciterHeader
    - _المتطلبات: 9.1, 9.2, 9.3, 9.4_

  - [x] 10.2 إضافة معالجة أخطاء API للقراء
    - عرض ErrorMessage في منطقة القراء عند فشل useReciters
    - رسالة بالعربية: "فشل في تحميل قائمة القراء"
    - إخفاء Prayer Times و Weather بصمت عند فشل APIs الخارجية
    - _المتطلبات: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 11. تحديث QuranRadio page بمعالجة أخطاء Audio Stream
  - إضافة معالجة autoplay blocked errors
  - إضافة auto-fallback للمحطة التالية عند فشل stream
  - تجنب infinite loop (fallback مرة واحدة فقط)
  - عرض ErrorMessage إذا فشلت جميع المحطات
  - _المتطلبات: 14.1, 14.2, 14.3, 14.7, 14.9_

- [x] 12. Checkpoint - التحقق من Skeleton Loaders و Error Handling
  - التأكد من عرض skeleton loaders على جميع الصفحات أثناء التحميل
  - اختبار معالجة الأخطاء بقطع الاتصال بالإنترنت
  - التحقق من عمل أزرار Retry, Home, Back
  - سؤال المستخدم إذا كانت هناك أسئلة

- [x] 13. استبدال Helmet بـ SeoHead في Plays page
  - [x] 13.1 إضافة SeoHead component مع meta tags شاملة
    - title: "المسرحيات - سينما أونلاين"
    - description: "استمتع بمشاهدة أفضل المسرحيات العربية والخليجية بجودة عالية"
    - type: "website"
    - image: صورة OG مناسبة
    - _المتطلبات: 1.1, 1.2, 1.7, 1.8, 1.10, 1.12_

  - [ ]*  13.2 كتابة property test للتحقق من وجود جميع SEO meta tags
    - **Property 1: SEO Meta Tags Presence**
    - **يتحقق من: المتطلبات 1.7, 1.8, 1.10**

- [x] 14. استبدال Helmet بـ SeoHead في PlaysWithFilters page
  - إضافة SeoHead مع dynamic title و description بناءً على category
  - title examples: "مسرحيات عادل إمام", "مسرحيات كلاسيكية", "مسرحيات خليجية", "مسرح مصر"
  - _المتطلبات: 1.3, 1.4, 1.5, 1.6, 1.11_

- [x] 15. استبدال Helmet بـ SeoHead في Classics page
  - [x] 15.1 إضافة SeoHead component مع meta tags شاملة
    - title: "كلاسيكيات السينما - أفلام خالدة | سينما أونلاين"
    - description: "اكتشف أفضل الأفلام الكلاسيكية من العصر الذهبي للسينما"
    - type: "video.movie"
    - Schema.org MovieSeries structured data
    - _المتطلبات: 2.1, 2.2, 2.4, 2.5, 2.6, 2.9, 2.10_

  - [ ]*  15.2 كتابة property test للتحقق من Meta Description Length Constraint
    - **Property 2: Meta Description Length Constraint**
    - **يتحقق من: المتطلبات 1.2, 2.2, 3.2**

- [x] 16. استبدال Helmet بـ SeoHead في ClassicsWithFilters page
  - إضافة SeoHead مع dynamic title و description بناءً على filters
  - تحديث meta tags عند تطبيق فلاتر (genre, year, rating, language)
  - _المتطلبات: 2.3, 2.7_

- [x] 17. استبدال Helmet بـ SeoHead في Summaries page
  - [x] 17.1 إضافة SeoHead component مع meta tags شاملة
    - title: "ملخصات الأفلام - مراجعات سريعة | سينما أونلاين"
    - description: "شاهد ملخصات سريعة ومراجعات شاملة لأحدث الأفلام والمسلسلات"
    - type: "website"
    - Twitter Card: "summary_large_image"
    - Schema.org VideoObject structured data
    - _المتطلبات: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_

  - [ ]*  17.2 كتابة property test للتحقق من Schema.org Round-Trip Property
    - **Property 5: Schema.org Round-Trip Property**
    - **يتحقق من: المتطلبات 17.8**

- [x] 18. استبدال Helmet بـ SeoHead في SummariesWithFilters page
  - إضافة SeoHead مع dynamic title و description بناءً على filters
  - تحديث meta tags عند تطبيق فلاتر
  - _المتطلبات: 3.6_

- [x] 19. استبدال Helmet بـ SeoHead في Quran page
  - إضافة SeoHead component مع meta tags شاملة
  - title: "القرآن الكريم - استماع وتلاوة | سينما أونلاين"
  - description: "استمع إلى القرآن الكريم بأصوات نخبة من القراء"
  - type: "website"
  - lang="ar" attribute
  - _المتطلبات: 4.1, 4.2, 4.3, 4.4, 4.7, 4.9_

- [x] 20. استبدال Helmet بـ SeoHead في QuranRadio page
  - إضافة SeoHead component مع meta tags شاملة
  - title: "راديو القرآن الكريم - بث مباشر | سينما أونلاين"
  - description: "استمع إلى بث مباشر للقرآن الكريم على مدار الساعة"
  - Schema.org RadioStation structured data
  - _المتطلبات: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_

- [x] 21. Checkpoint - التحقق من SEO Implementation
  - التأكد من استبدال Helmet بـ SeoHead في جميع الصفحات
  - فحص meta tags في browser DevTools
  - التحقق من canonical URLs
  - سؤال المستخدم إذا كانت هناك أسئلة

- [x] 22. إنشاء SEO helper functions للصفحات المفلترة
  - [x] 22.1 إنشاء `src/lib/seo-helpers.ts`
    - دالة generatePlaysSeoData(category) لتوليد SEO data للمسرحيات
    - دالة generateClassicsSeoData(filters) لتوليد SEO data للكلاسيكيات
    - دالة generateSummariesSeoData(filters) لتوليد SEO data للملخصات
    - دالة truncateDescription(text, maxLength) لاقتصاص الوصف
    - _المتطلبات: 1.11, 2.7, 3.6_

  - [ ]*  22.2 كتابة property test للتحقق من Dynamic SEO Updates for Filters
    - **Property 3: Dynamic SEO Updates for Filters**
    - **يتحقق من: المتطلبات 1.11, 2.3, 2.7, 3.6**

- [x] 23. دمج SEO helpers مع PlaysWithFilters
  - استخدام generatePlaysSeoData لتوليد dynamic title و description
  - تحديث SeoHead عند تغيير category
  - _المتطلبات: 1.11_

- [x] 24. دمج SEO helpers مع ClassicsWithFilters
  - استخدام generateClassicsSeoData لتوليد dynamic title و description
  - تحديث SeoHead عند تغيير filters (genre, year, rating, language)
  - _المتطلبات: 2.7_

- [x] 25. دمج SEO helpers مع SummariesWithFilters
  - استخدام generateSummariesSeoData لتوليد dynamic title و description
  - تحديث SeoHead عند تغيير filters
  - _المتطلبات: 3.6_

- [x] 26. إضافة accessibility attributes لـ ErrorMessage و Skeleton Loaders
  - [x] 26.1 التحقق من وجود role="alert" و aria-live="assertive" في ErrorMessage
    - التأكد من أن جميع ErrorMessage components تتضمن accessibility attributes
    - _المتطلبات: 18.1, 18.2_

  - [x] 26.2 إضافة aria-label و aria-busy للـ Skeleton Loaders
    - إضافة aria-label="جاري التحميل" لـ skeleton loaders
    - إضافة aria-busy="true" أثناء التحميل
    - تحديث aria-busy إلى "false" عند اكتمال التحميل
    - _المتطلبات: 18.3, 18.4, 18.5_

  - [x] 26.3 إضافة aria-label لجميع الأزرار في ErrorMessage
    - التأكد من أن جميع الأزرار (Retry, Home, Back) لها aria-label واضح
    - _المتطلبات: 18.6, 18.10_

  - [ ]*  26.4 كتابة property test للتحقق من Accessibility Attributes Presence
    - **Property 20: Accessibility Attributes Presence**
    - **يتحقق من: المتطلبات 18.1, 18.2**

- [x] 27. Checkpoint النهائي - التحقق من جميع التحسينات
  - التأكد من عمل Error Boundaries على جميع الصفحات
  - التأكد من عرض Skeleton Loaders بشكل صحيح
  - التأكد من وجود SEO meta tags الشاملة
  - التأكد من تحديث SEO ديناميكياً للصفحات المفلترة
  - اختبار accessibility مع screen readers
  - سؤال المستخدم إذا كانت هناك أسئلة

- [ ]*  28. كتابة unit tests لـ SeoHead component
  - اختبار عرض basic meta tags
  - اختبار عرض Open Graph tags
  - اختبار عرض Twitter Card tags
  - اختبار عرض Schema.org structured data
  - اختبار canonical URL

- [ ]*  29. كتابة unit tests لـ ErrorMessage component
  - اختبار عرض network error message
  - اختبار عرض server error message
  - اختبار استدعاء onRetry عند النقر على زر إعادة المحاولة
  - اختبار وجود accessibility attributes

- [ ]*  30. كتابة unit tests لـ Skeleton Loaders
  - اختبار عرض SkeletonHero
  - اختبار عرض SkeletonGrid بالعدد الصحيح
  - اختبار استخدام aspect ratio الصحيح (video vs poster)

- [ ]*  31. كتابة unit tests لـ ErrorBoundary
  - اختبار التقاط React errors وعرض fallback
  - اختبار استدعاء onError callback
  - اختبار إعادة تعيين error state عند retry

- [ ]*  32. كتابة integration tests للصفحات
  - اختبار complete loading → success flow
  - اختبار complete loading → error flow
  - اختبار filter changes → SEO updates

- [ ]*  33. تشغيل accessibility tests
  - استخدام axe-core للتحقق من WCAG 2.1 AA compliance
  - اختبار keyboard navigation
  - اختبار screen reader compatibility

- [ ]*  34. التحقق من SEO باستخدام أدوات خارجية
  - اختبار Google Rich Results Test
  - اختبار Facebook Sharing Debugger
  - اختبار Twitter Card Validator
  - التحقق من Schema.org validator

## ملاحظات

- المهام المميزة بـ `*` اختيارية ويمكن تخطيها للحصول على MVP أسرع
- جميع المكونات المطلوبة موجودة بالفعل: `SeoHead`, `ErrorBoundary`, `ErrorMessage`, `Skeletons`
- يجب استخدام CockroachDB API لجميع استعلامات المحتوى (getPlays, getClassics, getSummaries)
- Supabase للمصادقة وبيانات المستخدم فقط
- جميع رسائل الأخطاء يجب أن تكون بالعربية
- Property tests يجب أن تعمل بـ minimum 100 iterations
