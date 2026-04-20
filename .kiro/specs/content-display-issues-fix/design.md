# مستند تصميم إصلاح مشاكل عرض المحتوى

## المقدمة

هذا المستند يحدد خطة إصلاح تفصيلية لثلاث مشاكل في عرض المحتوى على موقع Cinema.online:

1. **حد Pagination منخفض (40 عنصر)** - يجب زيادته إلى 100
2. **ترتيب الممثلين غير صحيح** - استخدام COALESCE لمعالجة NULL
3. **قسم "You may also like" فارغ** - التحقق من primary_genre وإضافة fallback

الهدف: تحسين تجربة المستخدم من خلال عرض المزيد من المحتوى، ترتيب صحيح للممثلين، وتوصيات محتوى مشابه فعالة.

---

## المصطلحات (Glossary)

- **Bug_Condition (C)**: الشرط الذي يؤدي إلى ظهور المشكلة
- **Property (P)**: السلوك المطلوب عند حدوث الشرط
- **Preservation**: السلوك الحالي الذي يجب الحفاظ عليه
- **Pagination**: نظام تقسيم المحتوى إلى صفحات
- **cast_order**: حقل في قاعدة البيانات يحدد ترتيب ظهور الممثلين
- **primary_genre**: التصنيف الرئيسي للمحتوى (أكشن، دراما، إلخ)
- **COALESCE**: دالة SQL تعيد أول قيمة غير NULL من قائمة القيم
- **useUnifiedContent**: Hook في React لجلب المحتوى الموحد
- **content.js**: ملف routes في الـ backend يحتوي على endpoints المحتوى

---

## تفاصيل المشاكل

### المشكلة 1: حد Pagination منخفض

#### شرط المشكلة (Bug Condition)

المشكلة تظهر عندما يطلب المستخدم عرض المزيد من المحتوى في الصفحات الرئيسية. الحد الأقصى الحالي هو 40 عنصر فقط، مما يتطلب 240+ صفحة لعرض 9,612 عنصر.

**المواصفات الرسمية:**
```
FUNCTION isBugCondition_Pagination(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN request.query.limit IS NOT NULL
         AND request.query.limit > 40
         AND request.query.limit <= 100
END FUNCTION
```

#### أمثلة

- **مثال 1**: مستخدم يطلب `?limit=60` → يحصل على 40 عنصر فقط (خطأ)
- **مثال 2**: مستخدم يطلب `?limit=100` → يحصل على 40 عنصر فقط (خطأ)
- **مثال 3**: مستخدم يطلب `?limit=150` → يجب أن يحصل على 100 عنصر (الحد الأقصى)
- **مثال 4**: مستخدم لا يحدد limit → يحصل على 20 عنصر (افتراضي، صحيح)


### المشكلة 2: ترتيب الممثلين غير صحيح

#### شرط المشكلة (Bug Condition)

المشكلة تظهر عندما يفتح المستخدم صفحة فيلم أو مسلسل ويكون لبعض الممثلين قيمة `cast_order = NULL` في قاعدة البيانات. الترتيب الحالي `ORDER BY mc.cast_order ASC` يضع القيم NULL في البداية أو النهاية بشكل غير متوقع.

**المواصفات الرسمية:**
```
FUNCTION isBugCondition_CastOrder(castMember)
  INPUT: castMember of type CastRecord
  OUTPUT: boolean
  
  RETURN castMember.cast_order IS NULL
         OR castMember.cast_order > 999
         AND castMember.isMainCast = TRUE
END FUNCTION
```

#### أمثلة

- **مثال 1**: ممثل رئيسي (cast_order = 0) يظهر أولاً ✅
- **مثال 2**: ممثل ثانوي (cast_order = NULL) يظهر قبل الممثل الرئيسي ❌
- **مثال 3**: ممثل (cast_order = 5) يظهر بعد ممثل (cast_order = NULL) ❌
- **مثال 4**: بعد الإصلاح: NULL يُعامل كـ 999 ويظهر في النهاية ✅

### المشكلة 3: قسم "You may also like" فارغ

#### شرط المشكلة (Bug Condition)

