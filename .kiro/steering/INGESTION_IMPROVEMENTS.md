# 🔧 تحسينات سكريبتات السحب

**تاريخ التطبيق:** 2026-04-21  
**الحالة:** 🔴 CRITICAL - يحتاج إصلاح فوري  
**الأولوية:** URGENT

---

## 🔍 المشاكل المكتشفة

### 1. HTTP 400 Errors - TMDB Page Limit

**المشكلة:**
- TMDB API بيرجع HTTP 400 لكل الصفحات من 501 فما فوق
- ده معناه إن TMDB عنده حد أقصى 500 صفحة لكل query
- 500 صفحة × 20 نتيجة = 10,000 فيلم فقط

**الأمثلة:**
```json
{
  "page": 501,
  "reason": "HTTP 400",
  "time": "2026-04-20T23:01:47.160Z"
}
// ... 297 صفحة فاشلة من 501 إلى 797
```

**التأثير:**
- الهدف: 50,000 فيلم عربي
- الواقع: 10,000 فيلم فقط (20%)
- الفرق: 40,000 فيلم ناقص!

---

### 2. Retry Logic المفرط

**المشكلة:**
- السكريبت بيعيد المحاولة 3 مرات لكل صفحة فاشلة
- كل محاولة بتاخد 30 ثانية (مع الـ sleep)
- 297 صفحة × 3 محاولات × 30 ثانية = 7.4 ساعة ضائعة!

**الكود الحالي:**
```javascript
for (let attempt = 0; attempt < 3 && !success; attempt++) {
  try {
    if (attempt > 0) { 
      console.log(`  ↩️ Retry page ${p} (attempt ${attempt + 1})`); 
      await sleep(3000 * attempt); // 3s, 6s, 9s
    }
    const data = await fetchTMDB('/discover/movie', { ... });
    // ...
    success = true;
  } catch (e) {
    if (attempt === 2) {
      console.error(`Page ${p} error:`, e.message);
      saveFailedPage('arabic', p, e.message);
      success = true; // ✅ Skip and continue
    }
  }
}
```

**المشكلة:**
- HTTP 400 مش هيتحل بالـ retry (ده error من TMDB نفسه)
- الـ retry مفيد بس للـ 429 (rate limit) أو network errors
- لازم نفرق بين الأخطاء القابلة للإعادة والغير قابلة

---

### 3. استراتيجية السحب الخاطئة

**الطريقة الحالية:**
```javascript
// ❌ تقسيم عربي/أجنبي - غير فعال!
/discover/movie?with_original_language=ar&sort_by=popularity.desc&page=1-500
/discover/movie?without_original_language=ar&sort_by=popularity.desc&page=1-500
```

**المشاكل:**
- ❌ التقسيم لعربي/أجنبي مش منطقي - ليه نحدد؟
- ❌ بتجيب نفس الأفلام (الأشهر فقط)
- ❌ مفيش تنوع في النتائج
- ❌ مش بتوصل للأفلام القديمة أو الأقل شهرة
- ❌ بنضيع وقت في تقسيم مش مفيد

---

## ✅ الحلول المقترحة

### 1. استخدام استراتيجيات متعددة (بدون تقسيم لغوي)

**الطريقة الجديدة:**
```javascript
// ✅ استراتيجيات متنوعة - كل الأفلام بدون تمييز
const strategies = [
  // 1. الأشهر (500 صفحة = 10K فيلم)
  { sort_by: 'popularity.desc', include_adult: false },
  
  // 2. الأحدث (500 صفحة = 10K فيلم)
  { sort_by: 'release_date.desc', include_adult: false },
  
  // 3. الأعلى تقييماً (500 صفحة = 10K فيلم)
  { sort_by: 'vote_average.desc', 'vote_count.gte': 500, include_adult: false },
  
  // 4. الأكثر تصويتاً (500 صفحة = 10K فيلم)
  { sort_by: 'vote_count.desc', include_adult: false },
  
  // 5. حسب السنة (20 سنة × 500 صفحة = 10K فيلم لكل سنة)
  { primary_release_year: 2024, sort_by: 'popularity.desc', include_adult: false },
  { primary_release_year: 2023, sort_by: 'popularity.desc', include_adult: false },
  { primary_release_year: 2022, sort_by: 'popularity.desc', include_adult: false },
  // ... 2021 حتى 2005 (20 سنة)
  
  // 6. حسب النوع (19 نوع × 500 صفحة = 10K فيلم لكل نوع)
  { with_genres: 28, sort_by: 'popularity.desc', include_adult: false },  // Action
  { with_genres: 12, sort_by: 'popularity.desc', include_adult: false },  // Adventure
  { with_genres: 16, sort_by: 'popularity.desc', include_adult: false },  // Animation
  { with_genres: 35, sort_by: 'popularity.desc', include_adult: false },  // Comedy
  { with_genres: 80, sort_by: 'popularity.desc', include_adult: false },  // Crime
  { with_genres: 18, sort_by: 'popularity.desc', include_adult: false },  // Drama
  { with_genres: 10751, sort_by: 'popularity.desc', include_adult: false }, // Family
  { with_genres: 14, sort_by: 'popularity.desc', include_adult: false },  // Fantasy
  { with_genres: 36, sort_by: 'popularity.desc', include_adult: false },  // History
  { with_genres: 27, sort_by: 'popularity.desc', include_adult: false },  // Horror
  { with_genres: 10402, sort_by: 'popularity.desc', include_adult: false }, // Music
  { with_genres: 9648, sort_by: 'popularity.desc', include_adult: false }, // Mystery
  { with_genres: 10749, sort_by: 'popularity.desc', include_adult: false }, // Romance
  { with_genres: 878, sort_by: 'popularity.desc', include_adult: false },  // Science Fiction
  { with_genres: 53, sort_by: 'popularity.desc', include_adult: false },   // Thriller
  { with_genres: 10752, sort_by: 'popularity.desc', include_adult: false }, // War
  { with_genres: 37, sort_by: 'popularity.desc', include_adult: false },   // Western
  // ... etc.
];
```

