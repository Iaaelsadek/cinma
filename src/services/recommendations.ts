import { getHistory, getContinueWatching, supabase } from '../lib/supabase'
import { tmdb } from '../lib/tmdb'
import { callGeminiWithFallback } from '../lib/gemini'
import { logger } from '../lib/logger'

export type RecommendationItem = {
  id: number
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  popularity?: number
  vote_average?: number
  release_date?: string
  first_air_date?: string
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const obj = JSON.parse(raw) as { exp?: number; val?: T }
    if (obj.exp && Date.now() > obj.exp) return null
    return obj.val ?? null
  } catch { return null }
}
function cacheSet<T>(key: string, val: T, ttlMs = 6 * 60 * 60 * 1000) {
  try {
    localStorage.setItem(key, JSON.stringify({ val, exp: Date.now() + ttlMs }))
  } catch {}
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const out = new Array<R>(items.length)
  let index = 0
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (index < items.length) {
      const currentIndex = index++
      out[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(workers)
  return out
}

/** Fallback: Use TMDB similar/discover when Gemini API is unavailable */
async function tmdbFallback(userId: string): Promise<RecommendationItem[]> {
  const seen = new Set<string>()
  const results: RecommendationItem[] = []

  // 1. From Continue Watching - fetch similar content
  const cw = await getContinueWatching(userId)
  const cwSimilar = await mapWithConcurrency(cw.slice(0, 3), 3, async (r) => {
    try {
      const path = r.content_type === 'movie' ? `/movie/${r.content_id}/similar` : `/tv/${r.content_id}/similar`
      const { data } = await tmdb.get(path, { params: { page: 1 } })
      return ((data.results || []) as RecommendationItem[]).map((m) => ({ ...m, media_type: r.content_type }))
    } catch {
      return []
    }
  })
  for (const arr of cwSimilar) {
    for (const m of arr) {
      const key = `${m.media_type}-${m.id}`
      if (!seen.has(key) && m.poster_path) {
        seen.add(key)
        results.push(m)
      }
    }
  }

  // 2. From History - fetch similar
  const hist = await getHistory(userId)
  const histSimilar = await mapWithConcurrency(hist.slice(0, 3), 3, async (h) => {
    try {
      const path = h.content_type === 'movie' ? `/movie/${h.content_id}/similar` : `/tv/${h.content_id}/similar`
      const { data } = await tmdb.get(path, { params: { page: 1 } })
      return ((data.results || []) as RecommendationItem[]).map((m) => ({ ...m, media_type: h.content_type }))
    } catch {
      return []
    }
  })
  for (const arr of histSimilar) {
    for (const m of arr) {
      const key = `${m.media_type}-${m.id}`
      if (!seen.has(key) && m.poster_path) {
        seen.add(key)
        results.push(m)
      }
    }
  }

  // 3. Summarize genres from history
  const counts: Record<string, number> = {}
  const histDetails = await mapWithConcurrency(hist.slice(0, 8), 4, async (h) => {
    try {
      const path = h.content_type === 'movie' ? `/movie/${h.content_id}` : `/tv/${h.content_id}`
      const { data } = await tmdb.get(path)
      return data.genres || []
    } catch {
      return []
    }
  })
  for (const genres of histDetails) {
    for (const g of genres) {
      counts[g.name] = (counts[g.name] || 0) + 1
    }
  }
  const topGenres = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)

  // 4. Discover by top genres
  if (topGenres.length > 0) {
    try {
      const genreIds: number[] = []
      const { data: movieGenres } = await tmdb.get('/genre/movie/list')
      const { data: tvGenres } = await tmdb.get('/genre/tv/list')
      const allGenres = [...(movieGenres.genres || []), ...(tvGenres.genres || [])]
      for (const g of topGenres) {
        const found = allGenres.find((x: { name: string; id: number }) => x.name.toLowerCase() === g.toLowerCase())
        if (found) genreIds.push(found.id)
      }
      if (genreIds.length > 0) {
        const [{ data: movieData }, { data: tvData }] = await Promise.all([
          tmdb.get('/discover/movie', { params: { with_genres: genreIds.slice(0, 2).join(','), sort_by: 'popularity.desc', page: 1 } }),
          tmdb.get('/discover/tv', { params: { with_genres: genreIds.slice(0, 2).join(','), sort_by: 'popularity.desc', page: 1 } })
        ])
        const combined = [
          ...(movieData.results || []).map((m: RecommendationItem) => ({ ...m, media_type: 'movie' as const })),
          ...(tvData.results || []).map((t: RecommendationItem) => ({ ...t, media_type: 'tv' as const }))
        ]
        for (const m of combined) {
          const key = `${m.media_type}-${m.id}`
          if (!seen.has(key) && m.poster_path) {
            seen.add(key)
            results.push(m)
          }
        }
      }
    } catch {}
  }

  // 5. Fallback: trending if nothing
  if (results.length < 5) {
    try {
      const { data } = await tmdb.get('/trending/all/week', { params: { page: 1 } })
      for (const m of (data.results || [])) {
        const key = `${m.media_type || 'movie'}-${m.id}`
        if (!seen.has(key) && m.poster_path) {
          seen.add(key)
          results.push({ ...m, media_type: m.media_type || 'movie' })
        }
      }
    } catch {}
  }

  return results.slice(0, 15)
}

async function summarizeGenres(userId: string): Promise<string[]> {
  const last = await getHistory(userId)
  const items = last.slice(0, 10)
  const counts: Record<string, number> = {}
  const details = await mapWithConcurrency(items, 4, async (it) => {
    try {
      const path = it.content_type === 'movie' ? `/movie/${it.content_id}` : `/tv/${it.content_id}`
      const { data } = await tmdb.get(path)
      return data.genres || []
    } catch {
      return []
    }
  })
  for (const genres of details) {
    for (const g of genres) {
      counts[g.name] = (counts[g.name] || 0) + 1
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
}

async function generateTitles(genres: string[], userId: string): Promise<string[]> {
  try {
    // Get last 5 history items to give Gemini more context
    const lastItems = await getHistory(userId)
    const context = await mapWithConcurrency(lastItems.slice(0, 5), 3, async (h) => {
      try {
        const path = h.content_type === 'movie' ? `/movie/${h.content_id}` : `/tv/${h.content_id}`
        const { data } = await tmdb.get(path)
        return `${h.content_type === 'movie' ? 'Movie' : 'TV'}: ${data.title || data.name}`
      } catch {
        return null
      }
    })
    const validContext = context.filter(Boolean).join(', ')

    const prompt = `
      You are a cinematic recommendation expert for a user with these favorite genres: ${genres.join(', ')}.
      Recent history: ${validContext || "No recent history available"}.
      
      Task: Provide a list of 8 unique movie or TV show titles that this user would love.
      Requirements:
      1. Mix well-known hits with hidden gems.
      2. Ensure they fit the genres and history provided.
      3. Return ONLY the titles, one per line. No numbers, no extra text.
      `;
      
    const text = await callGeminiWithFallback(prompt, "recommendations");
    
    if (!text) throw new Error('gemini_error');
    
    const lines = text.split('\n')
      .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    return lines.slice(0, 8);
  } catch (err) {
    logger.warn('[Recommendations] Gemini failed, falling back to TMDB genres', err)
    return [];
  }
}

async function searchTitles(titles: string[]): Promise<RecommendationItem[]> {
  const rows = await mapWithConcurrency(titles, 4, async (t) => {
    try {
      const [m, tv] = await Promise.all([
        tmdb.get('/search/movie', { params: { query: t, include_adult: false } }).then(r => r.data.results || []),
        tmdb.get('/search/tv', { params: { query: t, include_adult: false } }).then(r => r.data.results || [])
      ])
      const top = [...m, ...tv].sort((a: { popularity?: number }, b: { popularity?: number }) => (b.popularity || 0) - (a.popularity || 0))[0]
      if (!top) return null
      return { ...top, media_type: top.title ? 'movie' : 'tv' } as RecommendationItem
    } catch {
      return null
    }
  })
  return rows.filter(Boolean) as RecommendationItem[]
}

export async function getRecommendations(userId: string): Promise<RecommendationItem[]> {
  const key = `recs:${userId}`
  const cached = cacheGet<RecommendationItem[]>(key)
  if (cached?.length) return cached

  const genres = await summarizeGenres(userId)
  if (genres.length > 0) {
    const titles = await generateTitles(genres, userId)
    if (titles.length > 0) {
      const items = await searchTitles(titles)
      if (items.length > 0) {
        cacheSet(key, items)
        return items
      }
    }
  }
  
  // Fallback if AI fails or no history
  const fallback = await tmdbFallback(userId)
  if (fallback.length > 0) {
    cacheSet(key, fallback)
    return fallback
  }

  // Ultimate fallback: trending
  try {
    const { data } = await tmdb.get('/trending/all/week', { params: { page: 1 } })
    const items = (data.results || []).slice(0, 10).map((m: RecommendationItem) => ({
      ...m,
      media_type: (m.media_type || (m.title ? 'movie' : 'tv')) as 'movie' | 'tv'
    }))
    cacheSet(key, items)
    return items
  } catch {
    return []
  }
}
