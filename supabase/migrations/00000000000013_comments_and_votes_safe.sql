CREATE TABLE IF NOT EXISTS public.comments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id BIGINT,
  content_type TEXT,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS rating NUMERIC;
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS comments_select ON comments;
    CREATE POLICY comments_select ON comments FOR SELECT USING (true);

    DROP POLICY IF EXISTS comments_insert ON comments;
    CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS comments_update ON comments;
    CREATE POLICY comments_update ON comments FOR UPDATE USING (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'supervisor')
      )
    );

    DROP POLICY IF EXISTS comments_delete ON comments;
    CREATE POLICY comments_delete ON comments FOR DELETE USING (
      auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'supervisor')
      )
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_comments_content_id ON public.comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_content_type ON public.comments(content_type);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

DO $$
DECLARE
  comments_id_type TEXT;
BEGIN
  IF to_regclass('public.comments') IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL THEN
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO comments_id_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'comments'
      AND a.attname = 'id'
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF comments_id_type IS NOT NULL THEN
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.review_votes (
           id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
           comment_id %s NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
           user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
           vote_type TEXT NOT NULL CHECK (vote_type IN (''up'', ''down'')),
           created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
           UNIQUE(comment_id, user_id)
         )',
        comments_id_type
      );
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.review_votes') IS NOT NULL THEN
    ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view all votes" ON review_votes;
    CREATE POLICY "Users can view all votes" ON review_votes FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Users can vote once per review" ON review_votes;
    CREATE POLICY "Users can vote once per review" ON review_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can change their vote" ON review_votes;
    CREATE POLICY "Users can change their vote" ON review_votes FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can remove their vote" ON review_votes;
    CREATE POLICY "Users can remove their vote" ON review_votes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;
