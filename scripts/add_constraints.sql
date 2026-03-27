-- ✅ Database Constraints for Data Integrity
-- Run this script to add constraints to ensure data quality

-- Profiles table constraints
ALTER TABLE profiles 
  ADD CONSTRAINT IF NOT EXISTS unique_username UNIQUE (username);

ALTER TABLE profiles 
  ADD CONSTRAINT IF NOT EXISTS check_role 
  CHECK (role IN ('user', 'admin', 'supervisor'));

-- Movies table constraints
ALTER TABLE movies 
  ADD CONSTRAINT IF NOT EXISTS check_vote_average 
  CHECK (vote_average >= 0 AND vote_average <= 10);

ALTER TABLE movies 
  ADD CONSTRAINT IF NOT EXISTS check_popularity 
  CHECK (popularity >= 0);

ALTER TABLE movies 
  ADD CONSTRAINT IF NOT EXISTS check_runtime 
  CHECK (runtime >= 0);

-- TV Series table constraints
ALTER TABLE tv_series 
  ADD CONSTRAINT IF NOT EXISTS check_tv_vote_average 
  CHECK (vote_average >= 0 AND vote_average <= 10);

ALTER TABLE tv_series 
  ADD CONSTRAINT IF NOT EXISTS check_tv_popularity 
  CHECK (popularity >= 0);

ALTER TABLE tv_series 
  ADD CONSTRAINT IF NOT EXISTS check_seasons 
  CHECK (number_of_seasons >= 0);

ALTER TABLE tv_series 
  ADD CONSTRAINT IF NOT EXISTS check_episodes 
  CHECK (number_of_episodes >= 0);

-- Continue Watching table constraints
ALTER TABLE continue_watching 
  ADD CONSTRAINT IF NOT EXISTS check_progress 
  CHECK (progress_seconds >= 0);

ALTER TABLE continue_watching 
  ADD CONSTRAINT IF NOT EXISTS check_content_type 
  CHECK (content_type IN ('movie', 'tv', 'video'));

-- Add NOT NULL constraints where appropriate
ALTER TABLE profiles 
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE profiles 
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE movies 
  ALTER COLUMN title SET NOT NULL;

ALTER TABLE tv_series 
  ALTER COLUMN name SET NOT NULL;
