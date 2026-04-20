# 🎯 خطة سحب مليون محتوى - الدليل الشامل

**التاريخ:** 2026-04-12  
**الهدف:** سحب 1,000,000+ محتوى إلى CockroachDB

---

## 📊 التوزيع المستهدف

```
أفلام عربية:        50,000
أفلام أجنبية:      200,000
مسلسلات عربية:      30,000
مسلسلات أجنبية:    100,000
أنمي:               50,000
ألعاب:             200,000+
─────────────────────────────
المجموع:           630,000+
مجموع الحلقات:    500,000+
─────────────────────────────
الإجمالي الكلي:  1,130,000+
```

---

## 🗂️ السكريبتات المطلوبة

```
scripts/ingestion/
├── 01_create_content_tables.sql      # إنشاء جميع الجداول
├── 02_seed_movies_arabic.js          # سحب 50,000 فيلم عربي
├── 03_seed_movies_foreign.js         # سحب 200,000 فيلم أجنبي
├── 04_seed_series_arabic.js          # سحب 30,000 مسلسل عربي
├── 05_seed_series_foreign.js         # سحب 100,000 مسلسل أجنبي
├── 06_seed_seasons_episodes.js       # سحب 500,000+ حلقة
├── 07_seed_anime.js                  # سحب 50,000 أنمي
├── 08_seed_games.js                  # سحب 200,000+ لعبة (يحتاج IGDB API)
├── 09_generate_slugs.js              # توليد slugs لكل المحتوى
├── 10_verify_data.js                 # التحقق من البيانات
└── run_all.sh                        # تشغيل الكل بالترتيب
```

---

## 📋 الخطوة 1: إنشاء الجداول

### ملف: `scripts/ingestion/01_create_content_tables.sql`

