CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ads (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.embed_sources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  base_url TEXT,
  url_pattern TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anime (
  id BIGINT PRIMARY KEY,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,
  embed_links JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  rating_color TEXT DEFAULT 'green',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.games (
  id BIGINT PRIMARY KEY,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,
  download_urls JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.software (
  id BIGINT PRIMARY KEY,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  version TEXT,
  download_urls JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quran_reciters (
  id BIGINT PRIMARY KEY,
  name TEXT,
  rewaya TEXT,
  server TEXT,
  letter TEXT,
  category TEXT,
  image TEXT,
  surah_list TEXT,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.embed_sources') IS NOT NULL THEN
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS base_url TEXT;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS url_pattern TEXT;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
  END IF;

  IF to_regclass('public.anime') IS NOT NULL THEN
    ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
    ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;

  IF to_regclass('public.games') IS NOT NULL THEN
    ALTER TABLE public.games ADD COLUMN IF NOT EXISTS poster_url TEXT;
    ALTER TABLE public.games ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
    ALTER TABLE public.games ADD COLUMN IF NOT EXISTS release_year INTEGER;
    ALTER TABLE public.games ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;

  IF to_regclass('public.software') IS NOT NULL THEN
    ALTER TABLE public.software ADD COLUMN IF NOT EXISTS poster_url TEXT;
    ALTER TABLE public.software ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
    ALTER TABLE public.software ADD COLUMN IF NOT EXISTS release_year INTEGER;
    ALTER TABLE public.software ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.anime') IS NOT NULL THEN
    IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='anime' AND column_name='id') IS NULL THEN
      CREATE SEQUENCE IF NOT EXISTS anime_id_seq OWNED BY public.anime.id;
      ALTER TABLE public.anime ALTER COLUMN id SET DEFAULT nextval('anime_id_seq');
      PERFORM setval('anime_id_seq', COALESCE((SELECT MAX(id) FROM public.anime), 0) + 1, false);
    END IF;
  END IF;

  IF to_regclass('public.quran_reciters') IS NOT NULL THEN
    IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='quran_reciters' AND column_name='id') IS NULL THEN
      CREATE SEQUENCE IF NOT EXISTS quran_reciters_id_seq OWNED BY public.quran_reciters.id;
      ALTER TABLE public.quran_reciters ALTER COLUMN id SET DEFAULT nextval('quran_reciters_id_seq');
      PERFORM setval('quran_reciters_id_seq', COALESCE((SELECT MAX(id) FROM public.quran_reciters), 0) + 1, false);
    END IF;
  END IF;

  IF to_regclass('public.games') IS NOT NULL THEN
    IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='games' AND column_name='id') IS NULL THEN
      CREATE SEQUENCE IF NOT EXISTS games_id_seq OWNED BY public.games.id;
      ALTER TABLE public.games ALTER COLUMN id SET DEFAULT nextval('games_id_seq');
      PERFORM setval('games_id_seq', COALESCE((SELECT MAX(id) FROM public.games), 0) + 1, false);
    END IF;
  END IF;

  IF to_regclass('public.software') IS NOT NULL THEN
    IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='software' AND column_name='id') IS NULL THEN
      CREATE SEQUENCE IF NOT EXISTS software_id_seq OWNED BY public.software.id;
      ALTER TABLE public.software ALTER COLUMN id SET DEFAULT nextval('software_id_seq');
      PERFORM setval('software_id_seq', COALESCE((SELECT MAX(id) FROM public.software), 0) + 1, false);
    END IF;
  END IF;
END
$$;
