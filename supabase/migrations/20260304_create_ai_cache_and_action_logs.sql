-- Create ai_cache table
CREATE TABLE IF NOT EXISTS public.ai_cache (
    cache_key TEXT PRIMARY KEY,
    response TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create action_logs table
CREATE TABLE IF NOT EXISTS public.action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    content_id BIGINT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- ai_cache Policies
DROP POLICY IF EXISTS "Enable read for everyone" ON public.ai_cache;
CREATE POLICY "Enable read for everyone" ON public.ai_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable insert for admins only" ON public.ai_cache;
CREATE POLICY "Enable insert for admins only" ON public.ai_cache FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable update for everyone" ON public.ai_cache;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.ai_cache;
CREATE POLICY "Enable update for admins only" ON public.ai_cache FOR UPDATE TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

-- action_logs Policies
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.action_logs;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.action_logs;
CREATE POLICY "Enable insert for admins" ON public.action_logs FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

DROP POLICY IF EXISTS "Enable read for admins" ON public.action_logs;
CREATE POLICY "Enable read for admins" ON public.action_logs FOR SELECT TO authenticated USING (
    auth.uid() IN (
        SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_cache_context ON public.ai_cache(context);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON public.action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_content_id ON public.action_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);
