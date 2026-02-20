-- Create app_diagnostics table if it doesn't exist
-- We use this name instead of 'error_logs' to avoid ad-blockers
CREATE TABLE IF NOT EXISTS public.app_diagnostics (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  stack TEXT,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  context JSONB,
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for anonymous users logging errors)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
CREATE POLICY "Enable insert for everyone" ON public.app_diagnostics
FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins to read all logs
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;
CREATE POLICY "Enable read for admins" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);

-- Allow admins to update (e.g., mark as resolved)
DROP POLICY IF EXISTS "Enable update for admins" ON public.app_diagnostics;
CREATE POLICY "Enable update for admins" ON public.app_diagnostics
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
  )
);
