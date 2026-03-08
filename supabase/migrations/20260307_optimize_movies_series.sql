
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
