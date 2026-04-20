# 🚀 خطة تنفيذ Backfill للكلمات المفتاحية والمحتوى المشابه

**Last Updated:** 2026-04-14  
**Status:** ✅ جاهز للتنفيذ

---

## 📊 الوضع الحالي

### البيانات الموجودة:
```
✅ 7,162 فيلم بكلمات مفتاحية في JSONB
✅ 7,329 فيلم بمحتوى مشابه في JSONB
✅ 1,559 مسلسل بكلمات مفتاحية في JSONB
✅ 1,564 مسلسل بمحتوى مشابه في JSONB
```

### الجداول المخصصة:
```
❌ keywords: 0 rows
❌ movie_keywords: 0 rows
❌ tv_keywords: 0 rows
❌ similar_movies: 0 rows
❌ similar_tv_series: 0 rows
```

---

## 🎯 الخطة التنفيذية

### الخطوة 1: Backfill للمحتوى الموجود ✅

**السكريبت:** `scripts/backfill-keywords-similar.cjs`

**ما يفعله:**
1. يجلب كل الأفلام/المسلسلات اللي عندها keywords أو similar_content في JSONB
2. لكل فيلم/مسلسل:
   - يدرج الكلمات المفتاحية في جدول `keywords`
   - يربط الفيلم/المسلسل بالكلمات في `movie_keywords`/`tv_keywords`
   - يبحث عن المحتوى المشابه في قاعدة البيانات
   - يربط المحتوى المشابه في `similar_movies`/`similar_tv_series`

**المعدل:**
- 100 عنصر كل batch
- 100ms delay بين كل batch
- الوقت المتوقع: ~15-20 دقيقة لـ 8,000+ عنصر

**التشغيل:**
```bash
node scripts/backfill-keywords-similar.cjs
```

### الخطوة 2: تعديل السكريبتات الرئيسية ⏳

**الملفات المطلوب تعديلها:**
- `scripts/ingestion/MASTER_INGESTION_QUEUE.js`
- `scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js`

**التعديلات المطلوبة:**
1. إضافة دالة `insertKeywords(contentId, keywords, contentType)`
2. إضافة دالة `insertSimilarContent(contentId, similarItems, contentType)`
3. استدعاء الدالتين في نهاية `insertMovie()` و `insertTVSeries()`

---

## 📝 الكود المطلوب للخطوة 2

### 1. دالة insertKeywords

```javascript
/**
 * Insert keywords and link to content
 */
async function insertKeywords(contentId, keywords, contentType) {
  if (!keywords || keywords.length === 0) return;
  
  for (const keyword of keywords) {
    if (!keyword.id || !keyword.name) continue;
    
    try {
      // Insert keyword
      const keywordResult = await pool.query(`
        INSERT INTO keywords (id, tmdb_id, name)
        VALUES (gen_random_uuid(), $1, $2)
        ON CONFLICT (tmdb_id) DO UPDATE SET 
          name = EXCLUDED.name,
          updated_at = NOW()
        RETURNING id
      `, [keyword.id, keyword.name]);
      
      const keywordId = keywordResult.rows[0].id;
      
      // Link to content
      if (contentType === 'movie') {
        await pool.query(`
          INSERT INTO movie_keywords (id, movie_id, keyword_id)
          VALUES (gen_random_uuid(), $1, $2)
          ON CONFLICT (movie_id, keyword_id) DO NOTHING
        `, [contentId, keywordId]);
      } else if (contentType === 'tv') {
        await pool.query(`
          INSERT INTO tv_keywords (id, series_id, keyword_id)
          VALUES (gen_random_uuid(), $1, $2)
          ON CONFLICT (series_id, keyword_id) DO NOTHING
        `, [contentId, keywordId]);
      }
    } catch (error) {
      // Silent fail - don't stop ingestion for keyword errors
      console.error(`   ⚠️  Keyword error: ${error.message}`);
    }
  }
}
```

### 2. دالة insertSimilarContent

