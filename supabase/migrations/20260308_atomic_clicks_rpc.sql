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
