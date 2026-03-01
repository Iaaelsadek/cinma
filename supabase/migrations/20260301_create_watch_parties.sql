-- Migration to create watch parties system
-- This enables users to watch content together in synchronized rooms

CREATE TABLE IF NOT EXISTS public.watch_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_time FLOAT DEFAULT 0.0,
    is_playing BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Watch parties are viewable by everyone" 
ON public.watch_parties FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create watch parties" 
ON public.watch_parties FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own watch parties" 
ON public.watch_parties FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own watch parties" 
ON public.watch_parties FOR DELETE 
USING (auth.uid() = creator_id);

-- Create table for room members/participants
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(party_id, user_id)
);

-- Enable RLS for participants
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

-- Policies for participants
CREATE POLICY "Participants are viewable by room members" 
ON public.watch_party_participants FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can join watch parties" 
ON public.watch_party_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave watch parties" 
ON public.watch_party_participants FOR DELETE 
USING (auth.uid() = user_id);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE watch_party_participants;
