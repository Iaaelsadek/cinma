CREATE TABLE IF NOT EXISTS public.server_provider_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base TEXT NOT NULL DEFAULT '',
  movie_template TEXT,
  tv_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  supports_movie BOOLEAN NOT NULL DEFAULT true,
  supports_tv BOOLEAN NOT NULL DEFAULT true,
  is_download BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_provider_configs_priority
  ON public.server_provider_configs (priority);

CREATE OR REPLACE FUNCTION public.set_server_provider_configs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_server_provider_configs_updated_at ON public.server_provider_configs;
CREATE TRIGGER trg_server_provider_configs_updated_at
BEFORE UPDATE ON public.server_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_server_provider_configs_updated_at();

ALTER TABLE public.server_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "server_provider_configs_select_public" ON public.server_provider_configs;
CREATE POLICY "server_provider_configs_select_public"
ON public.server_provider_configs
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "server_provider_configs_insert_admin" ON public.server_provider_configs;
CREATE POLICY "server_provider_configs_insert_admin"
ON public.server_provider_configs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'supervisor')
  )
);

DROP POLICY IF EXISTS "server_provider_configs_update_admin" ON public.server_provider_configs;
CREATE POLICY "server_provider_configs_update_admin"
ON public.server_provider_configs
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'supervisor')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'supervisor')
  )
);

DROP POLICY IF EXISTS "server_provider_configs_delete_admin" ON public.server_provider_configs;
CREATE POLICY "server_provider_configs_delete_admin"
ON public.server_provider_configs
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'supervisor')
  )
);

INSERT INTO public.server_provider_configs (
  id, name, base, movie_template, tv_template, is_active, supports_movie, supports_tv, is_download, priority
)
VALUES
  ('autoembed_co', 'AutoEmbed Co', 'https://autoembed.co/movie/tmdb', NULL, NULL, true, true, true, true, 1),
  ('vidsrc_net', 'VidSrc.net', 'https://vidsrc.net/embed', NULL, NULL, true, true, true, true, 2),
  ('2embed_cc', '2Embed.cc', 'https://www.2embed.cc/embed', NULL, NULL, true, true, true, true, 3),
  ('111movies', '111Movies', 'https://111movies.com', NULL, NULL, true, true, true, false, 4),
  ('smashystream', 'SmashyStream', 'https://player.smashy.stream', NULL, NULL, true, true, true, false, 5),
  ('vidsrc_io', 'VidSrc.io', 'https://vidsrc.io/embed', NULL, NULL, true, true, true, false, 6),
  ('vidsrc_cc', 'VidSrc.cc', 'https://vidsrc.cc/v2/embed', NULL, NULL, true, true, true, false, 7),
  ('vidsrc_xyz', 'VidSrc.xyz', 'https://vidsrc.xyz/embed', NULL, NULL, true, true, true, false, 8),
  ('2embed_skin', '2Embed.skin', 'https://www.2embed.skin/embed', NULL, NULL, true, true, true, false, 9),
  ('vidsrc_me', 'VidSrc.me', 'https://vidsrc.me/embed', NULL, NULL, true, true, true, false, 10),
  ('vidsrc_vip', 'VidSrc.vip', 'https://vidsrc.vip/embed', NULL, NULL, true, true, true, false, 11)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  base = EXCLUDED.base,
  is_active = EXCLUDED.is_active,
  supports_movie = EXCLUDED.supports_movie,
  supports_tv = EXCLUDED.supports_tv,
  is_download = EXCLUDED.is_download,
  priority = EXCLUDED.priority;
