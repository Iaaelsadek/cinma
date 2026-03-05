-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- Lucide icon name or emoji
    category TEXT DEFAULT 'general',
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for achievements
CREATE POLICY "Achievements are viewable by everyone" 
    ON public.achievements FOR SELECT 
    USING (true);

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
    ON public.user_achievements FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' achievements" 
    ON public.user_achievements FOR SELECT 
    USING (true);

-- Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;

-- Insert some default achievements
INSERT INTO public.achievements (id, title, description, icon, category, points) VALUES
('first_movie', 'أول فشار 🍿', 'شاهدت أول فيلم لك على المنصة', 'Film', 'watch', 10),
('movie_critic', 'ناقد سينمائي 🎭', 'قمت بتقييم 5 أفلام أو مسلسلات', 'Star', 'social', 20),
('social_butterfly', 'فراشة اجتماعية 🦋', 'شاركت 10 روابط مع أصدقائك', 'Share2', 'social', 30),
('party_host', 'صاحب المجلس 🏠', 'أنشأت أول غرفة مشاهدة جماعية لك', 'Users', 'social', 25),
('night_owl', 'بومة الليل 🦉', 'شاهدت محتوى بعد منتصف الليل', 'Moon', 'watch', 15),
('marathon_runner', 'عداء الماراثون 🏃‍♂️', 'شاهدت 3 حلقات متتالية من مسلسل', 'Zap', 'watch', 50),
('cinema_legend', 'أسطورة السينما 👑', 'شاهدت أكثر من 100 ساعة من المحتوى', 'Trophy', 'watch', 100)
ON CONFLICT (id) DO NOTHING;
