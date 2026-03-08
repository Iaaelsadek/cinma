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
