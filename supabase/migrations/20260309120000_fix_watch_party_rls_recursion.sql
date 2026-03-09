-- Fix recursive RLS policy on watch_party_participants which causes infinite recursion errors
-- when users try to join or view a party.

-- Drop potential problematic policies
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Participants can view other participants" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "view_participants" ON "public"."watch_party_participants";
DROP POLICY IF EXISTS "Allow read access for participants" ON "public"."watch_party_participants";

-- Create a non-recursive policy for SELECT
-- We allow any authenticated user (or even anon if needed) to see participants of a party.
-- This breaks the recursion loop where "checking if I am a participant" required "querying the participants table".
CREATE POLICY "Enable read access for all users"
ON "public"."watch_party_participants"
FOR SELECT
USING (true);

-- Ensure we have policies for INSERT and DELETE
-- Users can insert themselves
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."watch_party_participants";
CREATE POLICY "Enable insert for authenticated users only"
ON "public"."watch_party_participants"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete themselves
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "public"."watch_party_participants";
CREATE POLICY "Enable delete for users based on user_id"
ON "public"."watch_party_participants"
FOR DELETE
USING (auth.uid() = user_id);
