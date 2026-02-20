
ALTER TABLE games ADD COLUMN IF NOT EXISTS _force_reload INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS _force_reload INTEGER;
NOTIFY pgrst, 'reload schema';
