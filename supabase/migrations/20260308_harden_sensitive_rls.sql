BEGIN;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Users can read own logs" ON public.app_diagnostics;
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
CREATE POLICY "Authenticated users can insert diagnostics"
  ON public.app_diagnostics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Authenticated users can read own diagnostics"
  ON public.app_diagnostics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
CREATE POLICY "Authenticated users can read link checks"
  ON public.link_checks
  FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can insert link checks"
  ON public.link_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can update link checks"
  ON public.link_checks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert access" ON public.translations;
DROP POLICY IF EXISTS "Allow public read access" ON public.translations;
CREATE POLICY "Public read translations"
  ON public.translations
  FOR SELECT
  USING (true);
CREATE POLICY "Authenticated insert translations"
  ON public.translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated update translations"
  ON public.translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;
