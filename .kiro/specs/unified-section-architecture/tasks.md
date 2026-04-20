# خطة التنفيذ: توحيد بنية الأقسام والصفحات
# Implementation Plan: Unified Section Architecture

**التاريخ / Date**: 2026-04-07  
**الحالة / Status**: Ready for Implementation  
**اللغة / Language**: TypeScript + React

---

## نظرة عامة / Overview

هذه الخطة تحول التصميم إلى مهام تنفيذية محددة. كل مهمة تبني على المهام السابقة وتنتهي بدمج كامل للكود. التركيز فقط على المهام التي تتضمن كتابة أو تعديل أو اختبار الكود.

This plan converts the design into specific implementation tasks. Each task builds on previous tasks and ends with full code integration. Focus only on tasks involving writing, modifying, or testing code.

---

## المهام / Tasks

- [x] 1. إعداد البنية الأساسية / Setup Core Structure
  - إنشاء ملفات TypeScript interfaces والأنواع
  - إنشاء دوال مساعدة للفلاتر
  - إعداد معالجة الأخطاء
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 2. إنشاء Custom Hook لجلب البيانات / Create Data Fetching Hook
  - [x] 2.1 إنشاء useUnifiedContent hook
    - كتابة hook لجلب المحتوى من CockroachDB API
    - دعم كل أنواع المحتوى (movies, series, anime, gaming, software)
    - تطبيق React Query للتخزين المؤقت (staleTime: 5min)
    - معالجة الفلاتر (genre, year, rating, sortBy, page)
    - _Requirements: 4.2, 7.9, 8.1, 8.2, 8.3, 10.1, 10.3_
  
  - [ ]* 2.2 كتابة property test لـ useUnifiedContent
    - **Property 7: CockroachDB API Data Source**
    - **Property 8: Content Type API Endpoint Mapping**
    - **Validates: Requirements 4.2, 8.1, 8.2, 8.3, 8.4**
  
  - [ ]* 2.3 كتابة unit tests لـ useUnifiedContent
    - اختبار جلب البيانات بنجاح
    - اختبار معالجة الأخطاء
    - اختبار التخزين المؤقت
    - _Requirements: 8.1, 8.2, 8.3, 10.1_

- [x] 3. إنشاء مكونات الفلترة / Create Filter Components
  - [x] 3.1 إنشاء FilterTabs component
    - كتابة مكون روابط الأقسام الفرعية
    - دعم كل أنواع المحتوى
    - دعم اللغتين العربية والإنجليزية
    - تمييز Tab النشط
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 9.1, 9.2_
  
  - [ ]* 3.2 كتابة property test لـ FilterTabs
    - **Property 1: Filter Tab Navigation**
    - **Property 9: Language-Specific UI Rendering**
    - **Validates: Requirements 3.4, 6.6, 9.1, 9.2**
  
  - [x] 3.3 إنشاء AdvancedFilters component
    - كتابة مكون الفلاتر المتقدمة (genre, year, rating, sort)
    - دعم كل أنواع المحتوى مع تصنيفات مختلفة
    - دعم اللغتين العربية والإنجليزية
    - زر مسح الفلاتر
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.3, 9.4_
  
  - [ ]* 3.4 كتابة property test لـ AdvancedFilters
    - **Property 2: Content Filtering by Genre/Year/Rating**
    - **Property 3: Content Sorting**
    - **Validates: Requirements 5.6, 5.7, 5.8, 5.9**

- [x] 4. Checkpoint - التحقق من المكونات الأساسية
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. إنشاء مكونات العرض / Create Display Components
  - [x] 5.1 إنشاء ContentGrid component
    - كتابة مكون شبكة عرض المحتوى
    - دعم responsive grid (2 cols mobile, 4 tablet, 6 desktop)
    - دمج التقييمات المجمعة (useAggregateRatings)
    - عرض رسالة "لا توجد نتائج" عند عدم وجود محتوى
    - دعم اللغتين
    - _Requirements: 4.1, 4.4, 4.7, 9.5, 9.6, 11.3_
  
  - [ ]* 5.2 كتابة unit tests لـ ContentGrid
    - اختبار عرض 40 عنصر
    - اختبار responsive grid
    - اختبار empty state
    - _Requirements: 4.4, 4.7, 11.3_
  
  - [x] 5.3 إنشاء Pagination component
    - كتابة مكون التنقل بين الصفحات
    - عرض أرقام الصفحات مع "..." للصفحات البعيدة
    - أزرار السابق/التالي
    - دعم اللغتين
    - _Requirements: 4.5_
  
  - [ ]* 5.4 كتابة property test لـ Pagination
    - **Property 5: Pagination Support**
    - **Validates: Requirements 4.5**

