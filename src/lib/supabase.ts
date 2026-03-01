import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './constants'
import { errorLogger } from '../services/errorLogging'

// Fallback to prevent crash if env vars are missing
const sbUrl = CONFIG.SUPABASE_URL || 'https://placeholder.supabase.co'
const sbKey = CONFIG.SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(sbUrl, sbKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth-token-v2' // Unique key to prevent conflicts
  },
  global: {
    fetch: (input, init) => fetchWithTimeout(input, init)
  },
  db: {
    schema: 'public'
  }
})

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetchWithTimeout(resource: RequestInfo | URL, options: FetchOptions = {}) {
  // Increased default timeout to 60s to ensure data loads even on slow connections
  const { timeout = 60000, ...fetchOptions } = options; 
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.warn('[Supabase] Request timed out:', resource);
    }
    throw error;
  }
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url?: string | null;
  role: 'user' | 'admin' | 'supervisor';
  bio?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  avatar_decoration?: string;
  is_public: boolean;
  created_at?: string;
  total_xp?: number;
  movies_watched?: number;
  reviews_written?: number;
}

export interface WatchParty {
  id: string;
  room_name: string;
  description?: string;
  creator_id: string;
  content_id: number | string;
  content_type: 'movie' | 'tv' | string;
  is_playing: boolean;
  current_time: number;
  created_at: string;
  last_updated?: string;
}

export interface PartyChatMessage {
  id: string;
  party_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
}

export async function sendPartyMessage(partyId: string, userId: string, username: string, avatarUrl: string | null, text: string) {
  const { data, error } = await supabase
    .from('watch_party_messages')
    .insert([{ party_id: partyId, user_id: userId, username, avatar_url: avatarUrl, text }])
  
  if (error) throw error
  return data
}

export async function getPartyMessages(partyId: string) {
  const { data, error } = await supabase
    .from('watch_party_messages')
    .select('*')
    .eq('party_id', partyId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data as PartyChatMessage[]
}

export interface Challenge {
  id: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  type: 'watch_count' | 'review_count' | 'follow_count' | 'social_share';
  target_count: number;
  reward_xp: number;
  icon: string;
  is_active: boolean;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  current_count: number;
  is_completed: boolean;
  completed_at: string | null;
  updated_at: string;
  challenge: Challenge;
}

export async function getUserChallenges(userId: string) {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)
  
  if (error) throw error
  return data as UserChallenge[]
}

export async function getAvailableChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
  
  if (error) throw error
  return data as Challenge[]
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  movies_watched: number;
  reviews_written: number;
  rank: number;
}

export async function getLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('user_rankings')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as LeaderboardEntry[]
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  
  if (error) throw error
  return data as Profile | null
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  
  if (data && !error) {
    return data as Profile | null
  }

  // If error (RLS/Network) OR no data (RLS silent failure), try proxy
  if (error || !data) {
    try {
      // Use relative path by default to leverage Vite proxy in dev, or API_BASE if set
      const apiBase = CONFIG.API_BASE || ''
      const url = apiBase ? `${apiBase}/api/profile/${userId}` : `/api/profile/${userId}`
      
      // Get current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetchWithTimeout(url, { headers, timeout: 3000 })
      if (res.ok) {
        const proxyData = await res.json()
        if (proxyData) {
          return proxyData as Profile | null
        }
      }
    } catch (e) {
      // Only log proxy errors if we also had a direct error, to avoid noise on simple "not found"
      if (error) {
        errorLogger.logError({
          message: 'Proxy fetch failed after direct fetch error',
          severity: 'medium',
          category: 'network',
          context: { error: e, originalError: error }
        })
      }
    }
    
    // If direct fetch had an error and proxy failed, throw original error
    if (error) throw error
    
    // If direct fetch was null (silent RLS or not found) and proxy failed/null, return null
    return null
  }
  
  return null
}

export async function ensureProfile(userId: string, email?: string | null) {
  const existing = await getProfile(userId)
  if (existing) return existing
  const username = email?.split('@')[0] || 'user'
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username, role: 'user', is_public: true })
    .select('*')
    .single()
    
  if (error) {
    // If profile already exists (race condition or trigger), try fetching it again
    if (error.code === '23505') {
      const retry = await getProfile(userId)
      if (retry) return retry
    }
    throw error
  }
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export async function updateUsername(userId: string, username: string) {
  return updateProfile(userId, { username })
}

