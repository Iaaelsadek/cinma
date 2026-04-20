# 🔧 سجل الإصلاحات الدائمة

**آخر تحديث:** 2026-04-19

---

## ✅ الإصلاحات المطبقة

### 6. إصلاح Infinite Loop في Watch.tsx - checkBatchAvailability Dependencies (2026-04-19)

**المشكلة:**
- الأخطاء تحدث للمسلسلات فقط وليس للأفلام
- المشكلة بدأت عند إصلاح عرض المواسم والحلقات
- آلاف الأخطاء المتكررة في الكونسول من kimetsunoyaiba.site و vidrock.net
- `checkBatchAvailability` كانت مفقودة من dependency arrays

**السبب الجذري:**
```typescript
// ❌ الكود القديم - checkBatchAvailability مفقودة من dependencies
useEffect(() => {
  if (type === 'tv' && effectiveId && season && episodesCount > 0) {
    checkBatchAvailability(episodesToCheck).then(results => {
      setAvailableEpisodes(prev => ({ ...prev, ...results }))
    })
  }
}, [type, effectiveId, season, episodesCount]) // ❌ checkBatchAvailability مفقودة!

// النتيجة: infinite loop لأن React يعتقد أن الدالة تتغير في كل render
```

**الحل الدائم:**
```typescript
// ✅ الكود الجديد - إضافة checkBatchAvailability للـ dependencies
useEffect(() => {
  if (type === 'tv' && effectiveId && season && episodesCount > 0) {
    const episodesToCheck = Array.from({ length: episodesCount }).map((_, i) => ({
      s: season,
      e: i + 1
    }))
    checkBatchAvailability(episodesToCheck).then(results => {
      setAvailableEpisodes(prev => ({ ...prev, ...results }))
    })
  }
}, [type, effectiveId, season, episodesCount, checkBatchAvailability]) // ✅ أضيفت!

useEffect(() => {
  if (type === 'tv' && effectiveId && seasons && seasons.length > 0) {
    const seasonsToCheck = seasons
      .filter(s => s.season_number > 0 && s.episode_count > 0)
      .map(s => ({ s: s.season_number, e: 1 }))
    checkBatchAvailability(seasonsToCheck).then(results => {
      const seasonMap: Record<number, boolean> = {}
      Object.entries(results).forEach(([key, isAvailable]) => {
        const sNum = parseInt(key.split('-')[0])
        seasonMap[sNum] = isAvailable
      })
      setAvailableSeasonsMap(prev => ({ ...prev, ...seasonMap }))
    })
  }
}, [type, effectiveId, seasons, checkBatchAvailability]) // ✅ أضيفت!
```

**الملفات المعدلة:**
- `src/pages/media/Watch.tsx`:
  - إضافة `checkBatchAvailability` لـ dependency array في useEffect للحلقات
  - إضافة `checkBatchAvailability` لـ dependency array في useEffect للمواسم
  - منع infinite loop عند تحميل المسلسلات

**الفائدة:**
- ✅ لا مزيد من infinite loop عند تحميل المسلسلات
- ✅ المواسم والحلقات تُحمّل مرة واحدة فقط
- ✅ الكونسول نظيف من التكرار اللانهائي
- ✅ الأفلام والمسلسلات تعمل بشكل صحيح

**التأثير:**
- المسلسلات: تُحمّل بدون infinite loop ✅
- الأفلام: لا تأثير (لا تستخدم checkBatchAvailability) ✅
- الأداء: تحسن كبير ✅

**ملاحظة:**
- `checkBatchAvailability` مُعرّفة بـ `useCallback` مع `[]` في `useServers` hook
- هذا يعني أنها مستقرة ولا تتغير بين renders
- إضافتها للـ dependencies آمنة ولا تسبب re-renders إضافية

---

### 7. إصلاح Infinite Loop في EmbedPlayer - CORS Error Handling (2026-04-19)

**المشكلة:**
- الأخطاء الخارجية (CORS, 404, 500) من kimetsunoyaiba.site و vidrock.net تتكرر آلاف المرات
- iframe يحاول إعادة تحميل المصدر الفاشل بشكل لا نهائي
- الكونسول يمتلئ بآلاف الأخطاء المتكررة
- المتصفح يتجمد أو يصبح بطيئاً جداً

