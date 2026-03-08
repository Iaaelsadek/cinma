REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_home_materialized_views(boolean, integer) TO service_role;
