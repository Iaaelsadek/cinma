# خطة التنفيذ - Arabic Movies Duplicate and Missing Slugs Fix

## نظرة عامة
إصلاح مشكلتين حرجتين في `/api/db/home` endpoint:
1. أفلام ومسلسلات بدون slugs صالحة تسبب خطأ "Missing slug"
2. نفس 20 فيلم عربي يظهرون في جميع الأقسام بسبب عدم وجود فلترة صحيحة

---

## المهام

- [x] 1. كتابة اختبار استكشاف شرط الخلل (Bug Condition Exploration Test)
  - **Property 1: Bug Condition** - Home Endpoint Returns Invalid Slugs
  - **مهم جداً**: اكتب هذا الاختبار قبل تطبيق الإصلاح
  - **الهدف**: كشف الأمثلة المضادة التي تثبت وجود الخلل
  - **نهج PBT المحدد**: نطاق الاختبار على الحالات الفاشلة المحددة:
    - اختبار أن `/api/db/home` يرجع محتوى بدون slug صالح (slug = NULL أو '' أو 'content')
    - اختبار أن قسم `kids` يحتوي على أفلام ليست للأطفال (بدون genres: Family/Animation)
    - اختبار أن نفس الأفلام تظهر في أقسام متعددة (تكرار > 50%)
  - تشغيل الاختبار على الكود غير المصلح
  - **النتيجة المتوقعة**: الاختبار يفشل (هذا صحيح - يثبت وجود الخلل)
  - توثيق الأمثلة المضادة الموجودة (مثل: "movie:53220 بدون slug", "movie:1290821 بدون slug")
  - وضع علامة إكمال على المهمة عند كتابة الاختبار وتشغيله وتوثيق الفشل
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. كتابة اختبارات خصائص الحفاظ (Preservation Property Tests) - قبل تطبيق الإصلاح
  - **Property 2: Preservation** - Valid Content Continues to Work
  - **مهم جداً**: اتبع منهجية الملاحظة أولاً (observation-first)
  - ملاحظة: `/api/db/home` يرجع محتوى صالح مع slugs صحيحة على الكود غير المصلح
  - ملاحظة: البيانات المرجعة تحتوي على جميع الحقول المطلوبة (id, slug, title, poster_path, media_type)
  - ملاحظة: الـ cache يعمل بشكل صحيح (300 ثانية)
  - كتابة اختبار property-based: لجميع المحتوى الصالح، يجب أن يستمر في الظهور مع نفس البيانات (من Preservation Requirements في التصميم)
  - اختبار property-based يولد حالات اختبار متعددة تلقائياً
  - التحقق من أن الاختبار ينجح على الكود غير المصلح
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. إصلاح `/api/db/home` endpoint في `server/api/db.js`

  - [x] 3.1 إضافة فلترة slug صالح لاستعلام trending
    - إضافة شرط `AND slug IS NOT NULL AND slug != '' AND slug != 'content' AND slug != '-1'`
    - التأكد من أن الاستعلام يرجع فقط أفلام مع slugs صالحة
    - _Bug_Condition: isBugCondition(input) حيث الاستعلام لا يفلتر slugs غير صالحة_
    - _Expected_Behavior: expectedBehavior(result) من التصميم - جميع العناصر لها slug صالح_
    - _Preservation: Preservation Requirements من التصميم - المحتوى الصالح يستمر في الظهور_
    - _Requirements: 1.1, 1.5, 2.1, 2.5, 3.1_

  - [x] 3.2 إصلاح قسم kids لفلترة أفلام الأطفال فقط
    - إضافة فلترة حسب genres: `(genres::text ILIKE '%10751%' OR genres::text ILIKE '%16%' OR genres::text ILIKE '%Family%' OR genres::text ILIKE '%Animation%')`
    - إضافة فلترة slug صالح: `AND slug IS NOT NULL AND slug != '' AND slug != 'content'`
    - التأكد من أن القسم يرجع أفلام أطفال فقط
    - _Bug_Condition: isBugCondition(input) حيث قسم kids يجلب جميع الأفلام بدون فلترة حسب النوع_
    - _Expected_Behavior: expectedBehavior(result) - قسم kids يحتوي على أفلام أطفال فقط_
    - _Preservation: Preservation Requirements - الحد الأقصى للعناصر يبقى 50_
    - _Requirements: 1.3, 2.3, 3.1_

  - [x] 3.3 إضافة فلترة slug صالح لقسم arabicSeries
    - إضافة شرط `AND slug IS NOT NULL AND slug != '' AND slug != 'content'`
    - التأكد من أن المسلسلات العربية المرجعة لها slugs صالحة
    - _Bug_Condition: isBugCondition(input) حيث arabicSeries يرجع مسلسلات بدون slug_
    - _Expected_Behavior: expectedBehavior(result) - جميع المسلسلات لها slug صالح_
    - _Preservation: Preservation Requirements - المسلسلات الصالحة تستمر في الظهور_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.4 إضافة فلترة slug صالح لقسم bollywood
    - إضافة شرط `AND slug IS NOT NULL AND slug != '' AND slug != 'content'`
    - التأكد من أن أفلام بوليوود المرجعة لها slugs صالحة
    - _Bug_Condition: isBugCondition(input) حيث bollywood يرجع أفلام بدون slug_
    - _Expected_Behavior: expectedBehavior(result) - جميع أفلام بوليوود لها slug صالح_
    - _Preservation: Preservation Requirements - الفلترة حسب original_language = 'hi' تستمر_
    - _Requirements: 1.4, 2.4, 3.1_

  - [x] 3.5 التحقق من أن اختبار استكشاف شرط الخلل ينجح الآن
    - **Property 1: Expected Behavior** - Home Endpoint Returns Only Valid Slugs
    - **مهم جداً**: إعادة تشغيل نفس الاختبار من المهمة 1 - لا تكتب اختباراً جديداً
    - الاختبار من المهمة 1 يحتوي على السلوك المتوقع
    - عندما ينجح هذا الاختبار، يؤكد أن السلوك المتوقع تم تحقيقه
    - تشغيل اختبار استكشاف شرط الخلل من الخطوة 1
    - **النتيجة المتوقعة**: الاختبار ينجح (يؤكد إصلاح الخلل)
    - _Requirements: Expected Behavior Properties من التصميم_

  - [x] 3.6 التحقق من أن اختبارات الحفاظ لا تزال تنجح
    - **Property 2: Preservation** - Valid Content Still Works After Fix
    - **مهم جداً**: إعادة تشغيل نفس الاختبارات من المهمة 2 - لا تكتب اختبارات جديدة
    - تشغيل اختبارات خصائص الحفاظ من الخطوة 2
    - **النتيجة المتوقعة**: الاختبارات تنجح (تؤكد عدم وجود انحدار)
    - التأكد من أن جميع الاختبارات تنجح بعد الإصلاح (لا يوجد انحدار)

