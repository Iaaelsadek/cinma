-- Activity Interactions Table
CREATE TABLE IF NOT EXISTS public.activity_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(activity_id, user_id)
);

-- Activity Comments Table
CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity likes" ON public.activity_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like activities" ON public.activity_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike activities" ON public.activity_likes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view activity comments" ON public.activity_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can comment on activities" ON public.activity_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit/delete their own comments" ON public.activity_comments
    FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_comments;
