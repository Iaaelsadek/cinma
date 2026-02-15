import axios from 'axios'
import { CONFIG } from './constants'

export const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: CONFIG.TMDB_API_KEY, language: 'ar-SA' }
})

export function setTmdbLanguage(lang: 'ar-SA' | 'en-US') {
  tmdb.defaults.params = { ...(tmdb.defaults.params || {}), language: lang }
}
export function getTmdbLanguage(): 'ar-SA' | 'en-US' {
  const lang = tmdb.defaults.params?.language
  return lang === 'en-US' ? 'en-US' : 'ar-SA'
}
// initialize from storage if present
try {
  const raw = localStorage.getItem('cinma_lang')
  if (raw === 'en') setTmdbLanguage('en-US')
} catch {}

export function getRatingColorFromCert(cert: string): 'green' | 'yellow' | 'red' {
  const c = (cert || '').toUpperCase()
  if (['G', 'PG'].includes(c)) return 'green'
  if (['PG-13', 'TV-14'].includes(c)) return 'yellow'
  return 'red'
}

export async function fetchTrending(type: 'movie' | 'tv') {
  const { data } = await tmdb.get(`/trending/${type}/week`)
  return data
}

export async function getUsMovieCertification(tmdbId: number) {
  const { data } = await tmdb.get(`/movie/${tmdbId}/release_dates`)
  const arr = (data?.results || []) as Array<{ iso_3166_1: string; release_dates: Array<{ certification?: string }> }>
  const us = arr.find(r => r.iso_3166_1 === 'US')
  const cert = us?.release_dates?.[0]?.certification || ''
  return cert.toUpperCase()
}

export async function getUsTvRating(tmdbId: number) {
  const { data } = await tmdb.get(`/tv/${tmdbId}/content_ratings`)
  const arr = (data?.results || []) as Array<{ iso_3166_1: string; rating?: string }>
  const us = arr.find(r => r.iso_3166_1 === 'US')
  return (us?.rating || '').toUpperCase()
}

export async function fetchGenres(type: 'movie' | 'tv') {
  const { data } = await tmdb.get(`/genre/${type}/list`)
  return (data?.genres || []) as Array<{ id: number; name: string }>
}

export type AdvancedSearchParams = {
  query?: string
  types?: Array<'movie' | 'tv'>
  genres?: number[]
  yearFrom?: number
  yearTo?: number
  ratingFrom?: number
  ratingTo?: number
  rating_color?: Array<'green' | 'yellow' | 'red'>
  page?: number
}

type TmdbSearchItem = {
  id: number
  genre_ids?: number[]
  release_date?: string
  first_air_date?: string
  vote_average?: number
  popularity?: number
  media_type?: 'movie' | 'tv'
}

type TmdbListResponse = {
  page: number
  results: TmdbSearchItem[]
  total_pages: number
}

function colorToCertification(colors?: Array<'green' | 'yellow' | 'red'>) {
  if (!colors || colors.length === 0) return undefined
  if (colors.includes('red')) return 'NC-17'
  if (colors.includes('yellow')) return 'PG-13'
  return 'PG'
}

export async function advancedSearch(params: AdvancedSearchParams) {
  const {
    query = '',
    types = ['movie'],
    genres = [],
    yearFrom,
    yearTo,
    ratingFrom,
    ratingTo,
    rating_color,
    page = 1
  } = params
  const doMovie = types.includes('movie')
  const doTv = types.includes('tv')
  const cert = colorToCertification(rating_color)
  const promises: Array<Promise<TmdbListResponse>> = []
  const hasQuery = query.trim().length > 0
  if (doMovie) {
    if (hasQuery) {
      const p = tmdb.get('/search/movie', { params: { query, include_adult: false, page } })
        .then(r => {
          let res = (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'movie' as const }))
          // client-side filter when using search endpoint
          if (genres.length) res = res.filter((x: TmdbSearchItem) => (x.genre_ids || []).some((id: number) => genres.includes(id)))
          if (yearFrom) res = res.filter((x: TmdbSearchItem) => (x.release_date || '0').slice(0, 4) >= String(yearFrom))
          if (yearTo) res = res.filter((x: TmdbSearchItem) => (x.release_date || '0').slice(0, 4) <= String(yearTo))
          if (ratingFrom != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) >= ratingFrom)
          if (ratingTo != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) <= ratingTo)
          return { ...r.data, results: res } as TmdbListResponse
        })
      promises.push(p)
    } else {
      const mp: Record<string, string | number | boolean | undefined> = {
        with_genres: genres.join(',') || undefined,
        'primary_release_date.gte': yearFrom ? `${yearFrom}-01-01` : undefined,
        'primary_release_date.lte': yearTo ? `${yearTo}-12-31` : undefined,
        'vote_average.gte': ratingFrom,
        'vote_average.lte': ratingTo,
        include_adult: false,
        page
      }
      if (cert) {
        mp.certification_country = 'US'
        mp['certification.lte'] = cert
      }
      const p = tmdb.get('/discover/movie', { params: mp }).then(r => ({ ...r.data, results: (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'movie' as const })) }) as TmdbListResponse)
      promises.push(p)
    }
  }
  if (doTv) {
    if (hasQuery) {
      const p = tmdb.get('/search/tv', { params: { query, include_adult: false, page } })
        .then(r => {
          let res = (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'tv' as const }))
          if (genres.length) res = res.filter((x: TmdbSearchItem) => (x.genre_ids || []).some((id: number) => genres.includes(id)))
          if (yearFrom) res = res.filter((x: TmdbSearchItem) => (x.first_air_date || '0').slice(0, 4) >= String(yearFrom))
          if (yearTo) res = res.filter((x: TmdbSearchItem) => (x.first_air_date || '0').slice(0, 4) <= String(yearTo))
          if (ratingFrom != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) >= ratingFrom)
          if (ratingTo != null) res = res.filter((x: TmdbSearchItem) => (x.vote_average || 0) <= ratingTo)
          return { ...r.data, results: res } as TmdbListResponse
        })
      promises.push(p)
    } else {
      const tp: Record<string, string | number | boolean | undefined> = {
        with_genres: genres.join(',') || undefined,
        'first_air_date.gte': yearFrom ? `${yearFrom}-01-01` : undefined,
        'first_air_date.lte': yearTo ? `${yearTo}-12-31` : undefined,
        'vote_average.gte': ratingFrom,
        'vote_average.lte': ratingTo,
        include_adult: false,
        page
      }
      const p = tmdb.get('/discover/tv', { params: tp }).then(r => ({ ...r.data, results: (r.data.results || []).map((x: TmdbSearchItem) => ({ ...x, media_type: 'tv' as const })) }) as TmdbListResponse)
      promises.push(p)
    }
  }
  const res = await Promise.all(promises)
  if (res.length === 1) return res[0]
  // merge movie+tv, sorting by popularity desc
  const all = [...(res[0]?.results || []), ...(res[1]?.results || [])]
  all.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return { page, results: all, total_pages: Math.max(res[0]?.total_pages || 1, res[1]?.total_pages || 1) }
}
