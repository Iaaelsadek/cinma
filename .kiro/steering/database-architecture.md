---
inclusion: always
---

# 🗄️ Database Architecture - CRITICAL RULES

## ⚠️ ABSOLUTE RULE - READ THIS FIRST

```
Supabase = Authentication & User Data ONLY (NO EXCEPTIONS)
CockroachDB = Primary Database for ALL Content
```

**This has been stated 100+ times. DO NOT IGNORE.**

**NO EXCEPTIONS. NO SPECIAL CASES. NO TEMPORARY TABLES IN SUPABASE.**

---

## 🚨 FORBIDDEN Operations

### ❌ NEVER DO THIS:
```typescript
// WRONG - Content is in CockroachDB, NOT Supabase!
await supabase.from('movies').select('*')
await supabase.from('tv_series').select('*')
await supabase.from('seasons').select('*')
await supabase.from('episodes').select('*')
await supabase.from('anime').select('*')
await supabase.from('actors').select('*')
await supabase.from('reviews').select('*') // Reviews are content data!
```

---

## ✅ CORRECT Operations

### For Content (Movies, Series, Episodes, etc.):
```typescript
// Use CockroachDB API services
import { getMovies, getTVSeries, searchContent } from '../services/contentQueries'
import { getSeasons, getEpisodes } from '../services/contentAPI'

const movies = await getMovies()
const series = await getTVSeriesDetails(123)
const seasons = await getSeasons(seriesId)
```

### For Auth & User Data:
```typescript
// Use Supabase ONLY for these tables
import { supabase } from '../lib/supabase'

await supabase.from('profiles').select('*')
await supabase.from('continue_watching').select('*')
await supabase.from('history').select('*')
await supabase.from('follows').select('*')
```

---

## 📋 Quick Reference

### Supabase Tables (Allowed):
- profiles, follows, continue_watching, history
- activity_feed, activity_likes, activity_comments
- challenges, achievements, playlists, notifications

### CockroachDB Tables (Use API):
- movies, tv_series, seasons, episodes
- anime, actors
- reviews, review_likes, review_reports
- ads, settings, link_checks, error_reports
- dailymotion_videos
- videos (YouTube summaries and content)

---

## 🔗 Connection Strings

```env
# Supabase (Auth Only)
VITE_SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co

# CockroachDB (Primary Database)
COCKROACHDB_URL=postgresql://cinma-db:...@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb
```

---

## 📚 Documentation Files

- `.kiro/DATABASE_ARCHITECTURE.md` - Full architecture details
- `.kiro/DEVELOPER_RULES.md` - Developer guidelines
- `.kiro/SUPABASE_VS_COCKROACHDB.md` - Complete comparison

---

## 🤖 For AI Assistants

**Before writing ANY database code:**

1. ✅ Check if table is user-related → Use Supabase
2. ✅ Check if table is content-related → Use CockroachDB API
3. ✅ Read `.kiro/DEVELOPER_RULES.md` if unsure
4. ✅ NEVER assume Supabase for content tables

**This rule has been violated multiple times. It MUST NOT happen again.**

---

Last Updated: 2026-04-04
**This steering file is ALWAYS included in context.**
