import type { ContentType, FilterType, ContentFetchParams, GenreOption } from '../types/unified-section'

/**
 * تحويل activeFilter إلى معاملات API
 * Map filter to API parameters
 */
export function mapFilterToAPIParams(
  activeFilter: FilterType,
  contentType: ContentType
): Partial<ContentFetchParams> {
  const baseParams: Partial<ContentFetchParams> = {}

  switch (activeFilter) {
    case 'trending':
      baseParams.sortBy = 'popularity'
      break

    case 'top-rated':
      baseParams.sortBy = 'vote_average'
      baseParams.rating = 8 // فقط العناصر ذات التقييم 8+
      break

    case 'latest':
      baseParams.sortBy = 'release_date'
      break

    case 'upcoming':
      baseParams.sortBy = 'release_date'
      // فلترة حسب تاريخ الإصدار المستقبلي
      const currentYear = new Date().getFullYear()
      baseParams.year = currentYear + 1
      break

    case 'classics':
      // الأفلام الكلاسيكية: أفلام قديمة (قبل 2000) بتقييم عالي
      baseParams.sortBy = 'vote_average'
      baseParams.rating = 7.5
      // سنة الإصدار قبل 2000
      baseParams.year = 1999
      break

    case 'summaries':
      // ملخصات: محتوى من فئة معينة
      // هنا نستخدم category parameter بدل genre
      baseParams.sortBy = 'popularity'
      break

    case 'ramadan':
      // مسلسلات رمضان
      baseParams.sortBy = 'popularity'
      break

    case 'animation_movies':
      // أفلام أنيمي
      baseParams.sortBy = 'popularity'
      break

    case 'cartoon_series':
      // مسلسلات كرتون
      baseParams.sortBy = 'popularity'
      break

    case 'all':
    default:
      baseParams.sortBy = 'popularity'
      break
  }

  return baseParams
}

/**
 * الحصول على قائمة التصنيفات حسب نوع المحتوى
 * Get genres for content type
 */
export function getGenresForContentType(
  contentType: ContentType,
  lang: 'ar' | 'en'
): GenreOption[] {
  // التصنيفات مخزنة في CockroachDB بالعربية
  const movieGenres: GenreOption[] = [
    { value: 'حركة', label: lang === 'ar' ? 'حركة' : 'Action' },
    { value: 'مغامرة', label: lang === 'ar' ? 'مغامرة' : 'Adventure' },
    { value: 'رسوم-متحركة', label: lang === 'ar' ? 'رسوم متحركة' : 'Animation' },
    { value: 'كوميديا', label: lang === 'ar' ? 'كوميديا' : 'Comedy' },
    { value: 'جريمة', label: lang === 'ar' ? 'جريمة' : 'Crime' },
    { value: 'وثائقي', label: lang === 'ar' ? 'وثائقي' : 'Documentary' },
    { value: 'دراما', label: lang === 'ar' ? 'دراما' : 'Drama' },
    { value: 'عائلي', label: lang === 'ar' ? 'عائلي' : 'Family' },
    { value: 'فانتازيا', label: lang === 'ar' ? 'فانتازيا' : 'Fantasy' },
    { value: 'تاريخي', label: lang === 'ar' ? 'تاريخي' : 'History' },
    { value: 'رعب', label: lang === 'ar' ? 'رعب' : 'Horror' },
    { value: 'موسيقي', label: lang === 'ar' ? 'موسيقي' : 'Music' },
    { value: 'غموض', label: lang === 'ar' ? 'غموض' : 'Mystery' },
    { value: 'رومانسي', label: lang === 'ar' ? 'رومانسي' : 'Romance' },
    { value: 'خيال-علمي', label: lang === 'ar' ? 'خيال علمي' : 'Sci-Fi' },
    { value: 'إثارة', label: lang === 'ar' ? 'إثارة' : 'Thriller' },
    { value: 'حرب', label: lang === 'ar' ? 'حرب' : 'War' },
    { value: 'غربي', label: lang === 'ar' ? 'غربي' : 'Western' }
  ]

  // نفس التصنيفات للمسلسلات والأنمي
  if (contentType === 'movies' || contentType === 'series' || contentType === 'anime') {
    return movieGenres
  }

  // تصنيفات الألعاب
  if (contentType === 'gaming') {
    return [
      { value: 'action', label: lang === 'ar' ? 'أكشن' : 'Action' },
      { value: 'adventure', label: lang === 'ar' ? 'مغامرة' : 'Adventure' },
      { value: 'rpg', label: lang === 'ar' ? 'آر بي جي' : 'RPG' },
      { value: 'strategy', label: lang === 'ar' ? 'استراتيجية' : 'Strategy' },
      { value: 'sports', label: lang === 'ar' ? 'رياضة' : 'Sports' },
      { value: 'racing', label: lang === 'ar' ? 'سباق' : 'Racing' },
      { value: 'simulation', label: lang === 'ar' ? 'محاكاة' : 'Simulation' }
    ]
  }

  // تصنيفات البرامج
  if (contentType === 'software') {
    return [
      { value: 'productivity', label: lang === 'ar' ? 'إنتاجية' : 'Productivity' },
      { value: 'design', label: lang === 'ar' ? 'تصميم' : 'Design' },
      { value: 'development', label: lang === 'ar' ? 'تطوير' : 'Development' },
      { value: 'multimedia', label: lang === 'ar' ? 'وسائط متعددة' : 'Multimedia' },
      { value: 'security', label: lang === 'ar' ? 'أمان' : 'Security' },
      { value: 'utilities', label: lang === 'ar' ? 'أدوات' : 'Utilities' }
    ]
  }

  return []
}

