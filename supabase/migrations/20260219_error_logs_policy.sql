-- Enable RLS on error_logs table if not already enabled
ALTER TABLE IF EXISTS "public"."error_logs" ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone (anon included) to insert error logs
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."error_logs";
CREATE POLICY "Enable insert for everyone" ON "public"."error_logs"
FOR INSERT
TO public
WITH CHECK (true);

-- Policy to allow admins to read error logs
DROP POLICY IF EXISTS "Enable read for admins" ON "public"."error_logs";
CREATE POLICY "Enable read for admins" ON "public"."error_logs"
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'supervisor')
  )
);
