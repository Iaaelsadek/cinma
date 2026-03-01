-- Add social fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS avatar_decoration TEXT, -- To store decoration type (e.g., 'gold_border', 'neon_glow')
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT cannot_follow_self CHECK (follower_id != following_id)
);

-- Enable RLS for follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies for follows
CREATE POLICY "Users can see who is following whom" 
    ON public.follows FOR SELECT 
    USING (true);

CREATE POLICY "Users can follow others" 
    ON public.follows FOR INSERT 
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
    ON public.follows FOR DELETE 
    USING (auth.uid() = follower_id);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'watch', 'review', 'achievement', 'follow', 'playlist_created'
    content_id TEXT, -- ID of the movie, series, review, achievement, etc.
    content_type TEXT, -- 'movie', 'series', 'review', 'achievement', 'playlist'
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data like rating, review title, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for activity_feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Policies for activity_feed
CREATE POLICY "Users can view activity of people they follow or their own" 
    ON public.activity_feed FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        user_id IN (SELECT following_id FROM public.follows WHERE follower_id = auth.uid())
    );

CREATE POLICY "Users can create their own activity" 
    ON public.activity_feed FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
