-- User Challenges System

CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description TEXT,
    description_en TEXT,
    type TEXT NOT NULL CHECK (type IN ('watch_count', 'review_count', 'follow_count', 'social_share')),
    target_count INTEGER NOT NULL DEFAULT 1,
    reward_xp INTEGER NOT NULL DEFAULT 50,
    icon TEXT DEFAULT 'Zap',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone" ON challenges
    FOR SELECT USING (true);

CREATE POLICY "User challenges are viewable by the user" ON user_challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User challenges are updatable by system" ON user_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Initial Challenges
INSERT INTO challenges (title, title_en, description, description_en, type, target_count, reward_xp, icon) VALUES
('مشاهد أول', 'First Watch', 'شاهد أول فيلم لك على المنصة', 'Watch your first movie on the platform', 'watch_count', 1, 50, 'PlayCircle'),
('عاشق السينما', 'Cinema Lover', 'شاهد 10 أفلام', 'Watch 10 movies', 'watch_count', 10, 200, 'Film'),
('الناقد المبتدئ', 'Junior Critic', 'اكتب أول مراجعة لك', 'Write your first review', 'review_count', 1, 50, 'MessageSquare'),
('المؤثر الاجتماعي', 'Social Influencer', 'تابع 5 مستخدمين', 'Follow 5 users', 'follow_count', 5, 100, 'Users');
