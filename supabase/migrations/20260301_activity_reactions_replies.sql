-- Activity Reactions Table
CREATE TABLE IF NOT EXISTS public.activity_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(activity_id, user_id)
);

-- Activity Comment Replies Table
CREATE TABLE IF NOT EXISTS public.activity_comment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for Reactions
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity reactions"
    ON public.activity_reactions FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add/update their own reactions"
    ON public.activity_reactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
    ON public.activity_reactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
    ON public.activity_reactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- RLS Policies for Comment Replies
ALTER TABLE public.activity_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment replies"
    ON public.activity_comment_replies FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add their own replies"
    ON public.activity_comment_replies FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
    ON public.activity_comment_replies FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_reactions_activity_id ON public.activity_reactions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comment_replies_comment_id ON public.activity_comment_replies(comment_id);
