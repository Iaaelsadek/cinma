-- Database status report (read-only)
-- Run in Supabase SQL Editor to see what exists and what is missing

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'watchlist',
    'continue_watching',
    'history',
    'comments',
    'movies',
    'tv_series',
    'seasons',
    'episodes',
    'videos',
    'ads',
    'settings',
    'embed_sources',
    'link_checks',
    'anime',
    'games',
    'software',
    'quran_reciters'
  ]) AS table_name
)
SELECT
  t.table_name,
  CASE WHEN to_regclass('public.' || t.table_name) IS NULL THEN 'missing' ELSE 'exists' END AS status
FROM expected_tables t
ORDER BY t.table_name;

WITH expected_columns AS (
  SELECT * FROM (VALUES
    ('embed_sources', 'name'),
    ('embed_sources', 'url_pattern'),
    ('embed_sources', 'priority'),
    ('embed_sources', 'base_url'),
    ('comments', 'user_id'),
    ('comments', 'content_id'),
    ('comments', 'content_type'),
    ('comments', 'created_at'),
    ('ads', 'is_active'),
    ('settings', 'key'),
    ('settings', 'value')
  ) AS v(table_name, column_name)
)
SELECT
  e.table_name,
  e.column_name,
  CASE
    WHEN c.column_name IS NULL THEN 'missing'
    ELSE 'exists'
  END AS status
FROM expected_columns e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name;

SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