- [x] 4. نقطة تفتيش - التأكد من نجاح جميع الاختبارات
  - التأكد من نجاح جميع الاختبارات، اسأل المستخدم إذا ظهرت أسئلة.

---

## ملاحظات مهمة

### منهجية Bug Condition:
- **C(X)**: شرط الخلل - يحدد المدخلات التي تسبب الخلل
- **P(result)**: الخاصية - السلوك المطلوب للمدخلات التي تسبب الخلل
- **¬C(X)**: المدخلات غير المعيبة - يجب الحفاظ عليها
- **F**: الدالة الأصلية (قبل الإصلاح)
- **F'**: الدالة المصلحة (بعد الإصلاح)

### ترتيب التنفيذ (حرج):
1. اختبار استكشاف شرط الخلل (قبل الإصلاح) - يجب أن يفشل
2. اختبارات الحفاظ (قبل الإصلاح) - يجب أن تنجح
3. تطبيق الإصلاح
4. إعادة تشغيل اختبار شرط الخلل - يجب أن ينجح الآن
5. إعادة تشغيل اختبارات الحفاظ - يجب أن تستمر في النجاح

### الملفات المتأثرة:
- `server/api/db.js` - `/api/db/home` endpoint (السطور 1050-1120 تقريباً)
- `src/__tests__/arabic-movies-bug-exploration.test.ts` - اختبار استكشاف الخلل (جديد)
- `src/__tests__/arabic-movies-preservation.test.ts` - اختبار الحفاظ (جديد)
