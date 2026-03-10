-- Cinema Online Full Schema Export
-- Date: 2026-03-03
-- Description: Complete database schema for Supabase

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    full_name TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTENT (MOVIES & SERIES)
CREATE TABLE IF NOT EXISTS public.movies (
    id BIGINT PRIMARY KEY, -- TMDB ID
    title TEXT NOT NULL,
    original_title TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date DATE,
    vote_average FLOAT,
    vote_count INTEGER,
    genres JSONB,
    runtime INTEGER,
    slug TEXT UNIQUE,
    embed_links JSONB DEFAULT '{}',
    is_anime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.series (
    id BIGINT PRIMARY KEY, -- TMDB ID
    name TEXT NOT NULL,
    original_name TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    first_air_date DATE,
    vote_average FLOAT,
    vote_count INTEGER,
    genres JSONB,
    slug TEXT UNIQUE,
    is_anime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    series_id BIGINT REFERENCES public.series(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    poster_path TEXT,
    air_date DATE,
    episode_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(series_id, season_number)
);

CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    still_path TEXT,
    air_date DATE,
    vote_average FLOAT,
    embed_links JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

-- 3. USER ACTIONS
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL,
    content_type TEXT CHECK (content_type IN ('movie', 'tv')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

CREATE TABLE IF NOT EXISTS public.continue_watching (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL,
    content_type TEXT CHECK (content_type IN ('movie', 'tv')),
    progress_seconds INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    season_number INTEGER,
    episode_number INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, content_type)
);

-- 4. SOCIAL & WATCH PARTIES
CREATE TABLE IF NOT EXISTS public.watch_parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_name TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    "current_time" DOUBLE PRECISION DEFAULT 0,
    is_playing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.watch_party_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(party_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.watch_party_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    points INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- RLS POLICIES (BASIC)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlist" ON public.watchlist USING (auth.uid() = user_id);

ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Watch parties are viewable by everyone" ON public.watch_parties FOR SELECT USING (true);
CREATE POLICY "Creators can manage parties" ON public.watch_parties USING (auth.uid() = creator_id);

-- ===== ADDITIONAL INDEXES =====
CREATE INDEX IF NOT EXISTS idx_movies_title ON public.movies(title);
CREATE INDEX IF NOT EXISTS idx_series_name ON public.series(name);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_continue_watching_user ON public.continue_watching(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_party_creator ON public.watch_parties(creator_id);
CREATE INDEX IF NOT EXISTS idx_wp_messages_party ON public.watch_party_messages(party_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages visible to party participants" ON public.watch_party_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.watch_party_participants
    WHERE party_id = watch_party_messages.party_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can send messages to their party" ON public.watch_party_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.watch_party_participants
    WHERE party_id = watch_party_messages.party_id AND user_id = auth.uid()
  )
);

ALTER TABLE public.continue_watching ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own continue watching" ON public.continue_watching USING (auth.uid() = user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

