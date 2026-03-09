import { useMemo } from 'react'
import { useLang } from '../state/useLang'

export const useDualTitles = (movie: any) => {
  const { lang } = useLang()

  return useMemo(() => {
    const rawCandidates = [
      movie?.title_ar,
      movie?.translated_title_ar,
      movie?.title,
      movie?.name,
      movie?.title_en,
      movie?.translated_title_en,
      movie?.original_title,
      movie?.original_name
    ]
      .map((v: any) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)

    const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text)
    // Strict English check: Must contain letters and NOT contain CJK/Thai/Hindi/Cyrillic characters
    const isEnglish = (text: string) => {
      const hasEnglish = /[A-Za-z]/.test(text)
      const hasForeign = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0900-\u097F\u0E00-\u0E7F\u0400-\u04FF]/.test(text)
      return hasEnglish && !hasForeign
    }

    const arTitle = rawCandidates.find(isArabic) || ''
    const enTitle = rawCandidates.find(isEnglish) || ''

    const fallbackAr = 'بدون عنوان'
    const fallbackEn = 'Untitled'

    if (lang === 'ar') {
      const main = arTitle || enTitle || fallbackAr
      const sub = enTitle && enTitle !== main ? enTitle : null
      return { main, sub }
    }

    const main = enTitle || arTitle || fallbackEn
    const sub = arTitle && arTitle !== main ? arTitle : null
    return { main, sub }
  }, [movie?.id, movie?.title, movie?.name, movie?.original_title, movie?.original_name, movie?.title_en, movie?.title_ar, lang])
}
