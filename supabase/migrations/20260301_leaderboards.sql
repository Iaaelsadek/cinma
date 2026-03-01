-- Leaderboard Views and Functions
-- Based on Experience Points (XP)

CREATE OR REPLACE VIEW user_rankings AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(SUM(a.points), 0) as total_xp,
    COUNT(DISTINCT h.id) as movies_watched,
    COUNT(DISTINCT c.id) as reviews_written,
    RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) as rank
FROM 
    profiles p
LEFT JOIN 
    user_achievements ua ON p.id = ua.user_id
LEFT JOIN 
    achievements a ON ua.achievement_id = a.id
LEFT JOIN 
    history h ON p.id = h.user_id
LEFT JOIN 
    comments c ON p.id = c.user_id
GROUP BY 
    p.id, p.username, p.avatar_url;

-- Enable RLS on the view (views don't have RLS themselves, but the underlying tables do)
-- However, we want to make sure the view is accessible to everyone
GRANT SELECT ON user_rankings TO anon, authenticated;
