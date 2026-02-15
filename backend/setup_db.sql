-- جدول الأفلام الرئيسي 
 CREATE TABLE IF NOT EXISTS movies ( 
   id BIGINT PRIMARY KEY, -- TMDB ID 
   title TEXT NOT NULL, 
   arabic_title TEXT, 
   overview TEXT, 
   ai_summary TEXT, 
   rating_color TEXT DEFAULT 'yellow', 
   genres JSONB, 
   release_date DATE, 
   poster_path TEXT, 
   backdrop_path TEXT, 
   trailer_key TEXT, -- مفتاح يوتيوب 
   embed_links JSONB DEFAULT '{}'::JSONB, -- { "vidsrc": "url", "2embed": "url", ... } 
   subtitle_urls JSONB DEFAULT '{}'::JSONB, -- { "ar": "url", "en": "url" } 
   last_checked TIMESTAMPTZ, -- آخر مرة تم فحص الروابط 
   is_active BOOLEAN DEFAULT true, 
   source TEXT, -- tmdb, imdb, scraped, etc 
   created_at TIMESTAMPTZ DEFAULT NOW(), 
   updated_at TIMESTAMPTZ DEFAULT NOW() 
 ); 
 
 -- جدول المسلسلات (مشابه مع seasons و episodes) 
 CREATE TABLE IF NOT EXISTS tv_series (LIKE movies INCLUDING ALL); 
 ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS first_air_date DATE; 
 
 CREATE TABLE IF NOT EXISTS seasons ( 
   id SERIAL PRIMARY KEY, 
   series_id BIGINT REFERENCES tv_series(id) ON DELETE CASCADE, 
   season_number INT, 
   name TEXT, 
   overview TEXT, 
   poster_path TEXT, 
   air_date DATE 
 ); 
 
 CREATE TABLE IF NOT EXISTS episodes ( 
   id SERIAL PRIMARY KEY, 
   season_id INT REFERENCES seasons(id) ON DELETE CASCADE, 
   episode_number INT, 
   name TEXT, 
   overview TEXT, 
   still_path TEXT, 
   air_date DATE, 
   embed_links JSONB DEFAULT '{}'::JSONB, 
   subtitle_urls JSONB DEFAULT '{}'::JSONB 
 ); 
 
 -- جدول لمصادر الـ Embed (يتم تحديثها دورياً) 
 CREATE TABLE IF NOT EXISTS embed_sources ( 
   id SERIAL PRIMARY KEY, 
   name TEXT UNIQUE, -- 'vidsrc', '2embed', 'autoembed', etc 
   base_url TEXT, 
   url_pattern TEXT, -- pattern with {id} and {type} 
   priority INT DEFAULT 5, -- 1 = أعلى أولوية 
   is_active BOOLEAN DEFAULT true, 
   last_checked TIMESTAMPTZ, 
   response_time_ms INT -- متوسط زمن الاستجابة 
 ); 
 
 -- جدول لفحص الروابط (logs) 
 CREATE TABLE IF NOT EXISTS link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
 );

 -- Seed initial embed sources
 INSERT INTO embed_sources (name, base_url, url_pattern, priority) VALUES 
 ('vidsrc', 'https://vidsrc.to', 'https://vidsrc.to/embed/{type}/{id}', 1),
 ('2embed', 'https://www.2embed.cc', 'https://www.2embed.cc/embed/{id}', 2),
 ('embed_su', 'https://embed.su', 'https://embed.su/embed/{type}/{id}', 3)
 ON CONFLICT (name) DO NOTHING;

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS continue_watching ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tv_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS embed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS software ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quran_reciters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS watchlist_select ON watchlist;
CREATE POLICY watchlist_select ON watchlist FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_select_admin ON watchlist;
CREATE POLICY watchlist_select_admin ON watchlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS watchlist_insert ON watchlist;
CREATE POLICY watchlist_insert ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_update ON watchlist;
CREATE POLICY watchlist_update ON watchlist FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS watchlist_delete ON watchlist;
CREATE POLICY watchlist_delete ON watchlist FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS continue_watching_select ON continue_watching;
CREATE POLICY continue_watching_select ON continue_watching FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_select_admin ON continue_watching;
CREATE POLICY continue_watching_select_admin ON continue_watching FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS continue_watching_insert ON continue_watching;
CREATE POLICY continue_watching_insert ON continue_watching FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_update ON continue_watching;
CREATE POLICY continue_watching_update ON continue_watching FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS continue_watching_delete ON continue_watching;
CREATE POLICY continue_watching_delete ON continue_watching FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS history_select ON history;
CREATE POLICY history_select ON history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS history_select_admin ON history;
CREATE POLICY history_select_admin ON history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS history_insert ON history;
CREATE POLICY history_insert ON history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS history_delete ON history;
CREATE POLICY history_delete ON history FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS comments_select ON comments;
CREATE POLICY comments_select ON comments FOR SELECT USING (true);
DROP POLICY IF EXISTS comments_insert ON comments;
CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS comments_update ON comments;
CREATE POLICY comments_update ON comments FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS comments_delete ON comments;
CREATE POLICY comments_delete ON comments FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS movies_select ON movies;
CREATE POLICY movies_select ON movies FOR SELECT USING (true);
DROP POLICY IF EXISTS movies_modify_admin ON movies;
CREATE POLICY movies_modify_admin ON movies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS tv_series_select ON tv_series;
CREATE POLICY tv_series_select ON tv_series FOR SELECT USING (true);
DROP POLICY IF EXISTS tv_series_modify_admin ON tv_series;
CREATE POLICY tv_series_modify_admin ON tv_series FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS seasons_select ON seasons;
CREATE POLICY seasons_select ON seasons FOR SELECT USING (true);
DROP POLICY IF EXISTS seasons_modify_admin ON seasons;
CREATE POLICY seasons_modify_admin ON seasons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS episodes_select ON episodes;
CREATE POLICY episodes_select ON episodes FOR SELECT USING (true);
DROP POLICY IF EXISTS episodes_modify_admin ON episodes;
CREATE POLICY episodes_modify_admin ON episodes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS videos_select ON videos;
CREATE POLICY videos_select ON videos FOR SELECT USING (true);
DROP POLICY IF EXISTS videos_modify_admin ON videos;
CREATE POLICY videos_modify_admin ON videos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS ads_select ON ads;
CREATE POLICY ads_select ON ads FOR SELECT USING (true);
DROP POLICY IF EXISTS ads_modify_admin ON ads;
CREATE POLICY ads_modify_admin ON ads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS settings_select_admin ON settings;
CREATE POLICY settings_select_admin ON settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS settings_modify_admin ON settings;
CREATE POLICY settings_modify_admin ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS embed_sources_select ON embed_sources;
CREATE POLICY embed_sources_select ON embed_sources FOR SELECT USING (true);
DROP POLICY IF EXISTS embed_sources_modify_admin ON embed_sources;
CREATE POLICY embed_sources_modify_admin ON embed_sources FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS link_checks_select_admin ON link_checks;
CREATE POLICY link_checks_select_admin ON link_checks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS link_checks_insert_auth ON link_checks;
CREATE POLICY link_checks_insert_auth ON link_checks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS link_checks_modify_admin ON link_checks;
CREATE POLICY link_checks_modify_admin ON link_checks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS games_select ON games;
CREATE POLICY games_select ON games FOR SELECT USING (true);
DROP POLICY IF EXISTS games_modify_admin ON games;
CREATE POLICY games_modify_admin ON games FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS software_select ON software;
CREATE POLICY software_select ON software FOR SELECT USING (true);
DROP POLICY IF EXISTS software_modify_admin ON software;
CREATE POLICY software_modify_admin ON software FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS anime_select ON anime;
CREATE POLICY anime_select ON anime FOR SELECT USING (true);
DROP POLICY IF EXISTS anime_modify_admin ON anime;
CREATE POLICY anime_modify_admin ON anime FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS quran_reciters_select ON quran_reciters;
CREATE POLICY quran_reciters_select ON quran_reciters FOR SELECT USING (true);
DROP POLICY IF EXISTS quran_reciters_modify_admin ON quran_reciters;
CREATE POLICY quran_reciters_modify_admin ON quran_reciters FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
