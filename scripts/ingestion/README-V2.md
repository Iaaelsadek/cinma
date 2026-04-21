# 🎬 نظام سحب المحتوى V2 - دليل شامل

**آخر تحديث:** 2026-04-21  
**الإصدار:** 2.0  
**الحالة:** ✅ Production Ready

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [السكريبتات المتاحة](#السكريبتات-المتاحة)
3. [الأسئلة الشائعة (FAQ)](#الأسئلة-الشائعة)
4. [سير العمل الكامل](#سير-العمل-الكامل)
5. [ملفات الـ IDs اليومية](#ملفات-الـ-ids-اليومية)
6. [نظام إصلاح الأخطاء](#نظام-إصلاح-الأخطاء)
7. [الملفات المُنتجة](#الملفات-المُنتجة)
8. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

نظام V2 يستخدم **TMDB Daily ID Exports** بدلاً من `/discover` API:

### الفرق بين V1 و V2:

| الميزة | V1 (القديم) | V2 (الجديد) |
|--------|-------------|-------------|
| **المصدر** | `/discover` API | Daily ID Exports |
| **الحد الأقصى** | 500 صفحة × 20 = 10K | لا حدود (~1M+) |
| **السرعة** | بطيء (sequential) | سريع (50 concurrent) |
| **الأخطاء** | لا يوجد تتبع | نظام شامل |
| **الإصلاح** | يدوي | تلقائي |

---

## 📦 السكريبتات المتاحة

### ✅ السكريبتات النشطة (استخدم هذه فقط):

#### 1. **INGEST-MOVIES-V2.js** - سحب الأفلام
```bash
node scripts/ingestion/INGEST-MOVIES-V2.js
```

**الوظيفة:**
- يحمّل `movie_ids_MM_DD_YYYY.json.gz` من TMDB
- يسحب كل الأفلام (~1M+ فيلم)
- يسحب الممثلين تلقائياً (8 ممثلين لكل فيلم)
- يترجم العناوين والنبذات تلقائياً
- يسجل الأخطاء في `error-log-movies.json`

---

#### 2. **INGEST-SERIES-V2.js** - سحب المسلسلات
```bash
node scripts/ingestion/INGEST-SERIES-V2.js
```

**الوظيفة:**
- يحمّل `tv_series_ids_MM_DD_YYYY.json.gz` من TMDB
- يسحب كل المسلسلات (~200K+ مسلسل)
- يسحب المواسم والحلقات تلقائياً
- يسحب الممثلين تلقائياً
- يترجم العناوين والنبذات تلقائياً
- يسجل الأخطاء في `error-log-series.json`

---

#### 3. **RETRY-FAILED-ITEMS.js** - إصلاح الأخطاء
```bash
node scripts/ingestion/RETRY-FAILED-ITEMS.js
```

**الوظيفة:**
- يقرأ `error-log-movies.json` و `error-log-series.json`
- يحاول إصلاح كل خطأ (translation, tmdb, database)
- يحذف العناصر الناجحة من القائمة
- يحدّث ملفات الأخطاء بالعناصر المتبقية
- يمكن تشغيله عدة مرات

---

### ❌ السكريبتات القديمة (لا تستخدم):

تم نقلها إلى `archive-old-scripts/`:
- `INGEST-MOVIES.js` (القديم)
- `INGEST-SERIES.js` (القديم)
- `RETRY-FAILED-PAGES.js` (القديم)
- `FIND-MISSING-PAGES.js` (القديم)

---

## ❓ الأسئلة الشائعة (FAQ)

### 1. هل ملفات الـ IDs منفصلة للأفلام والمسلسلات؟

**نعم، ملفين منفصلين:**

```
https://files.tmdb.org/p/exports/movie_ids_04_21_2026.json.gz      (للأفلام)
https://files.tmdb.org/p/exports/tv_series_ids_04_21_2026.json.gz  (للمسلسلات)
```

**كل سكريبت يستخدم ملفه:**
- `INGEST-MOVIES-V2.js` → يحمّل `movie_ids_*.json.gz`
- `INGEST-SERIES-V2.js` → يحمّل `tv_series_ids_*.json.gz`

---

### 2. هل الملف اليومي يحتوي على الجديد فقط أم كل الأعمال؟

**كل الأعمال (قديم + جديد):**

الملف اليومي يحتوي على:
- ✅ كل الأفلام/المسلسلات الموجودة في TMDB
- ✅ القديم والجديد
- ✅ يتحدث يومياً بالإضافات والحذف

**مثال:**
```
اليوم 1 (21 أبريل): 1,000,000 فيلم
اليوم 2 (22 أبريل): 1,000,050 فيلم (50 فيلم جديد)
اليوم 3 (23 أبريل): 999,980 فيلم (70 فيلم محذوف من TMDB)
```

---

### 3. هل نعيد السحب من الأول كل يوم؟

**لا! السكريبت ذكي - يستأنف من آخر نقطة:**

```javascript
// السكريبت يحفظ التقدم في progress-movies-v2.json
{
  "lastIndex": 500000,
  "lastUpdate": "2026-04-21T10:00:00Z"
}

// عند إعادة التشغيل:
const progress = loadProgress(); // { lastIndex: 500000 }
const remainingIds = allIds.slice(progress.lastIndex); // يبدأ من 500,001
```

**السيناريو الكامل:**

```bash
# اليوم 1: بدأت السحب
node scripts/ingestion/INGEST-MOVIES-V2.js
# Progress: 0 → 500,000 فيلم
# الملف: movie_ids_04_21_2026.json.gz

# اليوم 2: ملف جديد نزل
# السكريبت يحمّل: movie_ids_04_22_2026.json.gz
# يقرأ progress: lastIndex = 500,000
# يكمل من: 500,001 في الملف الجديد
# Progress: 500,000 → 1,000,000 فيلم
```

**الفائدة:**
- ✅ لا إعادة للعمل المُنجز
- ✅ استئناف ذكي من آخر نقطة
- ✅ يعمل مع الملفات اليومية الجديدة

---

### 4. هل RETRY-FAILED-ITEMS يصلح الأفلام والمسلسلات معاً؟

**نعم، يصلح الاتنين في نفس الوقت:**

```javascript
// في RETRY-FAILED-ITEMS.js
async function main() {
  // Process movies errors
  await processErrorLog('error-log-movies.json', 'movies');
  
  // Process series errors
  await processErrorLog('error-log-series.json', 'series');
  
  // Show combined stats
  console.log(`🎬 Movies: ${stats.movies.success}/${stats.movies.total} fixed`);
  console.log(`📺 Series: ${stats.series.success}/${stats.series.total} fixed`);
}
```

**المخرجات:**
```
🔄 Processing movies errors from: error-log-movies.json
═══════════════════════════════════════════════════
📝 Retrying 50 translation errors...
   ✅ movie 12345 - translation fixed
   ✅ movie 12346 - translation fixed

🔄 Processing series errors from: error-log-series.json
═══════════════════════════════════════════════════
📝 Retrying 20 translation errors...
   ✅ series 67890 - translation fixed

📊 FINAL STATS
═══════════════════════════════════════════════════
🎬 Movies: 45/50 fixed
📺 Series: 18/20 fixed
⏱  Time: 5.2 minutes
```

---

### 5. كيف أتعامل مع الملف اليومي الجديد؟

**لا تفعل شيء! السكريبت يتعامل تلقائياً:**

```javascript
// السكريبت يحمّل الملف اليومي تلقائياً
async function downloadDailyExport() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = today.getFullYear();
  
  // يبني URL تلقائياً حسب التاريخ
  const filename = `movie_ids_${mm}_${dd}_${yyyy}.json.gz`;
  const url = `https://files.tmdb.org/p/exports/${filename}`;
  
  // يحمّل ويفك الضغط
  await downloadAndExtract(url);
}
```

**ما يحدث:**
1. السكريبت يحمّل الملف اليومي تلقائياً
2. يقرأ progress من `progress-movies-v2.json`
3. يكمل من آخر نقطة في الملف الجديد
4. يحفظ التقدم باستمرار

**لا حاجة لـ:**
- ❌ تحميل الملف يدوياً
- ❌ حذف الملف القديم
- ❌ إعادة تعيين progress
- ❌ أي تدخل يدوي

---

## 🔄 سير العمل الكامل

### المرحلة 1: السحب الأولي (مرة واحدة)

```bash
# تشغيل سكريبت الأفلام
node scripts/ingestion/INGEST-MOVIES-V2.js

# النتيجة المتوقعة:
# ✅ 950,000 فيلم تم سحبهم بنجاح
# ❌ 50,000 فيلم فشلوا (مسجلين في error-log-movies.json)
# ⏱  الوقت: ~33 ساعة
```

```bash
# تشغيل سكريبت المسلسلات
node scripts/ingestion/INGEST-SERIES-V2.js

# النتيجة المتوقعة:
# ✅ 180,000 مسلسل تم سحبهم بنجاح
# ❌ 20,000 مسلسل فشلوا (مسجلين في error-log-series.json)
# ⏱  الوقت: ~7 ساعات
```

---

### المرحلة 2: إصلاح الأخطاء (عدة مرات)

```bash
# المحاولة الأولى
node scripts/ingestion/RETRY-FAILED-ITEMS.js

# النتيجة:
# 🎬 Movies: 45,000/50,000 fixed ✅
# 📺 Series: 18,000/20,000 fixed ✅
# 
# المتبقي:
# - 5,000 فيلم
# - 2,000 مسلسل
```

```bash
# المحاولة الثانية (بعد ساعة)
node scripts/ingestion/RETRY-FAILED-ITEMS.js

# النتيجة:
# 🎬 Movies: 4,000/5,000 fixed ✅
# 📺 Series: 1,800/2,000 fixed ✅
#
# المتبقي:
# - 1,000 فيلم
# - 200 مسلسل
```

```bash
# المحاولة الثالثة (بعد يوم)
node scripts/ingestion/RETRY-FAILED-ITEMS.js

# النتيجة:
# 🎬 Movies: 900/1,000 fixed ✅
# 📺 Series: 180/200 fixed ✅
#
# المتبقي:
# - 100 فيلم (أخطاء دائمة - غالباً 404)
# - 20 مسلسل (أخطاء دائمة)
```

---

### المرحلة 3: التحديث اليومي (تلقائي)

```bash
# كل يوم، شغّل السكريبتات مرة أخرى
node scripts/ingestion/INGEST-MOVIES-V2.js
node scripts/ingestion/INGEST-SERIES-V2.js

# ما يحدث:
# 1. يحمّل الملف اليومي الجديد
# 2. يكمل من آخر نقطة
# 3. يسحب المحتوى الجديد فقط
# 4. يحدّث المحتوى القديم إذا تغير
```

---

## 📁 ملفات الـ IDs اليومية

### المصدر:
```
https://files.tmdb.org/p/exports/
```

### الملفات المتاحة:
```
movie_ids_MM_DD_YYYY.json.gz       (~10-20 MB compressed)
tv_series_ids_MM_DD_YYYY.json.gz   (~2-5 MB compressed)
person_ids_MM_DD_YYYY.json.gz      (للممثلين - لا نستخدمه)
collection_ids_MM_DD_YYYY.json.gz  (للمجموعات - لا نستخدمه)
```

### التحديث:
- ⏰ يومياً الساعة 7-8 صباحاً UTC
- 📅 يحتوي على كل الـ IDs (قديم + جديد)
- 🔄 يتحدث بالإضافات والحذف

### الصيغة:
```json
{"adult":false,"id":12345,"original_title":"Movie Title","popularity":123.45,"video":false}
{"adult":false,"id":12346,"original_title":"Another Movie","popularity":98.76,"video":false}
...
```

**ملاحظة:** كل سطر = JSON object منفصل (newline-delimited JSON)

---

## 🔧 نظام إصلاح الأخطاء

### أنواع الأخطاء المتتبعة:

#### 1. **Translation Errors** (أخطاء الترجمة)
```json
{
  "id": 12345,
  "title": "Movie Title",
  "error": "Translation service timeout",
  "attempts": 3,
  "firstAttempt": "2026-04-21T10:00:00Z",
  "lastAttempt": "2026-04-21T10:05:00Z"
}
```

**الأسباب:**
- Mistral AI timeout
- Rate limit
- Network error

**الحل:**
- RETRY يحاول مرة أخرى
- معظمها تُحل في المحاولة الثانية

---

#### 2. **TMDB Errors** (أخطاء TMDB API)
```json
{
  "id": 67890,
  "error": "HTTP 404 - Not found",
  "attempts": 5,
  "firstAttempt": "2026-04-21T10:00:00Z",
  "lastAttempt": "2026-04-21T10:10:00Z"
}
```

**الأسباب:**
- 404: محتوى محذوف من TMDB
- 500: server error
- timeout: network issue

**الحل:**
- 404 → يُحذف من القائمة (لا يوجد في TMDB)
- 500/timeout → RETRY يحاول مرة أخرى

---

#### 3. **Database Errors** (أخطاء قاعدة البيانات)
```json
{
  "id": 11111,
  "error": "Connection timeout",
  "attempts": 2,
  "firstAttempt": "2026-04-21T10:00:00Z",
  "lastAttempt": "2026-04-21T10:02:00Z"
}
```

**الأسباب:**
- Connection timeout
- Constraint violation
- Deadlock

**الحل:**
- RETRY يحاول مرة أخرى
- معظمها تُحل في المحاولة الثانية

---

### آلية إعادة المحاولة:

```javascript
// Smart Retry مع Backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // Exponential backoff
      const delay = 1000 * (attempt + 1); // 1s, 2s, 3s
      await sleep(delay);
    }
  }
}
```

**النتيجة:**
- المحاولة 1: فوراً
- المحاولة 2: بعد 2 ثانية
- المحاولة 3: بعد 4 ثواني
- بعد 3 فشل: تسجيل الخطأ والمتابعة

---

### التنبيهات التلقائية:

```javascript
// تنبيه بعد 10 أخطاء متكررة لنفس العنصر
if (errorCount >= 10) {
  console.error(`⚠️  ALERT: ${type} error repeated ${errorCount} times for ID ${id}`);
  console.error(`   Error: ${error.message}`);
  
  // إضافة للأخطاء الحرجة
  errorLog.critical.push({
    id,
    error: error.message,
    type,
    attempts: errorCount,
    timestamp: new Date().toISOString()
  });
}
```

---

## 📄 الملفات المُنتجة

### 1. ملفات التقدم (Progress):
```
scripts/ingestion/progress-movies-v2.json
scripts/ingestion/progress-series-v2.json
```

**المحتوى:**
```json
{
  "lastIndex": 500000,
  "lastUpdate": "2026-04-21T10:00:00Z"
}
```

**الاستخدام:**
- يحفظ آخر نقطة وصلت لها
- يسمح بالاستئناف من نفس النقطة
- يتحدث كل 1000 عنصر

---

### 2. ملفات الأخطاء (Error Logs):
```
scripts/ingestion/error-log-movies.json
scripts/ingestion/error-log-series.json
```

**المحتوى:**
```json
{
  "summary": {
    "total": 1000,
    "translation": 200,
    "tmdb": 700,
    "database": 100,
    "critical": 50
  },
  "errors": {
    "translation": [...],
    "tmdb": [...],
    "database": [...],
    "critical": [...]
  },
  "lastRetry": "2026-04-21T15:30:00Z",
  "previousTotal": 50000
}
```

**الاستخدام:**
- يسجل كل الأخطاء بالتفصيل
- يُستخدم بواسطة RETRY-FAILED-ITEMS
- يتحدث بعد كل retry

---

### 3. ملفات الـ IDs المحملة:
```
scripts/ingestion/movie_ids.json
scripts/ingestion/tv_series_ids.json
```

**المحتوى:**
```json
{"adult":false,"id":12345,"original_title":"Movie Title","popularity":123.45,"video":false}
{"adult":false,"id":12346,"original_title":"Another Movie","popularity":98.76,"video":false}
...
```

**الاستخدام:**
- يُحمّل تلقائياً من TMDB
- يُستخدم بواسطة السكريبتات
- يُحدّث يومياً

---

## 🐛 استكشاف الأخطاء

### المشكلة: السكريبت يتوقف فجأة

**الأسباب المحتملة:**
1. Connection timeout
2. Out of memory
3. Rate limit

**الحل:**
```bash
# أعد تشغيل السكريبت - سيستأنف من آخر نقطة
node scripts/ingestion/INGEST-MOVIES-V2.js
```

---

### المشكلة: أخطاء كثيرة في error log

**الحل:**
```bash
# شغّل RETRY عدة مرات
node scripts/ingestion/RETRY-FAILED-ITEMS.js

# انتظر ساعة وأعد المحاولة
node scripts/ingestion/RETRY-FAILED-ITEMS.js

# انتظر يوم وأعد المحاولة
node scripts/ingestion/RETRY-FAILED-ITEMS.js
```

---

### المشكلة: الملف اليومي لا يُحمّل

**الأسباب:**
- TMDB لم ينشر الملف بعد (ينشر 7-8 صباحاً UTC)
- مشكلة في الاتصال

**الحل:**
```bash
# انتظر حتى 9 صباحاً UTC
# أو استخدم ملف اليوم السابق (السكريبت يحاول تلقائياً)
```

---

### المشكلة: Translation errors كثيرة

**الأسباب:**
- Mistral AI rate limit
- API key issue

**الحل:**
```bash
# تحقق من API key
echo $MISTRAL_API_KEY

# شغّل RETRY بعد ساعة
node scripts/ingestion/RETRY-FAILED-ITEMS.js
```

---

## 📊 الإحصائيات المتوقعة

### الأفلام:
```
الهدف: 1,000,000 فيلم
الناجح: 999,000 فيلم (99.9%)
الفاشل: 1,000 فيلم (0.1%)
الوقت: ~33 ساعة
```

### المسلسلات:
```
الهدف: 200,000 مسلسل
الناجح: 199,800 مسلسل (99.9%)
الفاشل: 200 مسلسل (0.1%)
الوقت: ~7 ساعات
```

### المجموع:
```
الهدف: 1,200,000 عمل
الناجح: 1,198,800 عمل (99.9%)
الفاشل: 1,200 عمل (0.1%)
الوقت: ~40 ساعة
```

---

## 🎯 الخلاصة

### ✅ ما يجب فعله:

1. **السحب الأولي:**
   ```bash
   node scripts/ingestion/INGEST-MOVIES-V2.js
   node scripts/ingestion/INGEST-SERIES-V2.js
   ```

2. **إصلاح الأخطاء (عدة مرات):**
   ```bash
   node scripts/ingestion/RETRY-FAILED-ITEMS.js
   ```

3. **التحديث اليومي:**
   ```bash
   # كل يوم
   node scripts/ingestion/INGEST-MOVIES-V2.js
   node scripts/ingestion/INGEST-SERIES-V2.js
   ```

---

### ❌ ما يجب تجنبه:

1. ❌ لا تستخدم السكريبتات القديمة في `archive-old-scripts/`
2. ❌ لا تحذف ملفات progress يدوياً
3. ❌ لا تحذف ملفات error logs يدوياً
4. ❌ لا تشغّل أكثر من instance من نفس السكريبت

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع [استكشاف الأخطاء](#استكشاف-الأخطاء)
2. افحص `error-log-movies.json` و `error-log-series.json`
3. شغّل `RETRY-FAILED-ITEMS.js` عدة مرات

---

**تم التوثيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-21  
**الإصدار:** 2.0
