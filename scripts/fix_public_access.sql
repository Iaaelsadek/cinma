
-- Enable RLS
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE software ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_reciters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view movies" ON movies;
DROP POLICY IF EXISTS "Public can view tv_series" ON tv_series;
DROP POLICY IF EXISTS "Public can view seasons" ON seasons;
DROP POLICY IF EXISTS "Public can view episodes" ON episodes;
DROP POLICY IF EXISTS "Public can view games" ON games;
DROP POLICY IF EXISTS "Public can view software" ON software;
DROP POLICY IF EXISTS "Public can view anime" ON anime;
DROP POLICY IF EXISTS "Public can view quran_reciters" ON quran_reciters;

-- Create policies for public read access
CREATE POLICY "Public can view movies" ON movies FOR SELECT USING (true);
CREATE POLICY "Public can view tv_series" ON tv_series FOR SELECT USING (true);
CREATE POLICY "Public can view seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public can view episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "Public can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Public can view software" ON software FOR SELECT USING (true);
CREATE POLICY "Public can view anime" ON anime FOR SELECT USING (true);
CREATE POLICY "Public can view quran_reciters" ON quran_reciters FOR SELECT USING (true);
