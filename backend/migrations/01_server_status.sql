CREATE TABLE IF NOT EXISTS server_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown', -- 'online', 'offline', 'degraded'
    latency INTEGER,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE server_status ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (public)
CREATE POLICY "Allow public read access" ON server_status FOR SELECT USING (true);

-- Allow all access to service_role (implicit, but good to be explicit if using custom roles)
-- For this setup, we will use the service_role key in the python script which bypasses RLS.
