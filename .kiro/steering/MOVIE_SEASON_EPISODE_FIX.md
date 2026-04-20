# 🎬 إصلاح دائم: منع تمرير Season/Episode للأفلام

**تاريخ التطبيق:** 2026-04-19  
**الحالة:** ✅ مكتمل ودائم  
**الأولوية:** CRITICAL

---

## 🔴 المشكلة الأصلية

### الأعراض:
```
GET https://api.themoviedb.org/3/tv/1426964?api_key=... 404 (Not Found)
GET https://api.themoviedb.org/3/tv/1426964/season/1?api_key=... 404 (Not Found)
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'length')
```

### السبب:
الأفلام كانت تحصل على `season=1` و `episode=1` parameters مما يجعل الكود يحاول جلبها كمسلسلات من TMDB API.

```javascript
// ❌ الكود القديم
VideoPlayer watch party params: {
  routeType: 'movie',
  routeSeason: '1',    // خطأ!
  routeEpisode: '1'    // خطأ!
}
```

---

## ✅ الحل الدائم

### 1. فحص نوع المحتوى في المرحلة الأولى

```typescript
const { initialType, initialId, initialSlug, initialSeason, initialEpisode, lang } = useMemo(() => {
  let t = typeParam || 'movie'
  if (t === 'series' || t === 'anime') t = 'tv'
  if (t === 'movies' || t === 'plays') t = 'movie'
  
  // ✅ CRITICAL FIX: Movies should NEVER have season/episode
  const isEpisodicType = t === 'tv' || t === 'anime' || t === 'series'
  
  return {
    initialType: t,
    initialId: idParam || null,
    initialSlug: slugParam || null,
    // ✅ Only set season/episode for episodic content (TV shows)
    initialSeason: isEpisodicType && s ? Number(s) : null,
    initialEpisode: isEpisodicType && e ? Number(e) : null,
    lang: (langParam === 'ar' || langParam === 'en') ? langParam : 'ar'
  }
}, [typeParam, idParam, slugParam, s, e, langParam])
```

### 2. منع sNum و eNum من إرجاع قيم للأفلام

```typescript
const sNum = useMemo(() => {
  // ✅ CRITICAL: Only return season number for episodic content
  if (!isEpisodic) return null
  if (initialSeason) return initialSeason
  if (!s) return null
  return Number(s)
}, [initialSeason, s, isEpisodic])

const eNum = useMemo(() => {
  // ✅ CRITICAL: Only return episode number for episodic content
  if (!isEpisodic) return null
  if (initialEpisode) return initialEpisode
  if (!e) return null
  return Number(e)
}, [initialEpisode, e, isEpisodic])
```

### 3. تأكيد في useWatchProgress

```typescript
const { elapsed } = useWatchProgress({
  user,
  id: id || null,
  type,
  // ✅ CRITICAL: Only pass season/episode for episodic content
  // Movies should NEVER have season/episode parameters
  season: isEpisodic ? season : undefined,
  episode: isEpisodic ? episode : undefined
})
```

---

## 📋 الملفات المعدلة

### `src/pages/media/Watch.tsx`
- ✅ إضافة `isEpisodicType` check في initial useMemo
- ✅ تحديث `sNum` و `eNum` لإرجاع `null` للأفلام
- ✅ إضافة تعليقات CRITICAL في جميع الأماكن الحساسة
- ✅ تأكيد في `useWatchProgress` call

---

## 🎯 النتيجة

### قبل الإصلاح:
```javascript
// ❌ فيلم مع season/episode
{
  type: 'movie',
  id: '1426964',
  season: 1,      // خطأ!
  episode: 1      // خطأ!
}
// النتيجة: TMDB API 404 errors
```

### بعد الإصلاح:
```javascript
// ✅ فيلم بدون season/episode
{
  type: 'movie',
  id: '1426964',
  season: undefined,  // صحيح!
  episode: undefined  // صحيح!
}
// النتيجة: لا أخطاء ✅
```

---

## 🔒 الضمانات

### 1. Type Safety
```typescript
const isEpisodicType = t === 'tv' || t === 'anime' || t === 'series'
// ✅ فحص صريح لنوع المحتوى
```

### 2. Multiple Checkpoints
```typescript
// Checkpoint 1: Initial parsing
initialSeason: isEpisodicType && s ? Number(s) : null

// Checkpoint 2: sNum/eNum calculation
if (!isEpisodic) return null

// Checkpoint 3: useWatchProgress call
season: isEpisodic ? season : undefined
```

### 3. Clear Comments
```typescript
// CRITICAL: Only pass season/episode for episodic content
// Movies should NEVER have season/episode parameters
```

---

## 📊 التأثير

| نوع المحتوى | Season | Episode | الحالة |
|-------------|--------|---------|--------|
| Movie | `undefined` | `undefined` | ✅ صحيح |
| TV Series | `number` | `number` | ✅ صحيح |
| Anime | `number` | `number` | ✅ صحيح |
| Video | `undefined` | `undefined` | ✅ صحيح |

---

## 🚀 للمستقبل

### إذا ظهرت المشكلة مرة أخرى:

1. **تحقق من URL:**
   ```
   /watch/movie/slug  ✅ صحيح
   /watch/movie/slug/s/1/ep/1  ❌ خطأ
   ```

2. **تحقق من الكونسول:**
   ```javascript
   // ابحث عن:
   routeType: 'movie'
   routeSeason: undefined  // يجب أن يكون undefined
   routeEpisode: undefined // يجب أن يكون undefined
   ```

3. **تحقق من TMDB API calls:**
   ```
   ✅ GET /api/movies/slug
   ❌ GET /api/tv/id
   ❌ GET /api/tv/id/season/1
   ```

---

## 📝 ملاحظات مهمة

1. **لا تعتمد على URL parameters فقط** - دائماً تحقق من `type`
2. **استخدم `isEpisodic` flag** - لا تكرر الشروط
3. **أضف CRITICAL comments** - للتذكير بالأهمية
4. **اختبر كل أنواع المحتوى** - movies, tv, anime, video

---

**تم التطبيق بواسطة:** Kiro AI  
**التاريخ:** 2026-04-19  
**النوع:** إصلاح دائم وشامل لكل المحتوى
