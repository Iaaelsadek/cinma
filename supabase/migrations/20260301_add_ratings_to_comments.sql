-- Migration to add ratings and titles to comments table
-- This transforms comments into a full Reviews & Ratings system

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 10),
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update RLS if needed (usually already covered by existing policies)
-- But let's ensure authenticated users can insert with ratings
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments" ON public.comments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add index for performance on content lookups
CREATE INDEX IF NOT EXISTS idx_comments_content ON public.comments(content_id, content_type);