```javascript
/**
 * Insert similar content links
 */
async function insertSimilarContent(contentId, similarItems, contentType) {
  if (!similarItems || similarItems.length === 0) return;
  
  for (let i = 0; i < similarItems.length; i++) {
    const similar = similarItems[i];
    if (!similar.id) continue;
    
    try {
      // Find similar content in our database
      const tableName = contentType === 'movie' ? 'movies' : 'tv_series';
      const result = await pool.query(`
        SELECT id FROM ${tableName}
        WHERE external_source = 'tmdb' AND external_id = $1
      `, [similar.id.toString()]);
      
      if (result.rows.length === 0) {
        // Similar content not in DB yet, skip
        continue;
      }
      
      const similarId = result.rows[0].id;
      
      // Link similar content
      if (contentType === 'movie') {
        await pool.query(`
          INSERT INTO similar_movies (id, movie_id, similar_movie_id, display_order)
          VALUES (gen_random_uuid(), $1, $2, $3)
          ON CONFLICT (movie_id, similar_movie_id) DO NOTHING
        `, [contentId, similarId, i + 1]);
      } else if (contentType === 'tv') {
        await pool.query(`
          INSERT INTO similar_tv_series (id, series_id, similar_series_id, display_order)
          VALUES (gen_random_uuid(), $1, $2, $3)
          ON CONFLICT (series_id, similar_series_id) DO NOTHING
        `, [contentId, similarId, i + 1]);
      }
    } catch (error) {
      // Silent fail - don't stop ingestion for similar content errors
      console.error(`   ⚠️  Similar content error: ${error.message}`);
    }
  }
}
```

### 3. تعديل insertMovie()

```javascript
async function insertMovie(movie, category) {
  // ... existing code ...
  
  const movieUUID = result.rows[0].id;
  
  // Insert actors
  if (movie.credits?.cast && movie.credits.cast.length > 0) {
    await insertActors(movie.credits.cast, movieUUID);
  }
  
  // ✅ NEW: Insert keywords
  if (movie.keywords?.keywords && movie.keywords.keywords.length > 0) {
    await insertKeywords(movieUUID, movie.keywords.keywords, 'movie');
  }
  
  // ✅ NEW: Insert similar content
  if (movie.similar?.results && movie.similar.results.length > 0) {
    await insertSimilarContent(movieUUID, movie.similar.results, 'movie');
  }
  
  console.log(`   ✅ ${movie.title} (${category})`);
}
```

### 4. تعديل insertTVSeries()

```javascript
async function insertTVSeries(series, category) {
  // ... existing code ...
  
  const finalSeriesUUID = result.rows[0].id;
  
  // Insert actors
  if (series.aggregate_credits?.cast && series.aggregate_credits.cast.length > 0) {
    await insertActors(series.aggregate_credits.cast, finalSeriesUUID);
  }
  
  // ✅ NEW: Insert keywords
  if (series.keywords?.results && series.keywords.results.length > 0) {
    await insertKeywords(finalSeriesUUID, series.keywords.results, 'tv');
  }
  
  // ✅ NEW: Insert similar content
  if (series.similar?.results && series.similar.results.length > 0) {
    await insertSimilarContent(finalSeriesUUID, series.similar.results, 'tv');
  }
  
  console.log(`   ✅ ${series.name} (${category})`);
  return finalSeriesUUID;
}
```

---

## ⚠️ نقاط مهمة

### 1. استخدم series_id (ليس tv_series_id)
```javascript
// ❌ خطأ
INSERT INTO tv_keywords (tv_series_id, keyword_id) ...

// ✅ صحيح
INSERT INTO tv_keywords (series_id, keyword_id) ...
```

### 2. Silent Fail للأخطاء
```javascript
try {
  // Insert keyword/similar
} catch (error) {
  // Don't throw - just log and continue
  console.error(`⚠️  Error: ${error.message}`);
}
```

**السبب:** لا نريد إيقاف السحب بالكامل لو فشل keyword واحد

