-- ✅ Database Indexes for Performance Optimization
-- Run this script to add indexes to improve query performance

-- Movies table indexes
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN (genres);

-- TV Series table indexes
CREATE INDEX IF NOT EXISTS idx_tv_series_name ON tv_series(name);
CREATE INDEX IF NOT EXISTS idx_tv_series_popularity ON tv_series(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_vote_average ON tv_series(vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_first_air_date ON tv_series(first_air_date DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_genres ON tv_series USING GIN (genres);

-- Continue Watching table indexes
CREATE INDEX IF NOT EXISTS idx_continue_watching_user ON continue_watching(user_id);
CREATE INDEX IF NOT EXISTS idx_continue_watching_content ON continue_watching(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_continue_watching_updated ON continue_watching(updated_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Watchlist table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_content ON watchlist(content_id, content_type);

-- Favorites table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_id, content_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_movies_title_popularity ON movies(title, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_series_name_popularity ON tv_series(name, popularity DESC);

-- Full-text search indexes (if supported)
-- CREATE INDEX IF NOT EXISTS idx_movies_title_fts ON movies USING GIN (to_tsvector('english', title));
-- CREATE INDEX IF NOT EXISTS idx_tv_series_name_fts ON tv_series USING GIN (to_tsvector('english', name));

ANALYZE movies;
ANALYZE tv_series;
ANALYZE continue_watching;
ANALYZE profiles;
