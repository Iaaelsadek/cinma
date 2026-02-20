-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins/supervisors to read all profiles
-- Note: To avoid recursion, we assume the user's role is checked via auth.uid() = id in the first policy,
-- but for reading *others*, we need to verify the requestor's role.
-- A secure way is to use a security definer function or simply trust that if they can read their own profile, they can check their role.
-- BUT RLS policies are per-row. When reading row X (another user), I need to check if *I* (auth.uid()) am admin.
-- To do this efficiently:
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 2. MOVIES POLICIES
-- Public read access
DROP POLICY IF EXISTS "Public read access movies" ON movies;
CREATE POLICY "Public read access movies" ON movies
  FOR SELECT USING (true);

-- Admin/Supervisor write access
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
CREATE POLICY "Admins can insert movies" ON movies
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update movies" ON movies;
CREATE POLICY "Admins can update movies" ON movies
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can delete movies" ON movies;
CREATE POLICY "Admins can delete movies" ON movies
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- 3. TV SERIES POLICIES
-- Public read access
DROP POLICY IF EXISTS "Public read access series" ON tv_series;
CREATE POLICY "Public read access series" ON tv_series
  FOR SELECT USING (true);

-- Admin/Supervisor write access
DROP POLICY IF EXISTS "Admins can insert series" ON tv_series;
CREATE POLICY "Admins can insert series" ON tv_series
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can update series" ON tv_series;
CREATE POLICY "Admins can update series" ON tv_series
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "Admins can delete series" ON tv_series;
CREATE POLICY "Admins can delete series" ON tv_series
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );
