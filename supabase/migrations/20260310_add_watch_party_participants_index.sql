-- Optimize getParticipants query: party_id is used in WHERE
CREATE INDEX IF NOT EXISTS idx_watch_party_participants_party_id
  ON public.watch_party_participants (party_id);
