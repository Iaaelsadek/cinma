ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
CREATE POLICY "Enable insert for admins only" ON public.ai_cache FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);
CREATE POLICY "Enable update for admins only" ON public.ai_cache FOR UPDATE TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
CREATE POLICY "Enable insert for admins" ON public.action_logs FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);
