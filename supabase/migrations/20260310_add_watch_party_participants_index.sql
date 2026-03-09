-- Optimize getParticipants query: party_id is used in WHERE
-- Conditional: only create index if table exists (table created in 20260301_create_watch_parties)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'watch_party_participants'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_watch_party_participants_party_id
      ON public.watch_party_participants (party_id);
  END IF;
END $$;
