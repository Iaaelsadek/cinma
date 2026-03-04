
-- Create a view to count broken links per content_id
-- This allows us to query only the counts, avoiding the 1000 row limit of direct table access
CREATE OR REPLACE VIEW public.broken_content_counts AS
SELECT 
    content_id, 
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200 -- Anything not OK is broken
GROUP BY 
    content_id;

-- Grant access to everyone
GRANT SELECT ON public.broken_content_counts TO anon;
GRANT SELECT ON public.broken_content_counts TO authenticated;
GRANT SELECT ON public.broken_content_counts TO service_role;
