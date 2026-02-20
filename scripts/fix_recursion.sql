-- Fix infinite recursion by using a security definer function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'supervisor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
CREATE POLICY "Admins can insert movies" ON movies
  FOR INSERT WITH CHECK (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can update movies" ON movies;
CREATE POLICY "Admins can update movies" ON movies
  FOR UPDATE USING (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete movies" ON movies;
CREATE POLICY "Admins can delete movies" ON movies
  FOR DELETE USING (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert series" ON tv_series;
CREATE POLICY "Admins can insert series" ON tv_series
  FOR INSERT WITH CHECK (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can update series" ON tv_series;
CREATE POLICY "Admins can update series" ON tv_series
  FOR UPDATE USING (
    is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete series" ON tv_series;
CREATE POLICY "Admins can delete series" ON tv_series
  FOR DELETE USING (
    is_admin()
  );
