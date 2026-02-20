import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './constants'
import { errorLogger } from '../services/errorLogging'

// Fallback to prevent crash if env vars are missing
const sbUrl = CONFIG.SUPABASE_URL || 'https://placeholder.supabase.co'
const sbKey = CONFIG.SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(sbUrl, sbKey)

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetchWithTimeout(resource: string, options: FetchOptions = {}) {
  const { timeout = 5000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, role')
    .eq('id', userId)
    .maybeSingle()
  
  if (data && !error) {
    return data as { id: string; username: string; avatar_url: string | null; role: 'user' | 'admin' | 'supervisor' } | null
  }

  // If error (RLS/Network) OR no data (RLS silent failure), try proxy
  if (error || !data) {
    try {
      // Use relative path by default to leverage Vite proxy in dev, or API_BASE if set
      const apiBase = CONFIG.API_BASE || ''
      const url = apiBase ? `${apiBase}/api/profile/${userId}` : `/api/profile/${userId}`
      const res = await fetchWithTimeout(url, { timeout: 3000 })
      if (res.ok) {
        const proxyData = await res.json()
        if (proxyData) {
          return proxyData as { id: string; username: string; avatar_url: string | null; role: 'user' | 'admin' | 'supervisor' } | null
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
    .insert({ id: userId, username, role: 'user' })
    .select('id, username, avatar_url, role')
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

export async function updateUsername(userId: string, username: string) {
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId)
  if (error) {
    errorLogger.logError({
      message: 'Direct username update failed, trying proxy',
      severity: 'low',
      category: 'database',
      context: { error, userId }
    })
    const apiBase = CONFIG.API_BASE || 'http://localhost:3001'
    const res = await fetch(`${apiBase}/api/profile/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    if (!res.ok) throw error
  }
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
  content_id: number
  content_type: 'movie' | 'tv'
  text: string
  created_at: string
}

export async function getComments(contentId: number, contentType: 'movie' | 'tv') {
  const { data, error } = await supabase
    .from('comments')
    .select('id,user_id,content_id,content_type,text,created_at')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CommentRow[]
}

export async function addComment(userId: string, contentId: number, contentType: 'movie' | 'tv', text: string) {
  const { error } = await supabase.from('comments').insert({
    user_id: userId,
    content_id: contentId,
    content_type: contentType,
    text
  })
  if (error) throw error
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
