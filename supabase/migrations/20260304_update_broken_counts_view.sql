
CREATE OR REPLACE VIEW public.broken_episode_counts AS
SELECT 
    content_id, 
    season_number,
    episode_number,
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200
GROUP BY 
    content_id, season_number, episode_number;

GRANT SELECT ON public.broken_episode_counts TO anon;
GRANT SELECT ON public.broken_episode_counts TO authenticated;
GRANT SELECT ON public.broken_episode_counts TO service_role;
