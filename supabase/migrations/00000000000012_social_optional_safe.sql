CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content_id TEXT,
  content_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.activity_likes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(activity_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS public.activity_comments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.activity_comment_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comment_id UUID NOT NULL REFERENCES public.activity_comments(id) ON DELETE CASCADE,
      reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(comment_id, reporter_id)
    );
  END IF;
END
$$;

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
  IF to_regclass('public.activity_feed') IS NOT NULL THEN
    ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.activity_likes') IS NOT NULL THEN
    ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.activity_comment_reports') IS NOT NULL THEN
    ALTER TABLE public.activity_comment_reports ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.review_votes') IS NOT NULL THEN
    ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
