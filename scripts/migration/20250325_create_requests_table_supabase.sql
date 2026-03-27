-- ============================================
-- Supabase Migration: Create Requests Table (Simplified)
-- Purpose: Store user content requests for admin processing
-- 
-- HOW TO APPLY:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- ============================================

-- Create requests table (simplified - no foreign key constraints)
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  media_type TEXT CHECK (media_type IN ('movie', 'tv')),
  tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_tmdb_id ON public.requests(tmdb_id);

-- Note: RLS and permissions can be added later based on your auth setup
-- For now, the table is created without security policies

SELECT 'Requests table created successfully!' AS status;
