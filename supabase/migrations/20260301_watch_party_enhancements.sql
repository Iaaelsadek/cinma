-- Watch Party Enhancements: Messages and Reactions

CREATE TABLE IF NOT EXISTS watch_party_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_party_messages_party_id ON watch_party_messages(party_id);

-- RLS Policies
ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are viewable by party participants" ON watch_party_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON watch_party_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM watch_party_participants 
            WHERE party_id = watch_party_messages.party_id 
            AND user_id = auth.uid()
        )
    );

-- Reactions View/Support
-- We'll use Supabase Realtime for transient reactions, no need for persistent table
