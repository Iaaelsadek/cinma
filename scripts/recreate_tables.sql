
DROP TABLE IF EXISTS games CASCADE;

CREATE TABLE games (
    id BIGINT PRIMARY KEY,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    release_date DATE,
    category TEXT,
    rating NUMERIC,
    download_urls JSONB DEFAULT '{}'::JSONB,
    download_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    _force_reload INTEGER
);

DROP TABLE IF EXISTS anime CASCADE;

CREATE TABLE anime (
    id BIGINT PRIMARY KEY,
    title TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date DATE,
    episodes INTEGER,
    rating NUMERIC,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synopsis TEXT,
    trailer_url TEXT,
    status TEXT,
    studios JSONB,
    start_date DATE,
    end_date DATE,
    duration TEXT,
    season TEXT,
    year INTEGER,
    broadcast TEXT,
    source TEXT,
    genres JSONB,
    _force_reload INTEGER
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view games" ON games;
CREATE POLICY "Public can view games" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view anime" ON anime;
CREATE POLICY "Public can view anime" ON anime FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