المشكلة تظهر عندما يفتح المستخدم صفحة مشاهدة ولا يظهر قسم "You may also like" أو يظهر فارغاً. السبب الرئيسي هو أن `primary_genre` قد يكون NULL أو لا يوجد محتوى مشابه بنفس التصنيف.

**المواصفات الرسمية:**
```
FUNCTION isBugCondition_SimilarContent(content)
  INPUT: content of type ContentRecord
  OUTPUT: boolean
  
  RETURN (content.primary_genre IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM movies/tv_series 
           WHERE primary_genre = content.primary_genre 
           AND slug != content.slug
         ))
         AND similarContent.length = 0
END FUNCTION
```

#### أمثلة

- **مثال 1**: فيلم بـ primary_genre = "action" → يعرض أفلام أكشن مشابهة ✅
- **مثال 2**: فيلم بـ primary_genre = NULL → لا يعرض أي محتوى ❌
- **مثال 3**: فيلم بـ primary_genre = "documentary" (نادر) → لا يعرض أي محتوى ❌
- **مثال 4**: بعد الإصلاح: يعرض محتوى شائع كبديل ✅

---

## السلوك المتوقع

### السلوك الصحيح للمشكلة 1: Pagination

**متطلبات الحفظ (Preservation Requirements):**

**السلوكيات التي يجب أن تبقى كما هي:**
- القيمة الافتراضية (20 عنصر) عند عدم تحديد limit
- حساب offset الصحيح: `(page - 1) * limit`
- رفض القيم السالبة أو الصفرية
- الحد الأقصى المطلق عند 100 لحماية الأداء

**النطاق:**
جميع الطلبات التي لا تحدد limit أو تحدد limit <= 40 يجب أن تعمل بنفس الطريقة تماماً.


### السلوك الصحيح للمشكلة 2: ترتيب الممثلين

**متطلبات الحفظ (Preservation Requirements):**

**السلوكيات التي يجب أن تبقى كما هي:**
- الممثلون بـ cast_order صحيح (0, 1, 2, ...) يظهرون بنفس الترتيب
- الحد الأقصى 20 ممثل افتراضياً
- استبعاد الممثلين غير المنشورين (is_published = FALSE)
- إرجاع 404 عند عدم وجود المحتوى

**النطاق:**
جميع الممثلين الذين لديهم cast_order صحيح (غير NULL) يجب أن يظهروا بنفس الترتيب الحالي.

### السلوك الصحيح للمشكلة 3: قسم "You may also like"

**متطلبات الحفظ (Preservation Requirements):**

**السلوكيات التي يجب أن تبقى كما هي:**
- استبعاد المحتوى الحالي من النتائج (`WHERE slug != $1`)
- ترتيب النتائج حسب `popularity DESC`
- إرجاع 10 عناصر افتراضياً
- إرجاع 404 عند عدم وجود المحتوى الأصلي

**النطاق:**
جميع الطلبات للمحتوى الذي لديه primary_genre صحيح ومحتوى مشابه متوفر يجب أن تعمل بنفس الطريقة.

---

## تحليل السبب الجذري (Hypothesized Root Cause)

### المشكلة 1: حد Pagination منخفض

بناءً على وصف المشكلة، الأسباب المحتملة هي:

1. **حد ثابت في الكود**: الملف `src/hooks/useUnifiedContent.ts` يحدد `limit = 40` كقيمة افتراضية
   - السطر: `limit = 40` في تعريف الـ hook
   - لا يوجد تحقق من القيمة القصوى

2. **حد في الـ backend**: الملف `server/routes/content.js` قد يحتوي على `Math.min(parseInt(req.query.limit) || 20, 100)`
   - لكن الـ frontend يمرر 40 دائماً
   - الـ backend يقبل حتى 100 لكن الـ frontend لا يستخدمها

3. **عدم تمرير limit من الـ UI**: مكونات الـ UI لا تمرر limit أكبر من 40
   - الصفحات الرئيسية تستخدم القيمة الافتراضية فقط

4. **عدم وجود pagination controls**: لا توجد أزرار "عرض المزيد" أو "تحميل المزيد"

