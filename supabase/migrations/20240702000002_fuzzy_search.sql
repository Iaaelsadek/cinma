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
