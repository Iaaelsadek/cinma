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
