CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role text;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized_profile_update';
  END IF;

  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'immutable_profile_id';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR COALESCE(NEW.banned, false) IS DISTINCT FROM COALESCE(OLD.banned, false) THEN
    SELECT role INTO requester_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF requester_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'forbidden_sensitive_profile_update';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_sensitive_updates ON public.profiles;

CREATE TRIGGER trg_guard_profiles_sensitive_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profiles_sensitive_updates();
