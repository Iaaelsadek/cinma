export const GENRES: Record<number, { ar: string; en: string }> = {
  // Movie Genres
  28: { ar: 'أكشن', en: 'Action' },
  12: { ar: 'مغامرة', en: 'Adventure' },
  16: { ar: 'رسوم متحركة', en: 'Animation' },
  35: { ar: 'كوميديا', en: 'Comedy' },
  80: { ar: 'جريمة', en: 'Crime' },
  99: { ar: 'وثائقي', en: 'Documentary' },
  18: { ar: 'دراما', en: 'Drama' },
  10751: { ar: 'عائلي', en: 'Family' },
  14: { ar: 'خيال', en: 'Fantasy' },
  36: { ar: 'تاريخ', en: 'History' },
  27: { ar: 'رعب', en: 'Horror' },
  10402: { ar: 'موسيقى', en: 'Music' },
  9648: { ar: 'غموض', en: 'Mystery' },
  10749: { ar: 'رومانسية', en: 'Romance' },
  878: { ar: 'خيال علمي', en: 'Science Fiction' },
  10770: { ar: 'فيلم تلفزيوني', en: 'TV Movie' },
  53: { ar: 'إثارة', en: 'Thriller' },
  10752: { ar: 'حرب', en: 'War' },
  37: { ar: 'غرب أمريكي', en: 'Western' },

  // TV Genres (Some overlap with movies, mapped by ID)
  10759: { ar: 'أكشن ومغامرة', en: 'Action & Adventure' },
  10762: { ar: 'أطفال', en: 'Kids' },
  10763: { ar: 'أخبار', en: 'News' },
  10764: { ar: 'واقع', en: 'Reality' },
  10765: { ar: 'خيال علمي وفانتازيا', en: 'Sci-Fi & Fantasy' },
  10766: { ar: 'أوبرا صابونية', en: 'Soap' },
  10767: { ar: 'برامج حوارية', en: 'Talk' },
  10768: { ar: 'حرب وسياسة', en: 'War & Politics' },
}

export function getGenreName(id: number | undefined, lang: 'ar' | 'en' = 'ar'): string | null {
  if (!id) return null
  return GENRES[id]?.[lang] || null
}
