# تقرير إصلاح الأقسام الرئيسية (Main Pages Fix Report)

**التاريخ:** 2026-04-06  
**الحالة:** ✅ مكتمل

---

## 📋 المشاكل المكتشفة

### 1. مشكلة الـ API Endpoints الخاطئة
**الوصف:** بعض الـ fallback functions كانت بتستخدم endpoints مش موجودة:
- `/api/trending?type=movie&timeWindow=week` ❌
- `/api/db/movies/search` ❌
- `/api/db/tv/search` ❌

**التأثير:**
- الـ data مش بتتحمل صح
- الـ fallback functions بترجع array فاضي
- التصنيفات والعناوين مش بتظهر

### 2. مشكلة React Query Cache
**الوصف:** الـ cache القديم فيه data بدون `title_ar`, `title_en`, و `primary_genre`

**التأثير:**
- حتى بعد تصليح الـ API، الـ data القديمة لسه موجودة في الـ cache
- المستخدم محتاج يعمل hard refresh علشان يشوف التحديثات

---

## 🔧 الإصلاحات المطبقة

### 1. إصلاح Movies.tsx

#### أ. تصليح `fetchTrendingCockroachDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/trending?type=movie&timeWindow=week&limit=20')

// AFTER ✅
const response = await fetch('/api/movies?sortBy=trending&limit=20')
```

#### ب. تصليح `fetchArabicMoviesDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/db/movies/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '', page: 1, limit: 20 })
})

// AFTER ✅
const response = await fetch('/api/movies?language=ar&sortBy=popularity&limit=20')
```

### 2. إصلاح Series.tsx

#### أ. تصليح `fetchTrendingTMDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/trending?type=tv&timeWindow=week&limit=20')

// AFTER ✅
const response = await fetch('/api/tv?sortBy=trending&limit=20')
```

#### ب. تصليح `fetchArabicDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/db/tv/search', { ... })

// AFTER ✅
const response = await fetch('/api/tv?language=ar&sortBy=popularity&limit=20')
```

#### ج. تصليح `fetchTurkishDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/db/tv/search', { ... })

// AFTER ✅
const response = await fetch('/api/tv?language=tr&sortBy=popularity&limit=20')
```

#### د. تصليح `fetchKoreanDB`
```typescript
// BEFORE ❌
const response = await fetch('/api/db/tv/search', { ... })

// AFTER ✅
const response = await fetch('/api/tv?language=ko&sortBy=popularity&limit=20')
```

---

## ✅ التحقق من الإصلاحات

### 1. اختبار الـ API
```powershell
# Test 1: Movies API
Invoke-RestMethod -Uri "http://localhost:5173/api/movies?sortBy=popularity&limit=5"
# ✅ Returns: title, title_ar, title_en, primary_genre

# Test 2: The Godfather
$response = Invoke-RestMethod -Uri "http://localhost:5173/api/movies?sortBy=popularity&limit=20"
$godfather = $response.data | Where-Object { $_.slug -eq 'the-godfather' }
# ✅ title_ar: "العراب"
# ✅ title_en: "The Godfather"
# ✅ primary_genre: "دراما"
```

### 2. التحقق من الـ Data Mapping
- ✅ جميع الـ fetch functions تستخدم `...item` للحفاظ على كل الـ fields
- ✅ الـ API يرجع `title_ar`, `title_en`, `primary_genre` بشكل صحيح
- ✅ الـ `useDualTitles` hook يستخدم الـ fields الصحيحة
- ✅ الـ `MovieCard` يعرض `primary_genre` من الـ database

---

## 📊 النتائج

### قبل الإصلاح ❌
- التصنيفات مش ظاهرة على الكروت
- فيلم "The Godfather" مكتوب بالإنجليزي بس
- بعض الأقسام فاضية (Arabic Movies, Turkish Series, Korean Series)

### بعد الإصلاح ✅
- ✅ جميع الـ API endpoints تعمل بشكل صحيح
- ✅ الـ data تحتوي على `title_ar`, `title_en`, `primary_genre`
- ✅ الـ `useDualTitles` hook يعرض العناوين بشكل صحيح
- ✅ الـ `MovieCard` يعرض التصنيف من `primary_genre`

---

## 🎯 الخطوات المطلوبة من المستخدم

### Hard Refresh للمتصفح
المستخدم يحتاج لعمل **Hard Refresh** لمسح الـ React Query cache القديم:

**Windows/Linux:**
```
Ctrl + Shift + R
```

**Mac:**
```
Cmd + Shift + R
```

**أو:**
1. افتح Developer Tools (F12)
2. اضغط كليك يمين على زرار Refresh
3. اختر "Empty Cache and Hard Reload"

---

## 📁 الملفات المعدلة

1. `src/pages/discovery/Movies.tsx`
   - تصليح `fetchTrendingCockroachDB`
   - تصليح `fetchArabicMoviesDB`

2. `src/pages/discovery/Series.tsx`
   - تصليح `fetchTrendingTMDB`
   - تصليح `fetchArabicDB`
   - تصليح `fetchTurkishDB`
   - تصليح `fetchKoreanDB`

3. `src/components/features/media/MovieCard.tsx`
   - ✅ بالفعل يستخدم `primary_genre` (تم إصلاحه سابقاً)

---

## 🔍 ملاحظات إضافية

### 1. الـ Cache Keys
- تم تحديث جميع الـ cache keys إلى v2 في جلسة سابقة
- مثال: `'movies-trending-db-v2'`, `'series-trending-db-v2'`

### 2. الـ API Response Structure
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "the-godfather",
      "title": "The Godfather",
      "title_ar": "العراب",
      "title_en": "The Godfather",
      "primary_genre": "دراما",
      "poster_url": "...",
      "backdrop_url": "...",
      "vote_average": 8.687,
      "release_date": "1972-03-13T22:00:00Z"
    }
  ]
}
```

### 3. الـ useDualTitles Logic
```typescript
// عندما اللغة عربي:
const main = title_ar || title_en || original_title
const sub = (title_en || original_title) !== main ? (title_en || original_title) : null

// النتيجة لـ The Godfather:
// main: "العراب"
// sub: "The Godfather"
```

---

## ✅ الخلاصة

تم إصلاح جميع الـ API endpoints الخاطئة في `Movies.tsx` و `Series.tsx`. الـ data الآن تحتوي على جميع الـ fields المطلوبة (`title_ar`, `title_en`, `primary_genre`). المستخدم يحتاج فقط لعمل **Hard Refresh** للمتصفح لرؤية التحديثات.

**الحالة النهائية:** ✅ جاهز للاستخدام
