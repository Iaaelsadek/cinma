import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const tmdbKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY

if (!supabaseUrl || !serviceKey || !tmdbKey) {
  console.error('Missing required environment variables for backfill')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const today = new Date().toISOString().split('T')[0]

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const fetchDiscoverIds = async (path, params, pages = 8) => {
  const ids = new Set()
  for (let page = 1; page <= pages; page += 1) {
    const query = new URLSearchParams({
      api_key: tmdbKey,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      page: String(page),
    })
    const res = await fetch(`https://api.themoviedb.org/3${path}?${query.toString()}`)
    if (!res.ok) break
    const data = await res.json()
    const rows = Array.isArray(data?.results) ? data.results : []
    rows.forEach((item) => {
      if (Number.isFinite(Number(item?.id))) ids.add(Number(item.id))
    })
    if (rows.length === 0 || page >= Number(data?.total_pages || page)) break
  }
  return Array.from(ids)
}

const updateMoviesByIds = async (ids, payload) => {
  let updated = 0
  for (const part of chunk(ids, 150)) {
    const { data, error } = await supabase
      .from('movies')
      .update(payload)
      .in('id', part)
      .select('id')
    if (error) throw error
    updated += (data || []).length
  }
  return updated
}

const updateSeriesByIds = async (ids, payload) => {
  let updated = 0
  for (const part of chunk(ids, 150)) {
    const { data, error } = await supabase
      .from('tv_series')
      .update(payload)
      .in('id', part)
      .select('id')
    if (error) throw error
    updated += (data || []).length
  }
  return updated
}

const run = async () => {
  const [arabicTvIds, ramadanTvIds, kidsMovieIds, bollywoodMovieIds] = await Promise.all([
    fetchDiscoverIds('/discover/tv', {
      with_original_language: 'ar',
      sort_by: 'popularity.desc',
      'vote_count.gte': 5,
      'first_air_date.lte': today,
    }, 10),
    fetchDiscoverIds('/discover/tv', {
      with_original_language: 'ar',
      with_origin_country: 'EG|SA|SY|AE|KW',
      sort_by: 'first_air_date.desc',
      'vote_count.gte': 5,
      'first_air_date.lte': today,
    }, 10),
    fetchDiscoverIds('/discover/movie', {
      with_genres: '16,10751',
      sort_by: 'popularity.desc',
      'vote_count.gte': 5,
      'release_date.lte': today,
    }, 12),
    fetchDiscoverIds('/discover/movie', {
      with_original_language: 'hi',
      region: 'IN',
      sort_by: 'popularity.desc',
      'vote_count.gte': 5,
      'release_date.lte': today,
    }, 12),
  ])

  const [arabicSeriesUpdated, ramadanSeriesUpdated, kidsMoviesUpdated, bollywoodMoviesUpdated] = await Promise.all([
    updateSeriesByIds(arabicTvIds, { original_language: 'ar' }),
    updateSeriesByIds(ramadanTvIds, { original_language: 'ar', is_ramadan: true }),
    updateMoviesByIds(kidsMovieIds, { category: 'kids-family' }),
    updateMoviesByIds(bollywoodMovieIds, { original_language: 'hi', category: 'bollywood', origin_country: ['IN'] }),
  ])

  const summary = {
    discovered: {
      arabicTvIds: arabicTvIds.length,
      ramadanTvIds: ramadanTvIds.length,
      kidsMovieIds: kidsMovieIds.length,
      bollywoodMovieIds: bollywoodMovieIds.length,
    },
    updated: {
      arabicSeriesUpdated,
      ramadanSeriesUpdated,
      kidsMoviesUpdated,
      bollywoodMoviesUpdated,
    },
  }

  console.log(JSON.stringify(summary, null, 2))
}

run().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
