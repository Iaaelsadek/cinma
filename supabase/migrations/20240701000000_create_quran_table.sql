
-- Create quran_reciters table if not exists
CREATE TABLE IF NOT EXISTS public.quran_reciters (
    id INTEGER PRIMARY KEY,
    name TEXT,
    rewaya TEXT,
    server TEXT,
    letter TEXT,
    category TEXT,
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_quran_reciters_name ON public.quran_reciters USING btree (name);

-- Enable RLS
ALTER TABLE public.quran_reciters ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'quran_reciters'
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.quran_reciters FOR SELECT USING (true);
    END IF;
END
$$;

-- Create policy to allow service role full access if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'quran_reciters'
        AND policyname = 'Allow service role full access'
    ) THEN
        CREATE POLICY "Allow service role full access" ON public.quran_reciters USING (true) WITH CHECK (true);
    END IF;
END
$$;
