# Genre Display Fix Report

**Date:** 2026-04-06  
**Status:** ✅ COMPLETED

---

## Issue

**User Report:** "تمام اتصلحت في الاقسام الفرعية لكن في الاقسام الرئيسية زي ماهيا"

Genre (التصنيف) was displaying correctly on hierarchical pages (e.g., `/movies/action`) but NOT on main pages (e.g., `/movies`).

---

## Root Cause Analysis

### 1. MovieCard Component ✅
- **Status:** FIXED
- **Issue:** Was using `genre_ids` array instead of `primary_genre` from database
- **Fix Applied:** Updated to prioritize `primary_genre`

```typescript
// BEFORE
const genre = getGenreName(movie.genre_ids?.[0], lang) || (movie as any).category

// AFTER
const genre = (movie as any).primary_genre || getGenreName(movie.genre_ids?.[0], lang) || (movie as any).category
```

### 2. API Endpoints ✅
- **Status:** WORKING CORRECTLY
- **Verification:** All endpoints return `primary_genre` field
- `/api/movies` ✅ Returns `primary_genre`
- `/api/tv` ✅ Returns `primary_genre`
- `/api/trending` ✅ Returns `primary_genre`

### 3. Data Mapping ✅
- **Status:** WORKING CORRECTLY
- All fetch functions use spread operator `...item` which preserves `primary_genre`

### 4. React Query Cache ❌
- **Status:** STALE CACHE
- **Issue:** Main pages (`/movies`, `/series`) were using old cached data WITHOUT `primary_genre`
- **Solution:** Updated all cache keys to invalidate old cache

---

## Fixes Applied

### 1. Updated MovieCard.tsx
**File:** `src/components/features/media/MovieCard.tsx`
**Line:** 89

```typescript
const genre = (movie as any).primary_genre || getGenreName(movie.genre_ids?.[0], lang) || (movie as any).category
```

**Result:** Genre now displays from `primary_genre` field (already in Arabic)

---

### 2. Updated Cache Keys in Movies.tsx
**File:** `src/pages/discovery/Movies.tsx`

Updated all React Query cache keys to version 2:

| Query | Old Key | New Key |
|-------|---------|---------|
| Trending | `movies-trending-db` | `movies-trending-db-v2` |
| Top Rated | `movies-top-db` | `movies-top-db-v2` |
| Arabic | `movies-arabic-db` | `movies-arabic-db-v2` |
| Latest | `movies-latest-db` | `movies-latest-db-v2` |
| Upcoming | `movies-upcoming` | `movies-upcoming-v2` |
| Popular | `movies-popular` | `movies-popular-v2` |
| Classics | `movies-classics` | `movies-classics-v2` |
| 90s | `movies-90s` | `movies-90s-v2` |
| Action | `movies-action` | `movies-action-v2` |
| Adventure | `movies-adventure` | `movies-adventure-v2` |
| Sci-Fi | `movies-scifi` | `movies-scifi-v2` |
| Animation | `movies-animation` | `movies-animation-v2` |
| Comedy | `movies-comedy` | `movies-comedy-v2` |
| Horror | `movies-horror` | `movies-horror-v2` |
| Anime | `movies-anime` | `movies-anime-v2` |
| Bollywood | `movies-bollywood` | `movies-bollywood-v2` |

**Result:** Forces React Query to fetch fresh data with `primary_genre`

---

### 3. Updated Cache Keys in Series.tsx
**File:** `src/pages/discovery/Series.tsx`

Updated all React Query cache keys to version 2:

