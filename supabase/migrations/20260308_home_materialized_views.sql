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