// Follow Functions
export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId })
  if (error) throw error
  
  // Add activity
  await addActivity({
    user_id: followerId,
    type: 'follow',
    content_id: followingId,
    content_type: 'user',
    metadata: {}
  })
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  if (error) throw error
}

export async function removeFollower(userId: string, followerId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', userId)
  if (error) throw error
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function getFollowers(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, profiles!follower_id(*)')
    .eq('following_id', userId)
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

export async function getFollowing(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, profiles!following_id(*)')
    .eq('follower_id', userId)
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

// Activity Feed Functions
export type Activity = {
  id: string
  user_id: string
  type: 'watch' | 'review' | 'achievement' | 'follow' | 'playlist_created'
  content_id: string
  content_type: string
  metadata?: any
  created_at: string
  user?: Profile
  likes_count?: number
  comments_count?: number
  is_liked?: boolean
}

export async function getActivityFeed(userId: string, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, user:profiles(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data as unknown as Activity[]
}

export async function addActivity(activity: Omit<Activity, 'id' | 'created_at'>) {
  const { error } = await supabase
    .from('activity_feed')
    .insert(activity)
  if (error) throw error
}

// Activity Interactions Functions
export async function likeActivity(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_likes')
    .insert({ activity_id: activityId, user_id: userId })
  if (error) throw error
}

export async function unlikeActivity(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_likes')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function isActivityLiked(activityId: string, userId: string) {
  const { data, error } = await supabase
    .from('activity_likes')
    .select('*')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function getActivityLikesCount(activityId: string) {
  const { count, error } = await supabase
    .from('activity_likes')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId)
  if (error) throw error
  return count || 0
}

export type ActivityComment = {
  id: string
  activity_id: string
  user_id: string
  text: string
  created_at: string
  user?: Profile
}

export async function addActivityComment(activityId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('activity_comments')
    .insert({ activity_id: activityId, user_id: userId, text })
    .select('*, user:profiles(*)')
    .single()
  if (error) throw error
  return data as ActivityComment
}

export async function getActivityComments(activityId: string) {
  const { data, error } = await supabase
    .from('activity_comments')
    .select('*, user:profiles(*)')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ActivityComment[]
}

export async function deleteActivityComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from('activity_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}

// Activity Reaction Functions
export type ActivityReaction = {
  id: string
  activity_id: string
  user_id: string
  type: string
  created_at: string
}

export async function addActivityReaction(activityId: string, userId: string, type: string) {
  const { error } = await supabase
    .from('activity_reactions')
    .upsert({ activity_id: activityId, user_id: userId, type }, { onConflict: 'activity_id,user_id' })
  if (error) throw error
}

export async function removeActivityReaction(activityId: string, userId: string) {
  const { error } = await supabase
    .from('activity_reactions')
    .delete()
    .eq('activity_id', activityId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getActivityReactions(activityId: string) {
  const { data, error } = await supabase
    .from('activity_reactions')
    .select('type, user_id')
    .eq('activity_id', activityId)
  if (error) throw error
  return data as { type: string, user_id: string }[]
}

// Activity Comment Reply Functions
export type ActivityCommentReply = {
  id: string
  comment_id: string
  user_id: string
  text: string
  created_at: string
  user?: Profile
}

export async function addActivityCommentReply(commentId: string, userId: string, text: string) {
  const { data, error } = await supabase
    .from('activity_comment_replies')
    .insert({ comment_id: commentId, user_id: userId, text })
    .select('*, user:profiles(*)')
    .single()
  if (error) throw error
  return data as ActivityCommentReply
}

export async function getActivityCommentReplies(commentId: string) {
  const { data, error } = await supabase
    .from('activity_comment_replies')
    .select('*, user:profiles(*)')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ActivityCommentReply[]
}

export async function deleteActivityCommentReply(replyId: string, userId: string) {
  const { error } = await supabase
    .from('activity_comment_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function uploadAvatar(file: File, userId: string) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type
  })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const publicUrl = pub.publicUrl
  
  const { error: updErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
  if (updErr) {
    errorLogger.logError({
      message: 'Direct avatar update failed, trying proxy',
      severity: 'low',
      category: 'database',
      context: { error: updErr, userId }
    })
    const apiBase = CONFIG.API_BASE || 'http://localhost:3001'
    const res = await fetch(`${apiBase}/api/profile/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: publicUrl })
    })
    if (!res.ok) throw updErr
  }
  return publicUrl
}

export async function isInWatchlist(userId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

export async function addToWatchlist(userId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { error } = await supabase.from('watchlist').insert({ user_id: userId, content_id: contentId, content_type: contentType })
  if (error && !String(error.message || '').includes('duplicate')) throw error
}

export async function removeFromWatchlist(userId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
  if (error) throw error
}

export async function getWatchlist(userId: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('content_id, content_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Array<{ content_id: number; content_type: 'movie' | 'tv'; created_at: string }>
}

export async function getProgress(userId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { data, error } = await supabase
    .from('continue_watching')
    .select('id, progress_seconds, duration_seconds, season_number, episode_number')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data as { id: string; progress_seconds: number; duration_seconds: number; season_number: number | null; episode_number: number | null } | null
}

export async function upsertProgress(args: {
  userId: string
  contentId: number
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  progressSeconds: number
  durationSeconds?: number
}) {
  const payload = {
    user_id: args.userId,
    content_id: args.contentId,
    content_type: args.contentType,
    season_number: args.season ?? null,
    episode_number: args.episode ?? null,
    progress_seconds: args.progressSeconds,
    duration_seconds: args.durationSeconds ?? 0,
    updated_at: new Date().toISOString()
  }
  const { error } = await supabase.from('continue_watching').upsert(payload, { onConflict: 'user_id,content_id,content_type' })
  if (error) throw error
}

export async function getContinueWatching(userId: string) {
  const { data, error } = await supabase
    .from('continue_watching')
    .select('content_id, content_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Array<{
    content_id: number
    content_type: 'movie' | 'tv'
    season_number: number | null
    episode_number: number | null
    progress_seconds: number
    duration_seconds: number
    updated_at: string
  }>
}

export async function addHistory(args: {
  userId: string
  contentId: number
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  watchedAt?: string
}) {
  const payload = {
    user_id: args.userId,
    content_id: args.contentId,
    content_type: args.contentType,
    season_number: args.season ?? null,
    episode_number: args.episode ?? null,
    watched_at: args.watchedAt ?? new Date().toISOString()
  }
  const { error } = await supabase.from('history').insert(payload)
  if (error) throw error
}

export async function getHistory(userId: string) {
  const { data, error } = await supabase
    .from('history')
    .select('content_id, content_type, season_number, episode_number, watched_at')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
  if (error) throw error
  return data as Array<{ content_id: number; content_type: 'movie' | 'tv'; season_number: number | null; episode_number: number | null; watched_at: string }>
}

export async function getSeriesById(id: number) {
  const { data, error } = await supabase.from('tv_series').select('*').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data as any | null
}

export async function upsertSeries(row: any) {
  const { error } = await supabase.from('tv_series').upsert(row, { onConflict: 'id' })
  if (error) throw error
}

export async function getSeasons(seriesId: number) {
  const { data, error } = await supabase.from('seasons').select('*').eq('series_id', seriesId).order('season_number', { ascending: true })
  if (error) throw error
  return data as any[]
}

export async function upsertSeason(row: any) {
  const { error } = await supabase.from('seasons').upsert(row)
  if (error) throw error
}

export async function deleteSeason(seasonId: number) {
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId)
  if (error) throw error
}

export async function getEpisodes(seasonId: number) {
  const { data, error } = await supabase.from('episodes').select('*').eq('season_id', seasonId).order('episode_number', { ascending: true })
  if (error) throw error
  return data as any[]
}

export async function upsertEpisode(row: any) {
  const { error } = await supabase.from('episodes').upsert(row)
  if (error) throw error
}

export async function deleteEpisode(episodeId: number) {
  const { error } = await supabase.from('episodes').delete().eq('id', episodeId)
  if (error) throw error
}

export type CommentRow = {
  id: string
  user_id: string
  content_id: number | string
  content_type: 'movie' | 'tv' | 'anime' | 'game' | 'software'
  text: string
  title?: string
  rating?: number
  created_at: string
}

export interface WatchPartyParticipant {
  party_id: string
  user_id: string
  joined_at: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: string
  points: number
  created_at: string
}

export interface UserAchievement {
  user_id: string
  achievement_id: string
  earned_at: string
  achievement?: Achievement
}

export async function createWatchParty(party: Omit<WatchParty, 'id' | 'created_at' | 'last_updated'>) {
  const { data, error } = await supabase
    .from('watch_parties')
    .insert(party)
    .select()
    .single()
  if (error) throw error
  return data as WatchParty
}

export async function getWatchParty(partyId: string) {
  const { data, error } = await supabase
    .from('watch_parties')
    .select('*')
    .eq('id', partyId)
    .maybeSingle()
  if (error) throw error
  return data as WatchParty | null
}

export async function updateWatchParty(partyId: string, updates: Partial<WatchParty>) {
  const { error } = await supabase
    .from('watch_parties')
    .update({ ...updates, last_updated: new Date().toISOString() })
    .eq('id', partyId)
  if (error) throw error
}

export async function joinWatchParty(partyId: string, userId: string) {
  const { error } = await supabase
    .from('watch_party_participants')
    .upsert({ party_id: partyId, user_id: userId })
  if (error) throw error
}

export async function leaveWatchParty(party_id: string, user_id: string) {
  const { error } = await supabase
    .from('watch_party_participants')
    .delete()
    .eq('party_id', party_id)
    .eq('user_id', user_id)
  if (error) throw error
}

// Achievements Functions
export async function getUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
  if (error) throw error
  return data as UserAchievement[]
}

export async function grantAchievement(userId: string, achievementId: string) {
  // Check if already has it
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle()

  if (existing) return false

  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: achievementId })
  
  if (error) throw error

  // Add activity
  await addActivity({
    user_id: userId,
    type: 'achievement',
    content_id: achievementId,
    content_type: 'achievement',
    metadata: {}
  })

  return true
}

export async function getAllAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
  if (error) throw error
  return data as Achievement[]
}

// Playlists Functions
export type Playlist = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_ai_generated: boolean;
  created_at: string;
};

export type PlaylistItem = {
  id: string;
  playlist_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  added_at: string;
};

export async function getUserPlaylists(userId: string) {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, items:playlist_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (Playlist & { items: PlaylistItem[] })[];
}

export async function getPublicAiPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select('*, items:playlist_items(*)')
    .eq('is_ai_generated', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data as (Playlist & { items: PlaylistItem[] })[];
}

export async function createPlaylist(args: {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  isAiGenerated?: boolean;
}) {
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: args.userId,
      title: args.title,
      description: args.description || null,
      is_public: args.isPublic ?? true,
      is_ai_generated: args.isAiGenerated ?? false
    })
    .select()
    .single();
  if (error) throw error;
  return data as Playlist;
}

export async function addPlaylistItem(playlistId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { error } = await supabase
    .from('playlist_items')
    .upsert({ playlist_id: playlistId, content_id: contentId, content_type: contentType });
  if (error) throw error;
}

// Notifications Functions
export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'recommendation'
  is_read: boolean
  data: any
  created_at: string
}

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Notification[]
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export async function deleteNotification(id: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function createNotification(args: {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'recommendation'
  data?: any
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: args.userId,
      title: args.title,
      message: args.message,
      type: args.type || 'info',
      data: args.data || {}
    })
    .select()
    .single()
  if (error) throw error
  return data as Notification
}

export async function getParticipants(partyId: string) {
  const { data, error } = await supabase
    .from('watch_party_participants')
    .select('user_id, joined_at')
    .eq('party_id', partyId)
  if (error) throw error
  return data as { user_id: string, joined_at: string }[]
}

export async function getComments(contentId: number | string, contentType: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,user_id,content_id,content_type,text,title,rating,created_at')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CommentRow[]
}

export async function addComment(args: {
  userId: string,
  contentId: number | string,
  contentType: string,
  text: string,
  title?: string,
  rating?: number
}) {
  const { data, error } = await supabase.from('comments').insert({
    user_id: args.userId,
    content_id: args.contentId,
    content_type: args.contentType,
    text: args.text,
    title: args.title,
    rating: args.rating
  }).select().single()
  
  if (error) throw error

  // Add activity
  await addActivity({
    user_id: args.userId,
    type: 'review',
    content_id: data.id,
    content_type: 'review',
    metadata: {
      content_id: args.contentId,
      content_type: args.contentType,
      rating: args.rating,
      title: args.title
    }
  })
}

export async function getAverageRating(contentId: number | string, contentType: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('rating')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .not('rating', 'is', null)
  
  if (error) throw error
  if (!data || data.length === 0) return 0
  
  const sum = data.reduce((acc, curr) => acc + (curr.rating || 0), 0)
  return parseFloat((sum / data.length).toFixed(1))
}

export async function updateComment(commentId: string, text: string) {
  const { error } = await supabase.from('comments').update({ text }).eq('id', commentId)
  if (error) throw error
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}

export async function incrementClicks(table: 'movies' | 'games' | 'software', id: number | string) {
  const { data, error } = await supabase.from(table).select('clicks').eq('id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  const next = (data?.clicks || 0) + 1
  const { error: upd } = await supabase.from(table).update({ clicks: next }).eq('id', id)
  if (upd) throw upd
}

// ------------------------------------------------------------------
// Recommendation System Data Collector
// ------------------------------------------------------------------

export type UserPreferenceData = {
  history: Array<{ content_id: number; content_type: 'movie' | 'tv' }>
  watchlist: Array<{ content_id: number; content_type: 'movie' | 'tv' }>
}

export async function getUserPreferences(userId: string): Promise<UserPreferenceData> {
  // Fetch history (limit to last 50 items to keep it relevant)
  const { data: history, error: historyError } = await supabase
    .from('history')
    .select('content_id, content_type')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(50)
  
  if (historyError) {
    errorLogger.logError({
      message: 'Failed to fetch user history for recommendations',
      severity: 'low',
      category: 'database',
      context: { error: historyError, userId }
    })
  }

  // Fetch watchlist
  const { data: watchlist, error: watchlistError } = await supabase
    .from('watchlist')
    .select('content_id, content_type')
    .eq('user_id', userId)
  
  if (watchlistError) {
    errorLogger.logError({
      message: 'Failed to fetch user watchlist for recommendations',
      severity: 'low',
      category: 'database',
      context: { error: watchlistError, userId }
    })
  }

  return {
    history: (history || []) as any[],
    watchlist: (watchlist || []) as any[]
  }
}

// Moderation & Blocking Functions
export async function reportActivityComment(commentId: string, reporterId: string, reason: string) {
  const { error } = await supabase
    .from('activity_comment_reports')
    .insert({ comment_id: commentId, reporter_id: reporterId, reason })
  if (error) throw error
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error) throw error
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function getBlockedUsers(userId: string) {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id, profiles!blocked_id(*)')
    .eq('blocker_id', userId)
  if (error) throw error
  return data.map(d => d.profiles).filter(Boolean) as unknown as Profile[]
}

export async function isUserBlocked(blockerId: string, blockedId: string) {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// Review Voting Functions
export async function voteReview(commentId: string, userId: string, voteType: 'up' | 'down') {
  const { error } = await supabase
    .from('review_votes')
    .upsert({ comment_id: commentId, user_id: userId, vote_type: voteType }, { onConflict: 'comment_id,user_id' })
  if (error) throw error
}

export async function removeReviewVote(commentId: string, userId: string) {
  const { error } = await supabase
    .from('review_votes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getReviewVotes(commentId: string) {
  const { data, error } = await supabase
    .from('review_votes')
    .select('vote_type, user_id')
    .eq('comment_id', commentId)
  if (error) throw error
  return data as { vote_type: 'up' | 'down', user_id: string }[]
}

// User List Functions
export async function createUserList(userId: string, title: string, description?: string, isPublic: boolean = true) {
  const { data, error } = await supabase
    .from('user_lists')
    .insert({ user_id: userId, title, description, is_public: isPublic })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserLists(userId: string) {
  const { data, error } = await supabase
    .from('user_lists')
    .select('*, items:user_list_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPublicUserLists(userId: string) {
  const { data, error } = await supabase
    .from('user_lists')
    .select('*, items:user_list_items(count)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addItemToList(listId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { error } = await supabase
    .from('user_list_items')
    .insert({ list_id: listId, content_id: contentId, content_type: contentType })
  if (error) throw error
}

export async function removeItemFromList(listId: string, contentId: number, contentType: 'movie' | 'tv') {
  const { error } = await supabase
    .from('user_list_items')
    .delete()
    .eq('list_id', listId)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
  if (error) throw error
}

export async function getListItems(listId: string) {
  const { data, error } = await supabase
    .from('user_list_items')
    .select('*')
    .eq('list_id', listId)
  if (error) throw error
  return data
}

export async function deleteUserList(listId: string) {
  const { error } = await supabase
    .from('user_lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}
