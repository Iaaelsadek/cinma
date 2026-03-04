
-- Enable read access for everyone on link_checks
ALTER TABLE public.link_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
CREATE POLICY "Enable read for everyone" ON public.link_checks
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
CREATE POLICY "Enable insert for everyone" ON public.link_checks
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
CREATE POLICY "Enable update for everyone" ON public.link_checks
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