- [x] 6. إنشاء مكونات معالجة الأخطاء / Create Error Handling Components
  - [x] 6.1 إنشاء ErrorMessage component
    - كتابة مكون عرض الأخطاء
    - دعم أنواع الأخطاء المختلفة
    - زر إعادة المحاولة للأخطاء القابلة للإعادة
    - دعم اللغتين
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [x] 6.2 إنشاء ErrorBoundary component
    - كتابة error boundary لمنع تعطل الصفحة
    - تسجيل الأخطاء
    - عرض fallback UI
    - _Requirements: 11.5_
  
  - [ ]* 6.3 كتابة unit tests لمعالجة الأخطاء
    - **Property 11: Error Handling and Display**
    - **Validates: Requirements 11.1, 11.2, 11.4**

- [x] 7. Checkpoint - التحقق من مكونات العرض
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. إنشاء المكون الرئيسي الموحد / Create Main Unified Component
  - [x] 8.1 إنشاء UnifiedSectionPage component
    - كتابة المكون الرئيسي الموحد
    - دمج FilterTabs, AdvancedFilters, ContentGrid, Pagination
    - معالجة URL query parameters
    - تحديث URL عند تغيير الفلاتر
    - إضافة SEO meta tags (Helmet)
    - عرض skeleton loaders أثناء التحميل
    - _Requirements: 7.1, 7.6, 7.7, 7.8, 5.10, 12.1, 12.6, 10.7_
  
  - [ ]* 8.2 كتابة property test لـ UnifiedSectionPage
    - **Property 4: URL Query Parameter Synchronization**
    - **Property 12: URL Filter Restoration**
    - **Validates: Requirements 5.10, 12.1, 12.2, 12.5**
  
  - [ ]* 8.3 كتابة integration tests لـ UnifiedSectionPage
    - اختبار تدفق الفلترة الكامل
    - اختبار التنقل بين Filter Tabs
    - اختبار تحديث URL
    - _Requirements: 3.4, 5.6, 5.7, 5.8, 12.1_

- [x] 9. تحديث صفحات الأقسام الحالية / Update Existing Section Pages
  - [x] 9.1 تحديث Movies.tsx
    - إزالة QuantumHero component
    - استخدام UnifiedSectionPage مع contentType="movies"
    - الاحتفاظ بالصفحة الرئيسية (Home.tsx) كما هي
    - _Requirements: 1.3, 2.1, 2.2, 7.10_
  
  - [x] 9.2 تحديث Series.tsx
    - إزالة QuantumHero component
    - استخدام UnifiedSectionPage مع contentType="series"
    - _Requirements: 2.3, 7.10_
  
  - [x] 9.3 تحديث Anime.tsx
    - إزالة QuantumHero component
    - استخدام UnifiedSectionPage مع contentType="anime"
    - _Requirements: 2.4, 7.10_
  
  - [x] 9.4 تحديث Gaming.tsx (إن وجد)
    - إزالة QuantumHero component
    - استخدام UnifiedSectionPage مع contentType="gaming"
    - _Requirements: 2.5, 7.10_
  
  - [x] 9.5 تحديث Software.tsx (إن وجد)
    - إزالة QuantumHero component
    - استخدام UnifiedSectionPage مع contentType="software"
    - _Requirements: 2.6, 7.10_
  
  - [ ]* 9.6 كتابة unit test للتحقق من عدم تعديل Home.tsx
    - التحقق من وجود QuantumHero في Home.tsx
    - التحقق من عدم وجود QuantumHero في صفحات الأقسام
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1_

