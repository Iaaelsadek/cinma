
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS content_id BIGINT;
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_link_checks_content ON link_checks(content_id, content_type);

-- RLS
ALTER TABLE link_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read link_checks" ON link_checks;
CREATE POLICY "Public read link_checks" ON link_checks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage link_checks" ON link_checks;
CREATE POLICY "Service role manage link_checks" ON link_checks USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
