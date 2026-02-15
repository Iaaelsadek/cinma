import { getHistory } from '../lib/supabase'
import { tmdb } from '../lib/tmdb'

export type RecommendationItem = {
  id: number
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  popularity?: number
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

async function summarizeGenres(userId: string) {
  const last = await getHistory(userId)
  const items = last.slice(0, 10)
  const counts: Record<string, number> = {}
  for (const it of items) {
    try {
      if (it.content_type === 'movie') {
        const { data } = await tmdb.get(`/movie/${it.content_id}`)
        for (const g of data.genres || []) counts[g.name] = (counts[g.name] || 0) + 1
      } else {
        const { data } = await tmdb.get(`/tv/${it.content_id}`)
        for (const g of data.genres || []) counts[g.name] = (counts[g.name] || 0) + 1
      }
    } catch {}
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
  return top
}

async function generateTitles(genres: string[]) {
  const res = await fetch('/api/gemini-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genres })
  })
  if (!res.ok) throw new Error('gemini_error')
  const data = await res.json()
  const text = data?.titles || ''
  const lines = text.split('\n').map((l: string) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  return lines.slice(0, 5)
}

async function searchTitles(titles: string[]) {
  const results: RecommendationItem[] = []
  for (const t of titles) {
    try {
      const [m, tv] = await Promise.all([
        tmdb.get('/search/movie', { params: { query: t, include_adult: false } }).then(r => r.data.results || []),
        tmdb.get('/search/tv', { params: { query: t, include_adult: false } }).then(r => r.data.results || [])
      ])
      const top = [...m, ...tv].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
      if (top) {
        results.push({ ...top, media_type: top.title ? 'movie' : 'tv' })
      }
    } catch {}
  }
  return results
}

export async function getRecommendations(userId: string): Promise<RecommendationItem[]> {
  const key = `recs:${userId}`
  const cached = cacheGet<RecommendationItem[]>(key)
  if (cached) return cached
  const genres = await summarizeGenres(userId)
  if (!genres.length) return []
  const titles = await generateTitles(genres)
  const items = await searchTitles(titles)
  cacheSet(key, items)
  return items
}
