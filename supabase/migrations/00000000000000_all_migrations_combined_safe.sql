-- SAFE REPLAY COMBINED MIGRATION FILE
-- Generated at: 2026-03-10T17:40:30.8131422+02:00
-- Source: 00000000000000_all_migrations_combined.sql
-- Notes: normalized IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS

-- AUTO-GENERATED COMBINED MIGRATION FILE
-- Generated at: 2026-03-10
-- Source files count: 76

-- ==============================
-- BEGIN FILE: 20240217_fix_missing_tables.sql
-- ==============================

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movies ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select ON categories;
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY categories_select ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS categories_modify_admin ON categories;
DROP POLICY IF EXISTS "categories_modify_admin" ON categories;
CREATE POLICY categories_modify_admin ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ==============================
-- END FILE: 20240217_fix_missing_tables.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240523000000_add_mena_tags.sql
-- ==============================

-- Add columns to support advanced filtering for MENA market

-- Movies: Add origin_country and is_play
ALTER TABLE public.movies 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_play BOOLEAN DEFAULT FALSE;

-- Series: Add origin_country and is_ramadan
ALTER TABLE public.tv_series 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_ramadan BOOLEAN DEFAULT FALSE;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_movies_is_play ON public.movies(is_play);
CREATE INDEX IF NOT EXISTS idx_series_is_ramadan ON public.tv_series(is_ramadan);
CREATE INDEX IF NOT EXISTS idx_series_origin_country ON public.tv_series USING GIN(origin_country);

-- ==============================
-- END FILE: 20240523000000_add_mena_tags.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240601_add_surah_list.sql
-- ==============================


ALTER TABLE quran_reciters ADD COLUMN IF NOT EXISTS surah_list text;

-- ==============================
-- END FILE: 20240601_add_surah_list.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240701000000_create_quran_table.sql
-- ==============================


-- Create quran_reciters table if not exists
CREATE TABLE IF NOT EXISTS public.quran_reciters (
    id INTEGER PRIMARY KEY,
    name TEXT,
    rewaya TEXT,
    server TEXT,
    letter TEXT,
    category TEXT,
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_quran_reciters_name ON public.quran_reciters USING btree (name);

-- Enable RLS
ALTER TABLE public.quran_reciters ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'quran_reciters'
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.quran_reciters FOR SELECT USING (true);
    END IF;
END
$$;

-- Create policy to allow service role full access if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'quran_reciters'
        AND policyname = 'Allow service role full access'
    ) THEN
        CREATE POLICY "Allow service role full access" ON public.quran_reciters USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- ==============================
-- END FILE: 20240701000000_create_quran_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240701000001_fix_schema.sql
-- ==============================

-- Add missing columns to movies table
ALTER TABLE IF EXISTS movies 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arabic_title TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow',
ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trailer_url TEXT,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add missing columns to tv_series table
ALTER TABLE IF EXISTS tv_series 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arabic_title TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow',
ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS trailer_url TEXT,
ADD COLUMN IF NOT EXISTS first_air_date DATE;

-- Unify other content tables
ALTER TABLE IF EXISTS games 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS software 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Ensure anime table has correct columns
ALTER TABLE IF EXISTS anime 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'green';

-- Ensure quran_reciters table has correct columns
ALTER TABLE IF EXISTS quran_reciters 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Ensure tables exist if they don't (fallback)
CREATE TABLE IF NOT EXISTS movies ( 
   id BIGINT PRIMARY KEY, 
   title TEXT NOT NULL, 
   arabic_title TEXT, 
   overview TEXT, 
   ai_summary TEXT, 
   rating_color TEXT DEFAULT 'yellow', 
   genres JSONB, 
   release_date DATE, 
   poster_path TEXT, 
   backdrop_path TEXT, 
   trailer_key TEXT, 
   trailer_url TEXT, 
   embed_links JSONB DEFAULT '{}'::JSONB, 
   subtitle_urls JSONB DEFAULT '{}'::JSONB, 
   last_checked TIMESTAMPTZ, 
   is_active BOOLEAN DEFAULT true, 
   featured BOOLEAN DEFAULT false, 
   source TEXT, 
   created_at TIMESTAMPTZ DEFAULT NOW(), 
   updated_at TIMESTAMPTZ DEFAULT NOW() 
); 

CREATE TABLE IF NOT EXISTS tv_series (LIKE movies INCLUDING ALL);
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS first_air_date DATE;

-- Ensure link_checks table exists
CREATE TABLE IF NOT EXISTS link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
);

-- RLS Policies
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS continue_watching ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tv_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS embed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS software ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quran_reciters ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS profiles_delete ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Watchlist Policies
DROP POLICY IF EXISTS watchlist_select ON watchlist;
DROP POLICY IF EXISTS "watchlist_select" ON watchlist;
CREATE POLICY watchlist_select ON watchlist FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_select_admin ON watchlist;
DROP POLICY IF EXISTS "watchlist_select_admin" ON watchlist;
CREATE POLICY watchlist_select_admin ON watchlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS watchlist_insert ON watchlist;
DROP POLICY IF EXISTS "watchlist_insert" ON watchlist;
CREATE POLICY watchlist_insert ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_update ON watchlist;
DROP POLICY IF EXISTS "watchlist_update" ON watchlist;
CREATE POLICY watchlist_update ON watchlist FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_delete ON watchlist;
DROP POLICY IF EXISTS "watchlist_delete" ON watchlist;
CREATE POLICY watchlist_delete ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Continue Watching Policies
DROP POLICY IF EXISTS continue_watching_select ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_select" ON continue_watching;
CREATE POLICY continue_watching_select ON continue_watching FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_select_admin ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_select_admin" ON continue_watching;
CREATE POLICY continue_watching_select_admin ON continue_watching FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS continue_watching_insert ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_insert" ON continue_watching;
CREATE POLICY continue_watching_insert ON continue_watching FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_update ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_update" ON continue_watching;
CREATE POLICY continue_watching_update ON continue_watching FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_delete ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_delete" ON continue_watching;
CREATE POLICY continue_watching_delete ON continue_watching FOR DELETE USING (auth.uid() = user_id);