### المشكلة 2: ترتيب الممثلين غير صحيح

بناءً على وصف المشكلة، الأسباب المحتملة هي:

1. **قيم NULL من TMDB**: عند سحب البيانات من TMDB، قد تكون `cast_order` مفقودة
   - السكريبتات تدرج `person.order || 0` لكن قد يكون `person.order` undefined
   - يجب استخدام `person.order ?? 999` بدلاً من `person.order || 0`

2. **ترتيب SQL غير صحيح**: الاستعلام `ORDER BY mc.cast_order ASC` لا يعالج NULL
   - في CockroachDB، NULL قد يظهر أولاً أو أخيراً حسب الإعدادات
   - يجب استخدام `ORDER BY COALESCE(mc.cast_order, 999) ASC`

3. **عدم التحقق من البيانات**: السكريبتات لا تتحقق من صحة cast_order قبل الإدراج
   - يجب إضافة validation في السكريبتات

4. **بيانات قديمة**: قد تكون هناك بيانات قديمة في قاعدة البيانات بـ cast_order = NULL
   - يحتاج إلى migration script لتحديث البيانات القديمة


### المشكلة 3: قسم "You may also like" فارغ

بناءً على وصف المشكلة، الأسباب المحتملة هي:

1. **primary_genre فارغ**: بعض المحتوى لا يحتوي على primary_genre
   - السكريبتات قد لا تحدد primary_genre بشكل صحيح
   - يجب إضافة fallback logic في الـ endpoint

2. **لا يوجد محتوى مشابه**: بعض التصنيفات نادرة (مثل Documentary)
   - الاستعلام يعيد مصفوفة فارغة
   - يجب إضافة fallback لعرض محتوى شائع

3. **الـ endpoint غير مستدعى**: الـ frontend قد لا يستدعي `/api/movies/:slug/similar`
   - يجب التحقق من `src/pages/media/Watch.tsx`
   - يجب إضافة useEffect لجلب المحتوى المشابه

4. **الـ endpoint غير موجود**: قد لا يكون الـ endpoint موجوداً في `server/routes/content.js`
   - يجب إضافة `/api/movies/:slug/similar` و `/api/tv/:slug/similar`

---

## الخصائص الصحيحة (Correctness Properties)

Property 1: Bug Condition - Pagination يقبل حتى 100 عنصر

_For any_ طلب HTTP حيث يحدد المستخدم `limit` بين 41 و 100، يجب أن يعيد النظام العدد المطلوب من العناصر (وليس 40 فقط).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - ترتيب الممثلين صحيح مع NULL

_For any_ استعلام لجلب الممثلين حيث يوجد ممثلون بـ `cast_order = NULL`، يجب أن يظهر الممثلون الرئيسيون (cast_order = 0, 1, 2) أولاً، والممثلون بـ NULL في النهاية.

**Validates: Requirements 2.5, 2.6, 2.8**

Property 3: Bug Condition - قسم "You may also like" يعرض محتوى

_For any_ طلب لجلب محتوى مشابه حيث `primary_genre` موجود أو NULL، يجب أن يعيد النظام على الأقل 10 عناصر (إما بنفس التصنيف أو محتوى شائع كبديل).

**Validates: Requirements 2.9, 2.10, 2.11**

Property 4: Preservation - القيمة الافتراضية للـ pagination

_For any_ طلب HTTP حيث لا يحدد المستخدم `limit`، يجب أن يعيد النظام 20 عنصر (القيمة الافتراضية)، محافظاً على السلوك الحالي.

**Validates: Requirements 3.1**

Property 5: Preservation - ترتيب الممثلين الحاليين

_For any_ استعلام لجلب الممثلين حيث جميع الممثلين لديهم `cast_order` صحيح (غير NULL)، يجب أن يظهروا بنفس الترتيب الحالي تماماً.

**Validates: Requirements 3.4**

Property 6: Preservation - استبعاد المحتوى الحالي من Similar

_For any_ طلب لجلب محتوى مشابه، يجب أن يستبعد النظام المحتوى الحالي من النتائج (`WHERE slug != $1`)، محافظاً على السلوك الحالي.

