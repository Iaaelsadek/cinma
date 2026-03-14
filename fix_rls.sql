-- ============================================================
-- CINEMA_ONLINE SECURITY PATCH: SUPABASE RLS
-- ============================================================

-- 1. FIX DANGEROUS CONTENT POLICIES (Prevent users from deleting/editing movies)
DROP POLICY IF EXISTS "Authenticated users can insert movies" ON public.movies;
DROP POLICY IF EXISTS "Authenticated users can update movies" ON public.movies;
DROP POLICY IF EXISTS "Authenticated users can delete movies" ON public.movies;

DROP POLICY IF EXISTS "Authenticated users can insert series" ON public.series;
DROP POLICY IF EXISTS "Authenticated users can update series" ON public.series;
DROP POLICY IF EXISTS "Authenticated users can delete series" ON public.series;

DROP POLICY IF EXISTS "Authenticated users can insert seasons" ON public.seasons;
DROP POLICY IF EXISTS "Authenticated users can update seasons" ON public.seasons;
DROP POLICY IF EXISTS "Authenticated users can delete seasons" ON public.seasons;

DROP POLICY IF EXISTS "Authenticated users can insert episodes" ON public.episodes;
DROP POLICY IF EXISTS "Authenticated users can update episodes" ON public.episodes;
DROP POLICY IF EXISTS "Authenticated users can delete episodes" ON public.episodes;

-- Note: No new policies needed here. The Backend uses SUPABASE_SERVICE_ROLE_KEY
-- which automatically bypasses RLS and can write data securely. Users only need SELECT.

-- 2. FIX PROFILES ROLE ESCALATION
-- A trigger is the safest way to prevent users from promoting themselves to 'admin'
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('admin', 'supervisor') THEN
    NEW.role = OLD.role;
    NEW.banned = OLD.banned;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- Restore the update policy securely
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'supervisor'));

-- 3. FIX STORAGE BUCKET VULNERABILITY
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