- [x] 10. إنشاء الصفحات الفرعية / Create Subsection Pages
  - [x] 10.1 إنشاء routes للصفحات الفرعية
    - إضافة routes لـ /movies/trending, /movies/top-rated, /movies/latest, /movies/upcoming
    - إضافة routes لـ /series/*, /anime/*, /gaming/*, /software/*
    - كل route يستخدم UnifiedSectionPage مع activeFilter مناسب
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [ ]* 10.2 كتابة property test للصفحات الفرعية
    - **Property 6: Subsection Content Filtering**
    - **Validates: Requirements 6.7**
  
  - [ ]* 10.3 كتابة integration tests للصفحات الفرعية
    - اختبار التنقل إلى /movies/trending
    - التحقق من عرض المحتوى الرائج فقط
    - التحقق من تمييز Tab النشط
    - _Requirements: 6.6, 6.7_

- [ ] 11. Checkpoint - التحقق من الروتات والصفحات
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. تحسين الأداء / Performance Optimization
  - [x] 12.1 تطبيق code splitting
    - استخدام React.lazy لـ UnifiedSectionPage
    - استخدام React.lazy لـ AdvancedFilters
    - إضافة Suspense مع fallback
    - _Requirements: 10.7_
  
  - [x] 12.2 تطبيق prefetching للصفحة التالية
    - إنشاء usePrefetchNextPage hook
    - prefetch الصفحة التالية عند الاقتراب من نهاية الصفحة
    - _Requirements: 10.4, 10.6_
  
  - [ ]* 12.3 قياس الأداء
    - قياس Initial Load Time
    - قياس Time to Interactive
    - قياس عدد API requests
    - التحقق من تحقيق الأهداف المحددة
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 13. اختبارات النهائية والتحقق / Final Testing and Verification
  - [ ]* 13.1 تشغيل كل property-based tests
    - **Property 1-12: All Correctness Properties**
    - **Validates: All Requirements**
  
  - [ ]* 13.2 تشغيل كل unit tests
    - التحقق من 80%+ code coverage
    - _Requirements: All_
  
  - [ ]* 13.3 تشغيل كل integration tests
    - اختبار تدفقات المستخدم الكاملة
    - _Requirements: All_
  
  - [x] 13.4 اختبار يدوي شامل
    - اختبار كل صفحة قسم (/movies, /series, /anime, /gaming, /software)
    - اختبار كل صفحة فرعية (trending, top-rated, latest, upcoming)
    - اختبار الفلاتر المتقدمة
    - اختبار التنقل بين الصفحات
    - اختبار اللغتين العربية والإنجليزية
    - اختبار معالجة الأخطاء
    - _Requirements: All_

- [ ] 14. Checkpoint النهائي - Final Verification
  - Ensure all tests pass, ask the user if questions arise.

---

## ملاحظات مهمة / Important Notes

### مهام اختيارية / Optional Tasks
- المهام المميزة بـ `*` اختيارية ويمكن تخطيها للحصول على MVP أسرع
- المهام الاختيارية تشمل: property tests, unit tests, integration tests
- المهام الأساسية (بدون `*`) يجب تنفيذها

### قواعد التنفيذ / Implementation Rules
- **MUST**: استخدام CockroachDB API فقط (لا Supabase للمحتوى)
- **MUST**: دعم اللغتين العربية والإنجليزية
- **MUST**: استخدام React Query للتخزين المؤقت
- **MUST**: استخدام TypeScript لكل الكود
- **MUST**: الاحتفاظ بالصفحة الرئيسية (Home.tsx) كما هي

### مكتبات مطلوبة / Required Libraries
```bash
# Already installed
@tanstack/react-query
react-router-dom
react-helmet-async

# Need to install for testing
npm install --save-dev fast-check @types/fast-check
```

### بنية الملفات / File Structure
```
src/
├── types/unified-section.ts
├── lib/filter-utils.ts
├── lib/error-handling.ts
├── hooks/useUnifiedContent.ts
├── hooks/usePrefetchNextPage.ts
├── components/
│   ├── features/filters/
│   │   ├── FilterTabs.tsx
│   │   └── AdvancedFilters.tsx
│   ├── features/media/ContentGrid.tsx
│   └── common/
│       ├── Pagination.tsx
│       ├── ErrorMessage.tsx
│       └── ErrorBoundary.tsx
└── pages/discovery/
    ├── UnifiedSectionPage.tsx
    ├── Movies.tsx (updated)
    ├── Series.tsx (updated)
    ├── Anime.tsx (updated)
    ├── Gaming.tsx (updated)
    └── Software.tsx (updated)
```

### Correctness Properties (12 خاصية)
1. Filter Tab Navigation
2. Content Filtering by Genre/Year/Rating
3. Content Sorting
4. URL Query Parameter Synchronization
5. Pagination Support
6. Subsection Content Filtering
7. CockroachDB API Data Source
8. Content Type API Endpoint Mapping
9. Language-Specific UI Rendering
10. Cache Utilization on Navigation
11. Error Handling and Display
12. URL Filter Restoration

---

**تاريخ الإنشاء**: 2026-04-07  
**الحالة**: ✅ Ready for Implementation  
**اللغة**: TypeScript + React
