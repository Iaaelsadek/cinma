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
