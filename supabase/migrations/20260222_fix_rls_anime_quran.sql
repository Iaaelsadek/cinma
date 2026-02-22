-- Fix RLS for Anime and Quran Reciters
ALTER TABLE IF EXISTS public.anime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.anime;
CREATE POLICY "Enable read access for all users" ON public.anime
FOR SELECT
TO public
USING (true);

ALTER TABLE IF EXISTS public.quran_reciters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.quran_reciters;
CREATE POLICY "Enable read access for all users" ON public.quran_reciters
FOR SELECT
TO public
USING (true);

-- Explicitly grant select permissions just in case
GRANT SELECT ON public.anime TO anon, authenticated, service_role;
GRANT SELECT ON public.quran_reciters TO anon, authenticated, service_role;
