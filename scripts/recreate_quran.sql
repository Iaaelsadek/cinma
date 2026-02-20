
DROP TABLE IF EXISTS quran_reciters CASCADE;

CREATE TABLE quran_reciters (
    id BIGINT PRIMARY KEY,
    name TEXT,
    rewaya TEXT,
    letter TEXT,
    server TEXT,
    surah_list TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    image TEXT, -- Just in case
    _force_reload INTEGER
);

ALTER TABLE quran_reciters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view quran_reciters" ON quran_reciters;
CREATE POLICY "Public can view quran_reciters" ON quran_reciters FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