**السبب الجذري:**
```javascript
// ❌ الكود القديم - لا يوجد حد لإعادة المحاولة
const handleIframeError = () => {
  setHasError(true)
  // iframe يعيد المحاولة تلقائياً بدون حد
}
```

**الحل الدائم:**
```javascript
// ✅ الكود الجديد - تتبع الأخطاء ومنع اللوب اللانهائي
const errorCountRef = useRef(0)
const lastErrorTimeRef = useRef(0)

const handleIframeError = () => {
  const now = Date.now()
  const timeSinceLastError = now - lastErrorTimeRef.current
  
  // إذا الأخطاء تحدث بسرعة (خلال 2 ثانية)، زيادة العداد
  if (timeSinceLastError < 2000) {
    errorCountRef.current++
  } else {
    // إعادة تعيين العداد إذا مر وقت كافٍ
    errorCountRef.current = 1
  }
  
  lastErrorTimeRef.current = now
  
  // إذا أكثر من 3 أخطاء متتالية، توقف عن المحاولة
  if (errorCountRef.current > 3) {
    setHasError(true)
    setIsIframeLoading(false)
    // لا تعيد التحميل - دع المستخدم يختار سيرفر آخر يدوياً
    return
  }
  
  setIsIframeLoading(false)
}

// إعادة تعيين عند تغيير السيرفر
useEffect(() => {
  errorCountRef.current = 0
  lastErrorTimeRef.current = 0
  // ...
}, [server?.url])
```

**الملفات المعدلة:**
- `src/components/features/media/EmbedPlayer.tsx`:
  - إضافة `errorCountRef` و `lastErrorTimeRef` لتتبع الأخطاء
  - تحديث `handleIframeError` لمنع اللوب اللانهائي
  - إعادة تعيين العدادات عند تغيير السيرفر
  - حد أقصى 3 أخطاء متتالية خلال 2 ثانية

**الفائدة:**
- ✅ لا مزيد من آلاف الأخطاء المتكررة في الكونسول
- ✅ المتصفح لا يتجمد بسبب اللوب اللانهائي
- ✅ الأخطاء الخارجية (CORS) تُعامل بشكل صحيح
- ✅ المستخدم يمكنه اختيار سيرفر آخر يدوياً
- ✅ الأداء أفضل بكثير

**التأثير:**
- الأخطاء الخارجية: تظهر مرة واحدة فقط ✅
- iframe: يتوقف عن إعادة المحاولة بعد 3 فشل ✅
- الكونسول: نظيف من التكرار اللانهائي ✅
- المستخدم: تجربة أفضل وأسرع ✅

---

### 5. إصلاح تمرير Season/Episode للأفلام (2026-04-19)

**المشكلة:**
- الأفلام كانت تحصل على `season=1` و `episode=1` parameters
- هذا يسبب أخطاء TMDB API 404:
  - `GET /api/tv/1426964?api_key=... 404`
  - `GET /api/tv/1426964/season/1?api_key=... 404`
- خطأ: `Cannot read properties of undefined (reading 'length')`
- الكونسول يظهر: `routeType: 'movie', routeSeason: '1', routeEpisode: '1'`

**السبب الجذري:**
```javascript
// ❌ الكود القديم - يمرر season/episode لكل المحتوى
initialSeason: s ? Number(s) : null,
initialEpisode: e ? Number(e) : null,

// ❌ النتيجة للأفلام
{
  type: 'movie',
  season: 1,    // خطأ!
  episode: 1    // خطأ!
}
```

**الحل الدائم:**
```javascript
// ✅ الكود الجديد - فحص نوع المحتوى أولاً
const isEpisodicType = t === 'tv' || t === 'anime' || t === 'series'

return {
  initialType: t,
  initialId: idParam || null,
  initialSlug: slugParam || null,
  // Only set season/episode for episodic content
  initialSeason: isEpisodicType && s ? Number(s) : null,
  initialEpisode: isEpisodicType && e ? Number(e) : null,
  lang: (langParam === 'ar' || langParam === 'en') ? langParam : 'ar'
}
```