/**
 * الحصول على endpoint حسب نوع المحتوى
 * Get endpoint for content type
 */
export function getEndpointForContentType(contentType: ContentType): string {
  switch (contentType) {
    case 'movies':
      return '/api/movies'
    case 'series':
    case 'anime':
      return '/api/tv'
    case 'gaming':
      return '/api/software' // gaming section removed, fallback to software
    case 'software':
      return '/api/software'
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

/**
 * الحصول على عنوان الصفحة
 * Get page title
 */
export function getPageTitle(
  contentType: ContentType,
  activeFilter: FilterType,
  lang: 'ar' | 'en'
): string {
  const contentTitles = {
    movies: { ar: 'الأفلام', en: 'Movies' },
    series: { ar: 'المسلسلات', en: 'Series' },
    anime: { ar: 'الأنمي', en: 'Anime' },
    gaming: { ar: 'الألعاب', en: 'Gaming' },
    software: { ar: 'البرامج', en: 'Software' }
  }

  const filterTitles: Record<string, { ar: string; en: string }> = {
    all: { ar: 'الكل', en: 'All' },
    trending: { ar: 'الرائج', en: 'Trending' },
    'top-rated': { ar: 'الأعلى تقييماً', en: 'Top Rated' },
    latest: { ar: 'الأحدث', en: 'Latest' },
    upcoming: { ar: 'قريباً', en: 'Upcoming' },
    classics: { ar: 'كلاسيكيات', en: 'Classics' },
    summaries: { ar: 'ملخصات', en: 'Summaries' },
    ramadan: { ar: 'رمضان', en: 'Ramadan' },
    arabic: { ar: 'عربي', en: 'Arabic' },
    korean: { ar: 'كوري', en: 'Korean' },
    turkish: { ar: 'تركي', en: 'Turkish' },
    chinese: { ar: 'صيني', en: 'Chinese' },
    foreign: { ar: 'أجنبي', en: 'Foreign' },
    pc: { ar: 'PC', en: 'PC' },
    playstation: { ar: 'بلايستيشن', en: 'PlayStation' },
    xbox: { ar: 'إكس بوكس', en: 'Xbox' },
    nintendo: { ar: 'نينتندو', en: 'Nintendo' },
    mobile: { ar: 'موبايل', en: 'Mobile' },
    windows: { ar: 'ويندوز', en: 'Windows' },
    mac: { ar: 'ماك', en: 'Mac' },
    linux: { ar: 'لينكس', en: 'Linux' },
    android: { ar: 'أندرويد', en: 'Android' },
    ios: { ar: 'iOS', en: 'iOS' }
  }

  const contentTitle = contentTitles[contentType][lang]
  const filterTitle = activeFilter !== 'all' && filterTitles[activeFilter] ? ` - ${filterTitles[activeFilter][lang]}` : ''

  return `${contentTitle}${filterTitle}`
}

/**
 * الحصول على وصف الصفحة
 * Get page description
 */
export function getPageDescription(
  contentType: ContentType,
  activeFilter: FilterType,
  lang: 'ar' | 'en'
): string {
  const descriptions: Record<string, { ar: string; en: string }> = {
    movies: {
      ar: 'تصفح مجموعة واسعة من الأفلام',
      en: 'Browse a wide collection of movies'
    },
    series: {
      ar: 'تصفح مجموعة واسعة من المسلسلات',
      en: 'Browse a wide collection of series'
    },
    anime: {
      ar: 'تصفح مجموعة واسعة من الأنمي',
      en: 'Browse a wide collection of anime'
    },
    software: {
      ar: 'تصفح مجموعة واسعة من البرامج',
      en: 'Browse a wide collection of software'
    },
    gaming: {
      ar: 'تصفح مجموعة واسعة من الألعاب',
      en: 'Browse a wide collection of games'
    }
  }

  return descriptions[contentType]?.[lang] || descriptions.movies[lang]
}
