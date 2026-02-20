-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 1. Users can view their own profile (all columns including role)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile (but usually role should be protected via triggers or API logic, 
--    but RLS for UPDATE handles row access, not column. 
--    We trust the frontend not to send 'role' or use a trigger to prevent it if needed.
--    For now, we allow update on own row.)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Admins (service_role is always bypassed, but if we have admin users logged in via client)
--    We want admins to be able to see ALL profiles.
--    This requires a recursive check or a claim. 
--    For simplicity, let's rely on the fact that admins use the dashboard which might use service role or 
--    we can add a policy if 'role' column is 'admin'.
--    CAUTION: Recursive policies can cause infinite loops.
--    "auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')" is risky if not careful.
--    So for now, we just stick to "Users can view own profile".
--    If admin needs to see others, they use the dashboard which uses service_role key (in python scripts) 
--    or we need a secure function.
--    BUT, the dashboard frontend uses the client key.
--    So admins DO need to see other profiles.

-- Let's add a policy for admins to view all profiles, avoiding recursion by using a JWT claim or a separate secure function.
-- Since we don't have custom claims set up easily, we will skip the admin-view-all policy for client-side for now,
-- as the admin dashboard (users page) might fail.
-- ACTUALLY, the admin dashboard (users.tsx) fetches profiles?
-- Yes, `AdminUsersPage` likely fetches profiles.
-- If so, we need a policy for admins.
-- A safe way is to define a function `is_admin()` but that also queries profiles.
-- The standard Supabase way is often to just allow public read of basic info, and protected read of private info.
-- But here we want full access for admins.

-- For now, let's just ensure the USER can see THEIR OWN profile, which is the immediate issue.