```sql
-- ============================================================================
-- Script: 01_create_content_tables.sql
-- Purpose: Create all content tables in CockroachDB
-- Date: 2026-04-12
-- ============================================================================

-- ============================================================================
-- PART 1: Movies Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY,                    -- TMDB ID
  title TEXT NOT NULL,
  title_ar TEXT,
  title_original TEXT,
  overview TEXT,
  overview_ar TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,
  runtime INTEGER,
  vote_average NUMERIC(3,1),
  vote_count INTEGER,
  popularity NUMERIC(10,3),
  genres TEXT[],
  language TEXT,
  original_language TEXT,
  slug TEXT UNIQUE,
  slug_ar TEXT,
  slug_en TEXT,
  content_section TEXT,                      -- 'arabic', 'foreign', 'classics'
  primary_genre TEXT,
  category TEXT,
  target_audience TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for movies
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_language ON movies(original_language);
CREATE INDEX IF NOT EXISTS idx_movies_content_section ON movies(content_section);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_slug_ar ON movies(slug_ar);
CREATE INDEX IF NOT EXISTS idx_movies_slug_en ON movies(slug_en);

-- ============================================================================
-- PART 2: TV Series Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tv_series (
  id INTEGER PRIMARY KEY,                    -- TMDB ID
  name TEXT NOT NULL,
  name_ar TEXT,
  name_original TEXT,
  overview TEXT,
  overview_ar TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date DATE,
  last_air_date DATE,
  number_of_seasons INTEGER,
  number_of_episodes INTEGER,
  vote_average NUMERIC(3,1),
  vote_count INTEGER,
  popularity NUMERIC(10,3),
  genres TEXT[],
  language TEXT,
  original_language TEXT,
  slug TEXT UNIQUE,
  slug_ar TEXT,
  slug_en TEXT,
  content_section TEXT,                      -- 'arabic', 'foreign'
  primary_genre TEXT,
  category TEXT,
  target_audience TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tv_series
CREATE INDEX IF NOT EXISTS idx_tv_series_popularity ON tv_series(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_vote_average ON tv_series(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_first_air_date ON tv_series(first_air_date DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_language ON tv_series(original_language);
CREATE INDEX IF NOT EXISTS idx_tv_series_content_section ON tv_series(content_section);
CREATE INDEX IF NOT EXISTS idx_tv_series_slug ON tv_series(slug);

-- ============================================================================
-- PART 3: Seasons Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,                    -- TMDB Season ID
  series_id INTEGER NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  name_ar TEXT,
  overview TEXT,
  overview_ar TEXT,
  poster_path TEXT,
  air_date DATE,
  episode_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, season_number)
);

-- Indexes for seasons
CREATE INDEX IF NOT EXISTS idx_seasons_series_id ON seasons(series_id);
CREATE INDEX IF NOT EXISTS idx_seasons_air_date ON seasons(air_date DESC);

-- ============================================================================
-- PART 4: Episodes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY,                    -- TMDB Episode ID
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  name TEXT,
  name_ar TEXT,
  overview TEXT,
  overview_ar TEXT,
  still_path TEXT,
  air_date DATE,
  runtime INTEGER,
  vote_average NUMERIC(3,1),
  vote_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, episode_number)
);

-- Indexes for episodes
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date DESC);

-- ============================================================================
-- PART 5: Anime Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS anime (
  id INTEGER PRIMARY KEY,                    -- TMDB ID
  name TEXT NOT NULL,
  name_ar TEXT,
  name_original TEXT,
  overview TEXT,
  overview_ar TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date DATE,
  last_air_date DATE,
  number_of_seasons INTEGER,
  number_of_episodes INTEGER,
  vote_average NUMERIC(3,1),
  vote_count INTEGER,
  popularity NUMERIC(10,3),
  genres TEXT[],
  language TEXT,
  original_language TEXT,
  slug TEXT UNIQUE,
  slug_ar TEXT,
  slug_en TEXT,
  primary_genre TEXT,
  category TEXT,
  target_audience TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for anime
CREATE INDEX IF NOT EXISTS idx_anime_popularity ON anime(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_anime_vote_average ON anime(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_anime_first_air_date ON anime(first_air_date DESC);
CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);

-- ============================================================================
-- PART 6: Games Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,                    -- IGDB ID
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  background_image TEXT,
  released DATE,
  rating NUMERIC(3,1),
  ratings_count INTEGER,
  metacritic INTEGER,
  platforms TEXT[],
  genres TEXT[],
  slug TEXT UNIQUE,
  primary_genre TEXT,
  primary_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for games
CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC);
CREATE INDEX IF NOT EXISTS idx_games_released ON games(released DESC);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);

-- ============================================================================
-- PART 7: Software Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS software (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  icon TEXT,
  category TEXT,
  version TEXT,
  size TEXT,
  developer TEXT,
  slug TEXT UNIQUE,
  primary_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for software
CREATE INDEX IF NOT EXISTS idx_software_category ON software(category);
CREATE INDEX IF NOT EXISTS idx_software_slug ON software(slug);

-- ============================================================================
-- PART 8: Actors Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS actors (
  id INTEGER PRIMARY KEY,                    -- TMDB Person ID
  name TEXT NOT NULL,
  name_ar TEXT,
  biography TEXT,
  biography_ar TEXT,
  profile_path TEXT,
  birthday DATE,
  place_of_birth TEXT,
  popularity NUMERIC(10,3),
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for actors
CREATE INDEX IF NOT EXISTS idx_actors_popularity ON actors(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_actors_slug ON actors(slug);

-- ============================================================================
-- PART 9: Reviews Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,                     -- Supabase user ID
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,                -- 'movie', 'tv', 'game', 'software'
  rating NUMERIC(2,1),
  review_text TEXT,
  likes_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_content ON reviews(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================================================
-- PART 10: Link Checks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS link_checks (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  server_name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',             -- 'working', 'broken', 'pending'
  last_checked TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for link_checks
CREATE INDEX IF NOT EXISTS idx_link_checks_content ON link_checks(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_link_checks_status ON link_checks(status);

-- ============================================================================
-- PART 11: Error Reports Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_reports (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  content_id INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  error_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',             -- 'pending', 'resolved', 'ignored'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for error_reports
CREATE INDEX IF NOT EXISTS idx_error_reports_content ON error_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status);

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'movies', 'tv_series', 'seasons', 'episodes', 'anime', 
    'games', 'software', 'actors', 'reviews', 'link_checks', 'error_reports'
  )
ORDER BY table_name;

```

---

## 📋 الخطوة 2: سحب الأفلام العربية (50,000)

### ملف: `scripts/ingestion/02_seed_movies_arabic.js`

سأنشئ هذا الملف في الرسالة التالية...

---

## ⏱️ الوقت المتوقع

```
إنشاء الجداول:           5 دقائق
سحب الأفلام العربية:     2-3 ساعات
سحب الأفلام الأجنبية:    8-10 ساعات
سحب المسلسلات العربية:   1-2 ساعات
سحب المسلسلات الأجنبية:  4-6 ساعات
سحب الحلقات:             20-30 ساعات
سحب الأنمي:              2-3 ساعات
سحب الألعاب:             8-10 ساعات
توليد Slugs:             2-3 ساعات
─────────────────────────────────────
الإجمالي:               48-68 ساعة (2-3 أيام)
```

---

## 🚀 الخطوات التالية

1. ✅ إنشاء مجلد `scripts/ingestion/`
2. ✅ إنشاء ملف `01_create_content_tables.sql`
3. ⏳ إنشاء سكريبتات السحب (02-09)
4. ⏳ إنشاء سكريبت التشغيل الكامل `run_all.sh`

**هل تريدني أكمل إنشاء باقي السكريبتات؟**
