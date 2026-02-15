-- Enable read access for all users for content tables

-- Movies
ALTER TABLE "public"."movies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Movies" ON "public"."movies";
CREATE POLICY "Public Read Movies" ON "public"."movies" FOR SELECT TO public USING (true);

-- Series
ALTER TABLE "public"."series" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Series" ON "public"."series";
CREATE POLICY "Public Read Series" ON "public"."series" FOR SELECT TO public USING (true);

-- Seasons
ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Seasons" ON "public"."seasons";
CREATE POLICY "Public Read Seasons" ON "public"."seasons" FOR SELECT TO public USING (true);

-- Episodes
ALTER TABLE "public"."episodes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Episodes" ON "public"."episodes";
CREATE POLICY "Public Read Episodes" ON "public"."episodes" FOR SELECT TO public USING (true);

-- Anime
ALTER TABLE "public"."anime" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Anime" ON "public"."anime";
CREATE POLICY "Public Read Anime" ON "public"."anime" FOR SELECT TO public USING (true);

-- Games
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Games" ON "public"."games";
CREATE POLICY "Public Read Games" ON "public"."games" FOR SELECT TO public USING (true);

-- Software
ALTER TABLE "public"."software" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Software" ON "public"."software";
CREATE POLICY "Public Read Software" ON "public"."software" FOR SELECT TO public USING (true);

-- Quran Reciters
ALTER TABLE "public"."quran_reciters" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Quran Reciters" ON "public"."quran_reciters";
CREATE POLICY "Public Read Quran Reciters" ON "public"."quran_reciters" FOR SELECT TO public USING (true);

-- Categories
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Categories" ON "public"."categories";
CREATE POLICY "Public Read Categories" ON "public"."categories" FOR SELECT TO public USING (true);

-- Videos (Kids/YouTube)
ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Videos" ON "public"."videos";
CREATE POLICY "Public Read Videos" ON "public"."videos" FOR SELECT TO public USING (true);

-- TV Series
ALTER TABLE "public"."tv_series" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read TV Series" ON "public"."tv_series";
CREATE POLICY "Public Read TV Series" ON "public"."tv_series" FOR SELECT TO public USING (true);