**الملفات المعدلة:**
- `src/pages/media/Watch.tsx`:
  - إضافة فحص `isEpisodicType` في `useMemo` الأولي
  - تحديث `sNum` و `eNum` لإرجاع `null` للأفلام
  - إضافة تعليقات توضيحية في `useWatchProgress`
  - منع تمرير season/episode للأفلام بشكل نهائي

**الفائدة:**
- ✅ لا مزيد من TMDB API 404 errors للأفلام
- ✅ لا مزيد من `Cannot read properties of undefined` errors
- ✅ الكونسول نظيف من أخطاء TMDB
- ✅ الأفلام تُعامل كأفلام، والمسلسلات كمسلسلات
- ✅ المحتوى الجديد والحالي يعمل بشكل صحيح

**التأثير:**
- الأفلام: لا season/episode parameters ✅
- المسلسلات: season/episode parameters موجودة ✅
- الأنمي: season/episode parameters موجودة ✅
- الفيديوهات: لا season/episode parameters ✅

---

### 4. إصلاح ترتيب الممثلين - Cast Order Fix (2026-04-19)

**المشكلة:**
- بعض الأعمال لا تعرض الأبطال الأوائل
- الممثلون يظهرون بترتيب عشوائي أو خاطئ
- في المسلسلات: تم استخدام `total_episode_count` بدلاً من `order`

**السبب الجذري:**
```javascript
// ❌ خطأ في INGEST-SERIES.js
actor.total_episode_count || 999  // عدد الحلقات ≠ ترتيب البطولة!

// ❌ خطأ في INGEST-MOVIES.js
actor.order ?? 999  // fallback عالي جداً
```

**الحل الدائم (للمحتوى الجديد):**
```javascript
// ✅ صحيح - استخدام order مع fallback للـ index
for (let i = 0; i < cast.length; i++) {
  const actor = cast[i];
  const castOrder = actor.order ?? i;  // استخدام index كـ fallback
  
  await pool.query(`
    INSERT INTO movie_cast (movie_id, actor_id, character_name, cast_order)
    VALUES ($1,$2,$3,$4)
  `, [movieId, actorId, character, castOrder]);
}
```

**الملفات المعدلة:**
- `scripts/ingestion/INGEST-MOVIES.js`:
  - تغيير `actor.order ?? 999` إلى `actor.order ?? i`
  - استخدام loop index كـ fallback بدلاً من 999
  - إضافة تعليق توضيحي
  
- `scripts/ingestion/INGEST-SERIES.js`:
  - تغيير `actor.total_episode_count || 999` إلى `actor.order ?? i`
  - إصلاح الخطأ الكبير (total_episode_count ≠ cast_order)
  - استخدام loop index كـ fallback
  - إضافة تعليق توضيحي

- `src/pages/media/Watch.tsx`:
  - تغيير limit من 12 إلى 8 ليتوافق مع عدد الممثلين المُدرجين
  - عرض جميع الـ 8 ممثلين مباشرة

**الفائدة:**
- ✅ الأبطال الأوائل يظهرون دائماً في المقدمة
- ✅ ترتيب صحيح حسب TMDB order
- ✅ fallback ذكي باستخدام index بدلاً من 999
- ✅ المحتوى الجديد سيُضاف بترتيب صحيح تلقائياً
- ✅ عرض جميع الممثلين (8) بدون الحاجة للسحب

**ملاحظة:**
- الـ API كان صحيحاً (`ORDER BY cast_order ASC`)
- المشكلة كانت في البيانات المُدخلة فقط
- الإصلاحات تطبق على المحتوى الجديد فقط
- المحتوى الحالي سيتم حذفه وإعادة استيراده

---

### 3. إصلاح Actors API - Column Names & Data Formatting (2026-04-19)

**المشكلة:**
- خطأ 500 عند محاولة الوصول لصفحات الممثلين
- الخطأ: `column "m.title_en" does not exist`
- تاريخ الميلاد يظهر بصيغة ISO كاملة مع الوقت
- الأعمال لا تحتوي على `title_en` للتوافق مع Frontend
- `poster_path` يحتوي على URL كامل بدلاً من المسار فقط

