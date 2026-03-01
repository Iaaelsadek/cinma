-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'recommendation'
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb, -- Optional data (e.g., { content_id: 123, content_type: 'movie' })
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    USING (auth.uid() = user_id);

-- System can insert notifications (via service role or defined functions)
-- For now, allow authenticated users to insert for testing/simplicity if needed, 
-- but ideally this is done via edge functions or triggers.
CREATE POLICY "Authenticated users can create notifications for themselves" 
    ON public.notifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
