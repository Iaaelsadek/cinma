# 🗄️ بنية قاعدة البيانات - Database Architecture

## ⚠️ قاعدة أساسية - CRITICAL RULE

**Supabase = تسجيل الأعضاء فقط (Auth ONLY)**
**CockroachDB = قاعدة البيانات الأساسية لكل شيء آخر**

---

## 📊 توزيع الجداول - Table Distribution

### ✅ Supabase Tables (Auth & User Data ONLY)
```
- profiles (معلومات المستخدمين)
- follows (المتابعات)
- watchlist (قائمة المشاهدة للمستخدم) - Uses external_id
- continue_watching (استكمال المشاهدة) - Uses external_id
- history (سجل المشاهدة) - Uses external_id
- activity_feed (نشاطات المستخدم) - Stores external_id in metadata
- activity_likes (إعجابات النشاطات)
- activity_comments (تعليقات النشاطات)
- activity_comment_replies (ردود التعليقات)
- activity_reactions (تفاعلات النشاطات)
- watch_parties (حفلات المشاهدة)
- watch_party_participants (مشاركين الحفلات)
- watch_party_messages (رسائل الحفلات)
- challenges (التحديات)
- user_challenges (تحديات المستخدم)
- achievements (الإنجازات)
- user_achievements (إنجازات المستخدم)
- playlists (قوائم التشغيل)
- playlist_items (عناصر قوائم التشغيل) - Uses external_id
- notifications (الإشعارات)
- user_rankings (ترتيب المستخدمين)
```

**Note**: User data tables now use `external_id` (TMDB ID as string) instead of integer `content_id` to reference content in CockroachDB.

### ✅ CockroachDB Tables (Content Data - PRIMARY DATABASE)
```
- movies (الأفلام) ⭐
- tv_series (المسلسلات) ⭐
- seasons (المواسم) ⭐
- episodes (الحلقات) ⭐
- anime (الأنمي) ⭐
- games (الألعاب) ⭐
- software (البرامج) ⭐
- actors (الممثلين) ⭐
- quran_reciters (القراء) ⭐
- ads (الإعلانات)
- settings (الإعدادات)
- link_checks (فحص الروابط)
- error_reports (تقارير الأخطاء)
- server_provider_configs (إعدادات السيرفرات)
```

---

## 🔧 كيفية الاستخدام - Usage Guide

### ❌ WRONG - Using Supabase for Content
```typescript
// DON'T DO THIS for movies/tv_series/episodes/etc.
const { data } = await supabase.from('movies').select('*')
```

### ✅ CORRECT - Using CockroachDB for Content
```typescript
// Use API endpoint that connects to CockroachDB
const response = await fetch('/api/movies')
const data = await response.json()

// OR use direct CockroachDB connection in backend
import { query } from '../server/lib/db.js'
const result = await query('SELECT * FROM movies WHERE id = $1', [movieId])
```

### ✅ CORRECT - Using Supabase for Auth/User Data
```typescript
// This is fine - Supabase for auth and user-related data
const { data } = await supabase.from('profiles').select('*')
const { data } = await supabase.from('watchlist').select('*')
```

---

## 🚨 للمطورين - For Developers

**قبل كتابة أي كود يستخدم قاعدة بيانات:**

1. ✅ هل الجدول متعلق بالمستخدمين/التسجيل؟ → استخدم Supabase
2. ✅ هل الجدول متعلق بالمحتوى (أفلام/مسلسلات/ألعاب)؟ → استخدم CockroachDB

**Never assume Supabase for content tables!**

---

## 📝 Connection Strings

