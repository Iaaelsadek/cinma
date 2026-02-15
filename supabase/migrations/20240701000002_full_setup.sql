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
INSERT INTO embed_sources (name, base_url, url_pattern, priority) VALUES 
('vidsrc', 'https://vidsrc.to', 'https://vidsrc.to/embed/{type}/{id}', 1),
('2embed', 'https://www.2embed.cc', 'https://www.2embed.cc/embed/{id}', 2),
('embed_su', 'https://embed.su', 'https://embed.su/embed/{type}/{id}', 3)
ON CONFLICT (name) DO NOTHING;

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
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_reciters ENABLE ROW LEVEL SECURITY;

-- Apply Policies

-- Profiles
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Watchlist
DROP POLICY IF EXISTS watchlist_select ON watchlist;
CREATE POLICY watchlist_select ON watchlist FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_insert ON watchlist;
CREATE POLICY watchlist_insert ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_delete ON watchlist;
CREATE POLICY watchlist_delete ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Continue Watching
DROP POLICY IF EXISTS continue_watching_select ON continue_watching;
CREATE POLICY continue_watching_select ON continue_watching FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_insert ON continue_watching;
CREATE POLICY continue_watching_insert ON continue_watching FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_update ON continue_watching;
CREATE POLICY continue_watching_update ON continue_watching FOR UPDATE USING (auth.uid() = user_id);

-- Public Read Access for Content Tables
CREATE POLICY "Public Read Movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Public Read Series" ON tv_series FOR SELECT USING (true);
CREATE POLICY "Public Read Seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public Read Episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "Public Read Videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Public Read Anime" ON anime FOR SELECT USING (true);
CREATE POLICY "Public Read Games" ON games FOR SELECT USING (true);
CREATE POLICY "Public Read Software" ON software FOR SELECT USING (true);
CREATE POLICY "Public Read Quran" ON quran_reciters FOR SELECT USING (true);
CREATE POLICY "Public Read Ads" ON ads FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_quran_reciters_name ON quran_reciters(name);
