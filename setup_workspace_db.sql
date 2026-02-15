-- Create the videos table for the Workspace content aggregator
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    duration INTEGER,
    views INTEGER,
    url TEXT NOT NULL,
    thumbnail TEXT,
    channel TEXT,
    category TEXT NOT NULL,
    source_platform TEXT NOT NULL DEFAULT 'youtube',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_source_platform ON videos(source_platform);

-- Enable Row Level Security (RLS)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows public read access
CREATE POLICY "Allow public read access on videos"
ON videos FOR SELECT
TO anon, authenticated
USING (true);

-- Create a policy that allows service role (admin) full access
CREATE POLICY "Allow service role full access on videos"
ON videos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
