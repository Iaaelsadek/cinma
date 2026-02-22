DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;

DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;

CREATE POLICY "Enable read for admins" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);
