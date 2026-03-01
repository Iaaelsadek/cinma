-- Update comments table for moderation
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Update activity_comments table for replies and moderation
ALTER TABLE public.activity_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.activity_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- RLS Update for moderation
-- Only admins can see hidden comments
CREATE POLICY "Admins can view all comments" ON public.comments
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
        OR is_hidden = false
    );

CREATE POLICY "Admins can view all activity comments" ON public.activity_comments
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
        OR is_hidden = false
    );