**Validates: Requirements 3.7**

---

## خطة التنفيذ (Fix Implementation)

بافتراض أن تحليل السبب الجذري صحيح:

### التغييرات المطلوبة

#### 1. إصلاح حد Pagination (ملف: `src/hooks/useUnifiedContent.ts`)

**التغيير المحدد:**
```typescript
// قبل:
limit = 40

// بعد:
limit = 100
```

**التفاصيل:**
- تغيير القيمة الافتراضية من 40 إلى 100
- الـ backend يدعم بالفعل حتى 100 (`Math.min(parseInt(req.query.limit) || 20, 100)`)
- لا حاجة لتغيير الـ backend


#### 2. إصلاح ترتيب الممثلين (ملف: `server/routes/content.js`)

**التغيير المحدد:**
```sql
-- قبل:
ORDER BY mc.cast_order ASC

-- بعد:
ORDER BY COALESCE(mc.cast_order, 999) ASC
```

**التفاصيل:**
- تطبيق على 4 endpoints:
  1. `/api/movies/:slug/cast` (السطر ~262)
  2. `/api/tv/:slug/cast` (السطر ~542)
  3. `/api/actors/:slug/works` - movies (السطر ~945)
  4. `/api/actors/:slug/works` - tv (السطر ~966)
- استخدام COALESCE لمعالجة NULL
- القيمة 999 تضمن ظهور NULL في النهاية

#### 3. إصلاح السكريبتات (ملفات: `scripts/ingestion/*.js`)

**التغيير المحدد:**
```javascript
// قبل:
person.order || 0

// بعد:
person.order ?? 999
```

**التفاصيل:**
- تطبيق على 4 سكريبتات:
  1. `scripts/ingestion/02_seed_movies_arabic.js` (السطر ~500)
  2. `scripts/ingestion/03_seed_movies_foreign.js` (السطر ~490)
  3. `scripts/ingestion/04_seed_tv_series.js` (السطر ~473)
  4. `scripts/ingestion/05_seed_anime.js` (السطر ~470)
- استخدام nullish coalescing operator (??) بدلاً من logical OR (||)
- القيمة 999 للممثلين بدون ترتيب

#### 4. إضافة migration script (ملف جديد: `scripts/fix-cast-order-nulls.js`)

**الهدف:**
- تحديث البيانات القديمة في قاعدة البيانات
- تحويل cast_order = NULL إلى 999

**الكود:**
```javascript
// تحديث movie_cast
UPDATE movie_cast 
SET cast_order = 999 
WHERE cast_order IS NULL;

// تحديث tv_cast
UPDATE tv_cast 
SET cast_order = 999 
WHERE cast_order IS NULL;
```

#### 5. إصلاح قسم "You may also like" (ملف: `server/routes/content.js`)

**التغيير المحدد:**
```javascript
// إضافة fallback logic في /api/movies/:slug/similar
if (result.rows.length === 0) {
  // Fallback: get popular movies
  const fallbackQuery = `
    SELECT id, slug, title, poster_url, vote_average, release_date
    FROM movies
    WHERE slug != $1 AND is_published = TRUE
    ORDER BY popularity DESC
    LIMIT $2
  `;
  const fallbackResult = await pool.query(fallbackQuery, [slug, limit]);
  return res.json({ data: fallbackResult.rows });
}
```

**التفاصيل:**
- تطبيق على 2 endpoints:
  1. `/api/movies/:slug/similar` (السطر ~290)
  2. `/api/tv/:slug/similar` (السطر ~320)
- إذا لم يوجد محتوى بنفس primary_genre، عرض محتوى شائع
- الحفاظ على استبعاد المحتوى الحالي

#### 6. التحقق من استدعاء الـ endpoint (ملف: `src/pages/media/Watch.tsx`)

**التحقق:**
- الكود الحالي يستدعي `/api/movies/:slug/similar` بالفعل (السطر ~700+)
- لا حاجة لتغيير

---

## استراتيجية الاختبار (Testing Strategy)