-- History Policies
DROP POLICY IF EXISTS history_select ON history;
DROP POLICY IF EXISTS "history_select" ON history;
CREATE POLICY history_select ON history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS history_select_admin ON history;
DROP POLICY IF EXISTS "history_select_admin" ON history;
CREATE POLICY history_select_admin ON history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS history_insert ON history;
DROP POLICY IF EXISTS "history_insert" ON history;
CREATE POLICY history_insert ON history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS history_delete ON history;
DROP POLICY IF EXISTS "history_delete" ON history;
CREATE POLICY history_delete ON history FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL OR to_regclass('comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS comments_select ON comments;
    DROP POLICY IF EXISTS "comments_select" ON comments;
    CREATE POLICY comments_select ON comments FOR SELECT USING (true);
    DROP POLICY IF EXISTS comments_insert ON comments;
    DROP POLICY IF EXISTS "comments_insert" ON comments;
    CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS comments_update ON comments;
    DROP POLICY IF EXISTS "comments_update" ON comments;
    CREATE POLICY comments_update ON comments FOR UPDATE USING (
      auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
      auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
    DROP POLICY IF EXISTS comments_delete ON comments;
    DROP POLICY IF EXISTS "comments_delete" ON comments;
    CREATE POLICY comments_delete ON comments FOR DELETE USING (
      auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END
$$;

-- Movies Policies
DROP POLICY IF EXISTS movies_select ON movies;
DROP POLICY IF EXISTS "movies_select" ON movies;
CREATE POLICY movies_select ON movies FOR SELECT USING (true);
DROP POLICY IF EXISTS movies_modify_admin ON movies;
DROP POLICY IF EXISTS "movies_modify_admin" ON movies;
CREATE POLICY movies_modify_admin ON movies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- TV Series Policies
DROP POLICY IF EXISTS tv_series_select ON tv_series;
DROP POLICY IF EXISTS "tv_series_select" ON tv_series;
CREATE POLICY tv_series_select ON tv_series FOR SELECT USING (true);
DROP POLICY IF EXISTS tv_series_modify_admin ON tv_series;
DROP POLICY IF EXISTS "tv_series_modify_admin" ON tv_series;
CREATE POLICY tv_series_modify_admin ON tv_series FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Seasons Policies
DROP POLICY IF EXISTS seasons_select ON seasons;
DROP POLICY IF EXISTS "seasons_select" ON seasons;
CREATE POLICY seasons_select ON seasons FOR SELECT USING (true);
DROP POLICY IF EXISTS seasons_modify_admin ON seasons;
DROP POLICY IF EXISTS "seasons_modify_admin" ON seasons;
CREATE POLICY seasons_modify_admin ON seasons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Episodes Policies
DROP POLICY IF EXISTS episodes_select ON episodes;
DROP POLICY IF EXISTS "episodes_select" ON episodes;
CREATE POLICY episodes_select ON episodes FOR SELECT USING (true);
DROP POLICY IF EXISTS episodes_modify_admin ON episodes;
DROP POLICY IF EXISTS "episodes_modify_admin" ON episodes;
CREATE POLICY episodes_modify_admin ON episodes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Videos Policies
DROP POLICY IF EXISTS videos_select ON videos;
DROP POLICY IF EXISTS "videos_select" ON videos;
CREATE POLICY videos_select ON videos FOR SELECT USING (true);
DROP POLICY IF EXISTS videos_modify_admin ON videos;
DROP POLICY IF EXISTS "videos_modify_admin" ON videos;
CREATE POLICY videos_modify_admin ON videos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Ads Policies
DO $$
BEGIN
  IF to_regclass('public.ads') IS NOT NULL OR to_regclass('ads') IS NOT NULL THEN
    DROP POLICY IF EXISTS ads_select ON ads;
    DROP POLICY IF EXISTS "ads_select" ON ads;
    CREATE POLICY ads_select ON ads FOR SELECT USING (true);
    DROP POLICY IF EXISTS ads_modify_admin ON ads;
    DROP POLICY IF EXISTS "ads_modify_admin" ON ads;
    CREATE POLICY ads_modify_admin ON ads FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END
$$;

-- Settings Policies
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL OR to_regclass('settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS settings_select_admin ON settings;
    DROP POLICY IF EXISTS "settings_select_admin" ON settings;
    CREATE POLICY settings_select_admin ON settings FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
    DROP POLICY IF EXISTS settings_modify_admin ON settings;
    DROP POLICY IF EXISTS "settings_modify_admin" ON settings;
    CREATE POLICY settings_modify_admin ON settings FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END
$$;

-- Embed Sources Policies
DROP POLICY IF EXISTS embed_sources_select ON embed_sources;
DROP POLICY IF EXISTS "embed_sources_select" ON embed_sources;
CREATE POLICY embed_sources_select ON embed_sources FOR SELECT USING (true);
DROP POLICY IF EXISTS embed_sources_modify_admin ON embed_sources;
DROP POLICY IF EXISTS "embed_sources_modify_admin" ON embed_sources;
CREATE POLICY embed_sources_modify_admin ON embed_sources FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Link Checks Policies
DROP POLICY IF EXISTS link_checks_select_admin ON link_checks;
DROP POLICY IF EXISTS "link_checks_select_admin" ON link_checks;
CREATE POLICY link_checks_select_admin ON link_checks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS link_checks_insert_auth ON link_checks;
DROP POLICY IF EXISTS "link_checks_insert_auth" ON link_checks;
CREATE POLICY link_checks_insert_auth ON link_checks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS link_checks_modify_admin ON link_checks;
DROP POLICY IF EXISTS "link_checks_modify_admin" ON link_checks;
CREATE POLICY link_checks_modify_admin ON link_checks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Games Policies
DROP POLICY IF EXISTS games_select ON games;
DROP POLICY IF EXISTS "games_select" ON games;
CREATE POLICY games_select ON games FOR SELECT USING (true);
DROP POLICY IF EXISTS games_modify_admin ON games;
DROP POLICY IF EXISTS "games_modify_admin" ON games;
CREATE POLICY games_modify_admin ON games FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Software Policies
DROP POLICY IF EXISTS software_select ON software;
DROP POLICY IF EXISTS "software_select" ON software;
CREATE POLICY software_select ON software FOR SELECT USING (true);
DROP POLICY IF EXISTS software_modify_admin ON software;
DROP POLICY IF EXISTS "software_modify_admin" ON software;
CREATE POLICY software_modify_admin ON software FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Anime Policies
DROP POLICY IF EXISTS anime_select ON anime;
DROP POLICY IF EXISTS "anime_select" ON anime;
CREATE POLICY anime_select ON anime FOR SELECT USING (true);
DROP POLICY IF EXISTS anime_modify_admin ON anime;
DROP POLICY IF EXISTS "anime_modify_admin" ON anime;
CREATE POLICY anime_modify_admin ON anime FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Quran Reciters Policies
DROP POLICY IF EXISTS quran_reciters_select ON quran_reciters;
DROP POLICY IF EXISTS "quran_reciters_select" ON quran_reciters;
CREATE POLICY quran_reciters_select ON quran_reciters FOR SELECT USING (true);
DROP POLICY IF EXISTS quran_reciters_modify_admin ON quran_reciters;
DROP POLICY IF EXISTS "quran_reciters_modify_admin" ON quran_reciters;
CREATE POLICY quran_reciters_modify_admin ON quran_reciters FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ==============================
-- END FILE: 20240701000001_fix_schema.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240701000002_full_setup.sql
-- ==============================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  website text,
  role text DEFAULT 'user'::text,
  updated_at timestamp with time zone,
  PRIMARY KEY (id)
);

-- Create movies table
CREATE TABLE IF NOT EXISTS public.movies (
   id BIGINT PRIMARY KEY, -- TMDB ID 
   title TEXT NOT NULL, 
   arabic_title TEXT, 
   overview TEXT, 
   ai_summary TEXT, 
   rating_color TEXT DEFAULT 'yellow', 
   genres JSONB, 
   release_date DATE, 
   poster_path TEXT, 
   backdrop_path TEXT, 
   trailer_key TEXT, 
   trailer_url TEXT, 
   embed_links JSONB DEFAULT '{}'::JSONB, 
   subtitle_urls JSONB DEFAULT '{}'::JSONB, 
   last_checked TIMESTAMPTZ, 
   is_active BOOLEAN DEFAULT true, 
   featured BOOLEAN DEFAULT false, 
   source TEXT, 
   created_at TIMESTAMPTZ DEFAULT NOW(), 
   updated_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- Create tv_series table
CREATE TABLE IF NOT EXISTS public.tv_series (LIKE movies INCLUDING ALL); 
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS first_air_date DATE;

-- Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons ( 
   id SERIAL PRIMARY KEY, 
   series_id BIGINT REFERENCES tv_series(id) ON DELETE CASCADE, 
   season_number INT, 
   name TEXT, 
   overview TEXT, 
   poster_path TEXT, 
   air_date DATE 
); 

-- Create episodes table
CREATE TABLE IF NOT EXISTS public.episodes ( 
   id SERIAL PRIMARY KEY, 
   season_id INT REFERENCES seasons(id) ON DELETE CASCADE, 
   episode_number INT, 
   name TEXT, 
   overview TEXT, 
   still_path TEXT, 
   air_date DATE, 
   embed_links JSONB DEFAULT '{}'::JSONB, 
   subtitle_urls JSONB DEFAULT '{}'::JSONB 
); 

-- Create embed_sources table
CREATE TABLE IF NOT EXISTS public.embed_sources ( 
   id SERIAL PRIMARY KEY, 
   name TEXT UNIQUE, 
   base_url TEXT, 
   url_pattern TEXT, 
   priority INT DEFAULT 5, 
   is_active BOOLEAN DEFAULT true, 
   last_checked TIMESTAMPTZ, 
   response_time_ms INT 
); 

-- Create link_checks table
CREATE TABLE IF NOT EXISTS public.link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
);

-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    duration INTEGER,
    views INTEGER,
    url TEXT NOT NULL,
    thumbnail TEXT,
    channel TEXT,
    category TEXT NOT NULL,
    source_platform TEXT NOT NULL DEFAULT 'youtube',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quran_reciters table
CREATE TABLE IF NOT EXISTS public.quran_reciters (
    id INTEGER PRIMARY KEY,
    name TEXT,
    rewaya TEXT,
    server TEXT,
    letter TEXT,
    category TEXT,
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create missing tables referenced in policies
CREATE TABLE IF NOT EXISTS public.watchlist (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    content_id BIGINT,
    content_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

CREATE TABLE IF NOT EXISTS public.continue_watching (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    content_id BIGINT,
    content_type TEXT,
    progress INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

CREATE TABLE IF NOT EXISTS public.history (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    content_id BIGINT,
    content_type TEXT,
    watched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comments (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    content_id BIGINT,
    content_type TEXT,
    text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ads (
    id SERIAL PRIMARY KEY,
    type TEXT,
    content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.games (
    id BIGINT PRIMARY KEY,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date DATE,
    download_urls JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.software (
    id BIGINT PRIMARY KEY,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    version TEXT,
    download_urls JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anime (
    id BIGINT PRIMARY KEY,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date DATE,
    embed_links JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    rating_color TEXT DEFAULT 'green',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial embed sources
DO $$
BEGIN
  IF to_regclass('public.embed_sources') IS NOT NULL OR to_regclass('embed_sources') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'embed_sources'
        AND column_name = 'base_url'
    ) THEN
      INSERT INTO embed_sources (name, base_url, url_pattern, priority) VALUES 
      ('vidsrc', 'https://vidsrc.to', 'https://vidsrc.to/embed/{type}/{id}', 1),
      ('2embed', 'https://www.2embed.cc', 'https://www.2embed.cc/embed/{id}', 2),
      ('embed_su', 'https://embed.su', 'https://embed.su/embed/{type}/{id}', 3)
      ON CONFLICT (name) DO NOTHING;
    ELSE
      INSERT INTO embed_sources (name, url_pattern, priority) VALUES 
      ('vidsrc', 'https://vidsrc.to/embed/{type}/{id}', 1),
      ('2embed', 'https://www.2embed.cc/embed/{id}', 2),
      ('embed_su', 'https://embed.su/embed/{type}/{id}', 3)
      ON CONFLICT (name) DO NOTHING;
    END IF;
  END IF;
END
$$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE continue_watching ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS embed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_reciters ENABLE ROW LEVEL SECURITY;

-- Apply Policies

-- Profiles
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Watchlist
DROP POLICY IF EXISTS watchlist_select ON watchlist;
DROP POLICY IF EXISTS "watchlist_select" ON watchlist;
CREATE POLICY watchlist_select ON watchlist FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_insert ON watchlist;
DROP POLICY IF EXISTS "watchlist_insert" ON watchlist;
CREATE POLICY watchlist_insert ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_delete ON watchlist;
DROP POLICY IF EXISTS "watchlist_delete" ON watchlist;
CREATE POLICY watchlist_delete ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Continue Watching
DROP POLICY IF EXISTS continue_watching_select ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_select" ON continue_watching;
CREATE POLICY continue_watching_select ON continue_watching FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_insert ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_insert" ON continue_watching;
CREATE POLICY continue_watching_insert ON continue_watching FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_update ON continue_watching;
DROP POLICY IF EXISTS "continue_watching_update" ON continue_watching;
CREATE POLICY continue_watching_update ON continue_watching FOR UPDATE USING (auth.uid() = user_id);

-- Public Read Access for Content Tables
DROP POLICY IF EXISTS "Public Read Movies" ON movies;
CREATE POLICY "Public Read Movies" ON movies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Series" ON tv_series;
CREATE POLICY "Public Read Series" ON tv_series FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Seasons" ON seasons;
CREATE POLICY "Public Read Seasons" ON seasons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Episodes" ON episodes;
CREATE POLICY "Public Read Episodes" ON episodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Videos" ON videos;
CREATE POLICY "Public Read Videos" ON videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Anime" ON anime;
CREATE POLICY "Public Read Anime" ON anime FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Games" ON games;
CREATE POLICY "Public Read Games" ON games FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Software" ON software;
CREATE POLICY "Public Read Software" ON software FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Quran" ON quran_reciters;
CREATE POLICY "Public Read Quran" ON quran_reciters FOR SELECT USING (true);
DO $$
BEGIN
  IF to_regclass('public.ads') IS NOT NULL OR to_regclass('ads') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public Read Ads" ON ads;
    CREATE POLICY "Public Read Ads" ON ads FOR SELECT USING (true);
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_quran_reciters_name ON quran_reciters(name);

-- ==============================
-- END FILE: 20240701000002_full_setup.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240701000003_force_update.sql
-- ==============================

-- Force update movies table
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS arabic_title TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;

-- Force update tv_series table
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS arabic_title TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow';
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS first_air_date DATE;

-- Force update other tables
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE public.software ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.software ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'green';
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS category TEXT;

-- Create link_checks if not exists
CREATE TABLE IF NOT EXISTS public.link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
);

-- Reload schema cache (this is a special Supabase/PostgREST function call if available, or just a comment)
NOTIFY pgrst, 'reload schema';

-- ==============================
-- END FILE: 20240701000003_force_update.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240702000001_robust_schema.sql
-- ==============================

-- Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make columns robust in movies
ALTER TABLE movies ALTER COLUMN title SET DEFAULT 'Untitled';
ALTER TABLE movies ALTER COLUMN overview DROP NOT NULL;
ALTER TABLE movies ALTER COLUMN poster_path DROP NOT NULL;
ALTER TABLE movies ALTER COLUMN backdrop_path DROP NOT NULL;
ALTER TABLE movies ALTER COLUMN release_date DROP NOT NULL;
ALTER TABLE movies ALTER COLUMN vote_average DROP NOT NULL;
ALTER TABLE movies ALTER COLUMN category DROP NOT NULL;

-- Add slug and search_vector to movies
ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Make columns robust in tv_series
ALTER TABLE tv_series ALTER COLUMN title SET DEFAULT 'Untitled';
ALTER TABLE tv_series ALTER COLUMN overview DROP NOT NULL;
ALTER TABLE tv_series ALTER COLUMN poster_path DROP NOT NULL;
ALTER TABLE tv_series ALTER COLUMN backdrop_path DROP NOT NULL;
ALTER TABLE tv_series ALTER COLUMN first_air_date DROP NOT NULL;
ALTER TABLE tv_series ALTER COLUMN vote_average DROP NOT NULL;
ALTER TABLE tv_series ALTER COLUMN category DROP NOT NULL;

-- Add slug and search_vector to tv_series
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_tv_series_slug ON tv_series(slug);
CREATE INDEX IF NOT EXISTS idx_movies_search ON movies USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_tv_series_search ON tv_series USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tv_series_title_trgm ON tv_series USING GIN(title gin_trgm_ops);

-- Function to update search_vector automatically
CREATE OR REPLACE FUNCTION movies_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('arabic', COALESCE(NEW.arabic_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.overview, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER movies_search_vector_update
BEFORE INSERT OR UPDATE ON movies
FOR EACH ROW EXECUTE FUNCTION movies_search_vector_update();

CREATE OR REPLACE FUNCTION tv_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('arabic', COALESCE(NEW.arabic_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.overview, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tv_search_vector_update
BEFORE INSERT OR UPDATE ON tv_series
FOR EACH ROW EXECUTE FUNCTION tv_search_vector_update();

-- ==============================
-- END FILE: 20240702000001_robust_schema.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240702000002_fuzzy_search.sql
-- ==============================

-- Function for fuzzy search on videos table
CREATE OR REPLACE FUNCTION fuzzy_search_videos(query_text text)
RETURNS SETOF videos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM videos
  WHERE
    title % query_text  -- Uses pg_trgm similarity operator (threshold usually 0.3)
    OR
    title ILIKE '%' || query_text || '%' -- Fallback to standard containment
  ORDER BY
    similarity(title, query_text) DESC,
    created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- END FILE: 20240702000002_fuzzy_search.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20240702000003_requests_table.sql
-- ==============================

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert (with rate limiting handled by app logic if needed, or just open for now)
DROP POLICY IF EXISTS "Allow public insert to requests" ON requests;
CREATE POLICY "Allow public insert to requests" ON requests FOR INSERT WITH CHECK (true);

-- Allow admins to view/update
-- Assuming admins have role 'admin' in profiles or checked via app logic. 
-- For simplicity here, we allow public insert, and select only for service_role or admin (implementation detail: usually authenticated users can see their own, but this is a simple request system).
-- Let's stick to: Everyone can insert. Only admins (via dashboard) or owner can select.

DROP POLICY IF EXISTS "Allow users to see their own requests" ON requests;
CREATE POLICY "Allow users to see their own requests" ON requests FOR SELECT USING (auth.uid() = user_id);

-- ==============================
-- END FILE: 20240702000003_requests_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250215_add_fetcher_columns.sql
-- ==============================

-- Add missing columns to support Python fetchers

-- Anime: Add episodes
ALTER TABLE "public"."anime" ADD COLUMN IF NOT EXISTS "episodes" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "public"."anime" ADD COLUMN IF NOT EXISTS "rating" numeric;

-- Games: Add category and rating
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "rating" numeric;

-- TV Series: Add genres
ALTER TABLE "public"."tv_series" ADD COLUMN IF NOT EXISTS "genres" text[];

-- ==============================
-- END FILE: 20250215_add_fetcher_columns.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250215_add_movies_genres.sql
-- ==============================

-- Add genres column to movies table
ALTER TABLE "public"."movies" ADD COLUMN IF NOT EXISTS "genres" text[];

-- ==============================
-- END FILE: 20250215_add_movies_genres.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250215_add_updated_at.sql
-- ==============================

-- Add updated_at column to movies and tv_series
ALTER TABLE "public"."movies" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();
ALTER TABLE "public"."tv_series" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();

-- ==============================
-- END FILE: 20250215_add_updated_at.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250215_enable_public_read.sql
-- ==============================

-- Enable read access for all users for content tables

-- Movies
ALTER TABLE "public"."movies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Movies" ON "public"."movies";
DROP POLICY IF EXISTS "Public Read Movies" ON "public"."movies";
CREATE POLICY "Public Read Movies" ON "public"."movies" FOR SELECT TO public USING (true);

-- Series
ALTER TABLE "public"."series" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Series" ON "public"."series";
DROP POLICY IF EXISTS "Public Read Series" ON "public"."series";
CREATE POLICY "Public Read Series" ON "public"."series" FOR SELECT TO public USING (true);

-- Seasons
ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Seasons" ON "public"."seasons";
DROP POLICY IF EXISTS "Public Read Seasons" ON "public"."seasons";
CREATE POLICY "Public Read Seasons" ON "public"."seasons" FOR SELECT TO public USING (true);

-- Episodes
ALTER TABLE "public"."episodes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Episodes" ON "public"."episodes";
DROP POLICY IF EXISTS "Public Read Episodes" ON "public"."episodes";
CREATE POLICY "Public Read Episodes" ON "public"."episodes" FOR SELECT TO public USING (true);

-- Anime
ALTER TABLE "public"."anime" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Anime" ON "public"."anime";
DROP POLICY IF EXISTS "Public Read Anime" ON "public"."anime";
CREATE POLICY "Public Read Anime" ON "public"."anime" FOR SELECT TO public USING (true);

-- Games
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Games" ON "public"."games";
DROP POLICY IF EXISTS "Public Read Games" ON "public"."games";
CREATE POLICY "Public Read Games" ON "public"."games" FOR SELECT TO public USING (true);

-- Software
ALTER TABLE "public"."software" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Software" ON "public"."software";
DROP POLICY IF EXISTS "Public Read Software" ON "public"."software";
CREATE POLICY "Public Read Software" ON "public"."software" FOR SELECT TO public USING (true);

-- Quran Reciters
ALTER TABLE "public"."quran_reciters" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Quran Reciters" ON "public"."quran_reciters";
DROP POLICY IF EXISTS "Public Read Quran Reciters" ON "public"."quran_reciters";
CREATE POLICY "Public Read Quran Reciters" ON "public"."quran_reciters" FOR SELECT TO public USING (true);

-- Categories
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Categories" ON "public"."categories";
DROP POLICY IF EXISTS "Public Read Categories" ON "public"."categories";
CREATE POLICY "Public Read Categories" ON "public"."categories" FOR SELECT TO public USING (true);

-- Videos (Kids/YouTube)
ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Videos" ON "public"."videos";
DROP POLICY IF EXISTS "Public Read Videos" ON "public"."videos";
CREATE POLICY "Public Read Videos" ON "public"."videos" FOR SELECT TO public USING (true);

-- TV Series
ALTER TABLE "public"."tv_series" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read TV Series" ON "public"."tv_series";
DROP POLICY IF EXISTS "Public Read TV Series" ON "public"."tv_series";
CREATE POLICY "Public Read TV Series" ON "public"."tv_series" FOR SELECT TO public USING (true);

-- ==============================
-- END FILE: 20250215_enable_public_read.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250216_create_admin_user.sql
-- ==============================

-- Create the user if not exists
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'iaaelsadek@gmail.com',
  crypt('Eslam@26634095', gen_salt('bf')),
  now(),
  null,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'iaaelsadek@gmail.com'
);

-- Ensure admin role in profiles
INSERT INTO public.profiles (id, username, role)
SELECT 
  id, 
  split_part(email, '@', 1), 
  'admin'
FROM auth.users 
WHERE email = 'iaaelsadek@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- ==============================
-- END FILE: 20250216_create_admin_user.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250216_fix_admin_role.sql
-- ==============================

-- Force update role to admin for the user
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'iaaelsadek@gmail.com'
);

-- ==============================
-- END FILE: 20250216_fix_admin_role.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250216_update_admin_role.sql
-- ==============================

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'iaaelsadek@gmail.com'
);

-- ==============================
-- END FILE: 20250216_update_admin_role.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20250217_create_reports_table.sql
-- ==============================

-- Create table for tracking error reports
CREATE TABLE IF NOT EXISTS public.error_reports (
  url TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Allow public access (since anyone can encounter an error)
DROP POLICY IF EXISTS "Allow public insert to error_reports" ON public.error_reports;
CREATE POLICY "Allow public insert to error_reports" ON public.error_reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to error_reports" ON public.error_reports;
CREATE POLICY "Allow public update to error_reports" ON public.error_reports
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public select to error_reports" ON public.error_reports;
CREATE POLICY "Allow public select to error_reports" ON public.error_reports
  FOR SELECT USING (true);

-- Create RPC function to handle reporting logic atomically
CREATE OR REPLACE FUNCTION public.report_page_error(p_url TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.error_reports (url)
  VALUES (p_url)
  ON CONFLICT (url) DO UPDATE
  SET count = error_reports.count + 1,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================
-- END FILE: 20250217_create_reports_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260217_add_missing_cols.sql
-- ==============================

-- Add missing columns to movies
ALTER TABLE IF EXISTS public.movies
ADD COLUMN IF NOT EXISTS original_language TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS vote_average NUMERIC;

-- Add missing columns to tv_series
ALTER TABLE IF EXISTS public.tv_series
ADD COLUMN IF NOT EXISTS original_language TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS vote_average NUMERIC,
ADD COLUMN IF NOT EXISTS popularity NUMERIC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_original_language ON public.movies(original_language);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON public.movies(vote_average);
CREATE INDEX IF NOT EXISTS idx_series_original_language ON public.tv_series(original_language);
CREATE INDEX IF NOT EXISTS idx_series_vote_average ON public.tv_series(vote_average);

-- ==============================
-- END FILE: 20260217_add_missing_cols.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260217_create_extra_tables.sql
-- ==============================

-- Create Anime Table
CREATE TABLE IF NOT EXISTS public.anime (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    image_url TEXT,
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    trailer_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create Quran Reciters Table
CREATE TABLE IF NOT EXISTS public.quran_reciters (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT,
    rewaya TEXT,
    server TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_reciters ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Read)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'anime' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.anime FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'quran_reciters' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.quran_reciters FOR SELECT USING (true);
    END IF;
END
$$;

-- Fix Games Table ID
DO $$
BEGIN
    -- Check if games.id has a default value
    IF (SELECT column_default FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'id') IS NULL THEN
        CREATE SEQUENCE IF NOT EXISTS games_id_seq OWNED BY public.games.id;
        ALTER TABLE public.games ALTER COLUMN id SET DEFAULT nextval('games_id_seq');
        PERFORM setval('games_id_seq', COALESCE((SELECT MAX(id) FROM public.games), 0) + 1, false);
    END IF;
END
$$;

-- Fix Software Table ID
DO $$
BEGIN
    -- Check if software.id has a default value
    IF (SELECT column_default FROM information_schema.columns WHERE table_name = 'software' AND column_name = 'id') IS NULL THEN
        CREATE SEQUENCE IF NOT EXISTS software_id_seq OWNED BY public.software.id;
        ALTER TABLE public.software ALTER COLUMN id SET DEFAULT nextval('software_id_seq');
        PERFORM setval('software_id_seq', COALESCE((SELECT MAX(id) FROM public.software), 0) + 1, false);
    END IF;
END
$$;

-- Insert Seed Data for Anime
DO $$
BEGIN
  IF to_regclass('public.anime') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anime' AND column_name = 'image_url'
    ) THEN
      INSERT INTO public.anime (id, title, category, image_url, rating, description)
      SELECT
        COALESCE((SELECT MAX(id) FROM public.anime), 0) + ROW_NUMBER() OVER (ORDER BY v.title),
        v.title, v.category, v.image_url, v.rating, v.description
      FROM (
        VALUES
        ('Attack on Titan', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hTP1DtLGFamjfu8WqjnuQdPuy61.jpg', 9.1, 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.'),
        ('One Piece', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/cMD9Ygz11zjJzAovURpO75Pg738.jpg', 8.9, 'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the king of all pirates.'),
        ('Demon Slayer: Kimetsu no Yaiba', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/xUfRZu2mi8bZJKSe15TLkQymxCot.jpg', 8.8, 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.'),
        ('Death Note', 'Thriller', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/tCzeDfOdqB8m0J82s27HCV84xM9.jpg', 9.0, 'Light Yagami is an ace student with great prospects—and he''s bored out of his mind. But all that changes when he finds the Death Note.'),
        ('Naruto', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/vauCEnR7CjyqePGUkyKAoExO75C.jpg', 8.5, 'Naruto Uzumaki, a hyperactive and knuckle-headed ninja, searches for recognition from everyone around him.'),
        ('Fullmetal Alchemist: Brotherhood', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/5TQ6YAeHHxMcpVNHl1bZ8Zq7e6R.jpg', 9.2, 'Two brothers search for a Philosopher''s Stone after an attempt to revive their deceased mother goes wrong and leaves them in damaged physical forms.'),
        ('Hunter x Hunter', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/ucmpL591Q07b8l4P7F9vW7x8b4o.jpg', 9.0, 'Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness.'),
        ('Jujutsu Kaisen', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hITg904yFXn0VvR9g8b9Z8k9j9.jpg', 8.7, 'Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life.'),
        ('My Hero Academia', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/phuYuzqWW9ru8OA3mNdUyXNfdh.jpg', 8.6, 'A superhero-loving boy without any powers is determined to enroll in a prestigious hero academy and learn what it really means to be a hero.'),
        ('Bleach', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/2EewMxXe72ogD0Ea18exjE7P0af.jpg', 8.4, 'High school student Ichigo Kurosaki, who has the ability to see ghosts, gains soul reaper powers.')
      ) AS v(title, category, image_url, rating, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.anime a WHERE a.title = v.title);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'anime' AND column_name = 'poster_path'
    ) THEN
      INSERT INTO public.anime (id, title, poster_path, overview)
      SELECT
        COALESCE((SELECT MAX(id) FROM public.anime), 0) + ROW_NUMBER() OVER (ORDER BY v.title),
        v.title, v.image_url, v.description
      FROM (
        VALUES
        ('Attack on Titan', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hTP1DtLGFamjfu8WqjnuQdPuy61.jpg', 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.'),
        ('One Piece', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/cMD9Ygz11zjJzAovURpO75Pg738.jpg', 'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the king of all pirates.'),
        ('Demon Slayer: Kimetsu no Yaiba', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/xUfRZu2mi8bZJKSe15TLkQymxCot.jpg', 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.'),
        ('Death Note', 'Thriller', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/tCzeDfOdqB8m0J82s27HCV84xM9.jpg', 'Light Yagami is an ace student with great prospects—and he''s bored out of his mind. But all that changes when he finds the Death Note.'),
        ('Naruto', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/vauCEnR7CjyqePGUkyKAoExO75C.jpg', 'Naruto Uzumaki, a hyperactive and knuckle-headed ninja, searches for recognition from everyone around him.'),
        ('Fullmetal Alchemist: Brotherhood', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/5TQ6YAeHHxMcpVNHl1bZ8Zq7e6R.jpg', 'Two brothers search for a Philosopher''s Stone after an attempt to revive their deceased mother goes wrong and leaves them in damaged physical forms.'),
        ('Hunter x Hunter', 'Adventure', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/ucmpL591Q07b8l4P7F9vW7x8b4o.jpg', 'Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness.'),
        ('Jujutsu Kaisen', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/hITg904yFXn0VvR9g8b9Z8k9j9.jpg', 'Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life.'),
        ('My Hero Academia', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/phuYuzqWW9ru8OA3mNdUyXNfdh.jpg', 'A superhero-loving boy without any powers is determined to enroll in a prestigious hero academy and learn what it really means to be a hero.'),
        ('Bleach', 'Action', 'https://media.themoviedb.org/t/p/w600_and_h900_bestv2/2EewMxXe72ogD0Ea18exjE7P0af.jpg', 'High school student Ichigo Kurosaki, who has the ability to see ghosts, gains soul reaper powers.')
      ) AS v(title, category, image_url, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.anime a WHERE a.title = v.title);
    ELSE
      INSERT INTO public.anime (id, title)
      SELECT
        COALESCE((SELECT MAX(id) FROM public.anime), 0) + ROW_NUMBER() OVER (ORDER BY v.title),
        v.title
      FROM (
        VALUES
        ('Attack on Titan'),
        ('One Piece'),
        ('Demon Slayer: Kimetsu no Yaiba'),
        ('Death Note'),
        ('Naruto'),
        ('Fullmetal Alchemist: Brotherhood'),
        ('Hunter x Hunter'),
        ('Jujutsu Kaisen'),
        ('My Hero Academia'),
        ('Bleach')
      ) AS v(title)
      WHERE NOT EXISTS (SELECT 1 FROM public.anime a WHERE a.title = v.title);
    END IF;
  END IF;
END
$$;

-- Insert Seed Data for Quran Reciters
DO $$
BEGIN
  IF to_regclass('public.quran_reciters') IS NOT NULL THEN
    WITH seed(name, image, rewaya, server, category) AS (
      VALUES
      ('Mishary Rashid Alafasy', 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg', 'Hafs', 'https://server8.mp3quran.net/afs/', 'Famous'),
      ('Maher Al Muaiqly', 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg', 'Hafs', 'https://server12.mp3quran.net/maher/', 'Famous'),
      ('Abdul Rahman Al-Sudais', 'https://static.surahquran.com/images/reciters/1.jpg', 'Hafs', 'https://server11.mp3quran.net/sds/', 'Famous'),
      ('Saad Al Ghamdi', 'https://static.surahquran.com/images/reciters/4.jpg', 'Hafs', 'https://server7.mp3quran.net/s_gmd/', 'Famous'),
      ('Yasser Al-Dosari', 'https://static.surahquran.com/images/reciters/2.jpg', 'Hafs', 'https://server11.mp3quran.net/yasser/', 'Famous'),
      ('Ahmed Al-Ajmi', 'https://static.surahquran.com/images/reciters/3.jpg', 'Hafs', 'https://server10.mp3quran.net/ajm/', 'Famous'),
      ('Saud Al-Shuraim', 'https://static.surahquran.com/images/reciters/6.jpg', 'Hafs', 'https://server7.mp3quran.net/shur/', 'Famous'),
      ('Fares Abbad', 'https://static.surahquran.com/images/reciters/8.jpg', 'Hafs', 'https://server8.mp3quran.net/frs_a/', 'Famous'),
      ('Nasser Al Qatami', 'https://static.surahquran.com/images/reciters/16.jpg', 'Hafs', 'https://server6.mp3quran.net/qtm/', 'Famous'),
      ('Idris Abkar', 'https://static.surahquran.com/images/reciters/19.jpg', 'Hafs', 'https://server6.mp3quran.net/abkr/', 'Famous')
    )
    INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category)
    SELECT
      COALESCE((SELECT MAX(id) FROM public.quran_reciters), 0) + ROW_NUMBER() OVER (ORDER BY s.name),
      s.name, s.image, s.rewaya, s.server, s.category
    FROM seed s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.quran_reciters q WHERE q.name = s.name
    );
  END IF;
END
$$;

-- Insert Seed Data for Games (if empty)
DO $$
BEGIN
  IF to_regclass('public.games') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'poster_url'
    ) THEN
      INSERT INTO public.games (title, category, poster_url, rating, release_year, description)
      SELECT v.title, v.category, v.poster_url, v.rating, v.release_year, v.description
      FROM (
        VALUES
        ('Grand Theft Auto V', 'Console', 'https://media.rawg.io/media/games/456/456dea5e127e3d7770975f19475e3c92.jpg', 9.5, 2013, 'Open world action-adventure game.'),
        ('The Witcher 3: Wild Hunt', 'PC', 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', 9.8, 2015, 'Action role-playing game.'),
        ('Red Dead Redemption 2', 'Console', 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', 9.7, 2018, 'Western action-adventure game.'),
        ('Cyberpunk 2077', 'PC', 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a60f0a5652.jpg', 8.5, 2020, 'Open world action-adventure story.'),
        ('God of War', 'Console', 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg', 9.8, 2018, 'Action-adventure game based on Norse mythology.')
      ) AS v(title, category, poster_url, rating, release_year, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.games g WHERE g.title = v.title);
    ELSE
      INSERT INTO public.games (title, poster_path, overview)
      SELECT v.title, v.poster_url, v.description
      FROM (
        VALUES
        ('Grand Theft Auto V', 'Console', 'https://media.rawg.io/media/games/456/456dea5e127e3d7770975f19475e3c92.jpg', 9.5, 2013, 'Open world action-adventure game.'),
        ('The Witcher 3: Wild Hunt', 'PC', 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', 9.8, 2015, 'Action role-playing game.'),
        ('Red Dead Redemption 2', 'Console', 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', 9.7, 2018, 'Western action-adventure game.'),
        ('Cyberpunk 2077', 'PC', 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a60f0a5652.jpg', 8.5, 2020, 'Open world action-adventure story.'),
        ('God of War', 'Console', 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg', 9.8, 2018, 'Action-adventure game based on Norse mythology.')
      ) AS v(title, category, poster_url, rating, release_year, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.games g WHERE g.title = v.title);
    END IF;
  END IF;
END
$$;

-- Insert Seed Data for Software (if empty)
DO $$
BEGIN
  IF to_regclass('public.software') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'software' AND column_name = 'poster_url'
    ) THEN
      INSERT INTO public.software (title, category, poster_url, rating, release_year, description)
      SELECT v.title, v.category, v.poster_url, v.rating, v.release_year, v.description
      FROM (
        VALUES
        ('Adobe Photoshop 2024', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', 9.5, 2024, 'Professional image editing software.'),
        ('Visual Studio Code', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/1200px-Visual_Studio_Code_1.35_icon.svg.png', 9.9, 2024, 'Code editor redefined.'),
        ('Microsoft Office 2021', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg/1200px-Microsoft_Office_logo_%282019%E2%80%93present%29.svg.png', 9.0, 2021, 'Productivity suite.'),
        ('Premiere Pro 2024', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Adobe_Premiere_Pro_CC_icon.svg/1200px-Adobe_Premiere_Pro_CC_icon.svg.png', 9.2, 2024, 'Video editing software.')
      ) AS v(title, category, poster_url, rating, release_year, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.software s WHERE s.title = v.title);
    ELSE
      INSERT INTO public.software (title, poster_path, overview)
      SELECT v.title, v.poster_url, v.description
      FROM (
        VALUES
        ('Adobe Photoshop 2024', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', 9.5, 2024, 'Professional image editing software.'),
        ('Visual Studio Code', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/1200px-Visual_Studio_Code_1.35_icon.svg.png', 9.9, 2024, 'Code editor redefined.'),
        ('Microsoft Office 2021', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg/1200px-Microsoft_Office_logo_%282019%E2%80%93present%29.svg.png', 9.0, 2021, 'Productivity suite.'),
        ('Premiere Pro 2024', 'PC', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Adobe_Premiere_Pro_CC_icon.svg/1200px-Adobe_Premiere_Pro_CC_icon.svg.png', 9.2, 2024, 'Video editing software.')
      ) AS v(title, category, poster_url, rating, release_year, description)
      WHERE NOT EXISTS (SELECT 1 FROM public.software s WHERE s.title = v.title);
    END IF;
  END IF;
END
$$;

-- ==============================
-- END FILE: 20260217_create_extra_tables.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260217_manual_fix.sql
-- ==============================

-- 1. Add MENA Columns (if missing)
ALTER TABLE IF EXISTS public.movies 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_play BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.tv_series 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_ramadan BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_movies_is_play ON public.movies(is_play);
CREATE INDEX IF NOT EXISTS idx_series_is_ramadan ON public.tv_series(is_ramadan);
CREATE INDEX IF NOT EXISTS idx_series_origin_country ON public.tv_series USING GIN(origin_country);

-- 2. Fix Permissions for Admin and Service Role
-- Enable RLS (just in case)
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_series ENABLE ROW LEVEL SECURITY;

-- Allow Admin to ALL operations
DROP POLICY IF EXISTS "Admin All Movies" ON public.movies;
DROP POLICY IF EXISTS "Admin All Movies" ON public.movies;
CREATE POLICY "Admin All Movies" ON public.movies
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admin All Series" ON public.tv_series;
DROP POLICY IF EXISTS "Admin All Series" ON public.tv_series;
CREATE POLICY "Admin All Series" ON public.tv_series
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Allow Service Role to ALL operations (for scripts using service key)
DROP POLICY IF EXISTS "Service Role All Movies" ON public.movies;
DROP POLICY IF EXISTS "Service Role All Movies" ON public.movies;
CREATE POLICY "Service Role All Movies" ON public.movies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role All Series" ON public.tv_series;
DROP POLICY IF EXISTS "Service Role All Series" ON public.tv_series;
CREATE POLICY "Service Role All Series" ON public.tv_series
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================
-- END FILE: 20260217_manual_fix.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260218_full_migration_v2.sql
-- ==============================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Movies Table
create table if not exists movies (
  id bigint generated by default as identity primary key,
  title text not null,
  description text,
  poster_url text,
  banner_url text,
  video_url text,
  category text,
  year int,
  release_date date,
  rating numeric,
  views int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tmdb_id int
);

-- 2. Series Table
create table if not exists series (
  id bigint generated by default as identity primary key,
  title text not null,
  description text,
  poster_url text,
  banner_url text,
  first_air_date date,
  rating numeric,
  views int default 0,
  seasons_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tmdb_id int
);

-- 3. Seasons Table
create table if not exists seasons (
  id bigint generated by default as identity primary key,
  series_id bigint references series(id) on delete cascade not null,
  name text,
  season_number int not null,
  episode_count int default 0,
  poster_url text,
  air_date date,
  overview text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Episodes Table
create table if not exists episodes (
  id bigint generated by default as identity primary key,
  series_id bigint references series(id) on delete cascade not null,
  season_id bigint references seasons(id) on delete cascade not null,
  title text not null,
  episode_number int not null,
  overview text,
  still_url text,
  air_date date,
  rating numeric,
  runtime int,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Profiles Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  role text check (role in ('user', 'admin', 'supervisor')) default 'user',
  banned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Storage Buckets
insert into storage.buckets (id, name, public) 
values ('posters', 'posters', true)
on conflict (id) do nothing;

-- RLS Policies
alter table movies enable row level security;
alter table series enable row level security;
alter table seasons enable row level security;
alter table episodes enable row level security;
alter table profiles enable row level security;

-- Drop existing policies to ensure idempotency
drop policy if exists "Public movies are viewable by everyone" on movies;
drop policy if exists "Authenticated users can insert movies" on movies;
drop policy if exists "Authenticated users can update movies" on movies;
drop policy if exists "Authenticated users can delete movies" on movies;

drop policy if exists "Public series are viewable by everyone" on series;
drop policy if exists "Authenticated users can insert series" on series;
drop policy if exists "Authenticated users can update series" on series;
drop policy if exists "Authenticated users can delete series" on series;

drop policy if exists "Public seasons are viewable by everyone" on seasons;
drop policy if exists "Authenticated users can insert seasons" on seasons;
drop policy if exists "Authenticated users can update seasons" on seasons;
drop policy if exists "Authenticated users can delete seasons" on seasons;

drop policy if exists "Public episodes are viewable by everyone" on episodes;
drop policy if exists "Authenticated users can insert episodes" on episodes;
drop policy if exists "Authenticated users can update episodes" on episodes;
drop policy if exists "Authenticated users can delete episodes" on episodes;

drop policy if exists "Public profiles are viewable by everyone" on profiles;

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;

-- Create Policies

-- Movies
DROP POLICY IF EXISTS "Public movies are viewable by everyone" ON movies;
create policy "Public movies are viewable by everyone" on movies for select using (true);
DROP POLICY IF EXISTS "Authenticated users can insert movies" ON movies;
create policy "Authenticated users can insert movies" on movies for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update movies" ON movies;
create policy "Authenticated users can update movies" on movies for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete movies" ON movies;
create policy "Authenticated users can delete movies" on movies for delete using (auth.role() = 'authenticated');

-- Series
DROP POLICY IF EXISTS "Public series are viewable by everyone" ON series;
create policy "Public series are viewable by everyone" on series for select using (true);
DROP POLICY IF EXISTS "Authenticated users can insert series" ON series;
create policy "Authenticated users can insert series" on series for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update series" ON series;
create policy "Authenticated users can update series" on series for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete series" ON series;
create policy "Authenticated users can delete series" on series for delete using (auth.role() = 'authenticated');

-- Seasons
DROP POLICY IF EXISTS "Public seasons are viewable by everyone" ON seasons;
create policy "Public seasons are viewable by everyone" on seasons for select using (true);
DROP POLICY IF EXISTS "Authenticated users can insert seasons" ON seasons;
create policy "Authenticated users can insert seasons" on seasons for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update seasons" ON seasons;
create policy "Authenticated users can update seasons" on seasons for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete seasons" ON seasons;
create policy "Authenticated users can delete seasons" on seasons for delete using (auth.role() = 'authenticated');

-- Episodes
DROP POLICY IF EXISTS "Public episodes are viewable by everyone" ON episodes;
create policy "Public episodes are viewable by everyone" on episodes for select using (true);
DROP POLICY IF EXISTS "Authenticated users can insert episodes" ON episodes;
create policy "Authenticated users can insert episodes" on episodes for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update episodes" ON episodes;
create policy "Authenticated users can update episodes" on episodes for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete episodes" ON episodes;
create policy "Authenticated users can delete episodes" on episodes for delete using (auth.role() = 'authenticated');

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);

-- Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'posters' );
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
create policy "Authenticated users can upload" on storage.objects for insert with check ( bucket_id = 'posters' and auth.role() = 'authenticated' );

-- ==============================
-- END FILE: 20260218_full_migration_v2.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260218_full_migration.sql
-- ==============================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Movies Table
create table if not exists movies (
  id bigint generated by default as identity primary key,
  title text not null,
  description text,
  poster_url text,
  banner_url text,
  video_url text,
  category text,
  year int,
  release_date date,
  rating numeric,
  views int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tmdb_id int
);

-- 2. Series Table
create table if not exists series (
  id bigint generated by default as identity primary key,
  title text not null,
  description text,
  poster_url text,
  banner_url text,
  first_air_date date,
  rating numeric,
  views int default 0,
  seasons_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tmdb_id int
);

-- 3. Seasons Table
create table if not exists seasons (
  id bigint generated by default as identity primary key,
  series_id bigint references series(id) on delete cascade not null,
  name text,
  season_number int not null,
  episode_count int default 0,
  poster_url text,
  air_date date,
  overview text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Episodes Table
create table if not exists episodes (
  id bigint generated by default as identity primary key,
  series_id bigint references series(id) on delete cascade not null,
  season_id bigint references seasons(id) on delete cascade not null,
  title text not null,
  episode_number int not null,
  overview text,
  still_url text,
  air_date date,
  rating numeric,
  runtime int,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Profiles Table (Ensure existence and role column)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  role text check (role in ('user', 'admin', 'supervisor')) default 'user',
  banned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Storage Buckets (for Phase 3)
insert into storage.buckets (id, name, public) 
values ('posters', 'posters', true)
on conflict (id) do nothing;

-- RLS Policies (Basic setup - can be refined)
alter table movies enable row level security;
alter table series enable row level security;
alter table seasons enable row level security;
alter table episodes enable row level security;
alter table profiles enable row level security;

-- Public read access
DROP POLICY IF EXISTS "Public movies are viewable by everyone" ON movies;
create policy "Public movies are viewable by everyone" on movies for select using (true);
DROP POLICY IF EXISTS "Public series are viewable by everyone" ON series;
create policy "Public series are viewable by everyone" on series for select using (true);
DROP POLICY IF EXISTS "Public seasons are viewable by everyone" ON seasons;
create policy "Public seasons are viewable by everyone" on seasons for select using (true);
DROP POLICY IF EXISTS "Public episodes are viewable by everyone" ON episodes;
create policy "Public episodes are viewable by everyone" on episodes for select using (true);
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);

-- Admin write access (Assuming simple role check or auth.uid() check if using custom claims, 
-- for now allow authenticated users to insert/update for simplicity in migration context, 
-- or strictly restrict to admin if possible. 
-- Since we are running this migration, we assume the user has admin rights.
-- For the app, we need a policy that allows admins to write.
-- A simple way for now is to allow authenticated users to write, or check specific user ID.)

-- Allow authenticated users to insert/update/delete (Adjust this for production!)
DROP POLICY IF EXISTS "Authenticated users can insert movies" ON movies;
create policy "Authenticated users can insert movies" on movies for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update movies" ON movies;
create policy "Authenticated users can update movies" on movies for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete movies" ON movies;
create policy "Authenticated users can delete movies" on movies for delete using (auth.role() = 'authenticated');

-- Repeat for other tables
DROP POLICY IF EXISTS "Authenticated users can insert series" ON series;
create policy "Authenticated users can insert series" on series for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update series" ON series;
create policy "Authenticated users can update series" on series for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete series" ON series;
create policy "Authenticated users can delete series" on series for delete using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert seasons" ON seasons;
create policy "Authenticated users can insert seasons" on seasons for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update seasons" ON seasons;
create policy "Authenticated users can update seasons" on seasons for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete seasons" ON seasons;
create policy "Authenticated users can delete seasons" on seasons for delete using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert episodes" ON episodes;
create policy "Authenticated users can insert episodes" on episodes for insert with check (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update episodes" ON episodes;
create policy "Authenticated users can update episodes" on episodes for update using (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete episodes" ON episodes;
create policy "Authenticated users can delete episodes" on episodes for delete using (auth.role() = 'authenticated');

-- Storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'posters' );
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
create policy "Authenticated users can upload" on storage.objects for insert with check ( bucket_id = 'posters' and auth.role() = 'authenticated' );

-- ==============================
-- END FILE: 20260218_full_migration.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260219_error_logs_policy.sql
-- ==============================

-- Enable RLS on error_logs table if not already enabled
ALTER TABLE IF EXISTS "public"."error_logs" ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone (anon included) to insert error logs
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."error_logs";
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."error_logs";
CREATE POLICY "Enable insert for everyone" ON "public"."error_logs"
FOR INSERT
TO public
WITH CHECK (true);

-- Policy to allow admins to read error logs
DROP POLICY IF EXISTS "Enable read for admins" ON "public"."error_logs";
DROP POLICY IF EXISTS "Enable read for admins" ON "public"."error_logs";
CREATE POLICY "Enable read for admins" ON "public"."error_logs"
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- ==============================
-- END FILE: 20260219_error_logs_policy.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260219_fix_rls_and_admin_access.sql
-- ==============================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins/supervisors to read all profiles
-- Note: To avoid recursion, we assume the user's role is checked via auth.uid() = id in the first policy,
-- but for reading *others*, we need to verify the requestor's role.
-- A secure way is to use a security definer function or simply trust that if they can read their own profile, they can check their role.
-- BUT RLS policies are per-row. When reading row X (another user), I need to check if *I* (auth.uid()) am admin.
-- To do this efficiently:
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. MOVIES POLICIES
-- Public read access
DROP POLICY IF EXISTS "Public read access movies" ON movies;
DROP POLICY IF EXISTS "Public read access movies" ON movies;
CREATE POLICY "Public read access movies" ON movies
  FOR SELECT USING (true);

-- Admin/Supervisor write access
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
CREATE POLICY "Admins can insert movies" ON movies
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update movies" ON movies;
DROP POLICY IF EXISTS "Admins can update movies" ON movies;
CREATE POLICY "Admins can update movies" ON movies
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can delete movies" ON movies;
DROP POLICY IF EXISTS "Admins can delete movies" ON movies;
CREATE POLICY "Admins can delete movies" ON movies
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- 3. TV SERIES POLICIES
-- Public read access
DROP POLICY IF EXISTS "Public read access series" ON tv_series;
DROP POLICY IF EXISTS "Public read access series" ON tv_series;
CREATE POLICY "Public read access series" ON tv_series
  FOR SELECT USING (true);

-- Admin/Supervisor write access
DROP POLICY IF EXISTS "Admins can insert series" ON tv_series;
DROP POLICY IF EXISTS "Admins can insert series" ON tv_series;
CREATE POLICY "Admins can insert series" ON tv_series
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update series" ON tv_series;
DROP POLICY IF EXISTS "Admins can update series" ON tv_series;
CREATE POLICY "Admins can update series" ON tv_series
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can delete series" ON tv_series;
DROP POLICY IF EXISTS "Admins can delete series" ON tv_series;
CREATE POLICY "Admins can delete series" ON tv_series
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- ==============================
-- END FILE: 20260219_fix_rls_and_admin_access.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260219_promote_cairo_tv_to_admin.sql
-- ==============================

-- 1. تحديث جدول profiles لترقية المستخدم إلى admin
-- نفترض أن البريد الإلكتروني موجود في جدول auth.users، ولكن هنا سنقوم بتحديث الدور في جدول profiles
-- بناءً على الربط بين auth.users و public.profiles

-- أولاً: السماح بقيمة 'admin' في عمود role (إذا كان هناك قيد CHECK)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'supervisor'));

-- ثانياً: تحديث الدور للمستخدم المحدد
-- ملاحظة: لا يمكننا الوصول لجدول auth.users مباشرة في استعلام بسيط أحياناً بسبب الصلاحيات، 
-- ولكن يمكننا استخدام معرف المستخدم إذا كنا نعرفه، أو الاعتماد على أن الـ profiles مربوطة بـ auth.users
-- سنقوم بتحديث الـ profile المرتبط بالمستخدم cairo.tv@gmail.com

UPDATE profiles
SET role = 'admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'cairo.tv@gmail.com';

-- تأكيد التحديث (اختياري، للعرض فقط)
-- SELECT * FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'cairo.tv@gmail.com');

-- ==============================
-- END FILE: 20260219_promote_cairo_tv_to_admin.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_add_banned_column.sql
-- ==============================

-- Add 'banned' column to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- Add 'created_at' column just in case it's missing (though it seems to exist)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure RLS policies cover the new column (update policy)
-- The existing policy "Users can update own profile" allows updating ANY column?
-- Usually policies are row-based. But we might want to restrict users from unbanning themselves!
-- Users should NOT be able to update 'banned' column.

-- We need to check if Supabase allows column-level permissions easily.
-- Alternatively, we can use a trigger to prevent users from changing 'banned'.
-- OR, we rely on the fact that the update query in `Profile.tsx` (user side) only updates `username`, `avatar_url`.
-- But a malicious user could try to update `banned`.

-- Let's revoke update on 'banned' for authenticated users?
-- Postgres doesn't support column-level REVOKE for rows owned by user easily with RLS.
-- But we can add a check constraint or a trigger.

-- Simple approach: separate policy for admin updates?
-- Currently:
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- This allows updating ALL columns.

-- We should probably restrict this.
-- BUT for now, let's just add the column so the page works. 
-- The priority is to fix the "Network Error" on the users page.

COMMENT ON COLUMN public.profiles.banned IS 'Whether the user is banned from the platform';

-- ==============================
-- END FILE: 20260220_add_banned_column.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_create_app_diagnostics_table.sql
-- ==============================

-- Create app_diagnostics table if it doesn't exist
-- We use this name instead of 'error_logs' to avoid ad-blockers
CREATE TABLE IF NOT EXISTS public.app_diagnostics (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  stack TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  context JSONB,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for anonymous users logging errors)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
CREATE POLICY "Enable insert for everyone" ON public.app_diagnostics
FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins to read all logs
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
CREATE POLICY "Enable read for admins" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- Allow admins to update (e.g., mark as resolved)
DROP POLICY IF EXISTS "Enable update for admins" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable update for admins" ON public.app_diagnostics;
CREATE POLICY "Enable update for admins" ON public.app_diagnostics
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- ==============================
-- END FILE: 20260220_create_app_diagnostics_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_create_error_logs_table.sql
-- ==============================

-- Create error_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  stack TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  context JSONB,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for anonymous users logging errors)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.error_logs;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.error_logs;
CREATE POLICY "Enable insert for everyone" ON public.error_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins to read all logs
DROP POLICY IF EXISTS "Enable read for admins" ON public.error_logs;
DROP POLICY IF EXISTS "Enable read for admins" ON public.error_logs;
CREATE POLICY "Enable read for admins" ON public.error_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- Allow admins to update (e.g., mark as resolved)
DROP POLICY IF EXISTS "Enable update for admins" ON public.error_logs;
DROP POLICY IF EXISTS "Enable update for admins" ON public.error_logs;
CREATE POLICY "Enable update for admins" ON public.error_logs
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- ==============================
-- END FILE: 20260220_create_error_logs_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_fix_all_rls.sql
-- ==============================

-- 1. Enable SQL Execution Helper (Optional but useful for future)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- 2. Fix Profiles Table RLS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'supervisor')),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Fix Error Logs Table RLS (just in case)
CREATE TABLE IF NOT EXISTS public.app_diagnostics (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  stack TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  context JSONB,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
CREATE POLICY "Enable insert for everyone" ON public.app_diagnostics
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
CREATE POLICY "Enable read for admins" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- ==============================
-- END FILE: 20260220_fix_all_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_fix_profiles_rls.sql
-- ==============================

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'supervisor')),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create permissive policies
-- Allow users to read any profile (needed for comments, reviews, etc.)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ==============================
-- END FILE: 20260220_fix_profiles_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260220_fix_recursive_rls.sql
-- ==============================

-- Fix Infinite Recursion on Profiles Table

-- 1. Drop ALL existing policies on profiles to be safe
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 2. Create STRICTLY NON-RECURSIVE policies

-- Simple Read: Everyone can read everything (no lookups)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Simple Insert: Only I can insert my own (no lookups)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Simple Update: Only I can update my own (no lookups)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Fix app_diagnostics policy to avoid recursion via profiles lookup
-- Instead of checking profiles table, we'll allow all authenticated users to insert logs
-- and only allow users to read their own logs (or use a security definer function for admins later)
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;

-- Allow users to read ONLY their own logs to prevent any profile lookup recursion
DROP POLICY IF EXISTS "Users can read own logs" ON public.app_diagnostics;
CREATE POLICY "Users can read own logs" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert logs
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
CREATE POLICY "Enable insert for everyone" ON public.app_diagnostics
FOR INSERT
TO public
WITH CHECK (true);

-- ==============================
-- END FILE: 20260220_fix_recursive_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_add_famous_reciters.sql
-- ==============================

-- Migration: Add Famous Reciters with Full Surah List
-- Date: 2026-02-22

-- Delete existing famous reciters to avoid duplicates (based on name or ID range if known, but name is safer here)
DELETE FROM public.quran_reciters WHERE name IN (
    'Mishary Rashid Alafasy',
    'Abdul Rahman Al-Sudais',
    'Saud Al-Shuraim',
    'Maher Al Muaiqly',
    'Saad Al Ghamdi',
    'Ahmed Al-Ajmi',
    'Yasser Al-Dosari',
    'Mahmoud Khalil Al-Hussary',
    'Mohamed Siddiq Al-Minshawi',
    'Abdul Basit Abdul Samad',
    'Fares Abbad',
    'Idris Abkar',
    'Nasser Al Qatami'
);

-- Insert Famous Reciters with Full Surah List (1-114)
DO $$
BEGIN
  IF to_regclass('public.quran_reciters') IS NOT NULL THEN
    IF (
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quran_reciters'
        AND column_name = 'id'
    ) IS NULL THEN
      CREATE SEQUENCE IF NOT EXISTS quran_reciters_id_seq OWNED BY public.quran_reciters.id;
      ALTER TABLE public.quran_reciters ALTER COLUMN id SET DEFAULT nextval('quran_reciters_id_seq');
      PERFORM setval('quran_reciters_id_seq', COALESCE((SELECT MAX(id) FROM public.quran_reciters), 0) + 1, false);
    END IF;
  END IF;
END
$$;

INSERT INTO public.quran_reciters (name, image, rewaya, server, category, surah_list, is_active, featured) VALUES
(
    'Mishary Rashid Alafasy',
    'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg',
    'Hafs',
    'https://server8.mp3quran.net/afs/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Abdul Rahman Al-Sudais',
    'https://static.surahquran.com/images/reciters/1.jpg',
    'Hafs',
    'https://server11.mp3quran.net/sds/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Saud Al-Shuraim',
    'https://static.surahquran.com/images/reciters/6.jpg',
    'Hafs',
    'https://server7.mp3quran.net/shur/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Maher Al Muaiqly',
    'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg',
    'Hafs',
    'https://server12.mp3quran.net/maher/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Saad Al Ghamdi',
    'https://static.surahquran.com/images/reciters/4.jpg',
    'Hafs',
    'https://server7.mp3quran.net/s_gmd/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Ahmed Al-Ajmi',
    'https://static.surahquran.com/images/reciters/3.jpg',
    'Hafs',
    'https://server10.mp3quran.net/ajm/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Yasser Al-Dosari',
    'https://static.surahquran.com/images/reciters/2.jpg',
    'Hafs',
    'https://server11.mp3quran.net/yasser/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Mahmoud Khalil Al-Hussary',
    'https://static.surahquran.com/images/reciters/5.jpg',
    'Murattal',
    'https://server13.mp3quran.net/husr/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Mohamed Siddiq Al-Minshawi',
    'https://static.surahquran.com/images/reciters/10.jpg',
    'Murattal',
    'https://server10.mp3quran.net/minsh/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Abdul Basit Abdul Samad',
    'https://static.surahquran.com/images/reciters/12.jpg',
    'Murattal',
    'https://server7.mp3quran.net/basit/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Fares Abbad',
    'https://static.surahquran.com/images/reciters/8.jpg',
    'Hafs',
    'https://server8.mp3quran.net/frs_a/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Idris Abkar',
    'https://static.surahquran.com/images/reciters/19.jpg',
    'Hafs',
    'https://server6.mp3quran.net/abkr/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
),
(
    'Nasser Al Qatami',
    'https://static.surahquran.com/images/reciters/16.jpg',
    'Hafs',
    'https://server6.mp3quran.net/qtm/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
);

-- ==============================
-- END FILE: 20260222_add_famous_reciters.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_add_indexes.sql
-- ==============================

-- Add indexes for frequently queried columns to improve performance

-- Videos table
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_year ON public.videos(year);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views ON public.videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category_year ON public.videos(category, year);

-- Anime table
CREATE INDEX IF NOT EXISTS idx_anime_category ON public.anime(category);
CREATE INDEX IF NOT EXISTS idx_anime_id_desc ON public.anime(id DESC);

-- Quran Reciters table
CREATE INDEX IF NOT EXISTS idx_quran_reciters_id_desc ON public.quran_reciters(id DESC);

-- Movies table (if exists, based on previous migrations)
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON public.movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON public.movies(created_at DESC);

-- Series table (if exists)
CREATE INDEX IF NOT EXISTS idx_series_tmdb_id ON public.series(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_series_created_at ON public.series(created_at DESC);

-- ==============================
-- END FILE: 20260222_add_indexes.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_fix_famous_reciters.sql
-- ==============================


-- Migration: Fix Famous Reciters
-- Date: 2026-02-22

-- 1. Remove "Famous" tag from accidental matches (impostors or less famous with similar names)
UPDATE public.quran_reciters
SET category = 'Others', featured = false
WHERE name IN ('خالد الشريمي', 'خالد الغامدي', 'سامي الدوسري', 'إبراهيم الدوسري');

-- 2. Update Abdul Basit to Famous (Arabic name match)
UPDATE public.quran_reciters
SET category = 'Famous', 
    featured = true,
    image = 'https://static.surahquran.com/images/reciters/12.jpg'
WHERE name LIKE '%عبدالباسط عبدالصمد%';

-- 3. Insert missing famous reciters (using high IDs to avoid conflict)

-- Yasser Al-Dosari
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10001,
    'Yasser Al-Dosari',
    'https://static.surahquran.com/images/reciters/2.jpg',
    'Hafs',
    'https://server11.mp3quran.net/yasser/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Fares Abbad
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10002,
    'Fares Abbad',
    'https://static.surahquran.com/images/reciters/8.jpg',
    'Hafs',
    'https://server8.mp3quran.net/frs_a/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Nasser Al Qatami
INSERT INTO public.quran_reciters (id, name, image, rewaya, server, category, surah_list, is_active, featured)
VALUES (
    10003,
    'Nasser Al Qatami',
    'https://static.surahquran.com/images/reciters/16.jpg',
    'Hafs',
    'https://server6.mp3quran.net/qtm/',
    'Famous',
    '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- ==============================
-- END FILE: 20260222_fix_famous_reciters.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_fix_rls_anime_quran.sql
-- ==============================

-- Fix RLS for Anime and Quran Reciters
ALTER TABLE IF EXISTS public.anime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.anime;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.anime;
CREATE POLICY "Enable read access for all users" ON public.anime
FOR SELECT
TO public
USING (true);

ALTER TABLE IF EXISTS public.quran_reciters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.quran_reciters;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quran_reciters;
CREATE POLICY "Enable read access for all users" ON public.quran_reciters
FOR SELECT
TO public
USING (true);

-- Explicitly grant select permissions just in case
GRANT SELECT ON public.anime TO anon, authenticated, service_role;
GRANT SELECT ON public.quran_reciters TO anon, authenticated, service_role;

-- ==============================
-- END FILE: 20260222_fix_rls_anime_quran.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_secure_diagnostics.sql
-- ==============================

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;

DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;

DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
CREATE POLICY "Enable read for admins" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- ==============================
-- END FILE: 20260222_secure_diagnostics.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260222_set_famous_images.sql
-- ==============================

-- Migration: Set images and featured status for famous reciters
-- Date: 2026-02-22

-- Mishary Rashid Alafasy
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg',
    category = 'Famous'
WHERE name LIKE '%Mishary%' OR name LIKE '%Afasy%';

-- Abdul Rahman Al-Sudais
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/1.jpg',
    category = 'Famous'
WHERE name LIKE '%Sudais%';

-- Saud Al-Shuraim
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/6.jpg',
    category = 'Famous'
WHERE name LIKE '%Shuraim%';

-- Maher Al Muaiqly
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg',
    category = 'Famous'
WHERE name LIKE '%Maher%' AND name LIKE '%Muaiqly%';

-- Saad Al Ghamdi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/4.jpg',
    category = 'Famous'
WHERE name LIKE '%Ghamdi%';

-- Ahmed Al-Ajmi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/3.jpg',
    category = 'Famous'
WHERE name LIKE '%Ajmi%';

-- Yasser Al-Dosari
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/2.jpg',
    category = 'Famous'
WHERE name LIKE '%Dosari%';

-- Mahmoud Khalil Al-Hussary
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/5.jpg',
    category = 'Famous'
WHERE name LIKE '%Hussary%' OR name LIKE '%Husary%';

-- Mohamed Siddiq Al-Minshawi
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/10.jpg',
    category = 'Famous'
WHERE name LIKE '%Minshawi%';

-- Abdul Basit Abdul Samad
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/12.jpg',
    category = 'Famous'
WHERE name LIKE '%Abdul Basit%' OR name LIKE '%Abdus-Samad%';

-- Fares Abbad
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/8.jpg',
    category = 'Famous'
WHERE name LIKE '%Fares%' AND name LIKE '%Abbad%';

-- Idris Abkar
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/19.jpg',
    category = 'Famous'
WHERE name LIKE '%Idris%' AND name LIKE '%Abkar%';

-- Nasser Al Qatami
UPDATE public.quran_reciters 
SET featured = true, 
    image = 'https://static.surahquran.com/images/reciters/16.jpg',
    category = 'Famous'
WHERE name LIKE '%Qatami%';

-- ==============================
-- END FILE: 20260222_set_famous_images.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260223_create_translations_table.sql
-- ==============================

CREATE TABLE IF NOT EXISTS translations (
    original_title TEXT PRIMARY KEY,
    arabic_title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON translations;
CREATE POLICY "Allow public read access" ON translations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON translations;
CREATE POLICY "Allow public insert access" ON translations FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_translations_original_title ON translations(original_title);

-- ==============================
-- END FILE: 20260223_create_translations_table.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_activity_interactions.sql
-- ==============================

-- Activity Interactions Table
DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.activity_likes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(activity_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS public.activity_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;

  IF to_regclass('public.activity_likes') IS NOT NULL THEN
    ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view activity likes" ON public.activity_likes;
    CREATE POLICY "Anyone can view activity likes" ON public.activity_likes
        FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Users can like activities" ON public.activity_likes;
    CREATE POLICY "Users can like activities" ON public.activity_likes
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can unlike activities" ON public.activity_likes;
    CREATE POLICY "Users can unlike activities" ON public.activity_likes
        FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view activity comments" ON public.activity_comments;
    CREATE POLICY "Anyone can view activity comments" ON public.activity_comments
        FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Users can comment on activities" ON public.activity_comments;
    CREATE POLICY "Users can comment on activities" ON public.activity_comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can edit/delete their own comments" ON public.activity_comments;
    CREATE POLICY "Users can edit/delete their own comments" ON public.activity_comments
        FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Realtime
DO $$
BEGIN
  IF to_regclass('public.activity_likes') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_likes;
  END IF;
END
$$;
DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_comments;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_activity_interactions.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_activity_reactions_replies.sql
-- ==============================

-- Activity Reactions Table
DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.activity_reactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(activity_id, user_id)
    );
  END IF;
END
$$;

-- Activity Comment Replies Table
DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.activity_comment_replies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        comment_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END
$$;

-- RLS Policies for Reactions
DO $$
BEGIN
  IF to_regclass('public.activity_reactions') IS NOT NULL THEN
    ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view activity reactions" ON public.activity_reactions;
    CREATE POLICY "Anyone can view activity reactions"
        ON public.activity_reactions FOR SELECT
        USING (true);
    DROP POLICY IF EXISTS "Authenticated users can add/update their own reactions" ON public.activity_reactions;
    CREATE POLICY "Authenticated users can add/update their own reactions"
        ON public.activity_reactions FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can update their own reactions" ON public.activity_reactions;
    CREATE POLICY "Users can update their own reactions"
        ON public.activity_reactions FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.activity_reactions;
    CREATE POLICY "Users can delete their own reactions"
        ON public.activity_reactions FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
  END IF;
END
$$;

-- RLS Policies for Comment Replies
DO $$
BEGIN
  IF to_regclass('public.activity_comment_replies') IS NOT NULL THEN
    ALTER TABLE public.activity_comment_replies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view comment replies" ON public.activity_comment_replies;
    CREATE POLICY "Anyone can view comment replies"
        ON public.activity_comment_replies FOR SELECT
        USING (true);
    DROP POLICY IF EXISTS "Authenticated users can add their own replies" ON public.activity_comment_replies;
    CREATE POLICY "Authenticated users can add their own replies"
        ON public.activity_comment_replies FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Users can delete their own replies" ON public.activity_comment_replies;
    CREATE POLICY "Users can delete their own replies"
        ON public.activity_comment_replies FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Indexes for performance
DO $$
BEGIN
  IF to_regclass('public.activity_reactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity_id ON public.activity_reactions(activity_id);
  END IF;
  IF to_regclass('public.activity_comment_replies') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON public.activity_comment_replies(comment_id);
  END IF;
END
$$;

-- ==============================
-- END FILE: 20260301_activity_reactions_replies.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_add_ratings_to_comments.sql
-- ==============================

-- Migration to add ratings and titles to comments table
-- This transforms comments into a full Reviews & Ratings system

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments 
    ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    ADD COLUMN IF NOT EXISTS title TEXT;

    DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
    DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
    CREATE POLICY "Users can insert their own comments" ON public.comments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE INDEX IF NOT EXISTS idx_comments_content ON public.comments(content_id, content_type);
  END IF;
END
$$;

-- ==============================
-- END FILE: 20260301_add_ratings_to_comments.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_add_social_features.sql
-- ==============================

-- Add social fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS avatar_decoration TEXT, -- To store decoration type (e.g., 'gold_border', 'neon_glow')
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT cannot_follow_self CHECK (follower_id != following_id)
);

-- Enable RLS for follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies for follows
DROP POLICY IF EXISTS "Users can see who is following whom" ON public.follows;
CREATE POLICY "Users can see who is following whom" 
    ON public.follows FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Users can unfollow others" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'watch', 'review', 'achievement', 'follow', 'playlist_created'
    content_id TEXT, -- ID of the movie, series, review, achievement, etc.
    content_type TEXT, -- 'movie', 'series', 'review', 'achievement', 'playlist'
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data like rating, review title, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for activity_feed
ALTER TABLE IF EXISTS public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Policies for activity_feed
DROP POLICY IF EXISTS "Users can view activity of people they follow or their own" ON public.activity_feed;
CREATE POLICY "Users can view activity of people they follow or their own" 
    ON public.activity_feed FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        user_id IN (SELECT following_id FROM public.follows WHERE follower_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create their own activity" ON public.activity_feed;
CREATE POLICY "Users can create their own activity" 
    ON public.activity_feed FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Realtime support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'follows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_add_social_features.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_challenges.sql
-- ==============================

-- User Challenges System

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description TEXT,
    description_en TEXT,
    type TEXT NOT NULL CHECK (type IN ('watch_count', 'review_count', 'follow_count', 'social_share')),
    target_count INTEGER NOT NULL DEFAULT 1,
    reward_xp INTEGER NOT NULL DEFAULT 50,
    icon TEXT DEFAULT 'Zap',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON challenges;
CREATE POLICY "Challenges are viewable by everyone" ON challenges
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "User challenges are viewable by the user" ON user_challenges;
CREATE POLICY "User challenges are viewable by the user" ON user_challenges
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User challenges are updatable by system" ON user_challenges;
CREATE POLICY "User challenges are updatable by system" ON user_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Initial Challenges
INSERT INTO challenges (title, title_en, description, description_en, type, target_count, reward_xp, icon) VALUES
('مشاهد أول', 'First Watch', 'شاهد أول فيلم لك على المنصة', 'Watch your first movie on the platform', 'watch_count', 1, 50, 'PlayCircle'),
('عاشق السينما', 'Cinema Lover', 'شاهد 10 أفلام', 'Watch 10 movies', 'watch_count', 10, 200, 'Film'),
('الناقد المبتدئ', 'Junior Critic', 'اكتب أول مراجعة لك', 'Write your first review', 'review_count', 1, 50, 'MessageSquare'),
('المؤثر الاجتماعي', 'Social Influencer', 'تابع 5 مستخدمين', 'Follow 5 users', 'follow_count', 5, 100, 'Users');

-- ==============================
-- END FILE: 20260301_challenges.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_comments_advanced.sql
-- ==============================

-- Update comments table for moderation
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments 
    ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
  END IF;
END
$$;

-- Update activity_comments table for replies and moderation
DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    ALTER TABLE public.activity_comments 
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- RLS Update for moderation
-- Only admins can see hidden comments
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;
    CREATE POLICY "Admins can view all comments" ON public.comments
        FOR SELECT USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
            OR is_hidden = false
        );
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all activity comments" ON public.activity_comments;
    CREATE POLICY "Admins can view all activity comments" ON public.activity_comments
        FOR SELECT USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
            OR is_hidden = false
        );
  END IF;
END
$$;

-- ==============================
-- END FILE: 20260301_comments_advanced.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_create_achievements.sql
-- ==============================

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- Lucide icon name or emoji
    category TEXT DEFAULT 'general',
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for achievements
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
CREATE POLICY "Achievements are viewable by everyone" 
    ON public.achievements FOR SELECT 
    USING (true);

-- Policies for user_achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" 
    ON public.user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view others' achievements" ON public.user_achievements;
CREATE POLICY "Users can view others' achievements" 
    ON public.user_achievements FOR SELECT 
    USING (true);

-- Realtime support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_achievements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
  END IF;
END
$$;
-- Insert some default achievements
INSERT INTO public.achievements (id, title, description, icon, category, points) VALUES
('first_movie', 'أول فشار 🍿', 'شاهدت أول فيلم لك على المنصة', 'Film', 'watch', 10),
('movie_critic', 'ناقد سينمائي 🎭', 'قمت بتقييم 5 أفلام أو مسلسلات', 'Star', 'social', 20),
('social_butterfly', 'فراشة اجتماعية 🦋', 'شاركت 10 روابط مع أصدقائك', 'Share2', 'social', 30),
('party_host', 'صاحب المجلس 🏠', 'أنشأت أول غرفة مشاهدة جماعية لك', 'Users', 'social', 25),
('night_owl', 'بومة الليل 🦉', 'شاهدت محتوى بعد منتصف الليل', 'Moon', 'watch', 15),
('marathon_runner', 'عداء الماراثون 🏃‍♂️', 'شاهدت 3 حلقات متتالية من مسلسل', 'Zap', 'watch', 50),
('cinema_legend', 'أسطورة السينما 👑', 'شاهدت أكثر من 100 ساعة من المحتوى', 'Trophy', 'watch', 100)
ON CONFLICT (id) DO NOTHING;

-- ==============================
-- END FILE: 20260301_create_achievements.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_create_notifications.sql
-- ==============================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'recommendation'
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb, -- Optional data (e.g., { content_id: 123, content_type: 'movie' })
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (mark as read)" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    USING (auth.uid() = user_id);

-- System can insert notifications (via service role or defined functions)
-- For now, allow authenticated users to insert for testing/simplicity if needed, 
-- but ideally this is done via edge functions or triggers.
DROP POLICY IF EXISTS "Authenticated users can create notifications for themselves" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications for themselves" 
    ON public.notifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Realtime support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_create_notifications.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_create_playlists.sql
-- ==============================

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create playlist_items table
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(playlist_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Policies for playlists
DROP POLICY IF EXISTS "Playlists are viewable by everyone if public" ON public.playlists;
CREATE POLICY "Playlists are viewable by everyone if public" 
    ON public.playlists FOR SELECT 
    USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;
CREATE POLICY "Users can manage their own playlists" 
    ON public.playlists FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for playlist_items
DROP POLICY IF EXISTS "Playlist items are viewable if playlist is viewable" ON public.playlist_items;
CREATE POLICY "Playlist items are viewable if playlist is viewable" 
    ON public.playlist_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE id = playlist_id AND (is_public OR auth.uid() = user_id)
    ));

DROP POLICY IF EXISTS "Users can manage items in their own playlists" ON public.playlist_items;
CREATE POLICY "Users can manage items in their own playlists" 
    ON public.playlist_items FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE id = playlist_id AND auth.uid() = user_id
    ));

-- Realtime support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'playlists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'playlist_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_items;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_create_playlists.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_create_watch_parties.sql
-- ==============================

-- Migration to create watch parties system
-- This enables users to watch content together in synchronized rooms

CREATE TABLE IF NOT EXISTS public.watch_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    "current_time" DOUBLE PRECISION DEFAULT 0.0,
    is_playing BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Watch parties are viewable by everyone" ON public.watch_parties;
CREATE POLICY "Watch parties are viewable by everyone" 
ON public.watch_parties FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create watch parties" ON public.watch_parties;
CREATE POLICY "Authenticated users can create watch parties" 
ON public.watch_parties FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their own watch parties" ON public.watch_parties;
CREATE POLICY "Creators can update their own watch parties" 
ON public.watch_parties FOR UPDATE 
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their own watch parties" ON public.watch_parties;
CREATE POLICY "Creators can delete their own watch parties" 
ON public.watch_parties FOR DELETE 
USING (auth.uid() = creator_id);

-- Create table for room members/participants
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(party_id, user_id)
);

-- Enable RLS for participants
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

-- Policies for participants
DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
CREATE POLICY "Participants are viewable by room members" 
ON public.watch_party_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.watch_party_participants 
        WHERE party_id = public.watch_party_participants.party_id 
        AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Authenticated users can join watch parties" ON public.watch_party_participants;
CREATE POLICY "Authenticated users can join watch parties" 
ON public.watch_party_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave watch parties" ON public.watch_party_participants;
CREATE POLICY "Users can leave watch parties" 
ON public.watch_party_participants FOR DELETE 
USING (auth.uid() = user_id);

-- Enable Realtime for these tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'watch_parties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'watch_party_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_create_watch_parties.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_leaderboards.sql
-- ==============================

-- Leaderboard Views and Functions
-- Based on Experience Points (XP)

CREATE OR REPLACE VIEW user_rankings AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(SUM(a.points), 0) as total_xp,
    COUNT(DISTINCT h.id) as movies_watched,
    COUNT(DISTINCT c.id) as reviews_written,
    RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) as rank
FROM 
    profiles p
LEFT JOIN 
    user_achievements ua ON p.id = ua.user_id
LEFT JOIN 
    achievements a ON ua.achievement_id = a.id
LEFT JOIN 
    history h ON p.id = h.user_id
LEFT JOIN 
    comments c ON p.id = c.user_id
GROUP BY 
    p.id, p.username, p.avatar_url;

-- Enable RLS on the view (views don't have RLS themselves, but the underlying tables do)
-- However, we want to make sure the view is accessible to everyone
GRANT SELECT ON user_rankings TO anon, authenticated;

-- ==============================
-- END FILE: 20260301_leaderboards.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_moderation_blocking.sql
-- ==============================


-- Create activity comment reports table
DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS activity_comment_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        comment_id UUID NOT NULL REFERENCES public.activity_comments(id) ON DELETE CASCADE,
        reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(comment_id, reporter_id)
    );
  END IF;
END
$$;

-- Create user blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- RLS for activity_comment_reports
DO $$
BEGIN
  IF to_regclass('public.activity_comment_reports') IS NOT NULL THEN
    ALTER TABLE activity_comment_reports ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can report comments" ON activity_comment_reports;
    CREATE POLICY "Users can report comments"
        ON activity_comment_reports FOR INSERT
        WITH CHECK (auth.uid() = reporter_id);

    DROP POLICY IF EXISTS "Admins can view reports" ON activity_comment_reports;
    CREATE POLICY "Admins can view reports"
        ON activity_comment_reports FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND (role = 'admin' OR role = 'supervisor')
            )
        );
  END IF;
END
$$;

-- RLS for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON user_blocks;
CREATE POLICY "Users can view their own blocks"
    ON user_blocks FOR SELECT
    USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON user_blocks;
CREATE POLICY "Users can block others"
    ON user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock others" ON user_blocks;
CREATE POLICY "Users can unblock others"
    ON user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- Realtime for reports (admins only)
DO $$
BEGIN
  IF to_regclass('public.activity_comment_reports') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_comment_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_comment_reports;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_moderation_blocking.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_review_voting.sql
-- ==============================


-- Create review votes table (for comments/reviews)
DO $$
DECLARE
  comments_id_type TEXT;
BEGIN
  IF to_regclass('public.comments') IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO comments_id_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'comments'
      AND a.attname = 'id'
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF comments_id_type IS NOT NULL THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS review_votes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            comment_id %s NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            vote_type TEXT NOT NULL CHECK (vote_type IN (''up'', ''down'')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(comment_id, user_id)
        )',
        comments_id_type
      );
    END IF;

    IF to_regclass('public.review_votes') IS NOT NULL THEN
      ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can view all votes" ON review_votes;
      CREATE POLICY "Users can view all votes"
          ON review_votes FOR SELECT
          USING (true);

      DROP POLICY IF EXISTS "Users can vote once per review" ON review_votes;
      CREATE POLICY "Users can vote once per review"
          ON review_votes FOR INSERT
          WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can change their vote" ON review_votes;
      CREATE POLICY "Users can change their vote"
          ON review_votes FOR UPDATE
          USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can remove their vote" ON review_votes;
      CREATE POLICY "Users can remove their vote"
          ON review_votes FOR DELETE
          USING (auth.uid() = user_id);

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'review_votes'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.review_votes;
      END IF;
    END IF;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_review_voting.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_user_lists.sql
-- ==============================


-- Create user lists table
CREATE TABLE IF NOT EXISTS user_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user list items table
CREATE TABLE IF NOT EXISTS user_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, content_id, content_type)
);

-- RLS for user_lists
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public lists are viewable by everyone" ON user_lists;
CREATE POLICY "Public lists are viewable by everyone"
    ON user_lists FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own lists" ON user_lists;
CREATE POLICY "Users can create their own lists"
    ON user_lists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lists" ON user_lists;
CREATE POLICY "Users can update their own lists"
    ON user_lists FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lists" ON user_lists;
CREATE POLICY "Users can delete their own lists"
    ON user_lists FOR DELETE
    USING (auth.uid() = user_id);

-- RLS for user_list_items
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "List items are viewable if list is viewable" ON user_list_items;
CREATE POLICY "List items are viewable if list is viewable"
    ON user_list_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND (user_lists.is_public = true OR user_lists.user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can add items to their own lists" ON user_list_items;
CREATE POLICY "Users can add items to their own lists"
    ON user_list_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND user_lists.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can remove items from their own lists" ON user_list_items;
CREATE POLICY "Users can remove items from their own lists"
    ON user_list_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND user_lists.user_id = auth.uid()
        )
    );

-- Realtime for lists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_lists;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_list_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_list_items;
  END IF;
END
$$;
-- ==============================
-- END FILE: 20260301_user_lists.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260301_watch_party_enhancements.sql
-- ==============================

-- Watch Party Enhancements: Messages and Reactions

CREATE TABLE IF NOT EXISTS watch_party_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_party_messages_party_id ON watch_party_messages(party_id);

-- RLS Policies
ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages are viewable by party participants" ON watch_party_messages;
CREATE POLICY "Messages are viewable by party participants" ON watch_party_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Participants can send messages" ON watch_party_messages;
CREATE POLICY "Participants can send messages" ON watch_party_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

-- Reactions View/Support
-- We'll use Supabase Realtime for transient reactions, no need for persistent table

-- ==============================
-- END FILE: 20260301_watch_party_enhancements.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260303_full_security_audit.sql
-- ==============================

-- Full Security Audit and RLS Policy Fixes
-- Date: 2026-03-03

-- 1. History Table Policies
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own history" ON public.history;
DROP POLICY IF EXISTS "Users can view their own history" ON public.history;
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own history" ON public.history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.history;
CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON public.history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.history;
CREATE POLICY "Users can delete their own history" 
ON public.history FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Comments Table Policies
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
    DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
    CREATE POLICY "Comments are viewable by everyone" 
    ON public.comments FOR SELECT 
    USING (true);

    DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
    DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
    CREATE POLICY "Authenticated users can insert comments" 
    ON public.comments FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
    DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
    CREATE POLICY "Users can update their own comments" 
    ON public.comments FOR UPDATE 
    USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor'));

    DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
    DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
    CREATE POLICY "Users can delete their own comments" 
    ON public.comments FOR DELETE 
    USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor'));
  END IF;
END
$$;

-- 3. Notifications Table Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = user_id);

-- 4. User Achievements Table Policies
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Playlists Table Policies
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.playlists;
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.playlists;
CREATE POLICY "Public playlists are viewable by everyone" 
ON public.playlists FOR SELECT 
USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;
CREATE POLICY "Users can manage their own playlists" 
ON public.playlists FOR ALL 
USING (auth.uid() = user_id);

-- 6. User Lists Table Policies
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public user lists are viewable by everyone" ON public.user_lists;
DROP POLICY IF EXISTS "Public user lists are viewable by everyone" ON public.user_lists;
CREATE POLICY "Public user lists are viewable by everyone" 
ON public.user_lists FOR SELECT 
USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own user lists" ON public.user_lists;
DROP POLICY IF EXISTS "Users can manage their own user lists" ON public.user_lists;
CREATE POLICY "Users can manage their own user lists" 
ON public.user_lists FOR ALL 
USING (auth.uid() = user_id);

-- ==============================
-- END FILE: 20260303_full_security_audit.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260303_security_hardening.sql
-- ==============================

-- Security Hardening for Watch Parties and Chat
-- Date: 2026-03-03

-- 1. Tighten watch_party_messages INSERT policy
-- Ensure user_id matches auth.uid() and user is a participant
DROP POLICY IF EXISTS "Participants can send messages" ON watch_party_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON watch_party_messages;
CREATE POLICY "Participants can send messages" ON watch_party_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

-- 2. Tighten watch_parties SELECT policy
-- Room metadata should only be visible to authenticated users at minimum, 
-- or even better, restricted to room members if we want strict privacy.
-- For now, let's at least restrict to authenticated users.
DROP POLICY IF EXISTS "Watch parties are viewable by everyone" ON public.watch_parties;
DROP POLICY IF EXISTS "Watch parties are viewable by authenticated users" ON public.watch_parties;
CREATE POLICY "Watch parties are viewable by authenticated users" 
ON public.watch_parties FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Add room privacy support (future-proofing)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='watch_parties' AND column_name='is_private') THEN
        ALTER TABLE public.watch_parties ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='watch_parties' AND column_name='room_password') THEN
        ALTER TABLE public.watch_parties ADD COLUMN IF NOT EXISTS room_password TEXT;
    END IF;
END $$;

-- 4. Update SELECT policy for watch_parties to handle privacy
DROP POLICY IF EXISTS "Watch parties are viewable by authenticated users" ON public.watch_parties;
DROP POLICY IF EXISTS "Watch parties visibility" ON public.watch_parties;
CREATE POLICY "Watch parties visibility" 
ON public.watch_parties FOR SELECT 
USING (
    NOT is_private OR 
    auth.uid() = creator_id OR
    EXISTS (
        SELECT 1 FROM watch_party_participants 
        WHERE party_id = public.watch_parties.id 
        AND user_id = auth.uid()
    )
);

-- 5. Harden watch_party_participants SELECT policy (already good, but re-confirming)
DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
CREATE POLICY "Participants are viewable by room members" 
ON public.watch_party_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.watch_party_participants 
        WHERE party_id = public.watch_party_participants.party_id 
        AND user_id = auth.uid()
    )
);

-- ==============================
-- END FILE: 20260303_security_hardening.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260304_create_ai_cache_and_action_logs.sql
-- ==============================

-- Create ai_cache table
CREATE TABLE IF NOT EXISTS public.ai_cache (
    cache_key TEXT PRIMARY KEY,
    response TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create action_logs table
CREATE TABLE IF NOT EXISTS public.action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    content_id BIGINT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- ai_cache Policies
DROP POLICY IF EXISTS "Enable read for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable read for everyone" ON public.ai_cache;
CREATE POLICY "Enable read for everyone" ON public.ai_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
CREATE POLICY "Enable insert for admins only" ON public.ai_cache FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable update for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
CREATE POLICY "Enable update for admins only" ON public.ai_cache FOR UPDATE TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

-- action_logs Policies
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
CREATE POLICY "Enable insert for admins" ON public.action_logs FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable read for admins" ON public.action_logs;
DROP POLICY IF EXISTS "Enable read for admins" ON public.action_logs;
CREATE POLICY "Enable read for admins" ON public.action_logs FOR SELECT TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_cache_context ON public.ai_cache(context);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_content_id ON public.action_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);

-- ==============================
-- END FILE: 20260304_create_ai_cache_and_action_logs.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260304_create_broken_counts_view.sql
-- ==============================


-- Create a view to count broken links per content_id
-- This allows us to query only the counts, avoiding the 1000 row limit of direct table access
CREATE OR REPLACE VIEW public.broken_content_counts AS
SELECT 
    content_id, 
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200 -- Anything not OK is broken
GROUP BY 
    content_id;

-- Grant access to everyone
GRANT SELECT ON public.broken_content_counts TO anon;
GRANT SELECT ON public.broken_content_counts TO authenticated;
GRANT SELECT ON public.broken_content_counts TO service_role;

-- ==============================
-- END FILE: 20260304_create_broken_counts_view.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260304_fix_link_checks_rls.sql
-- ==============================


-- Enable read access for everyone on link_checks
ALTER TABLE public.link_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
CREATE POLICY "Enable read for everyone" ON public.link_checks
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
CREATE POLICY "Enable insert for everyone" ON public.link_checks
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
CREATE POLICY "Enable update for everyone" ON public.link_checks
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ==============================
-- END FILE: 20260304_fix_link_checks_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260304_fix_link_checks_tv.sql
-- ==============================


-- Add season_number and episode_number to link_checks for TV content tracking
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS season_number INTEGER;
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Update content_type check to include tv_episode if needed, 
-- but ContentHealth uses 'tv' with season/episode
ALTER TABLE link_checks DROP CONSTRAINT IF EXISTS link_checks_content_type_check;
ALTER TABLE link_checks ADD CONSTRAINT link_checks_content_type_check 
  CHECK (content_type IN ('movie', 'tv', 'episode', 'tv_episode'));

-- Index for faster filtering in Content Health
CREATE INDEX IF NOT EXISTS idx_link_checks_tv_details ON link_checks(content_id, content_type, season_number, episode_number);

-- ==============================
-- END FILE: 20260304_fix_link_checks_tv.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260304_update_broken_counts_view.sql
-- ==============================


CREATE OR REPLACE VIEW public.broken_episode_counts AS
SELECT 
    content_id, 
    season_number,
    episode_number,
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200
GROUP BY 
    content_id, season_number, episode_number;

GRANT SELECT ON public.broken_episode_counts TO anon;
GRANT SELECT ON public.broken_episode_counts TO authenticated;
GRANT SELECT ON public.broken_episode_counts TO service_role;

-- ==============================
-- END FILE: 20260304_update_broken_counts_view.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260305_create_avatars_bucket.sql
-- ==============================

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
-- 1. Allow public access to view avatars
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload their own avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================
-- END FILE: 20260305_create_avatars_bucket.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260307_optimize_movies_series.sql
-- ==============================


-- Performance Optimization for 50k+ Content Items

-- 1. Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Movies Optimization
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON public.movies USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_arabic_title_trgm ON public.movies USING GIN (arabic_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON public.movies (release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_rating_color ON public.movies (rating_color);

-- 3. TV Series Optimization
CREATE INDEX IF NOT EXISTS idx_series_name_trgm ON public.tv_series USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_series_arabic_name_trgm ON public.tv_series USING GIN (arabic_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_series_first_air_date ON public.tv_series (first_air_date DESC);
CREATE INDEX IF NOT EXISTS idx_series_rating_color ON public.tv_series (rating_color);

-- 4. Tagging Optimization (Already exist but good to ensure)
CREATE INDEX IF NOT EXISTS idx_movies_origin_country ON public.movies USING GIN (origin_country);
CREATE INDEX IF NOT EXISTS idx_series_origin_country ON public.tv_series USING GIN (origin_country);

-- 5. Full Text Search Helper Function (Optional but useful)
CREATE OR REPLACE FUNCTION search_content(query_text text)
RETURNS TABLE (
  id bigint,
  title text,
  poster_path text,
  media_type text,
  relevance float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id, 
    title, 
    poster_path, 
    'movie' as media_type,
    similarity(title, query_text) as relevance
  FROM public.movies
  WHERE title % query_text OR arabic_title % query_text
  UNION ALL
  SELECT 
    id, 
    name as title, 
    poster_path, 
    'tv' as media_type,
    similarity(name, query_text) as relevance
  FROM public.tv_series
  WHERE name % query_text OR arabic_name % query_text
  ORDER BY relevance DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- END FILE: 20260307_optimize_movies_series.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_atomic_clicks_rpc.sql
-- ==============================

CREATE OR REPLACE FUNCTION public.increment_content_clicks(target_table text, target_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_table NOT IN ('movies', 'games', 'software') THEN
    RAISE EXCEPTION 'invalid_target_table';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET clicks = COALESCE(clicks, 0) + 1 WHERE id = $1',
    target_table
  ) USING target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_content_clicks(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_content_clicks(text, bigint) TO anon, authenticated;

-- ==============================
-- END FILE: 20260308_atomic_clicks_rpc.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_harden_sensitive_rls.sql
-- ==============================

BEGIN;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Users can read own logs" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Authenticated users can insert diagnostics" ON public.app_diagnostics;
CREATE POLICY "Authenticated users can insert diagnostics"
  ON public.app_diagnostics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Authenticated users can read own diagnostics" ON public.app_diagnostics;
CREATE POLICY "Authenticated users can read own diagnostics"
  ON public.app_diagnostics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Authenticated users can read link checks" ON public.link_checks;
CREATE POLICY "Authenticated users can read link checks"
  ON public.link_checks
  FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert link checks" ON public.link_checks;
CREATE POLICY "Authenticated users can insert link checks"
  ON public.link_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update link checks" ON public.link_checks;
CREATE POLICY "Authenticated users can update link checks"
  ON public.link_checks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert access" ON public.translations;
DROP POLICY IF EXISTS "Allow public read access" ON public.translations;
DROP POLICY IF EXISTS "Public read translations" ON public.translations;
CREATE POLICY "Public read translations"
  ON public.translations
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Authenticated insert translations" ON public.translations;
CREATE POLICY "Authenticated insert translations"
  ON public.translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update translations" ON public.translations;
CREATE POLICY "Authenticated update translations"
  ON public.translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- ==============================
-- END FILE: 20260308_harden_sensitive_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_home_materialized_views.sql
-- ==============================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_home_trending AS
SELECT
  m.tmdb_id,
  'movie'::text AS media_type,
  m.title::text AS title,
  NULL::text AS name,
  m.poster_path::text AS poster_path,
  m.backdrop_path::text AS backdrop_path,
  m.vote_average::numeric AS vote_average,
  m.overview::text AS overview,
  m.release_date::text AS release_date,
  NULL::text AS first_air_date,
  COALESCE(m.popularity, 0)::numeric AS popularity_score
FROM public.movies m
WHERE m.tmdb_id IS NOT NULL
ORDER BY COALESCE(m.popularity, 0) DESC, COALESCE(m.vote_average, 0) DESC
LIMIT 300;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_ramadan_eg AS
SELECT
  s.id AS tmdb_id,
  'tv'::text AS media_type,
  NULL::text AS title,
  s.name::text AS name,
  s.poster_path::text AS poster_path,
  s.backdrop_path::text AS backdrop_path,
  s.vote_average::numeric AS vote_average,
  s.overview::text AS overview,
  NULL::text AS release_date,
  s.first_air_date::text AS first_air_date,
  COALESCE(s.popularity, 0)::numeric AS popularity_score
FROM public.tv_series s
WHERE s.id IS NOT NULL
  AND (
    COALESCE(s.is_ramadan, false) = true
    OR COALESCE(s.origin_country::text, '') ILIKE '%EG%'
    OR COALESCE(s.arabic_name, '') <> ''
  )
ORDER BY COALESCE(s.popularity, 0) DESC, COALESCE(s.vote_average, 0) DESC
LIMIT 300;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_home_trending_tmdb_media
ON public.mv_home_trending (tmdb_id, media_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ramadan_eg_tmdb_media
ON public.mv_ramadan_eg (tmdb_id, media_type);

CREATE INDEX IF NOT EXISTS idx_mv_home_trending_popularity
ON public.mv_home_trending (popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_ramadan_eg_popularity
ON public.mv_ramadan_eg (popularity_score DESC);

CREATE TABLE IF NOT EXISTS public.system_cache_refresh (
  cache_key text PRIMARY KEY,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.refresh_home_materialized_views(
  force_refresh boolean DEFAULT false,
  min_interval_minutes integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_refresh timestamptz;
BEGIN
  SELECT refreshed_at INTO last_refresh
  FROM public.system_cache_refresh
  WHERE cache_key = 'home_materialized_views';

  IF NOT force_refresh
     AND last_refresh IS NOT NULL
     AND last_refresh > now() - make_interval(mins => GREATEST(min_interval_minutes, 1)) THEN
    RETURN 'skipped_recent_refresh';
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_home_trending;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_ramadan_eg;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_home_trending;
    REFRESH MATERIALIZED VIEW public.mv_ramadan_eg;
  END;

  INSERT INTO public.system_cache_refresh (cache_key, refreshed_at)
  VALUES ('home_materialized_views', now())
  ON CONFLICT (cache_key) DO UPDATE
  SET refreshed_at = EXCLUDED.refreshed_at;

  RETURN 'refreshed';
END;
$$;

GRANT SELECT ON public.mv_home_trending TO anon, authenticated;
GRANT SELECT ON public.mv_ramadan_eg TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) TO authenticated;

-- ==============================
-- END FILE: 20260308_home_materialized_views.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_lock_ai_cache_action_logs_rls.sql
-- ==============================

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
CREATE POLICY "Enable insert for admins only" ON public.ai_cache FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
CREATE POLICY "Enable update for admins only" ON public.ai_cache FOR UPDATE TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
CREATE POLICY "Enable insert for admins" ON public.action_logs FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

-- ==============================
-- END FILE: 20260308_lock_ai_cache_action_logs_rls.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_restrict_refresh_home_materialized_views_rpc.sql
-- ==============================

REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) TO service_role;

-- ==============================
-- END FILE: 20260308_restrict_refresh_home_materialized_views_rpc.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260308_unified_media_search_rpc.sql
-- ==============================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.search_movies_series(query_text text, result_limit integer DEFAULT 30)
RETURNS TABLE (
  id bigint,
  media_type text,
  title text,
  name text,
  poster_path text,
  backdrop_path text,
  vote_average numeric,
  rank_score real
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT NULLIF(trim(query_text), '') AS value
  ),
  movie_hits AS (
    SELECT
      m.id,
      'movie'::text AS media_type,
      m.title::text AS title,
      NULL::text AS name,
      m.poster_path::text AS poster_path,
      m.backdrop_path::text AS backdrop_path,
      m.vote_average::numeric AS vote_average,
      GREATEST(
        similarity(COALESCE(m.title, ''), q.value),
        similarity(COALESCE(m.arabic_title, ''), q.value)
      )::real AS rank_score
    FROM public.movies m
    CROSS JOIN q
    WHERE q.value IS NOT NULL
      AND (
        COALESCE(m.title, '') % q.value
        OR COALESCE(m.arabic_title, '') % q.value
        OR COALESCE(m.title, '') ILIKE '%' || q.value || '%'
        OR COALESCE(m.arabic_title, '') ILIKE '%' || q.value || '%'
      )
  ),
  series_hits AS (
    SELECT
      s.id,
      'tv'::text AS media_type,
      NULL::text AS title,
      s.name::text AS name,
      s.poster_path::text AS poster_path,
      s.backdrop_path::text AS backdrop_path,
      s.vote_average::numeric AS vote_average,
      GREATEST(
        similarity(COALESCE(s.name, ''), q.value),
        similarity(COALESCE(s.arabic_name, ''), q.value)
      )::real AS rank_score
    FROM public.tv_series s
    CROSS JOIN q
    WHERE q.value IS NOT NULL
      AND (
        COALESCE(s.name, '') % q.value
        OR COALESCE(s.arabic_name, '') % q.value
        OR COALESCE(s.name, '') ILIKE '%' || q.value || '%'
        OR COALESCE(s.arabic_name, '') ILIKE '%' || q.value || '%'
      )
  )
  SELECT *
  FROM (
    SELECT * FROM movie_hits
    UNION ALL
    SELECT * FROM series_hits
  ) merged
  ORDER BY rank_score DESC, vote_average DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 30), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_movies_series(text, integer) TO anon, authenticated;

-- ==============================
-- END FILE: 20260308_unified_media_search_rpc.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260309_core_indexes.sql
-- ==============================

create index if not exists idx_continue_watching_user_updated_at
  on public.continue_watching (user_id, updated_at desc);

create index if not exists idx_history_user_watched_at
  on public.history (user_id, watched_at desc);

create index if not exists idx_watchlist_user_type_content
  on public.watchlist (user_id, content_type, content_id);

DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    create index if not exists idx_activity_feed_user_created_at
      on public.activity_feed (user_id, created_at desc);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    create index if not exists idx_comments_content_type_created_at
      on public.comments (content_id, content_type, created_at desc);
  END IF;
END
$$;


-- ==============================
-- END FILE: 20260309_core_indexes.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260309_fix_watch_party_rls_recursion.sql
-- ==============================

DROP POLICY IF EXISTS "Watch parties visibility" ON public.watch_parties;
DROP POLICY IF EXISTS "Watch parties are viewable by authenticated users" ON public.watch_parties;
DROP POLICY IF EXISTS "Watch parties visibility safe" ON public.watch_parties;
CREATE POLICY "Watch parties visibility safe"
ON public.watch_parties
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
DROP POLICY IF EXISTS "Participants visibility safe" ON public.watch_party_participants;
CREATE POLICY "Participants visibility safe"
ON public.watch_party_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.watch_parties wp
    WHERE wp.id = watch_party_participants.party_id
      AND (wp.creator_id = auth.uid() OR NOT COALESCE(wp.is_private, false))
  )
);

-- ==============================
-- END FILE: 20260309_fix_watch_party_rls_recursion.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260309120000_fix_watch_party_rls_recursion.sql
-- ==============================

-- Fix recursive RLS policy on watch_party_participants which causes infinite recursion errors
-- when users try to join or view a party.

-- Drop potential problematic policies
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Participants can view other participants" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "view_participants" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Allow read access for participants" ON "public"."watch_party_participants";

-- Create a non-recursive policy for SELECT
-- We allow any authenticated user (or even anon if needed) to see participants of a party.
-- This breaks the recursion loop where "checking if I am a participant" required "querying the participants table".
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."watch_party_participants";
CREATE POLICY "Enable read access for all users"
ON "public"."watch_party_participants"
FOR SELECT
USING (true);

-- Ensure we have policies for INSERT and DELETE
-- Users can insert themselves
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."watch_party_participants";
CREATE POLICY "Enable insert for authenticated users only"
ON "public"."watch_party_participants"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete themselves
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "public"."watch_party_participants";
CREATE POLICY "Enable delete for users based on user_id"
ON "public"."watch_party_participants"
FOR DELETE
USING (auth.uid() = user_id);

-- ==============================
-- END FILE: 20260309120000_fix_watch_party_rls_recursion.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260309130000_create_content_translations.sql
-- ==============================

-- Create content_translations table to store AI translations
create table if not exists "public"."content_translations" (
    "id" uuid not null default gen_random_uuid(),
    "tmdb_id" int4 not null,
    "media_type" text not null,
    "title_ar" text,
    "overview_ar" text,
    "title_en" text,
    "overview_en" text,
    "created_at" timestamptz default now(),
    primary key ("id"),
    unique ("tmdb_id", "media_type")
);

-- Enable RLS
alter table "public"."content_translations" enable row level security;

-- Policy: Allow read access for all
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."content_translations";
create policy "Enable read access for all users"
on "public"."content_translations"
for select
using (true);

-- Policy: Allow insert for authenticated users (or anon if needed for auto-translation)
-- We'll allow anon for now to support the client-side translation flow
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."content_translations";
create policy "Enable insert for all users"
on "public"."content_translations"
for insert
with check (true);

-- Policy: Allow update for all users
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."content_translations";
create policy "Enable update for all users"
on "public"."content_translations"
for update
using (true);

-- ==============================
-- END FILE: 20260309130000_create_content_translations.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260310_add_watch_party_participants_index.sql
-- ==============================

-- Optimize getParticipants query: party_id is used in WHERE
-- Conditional: only create index if table exists (table created in 20260301_create_watch_parties)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'watch_party_participants'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_watch_party_participants_party_id
      ON public.watch_party_participants (party_id);
  END IF;
END $$;

-- ==============================
-- END FILE: 20260310_add_watch_party_participants_index.sql
-- ==============================


-- ==============================
-- BEGIN FILE: 20260310_harden_profiles_sensitive_updates.sql
-- ==============================

CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role text;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized_profile_update';
  END IF;

  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'immutable_profile_id';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR COALESCE(NEW.banned, false) IS DISTINCT FROM COALESCE(OLD.banned, false) THEN
    SELECT role INTO requester_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF requester_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'forbidden_sensitive_profile_update';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_sensitive_updates ON public.profiles;

CREATE TRIGGER trg_guard_profiles_sensitive_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profiles_sensitive_updates();

-- ==============================
-- END FILE: 20260310_harden_profiles_sensitive_updates.sql
-- ==============================


-- ==============================
-- BEGIN FILE: temp_view.sql
-- ==============================


CREATE OR REPLACE VIEW public.broken_content_counts AS
SELECT 
    content_id, 
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200
GROUP BY 
    content_id;

-- ==============================
-- END FILE: temp_view.sql
-- ==============================





