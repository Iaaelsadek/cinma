
-- Add season_number and episode_number to link_checks for TV content tracking
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS season_number INTEGER;
ALTER TABLE link_checks ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Update content_type check to include tv_episode if needed, 
-- but ContentHealth uses 'tv' with season/episode
ALTER TABLE link_checks DROP CONSTRAINT IF EXISTS link_checks_content_type_check;
ALTER TABLE link_checks ADD CONSTRAINT link_checks_content_type_check 
  CHECK (content_type IN ('movie', 'tv', 'episode', 'tv_episode'));

-- Index for faster filtering in Content Health
CREATE INDEX IF NOT EXISTS idx_link_checks_tv_details ON link_checks(content_id, content_type, season_number, episode_number);