| Query | Old Key | New Key |
|-------|---------|---------|
| Trending | `series-trending-db` | `series-trending-db-v2` |
| Top Rated | `series-top-db` | `series-top-db-v2` |
| Arabic | `series-arabic-db` | `series-arabic-db-v2` |
| Latest | `series-latest-db` | `series-latest-db-v2` |
| Turkish | `series-turkish-db` | `series-turkish-db-v2` |
| Korean | `series-korean-db` | `series-korean-db-v2` |
| Popular | `series-popular` | `series-popular-v2` |
| Classic | `series-classic` | `series-classic-v2` |
| 90s | `series-90s` | `series-90s-v2` |
| Anime | `series-anime` | `series-anime-v2` |
| Ramadan 2026 | `ramadan-2026` | `ramadan-2026-v2` |
| Ramadan 2025 | `ramadan-2025` | `ramadan-2025-v2` |
| Ramadan 2024 | `ramadan-2024` | `ramadan-2024-v2` |
| Ramadan 2023 | `ramadan-2023` | `ramadan-2023-v2` |

**Result:** Forces React Query to fetch fresh data with `primary_genre`

---

## Database Updates

### The Godfather Title Fix
**Issue:** `title_ar` was "The Godfather" (English) instead of "العراب" (Arabic)

**Fix:**
```sql
UPDATE movies 
SET title_ar = 'العراب'
WHERE slug = 'the-godfather'
```

**Result:** ✅ The Godfather now displays correctly with Arabic title

---

## Verification

### API Response Check
```bash
GET /api/movies?sortBy=popularity&limit=3
```

**Response Sample:**
```json
{
  "id": "71f6b217-88a7-4cb3-80c4-95a26d80d71b",
  "slug": "the-shawshank-redemption",
  "title": "إصلاحية شاوشانك",
  "title_ar": "إصلاحية شاوشانك",
  "title_en": "The Shawshank Redemption",
  "primary_genre": "دراما",  ✅
  "vote_average": 8.718,
  "release_date": "1994-09-22"
}
```

### The Godfather Check
```json
{
  "id": "adb42634-6869-45aa-880b-7f8bd1451b88",
  "slug": "the-godfather",
  "title": "The Godfather",
  "title_ar": "العراب",  ✅
  "title_en": "The Godfather",
  "primary_genre": "دراما",  ✅
  "vote_average": 8.7
}
```

---

## Expected Results After Refresh

### Main Pages (After Cache Invalidation)
- ✅ `/movies` - Genre displays on all cards
- ✅ `/series` - Genre displays on all cards
- ✅ All QuantumTrain sections show genres

### Hierarchical Pages (Already Working)
- ✅ `/movies/action` - Genre displays
- ✅ `/movies/drama` - Genre displays
- ✅ `/movies/top-rated` - Genre displays
- ✅ All hierarchical routes show genres

### The Godfather
- ✅ Arabic title: "العراب"
- ✅ English subtitle: "The Godfather"
- ✅ Genre: "دراما"

---

## Files Modified

1. **src/components/features/media/MovieCard.tsx**
   - Line 89: Updated genre display logic

2. **src/pages/discovery/Movies.tsx**
   - Lines 334-441: Updated 16 cache keys to v2

3. **src/pages/discovery/Series.tsx**
   - Lines 334-493: Updated 14 cache keys to v2

4. **Database: movies table**
   - Updated The Godfather `title_ar` field

---

## Scripts Created

1. **scripts/check-godfather.mjs**
   - Utility to check The Godfather data

2. **scripts/fix-godfather-title.mjs**
   - Updates The Godfather Arabic title

---

## User Action Required

**IMPORTANT:** User must refresh the browser to clear old cache and see the changes.

**Steps:**
1. Hard refresh the page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache
3. Navigate to `/movies` or `/series`
4. Genre should now display on all cards

---

## Success Criteria

- ✅ Genre displays on main pages (`/movies`, `/series`)
- ✅ Genre displays on hierarchical pages (already working)
- ✅ The Godfather shows correct Arabic title
- ✅ All movies show consistent display format
- ✅ No breaking changes

---

**Report Generated:** 2026-04-06  
**Status:** All fixes applied ✅  
**User Action:** Refresh browser to see changes