**الفائدة:**
- ✅ كل الأفلام (عربي، إنجليزي، هندي، كوري، ياباني، إلخ)
- ✅ تنوع أكبر في النتائج
- ✅ الوصول لأفلام قديمة وأقل شهرة
- ✅ تجاوز حد الـ 500 صفحة
- ✅ لا تمييز لغوي - المحتوى الجيد من أي لغة

---

### 2. Retry Logic الذكي

**الكود المحسّن:**
```javascript
async function fetchTMDB(endpoint, params = {}, retry = 0) {
  const url = new URL(`${CONFIG.TMDB_URL}${endpoint}`);
  url.searchParams.set('api_key', CONFIG.TMDB_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  
  try {
    const res = await fetch(url.toString());
    
    // ✅ Handle 429 (rate limit) - retry with backoff
    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') || '5') * 1000 + 500;
      await sleep(wait);
      return fetchTMDB(endpoint, params, retry);
    }
    
    // ✅ Handle 400 (bad request) - don't retry, skip immediately
    if (res.status === 400) {
      throw new Error('HTTP 400 - Page limit exceeded or invalid params');
    }
    
    // ✅ Handle 5xx (server error) - retry up to 3 times
    if (res.status >= 500) {
      if (retry < CONFIG.MAX_RETRIES) {
        await sleep(1000 * (retry + 1));
        return fetchTMDB(endpoint, params, retry + 1);
      }
      throw new Error(`HTTP ${res.status} - Server error after ${retry} retries`);
    }
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    // ✅ Network errors - retry up to 3 times
    if (retry < CONFIG.MAX_RETRIES && e.message.includes('fetch')) {
      await sleep(1000 * (retry + 1));
      return fetchTMDB(endpoint, params, retry + 1);
    }
    throw e;
  }
}
```

**الفائدة:**
- HTTP 400 → skip فوراً (لا retry)
- HTTP 429 → retry مع backoff
- HTTP 5xx → retry حتى 3 مرات
- Network errors → retry حتى 3 مرات
- توفير ساعات من الوقت الضائع

---

### 3. Progress Tracking المحسّن

**الكود المحسّن:**
```javascript
const progressFile = join(__dirname, 'progress-movies-v2.json');

function loadProgress() {
  try { 
    return JSON.parse(readFileSync(progressFile, 'utf-8')); 
  } catch (_) { 
    return {
      strategies: {
        'popularity': { page: 0, total: 0 },
        'release_date': { page: 0, total: 0 },
        'vote_average': { page: 0, total: 0 },
        'year_2024': { page: 0, total: 0 },
        // ... etc.
      },
      totalMovies: 0,
      lastUpdate: null
    };
  }
}

function saveProgress(progress) {
  progress.lastUpdate = new Date().toISOString();
  try { 
    writeFileSync(progressFile, JSON.stringify(progress, null, 2)); 
  } catch (_) { }
}
```

**الفائدة:**
- تتبع دقيق لكل استراتيجية
- معرفة أي استراتيجية أكثر إنتاجية
- إمكانية استئناف من أي نقطة

---

### 4. Deduplication

**المشكلة:**
- الاستراتيجيات المتعددة قد تجيب نفس الأفلام
- مثال: فيلم شهير قد يظهر في popularity و release_date

