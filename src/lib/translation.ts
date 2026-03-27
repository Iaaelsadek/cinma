import { supabase } from './supabase'
import { tmdb } from './tmdb'

export interface TranslatedContent {
  title_ar?: string
  overview_ar?: string
  title_en?: string
  overview_en?: string
}

const cleanText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const pickFirst = (...values: unknown[]): string => {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }
  return ''
}

export const resolveTitleWithFallback = (content: any): string => {
  const arabicTitle = pickFirst(content?.title_ar, content?.translated_title_ar, content?.title, content?.name)
  const englishTitle = pickFirst(content?.title_en, content?.translated_title_en)
  const originalTitle = pickFirst(content?.original_title, content?.original_name)
  return pickFirst(arabicTitle, englishTitle, originalTitle)
}

export const resolveOverviewWithFallback = (content: any): string => {
  const arabicOverview = pickFirst(content?.overview_ar, content?.translated_overview_ar, content?.overview)
  const englishOverview = pickFirst(content?.overview_en, content?.translated_overview_en)
  return pickFirst(arabicOverview, englishOverview)
}

export async function getTranslation(movie: any): Promise<TranslatedContent | null> {
  if (!movie || !movie.id) return null

  const mediaType: 'movie' | 'tv' = movie.media_type === 'tv' || movie.name ? 'tv' : 'movie'
  const tmdbId = Number(movie.id)
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null

  try {
    const { data } = await supabase
      .from('content_translations')
      .select('title_ar, overview_ar, title_en, overview_en')
      .eq('tmdb_id', tmdbId)
      .eq('media_type', mediaType)
      .maybeSingle()

    if (data && (data.title_ar || data.title_en)) {
      const originalTitle = pickFirst(movie?.original_title, movie?.original_name)
      const title_en = pickFirst(data.title_en, originalTitle)
      return {
        ...data,
        title_en,
        overview_en: resolveOverviewWithFallback(data)
      }
    }
  } catch {
  }

  const pickTitle = (payload: any) => {
    if (!payload) return ''
    return pickFirst(payload.title, payload.name, payload.original_title, payload.original_name)
  }

  const pickOverview = (payload: any) => {
    if (!payload) return ''
    return pickFirst(payload.overview)
  }

  const fromTranslations = (translationsPayload: any, langCode: 'en' | 'ar') => {
    const list = Array.isArray(translationsPayload?.translations) ? translationsPayload.translations : []
    const hit = list.find((t: any) => t?.iso_639_1 === langCode)
    if (!hit?.data) return { title: '', overview: '' }
    const title = pickTitle(hit.data)
    const overview = pickOverview(hit.data)
    return { title, overview }
  }

  const endpoint = `/${mediaType}/${tmdbId}`

  try {
    const [arRes, enRes, txRes] = await Promise.all([
      tmdb.get(endpoint, { params: { language: 'ar-SA' } }).catch(() => ({ data: null })),
      tmdb.get(endpoint, { params: { language: 'en-US' } }).catch(() => ({ data: null })),
      tmdb.get(`${endpoint}/translations`).catch(() => ({ data: null }))
    ])

    const arFromDetails = pickTitle(arRes.data)
    const enFromDetails = pickTitle(enRes.data)
    const arOverviewFromDetails = pickOverview(arRes.data)
    const enOverviewFromDetails = pickOverview(enRes.data)

    const fromTxAr = fromTranslations(txRes.data, 'ar')
    const fromTxEn = fromTranslations(txRes.data, 'en')

    const originalTitle = pickFirst(
      movie?.original_title,
      movie?.original_name,
      arRes.data?.original_title,
      arRes.data?.original_name,
      enRes.data?.original_title,
      enRes.data?.original_name
    )

    const title_ar = arFromDetails || fromTxAr.title || ''
    const title_en = enFromDetails || fromTxEn.title || originalTitle || ''
    const overview_ar = arOverviewFromDetails || fromTxAr.overview || ''
    const overview_en = enOverviewFromDetails || fromTxEn.overview || ''

    // CRITICAL FIX: To prevent infinite loops with useTranslatedContent hook,
    // we use pickFirst directly instead of calling resolveTitleWithFallback recursively
    const resolvedTitle = pickFirst(
      title_ar, 
      title_en, 
      originalTitle,
      movie?.title,
      movie?.name
    )
    if (!resolvedTitle) return null

    const resolvedOverview = pickFirst(
      overview_ar,
      overview_en,
      movie?.overview
    )

    const cachedTitleAr = title_ar || resolvedTitle
    const cachedOverviewAr = overview_ar || resolvedOverview || ''

    const result: TranslatedContent = {
      title_ar: cachedTitleAr,
      overview_ar: cachedOverviewAr,
      title_en,
      overview_en: resolvedOverview
    }

    // Mute any errors from Supabase to prevent React Query from retrying infinitely
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Check session and specifically look for admin/supervisor role
      // to completely prevent 401 Unauthorized loops for regular visitors
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
          
        if (profile && (profile.role === 'admin' || profile.role === 'supervisor')) {
          const { error: insertError } = await supabase.from('content_translations').upsert({
            tmdb_id: tmdbId,
            media_type: mediaType,
            title_ar: cachedTitleAr,
            overview_ar: cachedOverviewAr,
            title_en,
            overview_en: resolvedOverview
          }, { onConflict: 'tmdb_id,media_type' })
          
        }
      }
    } catch (e) {
      // Intentionally swallow errors related to session/db writing to prevent UI freezing
    }

    return result
  } catch (error) {
    // Return a valid empty object instead of null to break the retry cycle
    return { title_ar: '', overview_ar: '', title_en: '', overview_en: '' }
  }
}
