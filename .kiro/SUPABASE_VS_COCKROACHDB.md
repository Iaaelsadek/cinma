# 🗄️ Supabase vs CockroachDB - الدليل الكامل

## 🎯 الفكرة الأساسية

```
┌─────────────────────────────────────────────────────────┐
│  Supabase = Auth + User Data ONLY                      │
│  CockroachDB = Content + Everything Else               │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 جداول Supabase (Auth & User فقط)

### Authentication & Profiles
```sql
profiles                    -- معلومات المستخدمين
follows                     -- المتابعات بين المستخدمين
```

### User Activity
```sql
watchlist                   -- قائمة المشاهدة
continue_watching           -- استكمال المشاهدة
history                     -- سجل المشاهدة
activity_feed               -- نشاطات المستخدم
activity_likes              -- إعجابات
activity_comments           -- تعليقات
activity_comment_replies    -- ردود
activity_reactions          -- تفاعلات
```

### Social Features
```sql
watch_parties               -- حفلات المشاهدة
watch_party_participants    -- المشاركين
watch_party_messages        -- الرسائل
```

### Gamification
```sql
challenges                  -- التحديات
user_challenges             -- تحديات المستخدم
achievements                -- الإنجازات
user_achievements           -- إنجازات المستخدم
user_rankings               -- الترتيب
```

### Playlists & Notifications
```sql
playlists                   -- قوائم التشغيل
playlist_items              -- عناصر القوائم
notifications               -- الإشعارات
```

---

## 📊 جداول CockroachDB (المحتوى الأساسي)

### Core Content
```sql
movies                      -- الأفلام ⭐
tv_series                   -- المسلسلات ⭐
seasons                     -- المواسم ⭐
episodes                    -- الحلقات ⭐
```

### Additional Content
```sql
anime                       -- الأنمي
games                       -- الألعاب
software                    -- البرامج
actors                      -- الممثلين
quran_reciters              -- القراء
```

### System Tables
```sql
ads                         -- الإعلانات
settings                    -- الإعدادات
link_checks                 -- فحص الروابط
error_reports               -- تقارير الأخطاء
server_provider_configs     -- إعدادات السيرفرات
```

---

## 🔧 كيفية الاستخدام - Code Examples

### ✅ CORRECT: Supabase للـ Auth والمستخدمين

```typescript
import { supabase } from '../lib/supabase'

// Get user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// Add to watchlist
await supabase
  .from('watchlist')
  .insert({ user_id: userId, content_id: movieId, content_type: 'movie' })

// Get watch history
const { data: history } = await supabase
  .from('history')
  .select('*')
  .eq('user_id', userId)
```

### ✅ CORRECT: CockroachDB للمحتوى

```typescript
import { getMovies, getTVSeries, searchContent } from '../services/contentQueries'
import { getSeasons, getEpisodes } from '../services/contentAPI'

// Get trending movies
const { data: movies } = await getMovies()

// Get series details
const series = await getTVSeriesDetails(123)

// Get seasons
const seasons = await getSeasons(seriesId)

// Search content
const results = await searchContent('spider man', 'all')
```

### ❌ WRONG: استخدام Supabase للمحتوى

```typescript
// ❌ DON'T DO THIS!
const { data } = await supabase.from('movies').select('*')
const { data } = await supabase.from('tv_series').select('*')
const { data } = await supabase.from('episodes').select('*')

// ✅ DO THIS INSTEAD:
import { getMovies, getTVSeries } from '../services/contentQueries'
const { data: movies } = await getMovies()
const series = await getTVSeriesDetails(123)
```

---

## 🚀 API Endpoints المتاحة

### Movies
```
GET  /api/db/movies/trending?limit=20
GET  /api/db/movies/random?limit=10&min_rating=7
GET  /api/db/movies/:id
GET  /api/db/movies/:slug
POST /api/db/movies/search
```

### TV Series
```
GET  /api/db/tv/trending?limit=20
GET  /api/db/tv/random?limit=10&min_rating=7
GET  /api/db/tv/:id
GET  /api/db/tv/:slug
GET  /api/db/tv/:id/seasons
GET  /api/db/tv/seasons/:id/episodes
POST /api/db/tv/search
```

### Search
```
GET  /api/db/search?q=query&type=all|movie|tv&page=1&limit=20
```

### Home Page
```
GET  /api/db/home
```

### Slug Resolution
```
POST /api/db/slug/resolve
POST /api/db/slug/resolve-batch
POST /api/db/slug/get-by-id
```

---

## 📁 الملفات المهمة

### Services (Frontend)
```
src/services/contentQueries.ts      - استعلامات المحتوى (read)
src/services/contentAPI.ts          - Series/Episodes operations
src/services/adminContentAPI.ts     - Admin operations (write)
```

### Backend
```
server/api/db.js                    - CockroachDB API endpoints
server/lib/db.js                    - CockroachDB connection pool
```

### Auth (Supabase)
```
src/lib/supabase.ts                 - Auth & User operations ONLY
```

---

## 🔍 كيف تتحقق من الكود

### Checklist للمراجعة:

```bash
# ابحث عن استخدامات خاطئة
grep -r "supabase.from('movies')" src/
grep -r "supabase.from('tv_series')" src/
grep -r "supabase.from('episodes')" src/
grep -r "supabase.from('seasons')" src/

# يجب أن تكون النتيجة: 0 matches
```

### إذا وجدت أي استخدام:
1. استبدله بـ `contentQueries.ts` أو `contentAPI.ts`
2. أو استخدم `/api/db/*` endpoints مباشرة

---

## 🚨 تحذيرات مهمة

### ⚠️ للمطورين الجدد:
1. **لا تفترض أن Supabase تحتوي على المحتوى**
2. **اقرأ هذا الملف قبل كتابة أي كود**
3. **استخدم `contentQueries.ts` دائماً للمحتوى**

### ⚠️ للـ AI Assistants:
1. **Supabase = Auth ONLY (100 times!)**
2. **CockroachDB = Primary Database for Content**
3. **Read `.kiro/DEVELOPER_RULES.md` before any code changes**
4. **NEVER use `supabase.from('movies')` or similar**

---

## 📝 ملخص التغييرات

### ما تم:
- ✅ فصل Supabase عن المحتوى بالكامل
- ✅ إنشاء API endpoints في `server/api/db.js`
- ✅ إنشاء services في `src/services/`
- ✅ تحديث معظم الصفحات
- ✅ إضافة slugs لجميع المحتوى في CockroachDB
- ✅ توثيق شامل

### ما يحتاج تحديث:
- ⚠️ `src/pages/admin/series/SeriesManage.tsx`
- ⚠️ `src/context/AdminContext.tsx`
- ⚠️ `src/pages/discovery/Search.tsx` (anime queries)
- ⚠️ `src/pages/admin/ContentHealth.tsx`

---

## 🎉 النتيجة النهائية

**قاعدة بيانات واضحة ومنظمة:**
- Supabase → Auth & Users
- CockroachDB → Content & Everything Else

**لن يتكرر الخطأ مرة أخرى!**

---

Last Updated: 2026-03-31