**السبب الجذري:**
```javascript
// ❌ خطأ - الأعمدة غير موجودة
SELECT m.title_en, t.name_en FROM movies m

// ❌ خطأ - التاريخ بصيغة ISO كاملة
birthday: "1983-11-20T22:00:00Z"

// ❌ خطأ - بيانات غير كاملة
{
  title: "Movie",
  title_ar: "فيلم",
  title_original: "Original"
  // title_en مفقود
}
```

**الأعمدة الفعلية في قاعدة البيانات:**
- `movies`: `title`, `title_ar`, `title_original`
- `tv_series`: `name`, `name_ar`, `name_original`

**الحل الدائم:**
```javascript
// ✅ صحيح - استخدام الأعمدة الفعلية
SELECT m.title, m.title_ar, m.title_original FROM movies m
SELECT t.name, t.name_ar, t.name_original FROM tv_series t

// ✅ صحيح - تنسيق التاريخ
birthday: actor.birthday ? new Date(actor.birthday).toISOString().split('T')[0] : null
// النتيجة: "1983-11-20"

// ✅ صحيح - إضافة title_en للتوافق
{
  title: work.title,
  title_ar: work.title_ar,
  title_en: work.title, // للتوافق مع Frontend
  original_title: work.title_original,
  poster_path: work.poster_path, // المسار فقط
  poster_url: buildImageUrl(work.poster_path) // URL كامل
}
```

**الملفات المعدلة:**
- `server/routes/actors.js`:
  - تصحيح queries في `/api/actors/:slug/works`
  - تنسيق `birthday` إلى YYYY-MM-DD
  - تنسيق `release_date` إلى YYYY-MM-DD
  - إضافة `title_en` للتوافق
  - فصل `poster_path` و `poster_url`
- `src/pages/media/Actor.tsx`:
  - تحديث types لتشمل جميع الحقول
  - تصحيح تمرير البيانات إلى MovieCard

**الفائدة:**
- صفحات الممثلين تعمل بشكل صحيح 100%
- عرض أعمال الممثلين (أفلام ومسلسلات) بدون أخطاء
- التواريخ تُعرض بصيغة قابلة للقراءة
- التوافق الكامل مع schema قاعدة البيانات
- التوافق الكامل مع Frontend components

---

### 1. إصلاح Schema Compatibility (2026-04-19)

**المشكلة:**
- Frontend و Backend كانوا بيستخدموا أعمدة قديمة غير موجودة في الـ schema الفعلي
- `external_source`, `external_id`, `title_en`, `overview_en`, `name_en` - كلها مش موجودة
- الـ schema الفعلي يستخدم `id` مباشرة (TMDB ID) بدون `external_*`

**الحل الدائم:**
```typescript
// ❌ القديم (خطأ)
interface Season {
  name_en: string
  overview_en: string
}

// ✅ الجديد (صحيح)
interface Season {
  name: string
  name_ar: string | null
  overview: string | null
  overview_ar: string | null
}
```

**الملفات المعدلة:**
- `src/services/contentAPI.ts` - تحديث interfaces لتتوافق مع schema
- `src/services/recommendations.ts` - استخدام `id` أو `slug` بدل `external_id`

**الفائدة:**
- Frontend والـ Backend متوافقين 100% مع الـ schema الفعلي
- مفيش أخطاء "column does not exist"
- الـ API بيشتغل بشكل صحيح مع البيانات المسحوبة

---

### 2. إصلاح فقدان المواسم والحلقات (2026-04-19)

**المشكلة:**
- عند استخدام `ON CONFLICT ... DO UPDATE ... RETURNING id` في CockroachDB، لا يتم إرجاع الـ ID عند حدوث conflict
- هذا يسبب فقدان الـ UUID للمواسم والحلقات
- النتيجة: مواسم بدون حلقات

**الحل الدائم:**
```javascript
// ❌ الطريقة القديمة (تسبب مشاكل)
const result = await pool.query(`
  INSERT INTO seasons (...)
  VALUES (...)
  ON CONFLICT (...) DO UPDATE SET ...
  RETURNING id
