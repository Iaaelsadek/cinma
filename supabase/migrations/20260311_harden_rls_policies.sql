CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean := false;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE '
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = $1
        AND p.role IN (''admin'', ''supervisor'')
    )'
  INTO result
  USING user_uuid;

  RETURN COALESCE(result, false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_supervisor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_supervisor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_watch_party_member(party_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean := false;
BEGIN
  IF to_regclass('public.watch_party_participants') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE '
    SELECT EXISTS (
      SELECT 1
      FROM public.watch_party_participants wpp
      WHERE wpp.party_id = $1
        AND wpp.user_id = $2
    )'
  INTO result
  USING party_uuid, user_uuid;

  RETURN COALESCE(result, false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_watch_party_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_watch_party_member(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.watch_party_participants') IS NOT NULL THEN
    ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read access for all users" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Participants can view other participants" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "view_participants" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Allow read access for participants" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Participants visibility safe" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Authenticated users can join watch parties" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "Users can leave watch parties" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "watch_party_participants_select_secure" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "watch_party_participants_insert_secure" ON public.watch_party_participants;
    DROP POLICY IF EXISTS "watch_party_participants_delete_secure" ON public.watch_party_participants;

    CREATE POLICY "watch_party_participants_select_secure"
    ON public.watch_party_participants
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND (
        auth.uid() = user_id
        OR public.is_admin_or_supervisor(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.watch_parties wp
          WHERE wp.id = watch_party_participants.party_id
            AND wp.creator_id = auth.uid()
        )
        OR public.is_watch_party_member(watch_party_participants.party_id, auth.uid())
      )
    );

    CREATE POLICY "watch_party_participants_insert_secure"
    ON public.watch_party_participants
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        auth.uid() = user_id
        OR public.is_admin_or_supervisor(auth.uid())
      )
    );

    CREATE POLICY "watch_party_participants_delete_secure"
    ON public.watch_party_participants
    FOR DELETE
    USING (
      auth.uid() IS NOT NULL
      AND (
        auth.uid() = user_id
        OR public.is_admin_or_supervisor(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.watch_parties wp
          WHERE wp.id = watch_party_participants.party_id
            AND wp.creator_id = auth.uid()
        )
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.link_checks') IS NOT NULL THEN
    ALTER TABLE public.link_checks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable read for everyone" ON public.link_checks;
    DROP POLICY IF EXISTS "Enable insert for everyone" ON public.link_checks;
    DROP POLICY IF EXISTS "Enable update for everyone" ON public.link_checks;
    DROP POLICY IF EXISTS "link_checks_select_secure" ON public.link_checks;
    DROP POLICY IF EXISTS "link_checks_insert_secure" ON public.link_checks;
    DROP POLICY IF EXISTS "link_checks_update_secure" ON public.link_checks;
    DROP POLICY IF EXISTS "link_checks_delete_secure" ON public.link_checks;

    CREATE POLICY "link_checks_select_secure"
    ON public.link_checks
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND public.is_admin_or_supervisor(auth.uid())
    );

    CREATE POLICY "link_checks_insert_secure"
    ON public.link_checks
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
    );

    CREATE POLICY "link_checks_update_secure"
    ON public.link_checks
    FOR UPDATE
    USING (
      auth.uid() IS NOT NULL
      AND public.is_admin_or_supervisor(auth.uid())
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND public.is_admin_or_supervisor(auth.uid())
    );

    CREATE POLICY "link_checks_delete_secure"
    ON public.link_checks
    FOR DELETE
    USING (
      auth.uid() IS NOT NULL
      AND public.is_admin_or_supervisor(auth.uid())
    );
  END IF;
END
$$;
