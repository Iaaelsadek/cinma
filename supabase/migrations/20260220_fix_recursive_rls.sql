-- Fix Infinite Recursion on Profiles Table

-- 1. Drop ALL existing policies on profiles to be safe
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 2. Create STRICTLY NON-RECURSIVE policies

-- Simple Read: Everyone can read everything (no lookups)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Simple Insert: Only I can insert my own (no lookups)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Simple Update: Only I can update my own (no lookups)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Fix app_diagnostics policy to avoid recursion via profiles lookup
-- Instead of checking profiles table, we'll allow all authenticated users to insert logs
-- and only allow users to read their own logs (or use a security definer function for admins later)
DROP POLICY IF EXISTS "Enable read for admins" ON public.app_diagnostics;

-- Allow users to read ONLY their own logs to prevent any profile lookup recursion
CREATE POLICY "Users can read own logs" ON public.app_diagnostics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert logs
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.app_diagnostics;
CREATE POLICY "Enable insert for everyone" ON public.app_diagnostics
FOR INSERT
TO public
WITH CHECK (true);
