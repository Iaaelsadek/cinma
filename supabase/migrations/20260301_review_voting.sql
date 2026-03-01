
-- Create review votes table (for comments/reviews)
CREATE TABLE IF NOT EXISTS review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- RLS for review_votes
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes"
    ON review_votes FOR SELECT
    USING (true);

CREATE POLICY "Users can vote once per review"
    ON review_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote"
    ON review_votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
    ON review_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Realtime for votes
ALTER PUBLICATION supabase_realtime ADD TABLE review_votes;
