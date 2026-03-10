-- Apply only missing core primitives (safe / idempotent)

CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
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

DO $$
BEGIN
  IF to_regclass('public.embed_sources') IS NOT NULL THEN
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS base_url TEXT;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS url_pattern TEXT;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.embed_sources ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS settings_select_admin ON settings;
    CREATE POLICY settings_select_admin ON settings FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
    DROP POLICY IF EXISTS settings_modify_admin ON settings;
    CREATE POLICY settings_modify_admin ON settings FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;

  IF to_regclass('public.ads') IS NOT NULL THEN
    ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public Read Ads" ON ads;
    CREATE POLICY "Public Read Ads" ON ads FOR SELECT USING (true);
  END IF;

  IF to_regclass('public.embed_sources') IS NOT NULL THEN
    ALTER TABLE public.embed_sources ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
