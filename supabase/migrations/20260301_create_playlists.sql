-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create playlist_items table
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(playlist_id, content_id, content_type)
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Policies for playlists
CREATE POLICY "Playlists are viewable by everyone if public" 
    ON public.playlists FOR SELECT 
    USING (is_public OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own playlists" 
    ON public.playlists FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for playlist_items
CREATE POLICY "Playlist items are viewable if playlist is viewable" 
    ON public.playlist_items FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE id = playlist_id AND (is_public OR auth.uid() = user_id)
    ));

CREATE POLICY "Users can manage items in their own playlists" 
    ON public.playlist_items FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE id = playlist_id AND auth.uid() = user_id
    ));

-- Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE playlist_items;
