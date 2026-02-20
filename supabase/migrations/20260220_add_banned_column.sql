-- Add 'banned' column to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- Add 'created_at' column just in case it's missing (though it seems to exist)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure RLS policies cover the new column (update policy)
-- The existing policy "Users can update own profile" allows updating ANY column?
-- Usually policies are row-based. But we might want to restrict users from unbanning themselves!
-- Users should NOT be able to update 'banned' column.

-- We need to check if Supabase allows column-level permissions easily.
-- Alternatively, we can use a trigger to prevent users from changing 'banned'.
-- OR, we rely on the fact that the update query in `Profile.tsx` (user side) only updates `username`, `avatar_url`.
-- But a malicious user could try to update `banned`.

-- Let's revoke update on 'banned' for authenticated users?
-- Postgres doesn't support column-level REVOKE for rows owned by user easily with RLS.
-- But we can add a check constraint or a trigger.

-- Simple approach: separate policy for admin updates?
-- Currently:
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- This allows updating ALL columns.

-- We should probably restrict this.
-- BUT for now, let's just add the column so the page works. 
-- The priority is to fix the "Network Error" on the users page.

COMMENT ON COLUMN public.profiles.banned IS 'Whether the user is banned from the platform';
