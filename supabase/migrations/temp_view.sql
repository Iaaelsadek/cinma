
CREATE OR REPLACE VIEW public.broken_content_counts AS
SELECT 
    content_id, 
    COUNT(*) as broken_count
FROM 
    public.link_checks
WHERE 
    status_code != 200
GROUP BY 
    content_id;
