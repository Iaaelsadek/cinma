import { useMemo } from 'react'
import { useLang } from '../state/useLang'
import { resolveTitleWithFallback } from '../lib/translation'

export const useDualTitles = (movie: any) => {
  const { lang } = useLang()

  return useMemo(() => {
    const cleanText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
    const pickFirst = (...values: unknown[]) => values.map(cleanText).find(Boolean) || ''

    const arTitle = pickFirst(movie?.title_ar, movie?.translated_title_ar)
    const enTitle = pickFirst(movie?.title_en, movie?.translated_title_en)
    const originalTitle = pickFirst(movie?.original_title, movie?.original_name)
    const fallbackTitle = resolveTitleWithFallback(movie)

    const fallbackAr = 'بدون عنوان'
    const fallbackEn = 'Untitled'

    if (lang === 'ar') {
      const main = arTitle || enTitle || originalTitle || fallbackTitle || fallbackAr
      const sub = (enTitle || originalTitle) && (enTitle || originalTitle) !== main ? (enTitle || originalTitle) : null
      return { main, sub }
    }

    const main = enTitle || originalTitle || arTitle || fallbackTitle || fallbackEn
    const sub = arTitle && arTitle !== main ? arTitle : null
    return { main, sub }
  }, [movie?.id, movie?.title, movie?.name, movie?.original_title, movie?.original_name, movie?.title_en, movie?.title_ar, movie?.translated_title_ar, movie?.translated_title_en, lang])
}