**الحل:**
```javascript
const processedMovies = new Set();

async function processMovie(movieId, section) {
  // ✅ Skip if already processed in this session
  if (processedMovies.has(movieId)) {
    stats[section].duplicates++;
    return;
  }
  processedMovies.add(movieId);
  
  try {
    // Check DB
    const existing = await pool.query(
      'SELECT id, title_ar, overview_ar FROM movies WHERE id=$1', 
      [movieId]
    );
    
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      // ✅ Skip if already has full data
      if (row.title_ar && row.overview_ar) { 
        stats[section].skipped++; 
        return; 
      }
    }
    
    // Fetch and insert
    const movie = await fetchTMDB(`/movie/${movieId}`, { 
      append_to_response: 'credits,translations,keywords' 
    });
    
    if (shouldSkip(movie)) { 
      stats[section].filtered++; 
      return; 
    }
    
    await insertMovie(movie, section);
    stats[section].total++;
  } catch (e) {
    console.error(`   ❌ Movie ${movieId}: ${e.message}`);
    stats[section].errors++;
  }
}
```

**الفائدة:**
- تجنب معالجة نفس الفيلم مرتين
- توفير API calls
- إحصائيات أدق

---

## 📊 التأثير المتوقع

### قبل التحسينات:
```
التقسيم: عربي (50K) + أجنبي (200K) = 250K هدف
الواقع: 10K عربي + 10K أجنبي = 20K فقط (8%)
الوقت الضائع: 7.4 ساعة على retry فاشل
المشكلة: التقسيم اللغوي غير منطقي ومحدود
```

### بعد التحسينات:
```
الاستراتيجيات (كل الأفلام بدون تمييز):
- popularity: 10,000 فيلم
- release_date: 10,000 فيلم
- vote_average: 10,000 فيلم
- vote_count: 10,000 فيلم
- years (20 سنة): 200,000 فيلم
- genres (19 نوع): 190,000 فيلم
- المجموع (قبل dedup): 430,000 فيلم
- المجموع (بعد dedup): ~250,000 فيلم ✅

الوقت الموفر: 7.4 ساعة (لا retry على 400)
التنوع: أفلام من كل اللغات والثقافات
```

---

## 🎯 الخطوات التالية

### 1. الهيكل الصحيح

**سكريبتين فقط:**
1. `INGEST-MOVIES.js` - كل الأفلام (بدون تقسيم)
2. `INGEST-SERIES.js` - كل المسلسلات (بدون تقسيم)

**لماذا؟**
- ✅ الممثلين بيتسحبوا تلقائياً مع كل عمل
- ✅ الأنمي موجود في Movies (أفلام) و TV Shows (مسلسلات)
- ✅ لا حاجة لسكريبت منفصل للممثلين
- ✅ لا حاجة لتقسيم لغوي (عربي/أجنبي)

### 2. الميزات الجديدة:
- ✅ استراتيجيات متعددة (popularity, release_date, vote_average, years, genres)
- ✅ Retry logic ذكي (400 → skip, 429 → retry, 5xx → retry)
- ✅ Deduplication (تجنب معالجة نفس المحتوى مرتين)
- ✅ Progress tracking محسّن (لكل استراتيجية)
- ✅ Stats تفصيلية (total, skipped, filtered, duplicates, errors)
- ✅ Concurrency = 50 (سرعة عالية)

### 3. الاختبار:
```bash
# Test على عينة صغيرة
node scripts/ingestion/INGEST-MOVIES.js --test --limit=100

# Production run
node scripts/ingestion/INGEST-MOVIES.js
node scripts/ingestion/INGEST-SERIES.js
```

---

## 📝 ملاحظات مهمة

### 1. TMDB Content Types:
- **Movies:** كل الأفلام (عربي، أجنبي، هندي، كوري، أنمي، إلخ)
- **TV Shows:** كل المسلسلات (عربي، أجنبي، أنمي، كوري، إلخ)
- **People:** الممثلين (يتم سحبهم تلقائياً مع الأعمال)

### 2. TMDB API Limits:
- 500 صفحة maximum لكل query
- 20 نتيجة لكل صفحة
- 10,000 نتيجة maximum لكل query
- الحل: استراتيجيات متعددة (years, genres, sort methods)

### 3. Rate Limiting:
- TMDB: 40 requests/10 seconds
- مع concurrency=50، قد نحتاج throttling
- الحل: p-limit يتحكم في العدد

### 4. Database Performance:
- مع 50 concurrent inserts، الأداء ممتاز
- CockroachDB يتحمل الضغط
- الممثلين يتم cache في memory (Map) لتجنب التكرار

### 5. Actors Handling:
- ✅ يتم سحبهم تلقائياً مع كل عمل (8 ممثلين لكل عمل)
- ✅ يتم cache في memory لتجنب duplicate queries
- ✅ يتم ترجمتهم تلقائياً (name_ar, biography_ar)
- ✅ العلاقات تُحفظ في movie_cast و tv_cast

---

**تم التوثيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-21  
**الحالة:** 🔴 URGENT - يحتاج تطبيق فوري