### نهج التحقق

استراتيجية الاختبار تتبع نهج ثنائي المراحل: أولاً، إظهار الأمثلة المضادة التي توضح المشاكل على الكود غير المصلح، ثم التحقق من أن الإصلاح يعمل بشكل صحيح ويحافظ على السلوك الحالي.


### الاختبار الاستكشافي لشرط المشكلة (Exploratory Bug Condition Checking)

**الهدف**: إظهار الأمثلة المضادة التي توضح المشاكل قبل تنفيذ الإصلاح. تأكيد أو دحض تحليل السبب الجذري. إذا دحضنا، سنحتاج إلى إعادة الافتراض.

**خطة الاختبار**: كتابة اختبارات تحاكي السيناريوهات المختلفة وتؤكد السلوك المتوقع. تشغيل هذه الاختبارات على الكود غير المصلح لمراقبة الفشل وفهم السبب الجذري.

**حالات الاختبار**:

1. **اختبار Pagination - طلب 60 عنصر**: محاكاة طلب `?limit=60` والتحقق من أن النظام يعيد 40 عنصر فقط (سيفشل على الكود غير المصلح)
2. **اختبار Pagination - طلب 100 عنصر**: محاكاة طلب `?limit=100` والتحقق من أن النظام يعيد 40 عنصر فقط (سيفشل على الكود غير المصلح)
3. **اختبار ترتيب الممثلين - NULL في البداية**: محاكاة استعلام cast حيث يوجد ممثل بـ cast_order = NULL والتحقق من أنه يظهر قبل الممثلين الرئيسيين (سيفشل على الكود غير المصلح)
4. **اختبار Similar Content - primary_genre NULL**: محاكاة طلب similar content لمحتوى بـ primary_genre = NULL والتحقق من أن النتيجة فارغة (سيفشل على الكود غير المصلح)
5. **اختبار Similar Content - تصنيف نادر**: محاكاة طلب similar content لمحتوى بـ primary_genre نادر والتحقق من أن النتيجة فارغة (سيفشل على الكود غير المصلح)

**الأمثلة المضادة المتوقعة**:
- Pagination: النظام يعيد 40 عنصر بدلاً من 60 أو 100
- Cast Order: الممثلون بـ NULL يظهرون قبل الممثلين الرئيسيين
- Similar Content: النتيجة فارغة عندما primary_genre = NULL أو نادر
- الأسباب المحتملة: حد ثابت في الكود، ترتيب SQL غير صحيح، عدم وجود fallback logic

### اختبار الإصلاح (Fix Checking)

**الهدف**: التحقق من أنه لجميع المدخلات حيث يحدث شرط المشكلة، الدالة المصلحة تنتج السلوك المتوقع.

**الكود الزائف:**
```
FOR ALL request WHERE isBugCondition_Pagination(request) DO
  result := handleRequest_fixed(request)
  ASSERT result.items.length = request.query.limit
END FOR

FOR ALL castQuery WHERE isBugCondition_CastOrder(castQuery) DO
  result := getCast_fixed(castQuery)
  ASSERT result[0].cast_order <= result[1].cast_order
  ASSERT all NULL cast_order appear at end
END FOR

FOR ALL content WHERE isBugCondition_SimilarContent(content) DO
  result := getSimilar_fixed(content)
  ASSERT result.length >= 10
END FOR
```

### اختبار الحفاظ (Preservation Checking)

**الهدف**: التحقق من أنه لجميع المدخلات حيث لا يحدث شرط المشكلة، الدالة المصلحة تنتج نفس النتيجة كالدالة الأصلية.

**الكود الزائف:**
```
FOR ALL request WHERE NOT isBugCondition_Pagination(request) DO
  ASSERT handleRequest_original(request) = handleRequest_fixed(request)
END FOR

FOR ALL castQuery WHERE NOT isBugCondition_CastOrder(castQuery) DO
  ASSERT getCast_original(castQuery) = getCast_fixed(castQuery)
END FOR

FOR ALL content WHERE NOT isBugCondition_SimilarContent(content) DO
  ASSERT getSimilar_original(content) = getSimilar_fixed(content)
END FOR
```

