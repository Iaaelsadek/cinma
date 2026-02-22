CREATE TABLE IF NOT EXISTS translations (
    original_title TEXT PRIMARY KEY,
    arabic_title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON translations FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON translations FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_translations_original_title ON translations(original_title);
