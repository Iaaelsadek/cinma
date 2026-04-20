# 🚨 قواعد المطورين - Developer Rules

## ⚠️ القاعدة الذهبية - GOLDEN RULE

```
Supabase = Auth ONLY (تسجيل الأعضاء فقط)
CockroachDB = Everything Else (كل شيء آخر)
```

---

## 📊 توزيع قواعد البيانات - Database Distribution

### ✅ استخدم Supabase لـ:
```typescript
// User authentication and profiles
import { supabase } from '../lib/supabase'

await supabase.from('profiles').select('*')
await supabase.from('watchlist').select('*')
await supabase.from('continue_watching').select('*')
await supabase.from('history').select('*')
await supabase.from('follows').select('*')
await supabase.from('activity_feed').select('*')
await supabase.from('watch_parties').select('*')
await supabase.from('challenges').select('*')
await supabase.from('achievements').select('*')
await supabase.from('playlists').select('*')
await supabase.from('notifications').select('*')
```

### ✅ استخدم CockroachDB API لـ:
```typescript
// Content queries (movies, series, episodes, etc.)
import { getMovies, getTVSeries, searchContent } from '../services/contentQueries'
import { getSeasons, getEpisodes, getSeriesById } from '../services/contentAPI'

// Get movies
const movies = await getMovies()

// Get series details
const series = await getSeriesById(123)

// Get seasons
const seasons = await getSeasons(seriesId)

// Get episodes
const episodes = await getEpisodes(seasonId)
```

---

## ❌ ممنوع منعاً باتاً - STRICTLY FORBIDDEN

```typescript
// ❌ NEVER DO THIS - Content is in CockroachDB, not Supabase!
await supabase.from('movies').select('*')
await supabase.from('tv_series').select('*')
await supabase.from('seasons').select('*')
await supabase.from('episodes').select('*')
await supabase.from('anime').select('*')
await supabase.from('games').select('*')
await supabase.from('software').select('*')
await supabase.from('actors').select('*')
```

---

## 🔧 كيفية الاستعلام - Query Patterns

### Pattern 1: جلب قائمة محتوى
```typescript
import { getMovies, getTVSeries } from '../services/contentQueries'

// Get trending movies
const { data: movies } = await getMovies(
  {}, // filters
  { field: 'popularity', order: 'desc' }, // sort
  { page: 1, limit: 20 } // pagination
)

// Get Arabic series
const { data: series } = await getTVSeries(
  { language: 'ar' },
  { field: 'popularity', order: 'desc' },
  { page: 1, limit: 20 }
)
```

### Pattern 2: جلب تفاصيل محتوى
```typescript
import { getMovieDetails, getTVSeriesDetails } from '../services/contentQueries'

// Get movie by ID
const movie = await getMovieDetails(123)

// Get series by ID
const series = await getTVSeriesDetails(456)
```

### Pattern 3: البحث
```typescript
import { searchContent } from '../services/contentQueries'

// Search all content
const results = await searchContent('spider man', 'all', { page: 1, limit: 20 })

// Search only movies
const movies = await searchContent('spider man', 'movie', { page: 1, limit: 20 })
```

### Pattern 4: المواسم والحلقات
```typescript
import { getSeasons, getEpisodes } from '../services/contentAPI'

// Get all seasons for a series
const seasons = await getSeasons(seriesId)

// Get all episodes for a season
const episodes = await getEpisodes(seasonId)
```

---

## 🏗️ بنية المشروع - Project Structure

```
src/
├── services/
│   ├── contentQueries.ts    ← استعلامات المحتوى (CockroachDB API)
│   └── contentAPI.ts        ← إدارة المسلسلات والحلقات (CockroachDB API)
├── lib/
│   └── supabase.ts          ← Auth والمستخدمين فقط (Supabase)
server/
├── api/
│   └── db.js                ← CockroachDB API endpoints
└── lib/
    └── db.js                ← CockroachDB connection pool
```

---

## 🔍 كيف تتحقق - How to Verify

قبل كتابة أي كود:

1. **هل الجدول متعلق بالمستخدمين؟**
   - profiles, watchlist, history, follows → ✅ Supabase
   
2. **هل الجدول متعلق بالمحتوى؟**
   - movies, tv_series, seasons, episodes → ✅ CockroachDB API

3. **غير متأكد؟**
   - راجع `.kiro/DATABASE_ARCHITECTURE.md`

---

## 📝 Checklist للمراجعة

عند مراجعة Pull Request:

- [ ] لا يوجد `supabase.from('movies')`
- [ ] لا يوجد `supabase.from('tv_series')`
- [ ] لا يوجد `supabase.from('seasons')`
- [ ] لا يوجد `supabase.from('episodes')`
- [ ] جميع استعلامات المحتوى تستخدم `contentQueries.ts` أو `contentAPI.ts`
- [ ] Supabase يستخدم فقط للـ auth والمستخدمين

---

## 🚀 API Endpoints المتاحة

### Movies
- `GET /api/db/movies/trending?limit=20`
- `GET /api/db/movies/:id`
- `GET /api/db/movies/:slug`
- `POST /api/db/movies/search`

### TV Series
- `GET /api/db/tv/trending?limit=20`
- `GET /api/db/tv/:id`
- `GET /api/db/tv/:slug`
- `GET /api/db/tv/:id/seasons`
- `GET /api/db/tv/seasons/:id/episodes`
- `POST /api/db/tv/search`

### Search
- `GET /api/db/search?q=query&type=all|movie|tv`

### Slug Resolution
- `POST /api/db/slug/resolve` - Resolve single slug
- `POST /api/db/slug/resolve-batch` - Resolve multiple slugs

---

Last Updated: 2026-03-31
**This is the source of truth. Follow it religiously.**
