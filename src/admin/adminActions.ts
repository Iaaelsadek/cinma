import { supabase } from '../lib/supabase'
import { fetchTrending, getUsMovieCertification, getUsTvRating, getRatingColorFromCert } from '../lib/tmdb'

export async function fetchAndUpsertTrending() {
  const [movies, tv] = await Promise.all([fetchTrending('movie'), fetchTrending('tv')])
  const movieResults = movies?.results || []
  const tvResults = tv?.results || []

  const movieRows = await Promise.all(
    movieResults.slice(0, 20).map(async (m: any) => {
      const cert = await getUsMovieCertification(m.id)
      return {
        id: String(m.id),
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
      const cert = await getUsTvRating(t.id)
      return {
        id: Number(t.id),
        title: t.name || '',
        arabic_title: t.name || '',
        overview: t.overview || '',
        ai_summary: null,
        rating_color: getRatingColorFromCert(cert),
        genres: null,
        release_date: t.first_air_date || null,
        poster_path: t.poster_path || null,
        backdrop_path: t.backdrop_path || null,
        embed_urls: null,
        download_urls: null
      }
    })
  )

  const { error: mErr } = await supabase.from('movies').upsert(movieRows, { onConflict: 'id' })
  if (mErr) throw mErr
  const { error: tErr } = await supabase.from('tv_series').upsert(tvRows, { onConflict: 'id' })
  if (tErr) throw tErr
  return { movies: movieRows.length, tv: tvRows.length }
}
