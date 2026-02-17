-- 1. Add MENA Columns (if missing)
ALTER TABLE IF EXISTS public.movies 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_play BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.tv_series 
ADD COLUMN IF NOT EXISTS origin_country TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_ramadan BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_movies_is_play ON public.movies(is_play);
CREATE INDEX IF NOT EXISTS idx_series_is_ramadan ON public.tv_series(is_ramadan);
CREATE INDEX IF NOT EXISTS idx_series_origin_country ON public.tv_series USING GIN(origin_country);

-- 2. Fix Permissions for Admin and Service Role
-- Enable RLS (just in case)
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_series ENABLE ROW LEVEL SECURITY;

-- Allow Admin to ALL operations
DROP POLICY IF EXISTS "Admin All Movies" ON public.movies;
CREATE POLICY "Admin All Movies" ON public.movies
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admin All Series" ON public.tv_series;
CREATE POLICY "Admin All Series" ON public.tv_series
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Allow Service Role to ALL operations (for scripts using service key)
DROP POLICY IF EXISTS "Service Role All Movies" ON public.movies;
CREATE POLICY "Service Role All Movies" ON public.movies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role All Series" ON public.tv_series;
CREATE POLICY "Service Role All Series" ON public.tv_series
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
