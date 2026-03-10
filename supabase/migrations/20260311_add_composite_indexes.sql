DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_comments_content_type_created_at
      ON public.comments (content_id, content_type, created_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.continue_watching') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_continue_watching_user_updated_at
      ON public.continue_watching (user_id, updated_at DESC);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.history') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_history_user_watched_at
      ON public.history (user_id, watched_at DESC);
  END IF;
END $$;