```env
# Supabase (Auth Only)
VITE_SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co
VITE_SUPABASE_ANON_KEY=...

# CockroachDB (Primary Content Database)
COCKROACHDB_URL=postgresql://cinma-db:...@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

---

## 🔄 Migration Status

**Current Issue**: Frontend code uses `supabase.from('movies')` but should use CockroachDB API endpoints.

**Action Required**: 
1. Create API endpoints in `server/api/` that query CockroachDB
2. Update frontend to use these endpoints instead of Supabase client
3. Keep Supabase ONLY for auth and user-related tables

---

Last Updated: 2026-03-31


## 🔗 External ID Bridge System

### Overview
User data tables in Supabase reference content in CockroachDB using `external_id` (TMDB ID as string) instead of internal database IDs. This creates a stable bridge between the two databases.

### Why External IDs?
- **Stability**: TMDB IDs never change, unlike internal database IDs
- **Portability**: Data can be migrated between databases without breaking references
- **Simplicity**: Direct mapping to external content sources (TMDB, RAWG, IGDB)
- **Flexibility**: Easy to add new content sources in the future

### Schema Structure

#### Watchlist Table
```sql
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  external_id TEXT NOT NULL,  -- TMDB ID as string (e.g., "550")
  external_source TEXT DEFAULT 'tmdb',
  content_type TEXT NOT NULL,  -- 'movie' or 'tv'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_id, content_type)
);
```

#### Continue Watching Table
```sql
CREATE TABLE continue_watching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  external_id TEXT NOT NULL,
  external_source TEXT DEFAULT 'tmdb',
  content_type TEXT NOT NULL,
  progress NUMERIC NOT NULL,
  duration NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_id, content_type)
);
```

#### History Table
```sql
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  external_id TEXT NOT NULL,
  external_source TEXT DEFAULT 'tmdb',
  content_type TEXT NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW()
  -- No unique constraint - allows duplicate entries
);
```

### Usage Examples

#### Adding to Watchlist
```typescript
import { addToWatchlist } from '../lib/supabase'

// Add movie to watchlist using TMDB ID
await addToWatchlist(userId, '550', 'movie')  // Fight Club (TMDB ID: 550)
```

#### Fetching Content Details
```typescript
import { getWatchlist } from '../lib/supabase'
import { fetchBatchContent } from '../services/contentAPI'

// Get watchlist entries (returns external_ids)
const watchlist = await getWatchlist(userId)

// Fetch full content details from CockroachDB
const contentDetails = await fetchBatchContent(
  watchlist.map(item => ({
    external_id: item.external_id,
    content_type: item.content_type
  }))
)
```

#### Activity Feed with External IDs
```typescript
import { addActivity } from '../lib/supabase'

// Activity automatically stores external_id in metadata
await addActivity({
  user_id: userId,
  type: 'watch',
  content_id: '550',  // Stored in metadata.external_id
  content_type: 'movie',
  metadata: {
    external_source: 'tmdb'
  }
})
```

### Batch Content API

The `/api/content/batch` endpoint fetches content details from CockroachDB using external_ids:

```typescript
// POST /api/content/batch
{
  "items": [
    { "external_id": "550", "content_type": "movie" },
    { "external_id": "1396", "content_type": "tv" }
  ]
}

// Response
[
  { id: 550, title: "Fight Club", poster_path: "/...", ... },
  { id: 1396, name: "Breaking Bad", poster_path: "/...", ... }
]
```

### Validation Rules

All functions validate inputs before database operations:

```typescript
// Validates external_id
validateExternalId(externalId)  // Rejects null, empty, whitespace

// Validates content_type
validateContentType(contentType)  // Must be: movie, tv, game, software, actor
```

### Error Handling

All operations include comprehensive error logging:

```typescript
try {
  await addToWatchlist(userId, externalId, contentType)
} catch (error) {
  // Logged with context: userId, externalId, contentType, error message
  logger.error('Failed to add to watchlist', { userId, externalId, contentType, error })
}
```

### Migration Notes

- Old `content_id` (INTEGER) was already a TMDB ID stored as integer
- Migration converts: `external_id = content_id.toString()`
- No complex lookup needed - simple type conversion
- Backward compatible during transition period

---
