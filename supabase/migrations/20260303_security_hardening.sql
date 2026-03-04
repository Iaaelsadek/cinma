-- Security Hardening for Watch Parties and Chat
-- Date: 2026-03-03

-- 1. Tighten watch_party_messages INSERT policy
-- Ensure user_id matches auth.uid() and user is a participant
DROP POLICY IF EXISTS "Participants can send messages" ON watch_party_messages;
CREATE POLICY "Participants can send messages" ON watch_party_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

-- 2. Tighten watch_parties SELECT policy
-- Room metadata should only be visible to authenticated users at minimum, 
-- or even better, restricted to room members if we want strict privacy.
-- For now, let's at least restrict to authenticated users.
DROP POLICY IF EXISTS "Watch parties are viewable by everyone" ON public.watch_parties;
CREATE POLICY "Watch parties are viewable by authenticated users" 
ON public.watch_parties FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Add room privacy support (future-proofing)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='watch_parties' AND column_name='is_private') THEN
        ALTER TABLE public.watch_parties ADD COLUMN is_private BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='watch_parties' AND column_name='room_password') THEN
        ALTER TABLE public.watch_parties ADD COLUMN room_password TEXT;
    END IF;
END $$;

-- 4. Update SELECT policy for watch_parties to handle privacy
DROP POLICY IF EXISTS "Watch parties are viewable by authenticated users" ON public.watch_parties;
CREATE POLICY "Watch parties visibility" 
ON public.watch_parties FOR SELECT 
USING (
    NOT is_private OR 
    auth.uid() = creator_id OR
    EXISTS (
        SELECT 1 FROM watch_party_participants 
        WHERE party_id = public.watch_parties.id 
        AND user_id = auth.uid()
    )
);

-- 5. Harden watch_party_participants SELECT policy (already good, but re-confirming)
DROP POLICY IF EXISTS "Participants are viewable by room members" ON public.watch_party_participants;
CREATE POLICY "Participants are viewable by room members" 
ON public.watch_party_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.watch_party_participants 
        WHERE party_id = public.watch_party_participants.party_id 
        AND user_id = auth.uid()
    )
);
