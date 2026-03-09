DROP POLICY IF EXISTS "Watch parties visibility" ON public.watch_parties;
DROP POLICY IF EXISTS "Watch parties are viewable by authenticated users" ON public.watch_parties;
CREATE POLICY "Watch parties visibility safe"
ON public.watch_parties
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
CREATE POLICY "Participants visibility safe"
ON public.watch_party_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.watch_parties wp
    WHERE wp.id = watch_party_participants.party_id
      AND (wp.creator_id = auth.uid() OR NOT COALESCE(wp.is_private, false))
  )
);