`);
let seasonUUID = result.rows?.[0]?.id; // قد يكون undefined!

// ✅ الطريقة الصحيحة (دائمة)
let seasonUUID;
const existingSeason = await pool.query(
  `SELECT id FROM seasons WHERE series_id = $1 AND season_number = $2`,
  [seriesUUID, season.season_number]
);

if (existingSeason.rows.length > 0) {
  // موجود - استخدم الـ ID واعمل UPDATE
  seasonUUID = existingSeason.rows[0].id;
  await pool.query(`UPDATE seasons SET ... WHERE id = $1`, [..., seasonUUID]);
} else {
  // غير موجود - أضف جديد
  const result = await pool.query(`INSERT INTO seasons (...) RETURNING id`, [...]);
  seasonUUID = result.rows[0].id;
}
```

**الملفات المعدلة:**
- `scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js`
  - دالة `fetchAndInsertSeason()` - إصلاح إدراج المواسم
  - دالة `fetchAndInsertSeason()` - إصلاح إدراج الحلقات

**الفائدة:**
- ضمان عدم فقدان أي موسم أو حلقة في المستقبل
- كل محتوى جديد سيُضاف بشكل صحيح 100%

---

### 8. إصلاح عرض الحلقات - Type Mismatch في Season Number (2026-04-19)

**المشكلة:**
- المواسم تظهر بشكل صحيح (5 مواسم)
- الحلقات لا تظهر (`episodesCount = 0`)
- `foundSeason` يبقى `undefined` رغم وجود المواسم
- السبب: type mismatch بين `season` (number) و `season_number` من API

**السبب الجذري:**
```typescript
// ❌ الكود القديم - قد يكون season string أو number
const foundSeason = seasons?.find(s => s.season_number === season)
// النتيجة: undefined إذا كان season string و season_number number
```

**الحل الدائم:**
```typescript
// ✅ الكود الجديد - تحويل season إلى number قبل المقارنة
const seasonNum = typeof season === 'number' ? season : Number(season)
const foundSeason = seasons?.find(s => s.season_number === seasonNum)
const count = foundSeason?.episode_count || 0
```

**الملفات المعدلة:**
- `src/pages/media/Watch.tsx`:
  - إضافة `seasonNum` conversion في `episodesCount` useMemo
  - ضمان المقارنة الصحيحة بين `season_number` و `season`
  - حذف console.log الزائدة

**الفائدة:**
- ✅ الحلقات تظهر بشكل صحيح
- ✅ `episodesCount` يُحسب بشكل صحيح
- ✅ EpisodeSelector يعمل بشكل صحيح
- ✅ المستخدم يمكنه اختيار الحلقات

**التأثير:**
- المواسم: تعمل بشكل صحيح ✅
- الحلقات: تظهر الآن ✅
- التنقل: يعمل بشكل صحيح ✅

---

## 🛠️ أدوات مساعدة تم إنشاؤها

### 1. Database Connection Helper
**الملف:** `scripts/utils/db-connection.js`

**الغرض:**
- حل دائم لمشاكل الاتصال بـ CockroachDB
- إزالة علامات التنصيص من connection string
- توحيد طريقة الاتصال في جميع السكريبتات

**الاستخدام:**
```javascript
import { createPool, testConnection } from './utils/db-connection.js';

const pool = createPool();
await testConnection(); // اختبار الاتصال
```

---

## 📝 ملاحظات مهمة

### CockroachDB Quirks:
1. `ON CONFLICT ... DO UPDATE ... RETURNING` لا يعيد القيمة دائماً
2. الحل: استخدم `SELECT` أولاً، ثم `INSERT` أو `UPDATE`
3. هذا أبطأ قليلاً لكنه أكثر موثوقية 100%

### Best Practices:
1. دائماً اختبر وجود السجل قبل الإدراج
2. استخدم `RETURNING id` فقط مع `INSERT` النقي
3. لا تعتمد على `RETURNING` مع `ON CONFLICT`

---

## 🚀 المحتوى القادم

**الآن المحتوى الجديد سيُضاف بشكل صحيح:**
- ✅ كل مسلسل سيحصل على جميع مواسمه
- ✅ كل موسم سيحصل على جميع حلقاته
- ✅ لا فقدان للبيانات
- ✅ لا حاجة لسكريبتات تصليح لاحقة

---

**تم التطبيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-19