### 3. المحتوى المشابه قد لا يكون موجود
```javascript
const result = await pool.query(`SELECT id FROM movies WHERE external_id = $1`, [similar.id]);

if (result.rows.length === 0) {
  // Skip - similar movie not in DB yet
  continue;
}
```

**السبب:** الفيلم المشابه قد يُسحب لاحقاً

### 4. ON CONFLICT DO NOTHING
```javascript
ON CONFLICT (movie_id, keyword_id) DO NOTHING
ON CONFLICT (movie_id, similar_movie_id) DO NOTHING
```

**السبب:** تجنب أخطاء التكرار

---

## 📊 التأثير على الأداء

### قبل التعديل:
```
إدراج فيلم واحد:
1. INSERT movie (1 استعلام)
2. INSERT actors (20 استعلام)
= 21 استعلام
معدل: 52 فيلم/دقيقة
```

### بعد التعديل:
```
إدراج فيلم واحد:
1. INSERT movie (1 استعلام)
2. INSERT actors (20 استعلام)
3. INSERT keywords (10 كلمات × 2 استعلام = 20)
4. INSERT similar (6 أفلام × 2 استعلام = 12)
= 53 استعلام
معدل متوقع: 25-30 فيلم/دقيقة (-40%)
```

**هل هذا مقبول؟**
- ✅ نعم - الفائدة (SEO + بحث متقدم) تستحق
- ✅ يمكن تحسينه لاحقاً بـ batch inserts

---

## ✅ خطوات التنفيذ

### المرحلة 1: Backfill (الآن)
```bash
# 1. اختبار على عينة صغيرة
node scripts/test-backfill-sample.cjs

# 2. تشغيل Backfill الكامل
node scripts/backfill-keywords-similar.cjs

# 3. التحقق من النتائج
node scripts/check-keywords-similar.cjs
```

### المرحلة 2: تعديل السكريبتات (بعد الموافقة)
```bash
# 1. إضافة الدالتين في MASTER_INGESTION_QUEUE.js
# 2. إضافة الدالتين في MASTER_INGESTION_QUEUE_SERIES.js
# 3. استدعاء الدالتين في insertMovie() و insertTVSeries()
# 4. اختبار على 10 أفلام جديدة
# 5. مراقبة الأداء
```

---

## 🎯 النتيجة المتوقعة

### بعد Backfill:
```
✅ keywords: ~5,000-10,000 كلمة فريدة
✅ movie_keywords: ~50,000-70,000 ربط
✅ tv_keywords: ~10,000-15,000 ربط
✅ similar_movies: ~40,000-50,000 ربط
✅ similar_tv_series: ~8,000-10,000 ربط
```

### بعد تعديل السكريبتات:
```
✅ كل محتوى جديد يُربط تلقائياً
✅ صفحات SEO للكلمات: /keywords/android
✅ بحث متقدم: "أفلام بكلمة X"
✅ إحصائيات: "أكثر الكلمات استخداماً"
```

---

## 📝 الملفات المنشأة

1. ✅ `scripts/backfill-keywords-similar.cjs` - سكريبت Backfill الرئيسي
2. ✅ `scripts/test-backfill-sample.cjs` - اختبار على عينة صغيرة
3. ✅ `scripts/check-keywords-similar.cjs` - فحص البيانات
4. ✅ `scripts/check-table-schemas.cjs` - فحص هيكل الجداول
5. ✅ `TABLE_SCHEMAS_REPORT.md` - توثيق هيكل الجداول
6. ✅ `KEYWORDS_SIMILAR_FINAL_REPORT.md` - تقرير الوضع الحالي
7. ✅ `BACKFILL_IMPLEMENTATION_PLAN.md` - هذا الملف

---

## 🚀 جاهز للتنفيذ!

**الخطوة التالية:** تشغيل Backfill

```bash
node scripts/backfill-keywords-similar.cjs
```

**الوقت المتوقع:** 15-20 دقيقة

---

**Last Updated:** 2026-04-14  
**Status:** ✅ جاهز - بانتظار الموافقة على التنفيذ

