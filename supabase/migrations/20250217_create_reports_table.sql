-- Create table for tracking error reports
CREATE TABLE IF NOT EXISTS public.error_reports (
  url TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Allow public access (since anyone can encounter an error)
CREATE POLICY "Allow public insert to error_reports" ON public.error_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to error_reports" ON public.error_reports
  FOR UPDATE USING (true);

CREATE POLICY "Allow public select to error_reports" ON public.error_reports
  FOR SELECT USING (true);

-- Create RPC function to handle reporting logic atomically
CREATE OR REPLACE FUNCTION public.report_page_error(p_url TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.error_reports (url)
  VALUES (p_url)
  ON CONFLICT (url) DO UPDATE
  SET count = error_reports.count + 1,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
