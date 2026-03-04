-- Full Security Audit and RLS Policy Fixes
-- Date: 2026-03-03

-- 1. History Table Policies
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own history" ON public.history;
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own history" ON public.history;
CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON public.history;
CREATE POLICY "Users can delete their own history" 
ON public.history FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Comments Table Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments" 
ON public.comments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor'));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor'));

-- 3. Notifications Table Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = user_id);

-- 4. User Achievements Table Policies
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Playlists Table Policies
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.playlists;
CREATE POLICY "Public playlists are viewable by everyone" 
ON public.playlists FOR SELECT 
USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;
CREATE POLICY "Users can manage their own playlists" 
ON public.playlists FOR ALL 
USING (auth.uid() = user_id);

-- 6. User Lists Table Policies
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public user lists are viewable by everyone" ON public.user_lists;
CREATE POLICY "Public user lists are viewable by everyone" 
ON public.user_lists FOR SELECT 
USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own user lists" ON public.user_lists;
CREATE POLICY "Users can manage their own user lists" 
ON public.user_lists FOR ALL 
USING (auth.uid() = user_id);
