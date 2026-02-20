CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE movies ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select ON categories;
CREATE POLICY categories_select ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS categories_modify_admin ON categories;
CREATE POLICY categories_modify_admin ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