**نهج الاختبار**: يُوصى باختبار قائم على الخصائص (Property-based testing) لاختبار الحفاظ لأنه:
- يولد العديد من حالات الاختبار تلقائياً عبر نطاق المدخلات
- يلتقط الحالات الحدية التي قد تفوتها اختبارات الوحدة اليدوية
- يوفر ضمانات قوية بأن السلوك لم يتغير لجميع المدخلات غير المشكلة

**خطة الاختبار**: مراقبة السلوك على الكود غير المصلح أولاً للمدخلات غير المشكلة، ثم كتابة اختبارات قائمة على الخصائص تلتقط هذا السلوك.

**حالات الاختبار**:

1. **Pagination - القيمة الافتراضية**: التحقق من أن الطلبات بدون limit تعيد 20 عنصر
2. **Pagination - limit <= 40**: التحقق من أن الطلبات بـ limit <= 40 تعمل بنفس الطريقة
3. **Cast Order - جميع cast_order صحيح**: التحقق من أن الترتيب لم يتغير
4. **Similar Content - primary_genre موجود**: التحقق من أن النتائج لم تتغير


### اختبارات الوحدة (Unit Tests)

**المشكلة 1: Pagination**
- اختبار طلب بـ limit = 60 → يجب أن يعيد 60 عنصر
- اختبار طلب بـ limit = 100 → يجب أن يعيد 100 عنصر
- اختبار طلب بـ limit = 150 → يجب أن يعيد 100 عنصر (الحد الأقصى)
- اختبار طلب بدون limit → يجب أن يعيد 20 عنصر (افتراضي)
- اختبار طلب بـ limit = 0 → يجب أن يرفض أو يستخدم الافتراضي
- اختبار طلب بـ limit سالب → يجب أن يرفض أو يستخدم الافتراضي

**المشكلة 2: Cast Order**
- اختبار فيلم بممثلين cast_order = [0, 1, 2, NULL, NULL] → الترتيب: [0, 1, 2, 999, 999]
- اختبار فيلم بممثلين cast_order = [NULL, 0, NULL, 1] → الترتيب: [0, 1, 999, 999]
- اختبار فيلم بجميع الممثلين cast_order صحيح → نفس الترتيب الحالي
- اختبار فيلم بجميع الممثلين cast_order = NULL → جميعهم 999
- اختبار مسلسل بنفس السيناريوهات

**المشكلة 3: Similar Content**
- اختبار فيلم بـ primary_genre = "action" → يعيد أفلام أكشن
- اختبار فيلم بـ primary_genre = NULL → يعيد محتوى شائع
- اختبار فيلم بـ primary_genre نادر → يعيد محتوى شائع
- اختبار مسلسل بنفس السيناريوهات
- اختبار أن المحتوى الحالي مستبعد من النتائج

### اختبارات قائمة على الخصائص (Property-Based Tests)

**المشكلة 1: Pagination**
- توليد طلبات عشوائية بـ limit بين 1 و 150 والتحقق من أن النتيجة <= min(limit, 100)
- توليد طلبات عشوائية بـ page و limit والتحقق من أن offset = (page - 1) * limit
- توليد طلبات عشوائية بدون limit والتحقق من أن النتيجة = 20

**المشكلة 2: Cast Order**
- توليد قوائم عشوائية من الممثلين بـ cast_order مختلط (صحيح و NULL) والتحقق من أن الترتيب صحيح
- توليد قوائم عشوائية من الممثلين بـ cast_order صحيح فقط والتحقق من أن الترتيب لم يتغير
- توليد قوائم عشوائية من الممثلين بـ cast_order = NULL فقط والتحقق من أن جميعهم 999

**المشكلة 3: Similar Content**
- توليد محتوى عشوائي بـ primary_genre مختلف والتحقق من أن النتيجة >= 10
- توليد محتوى عشوائي بـ primary_genre = NULL والتحقق من أن النتيجة >= 10
- توليد محتوى عشوائي والتحقق من أن المحتوى الحالي مستبعد

### اختبارات التكامل (Integration Tests)

