
-- Create activity comment reports table
CREATE TABLE IF NOT EXISTS activity_comment_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, reporter_id)
);

-- Create user blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- RLS for activity_comment_reports
ALTER TABLE activity_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report comments"
    ON activity_comment_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view reports"
    ON activity_comment_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'supervisor')
        )
    );

-- RLS for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
    ON user_blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
    ON user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others"
    ON user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- Realtime for reports (admins only)
ALTER PUBLICATION supabase_realtime ADD TABLE activity_comment_reports;
