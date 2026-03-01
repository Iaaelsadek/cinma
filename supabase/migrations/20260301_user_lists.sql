
-- Create user lists table
CREATE TABLE IF NOT EXISTS user_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user list items table
CREATE TABLE IF NOT EXISTS user_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, content_id, content_type)
);

-- RLS for user_lists
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public lists are viewable by everyone"
    ON user_lists FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
    ON user_lists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
    ON user_lists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
    ON user_lists FOR DELETE
    USING (auth.uid() = user_id);

-- RLS for user_list_items
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List items are viewable if list is viewable"
    ON user_list_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND (user_lists.is_public = true OR user_lists.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can add items to their own lists"
    ON user_list_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND user_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove items from their own lists"
    ON user_list_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_lists
            WHERE user_lists.id = user_list_items.list_id
            AND user_lists.user_id = auth.uid()
        )
    );

-- Realtime for lists
ALTER PUBLICATION supabase_realtime ADD TABLE user_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE user_list_items;