**المشكلة 1: Pagination**
- اختبار تدفق كامل: فتح الصفحة الرئيسية → التحقق من عرض 100 عنصر
- اختبار تدفق كامل: فتح صفحة تصنيف → التحقق من عرض 100 عنصر
- اختبار تدفق كامل: التنقل بين الصفحات → التحقق من offset الصحيح

**المشكلة 2: Cast Order**
- اختبار تدفق كامل: فتح صفحة فيلم → التحقق من ترتيب الممثلين
- اختبار تدفق كامل: فتح صفحة مسلسل → التحقق من ترتيب الممثلين
- اختبار تدفق كامل: فتح صفحة ممثل → التحقق من ترتيب الأعمال

**المشكلة 3: Similar Content**
- اختبار تدفق كامل: فتح صفحة مشاهدة فيلم → التحقق من عرض قسم "You may also like"
- اختبار تدفق كامل: فتح صفحة مشاهدة مسلسل → التحقق من عرض قسم "You may also like"
- اختبار تدفق كامل: النقر على محتوى مشابه → التحقق من الانتقال الصحيح

---

## ملخص التغييرات

### الملفات المتأثرة

1. **src/hooks/useUnifiedContent.ts**
   - تغيير `limit = 40` إلى `limit = 100`
   - سطر واحد فقط

2. **server/routes/content.js**
   - تغيير `ORDER BY mc.cast_order ASC` إلى `ORDER BY COALESCE(mc.cast_order, 999) ASC`
   - 4 مواضع (movies cast, tv cast, actor works movies, actor works tv)
   - إضافة fallback logic في similar endpoints
   - 2 مواضع (movies similar, tv similar)

3. **scripts/ingestion/02_seed_movies_arabic.js**
   - تغيير `person.order || 0` إلى `person.order ?? 999`
   - موضع واحد

4. **scripts/ingestion/03_seed_movies_foreign.js**
   - تغيير `person.order || 0` إلى `person.order ?? 999`
   - موضع واحد

5. **scripts/ingestion/04_seed_tv_series.js**
   - تغيير `person.order || 0` إلى `person.order ?? 999`
   - موضع واحد

6. **scripts/ingestion/05_seed_anime.js**
   - تغيير `person.order || 0` إلى `person.order ?? 999`
   - موضع واحد

7. **scripts/fix-cast-order-nulls.js** (جديد)
   - سكريبت migration لتحديث البيانات القديمة
   - تحويل cast_order = NULL إلى 999

### الأولويات

1. **عالية**: إصلاح ترتيب الممثلين (يؤثر على تجربة المستخدم بشكل كبير)
2. **عالية**: إصلاح قسم "You may also like" (يؤثر على engagement)
3. **متوسطة**: إصلاح حد Pagination (يحسن تجربة التصفح)

### المخاطر

1. **تغيير limit إلى 100**: قد يؤثر على الأداء إذا كانت الاستعلامات بطيئة
   - **التخفيف**: الـ backend يدعم بالفعل 100، والاستعلامات محسّنة
   
2. **تغيير cast_order logic**: قد يؤثر على الترتيب الحالي
   - **التخفيف**: اختبارات الحفاظ تضمن عدم تغيير الترتيب للممثلين بـ cast_order صحيح

3. **إضافة fallback logic**: قد يعرض محتوى غير ذي صلة
   - **التخفيف**: الـ fallback يعرض محتوى شائع فقط، وهو أفضل من عدم عرض أي شيء

---

## الخطوات التالية

1. **مراجعة المستند**: التأكد من أن جميع المشاكل مغطاة
2. **تنفيذ الإصلاحات**: تطبيق التغييرات المحددة
3. **كتابة الاختبارات**: اختبارات الوحدة والتكامل
4. **تشغيل migration script**: تحديث البيانات القديمة
5. **اختبار يدوي**: التحقق من أن كل شيء يعمل
6. **نشر الإصلاحات**: deploy إلى production

---

**تاريخ الإنشاء**: 2026-04-12  
**الحالة**: مسودة - في انتظار المراجعة والموافقة
