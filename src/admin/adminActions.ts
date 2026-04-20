import { upsertContentDB } from '../lib/db'
import { getRatingColorFromCert } from '../lib/tmdb'
import { extractUsCertification, extractUsTvRating, filterValidSlugs } from '../lib/dataHelpers'
import axios from 'axios'
import { errorLogger } from '../services/errorLogging'

export async function fetchAndUpsertTrending() {
  try {
    // Fetch trending from CockroachDB API
    const [moviesRes, tvRes] = await Promise.all([
      axios.get('/api/trending', { params: { type: 'movie', limit: 20 } }),
      axios.get('/api/trending', { params: { type: 'tv', limit: 20 } })
    ])
    
    const movieResults = filterValidSlugs(moviesRes.data.data || [])
    const tvResults = filterValidSlugs(tvRes.data.data || [])

    const movieRows = await Promise.all(
      movieResults.slice(0, 20).map(async (m: any) => {
        // Extract certification from movie data (already in CockroachDB)
        const cert = extractUsCertification(m)
        return {
          id: m.id,
          title: m.title || '',
          arabic_title: m.title || '',
          overview: m.overview || '',
          ai_summary: null,
          rating_color: getRatingColorFromCert(cert),
          genres: null,
          release_date: m.release_date || null,
          poster_path: m.poster_path || null,
          backdrop_path: m.backdrop_path || null,
          embed_urls: null,
          download_urls: null
        }
      })
    )

    const tvRows = await Promise.all(
      tvResults.slice(0, 20).map(async (t: any) => {
        // Extract rating from series data (already in CockroachDB)
        const cert = extractUsTvRating(t)
        return {
          id: t.id,
          name: t.name || '',
          arabic_name: t.name || '',
          overview: t.overview || '',
          ai_summary: null,
          rating_color: getRatingColorFromCert(cert),
          genres: null,
          first_air_date: t.first_air_date || null,
          poster_path: t.poster_path || null,
          backdrop_path: t.backdrop_path || null,
          embed_urls: null,
          download_urls: null
        }
      })
    )

    if (movieRows.length > 0) {
      await upsertContentDB('movies', movieRows)
    }
    if (tvRows.length > 0) {
      await upsertContentDB('tv_series', tvRows)
    }
    
    return { movies: movieRows.length, tv: tvRows.length }
  } catch (error: any) {
    errorLogger.logError({
      message: 'Failed to fetch and upsert trending content',
      severity: 'high',
      category: 'network',
      context: { error }
    })
    return { movies: 0, tv: 0 }
  }
}
