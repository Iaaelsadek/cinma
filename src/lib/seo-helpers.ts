/**
 * SEO Helper Functions
 * Generates dynamic SEO metadata for filtered discovery pages
 */

export interface SeoData {
  title: string
  description: string
  keywords?: string[]
}

/**
 * Truncates description to specified max length while preserving word boundaries
 */
export function truncateDescription(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text
  
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...'
}

/**
 * Generates SEO data for Plays pages based on category
 */
export function generatePlaysSeoData(category?: string): SeoData {
  const categoryMap: Record<string, { title: string; description: string; keywords: string[] }> = {
    'adel-emam': {
      title: 'مسرحيات عادل إمام - فور سيما',
      description: 'استمتع بمشاهدة أفضل مسرحيات عادل إمام الكوميدية والاجتماعية بجودة عالية',
      keywords: ['عادل إمام', 'مسرحيات عادل إمام', 'كوميديا', 'مسرح مصري']
    },
    'classics': {
      title: 'المسرحيات الكلاسيكية - فور سيما',
      description: 'شاهد أفضل المسرحيات الكلاسيكية من العصر الذهبي للمسرح العربي',
      keywords: ['مسرحيات كلاسيكية', 'مسرح عربي', 'تراث مسرحي']
    },
    'gulf': {
      title: 'المسرحيات الخليجية - فور سيما',
      description: 'استمتع بأفضل المسرحيات الخليجية من الكويت والسعودية والإمارات',
      keywords: ['مسرحيات خليجية', 'مسرح كويتي', 'مسرح سعودي', 'مسرح إماراتي']
    },
    'masrah-masr': {
      title: 'مسرح مصر - فور سيما',
      description: 'شاهد جميع حلقات مسرح مصر بجودة عالية',
      keywords: ['مسرح مصر', 'أشرف عبد الباقي', 'كوميديا مصرية']
    }
  }

  if (category && categoryMap[category]) {
    return categoryMap[category]
  }

  // Default SEO data for main plays page
  return {
    title: 'المسرحيات - فور سيما',
    description: 'استمتع بمشاهدة أفضل المسرحيات العربية والخليجية بجودة عالية',
    keywords: ['مسرحيات', 'مسرح عربي', 'مسرح خليجي', 'كوميديا']
  }
}

/**
 * Generates SEO data for Classics pages based on filters
 */
export function generateClassicsSeoData(filters?: {
  genre?: string
  year?: string
  rating?: string
  language?: string
}): SeoData {
  let title = 'كلاسيكيات السينما'
  let description = 'اكتشف أفضل الأفلام الكلاسيكية من العصر الذهبي للسينما'
  const keywords: string[] = ['أفلام كلاسيكية', 'سينما عربية', 'أفلام قديمة']

  if (filters?.genre) {
    const genreNames: Record<string, string> = {
      drama: 'دراما',
      comedy: 'كوميديا',
      romance: 'رومانسي',
      action: 'أكشن',
      thriller: 'إثارة'
    }
    const genreName = genreNames[filters.genre] || filters.genre
    title = `أفلام ${genreName} كلاسيكية`
    description = `استمتع بأفضل الأفلام الكلاسيكية من نوع ${genreName}`
    keywords.push(genreName)
  }

  if (filters?.year) {
    title += ` - ${filters.year}`
    description += ` من عام ${filters.year}`
    keywords.push(filters.year)
  }

  if (filters?.language) {
    const langNames: Record<string, string> = {
      ar: 'عربية',
      en: 'إنجليزية',
      fr: 'فرنسية'
    }
    const langName = langNames[filters.language] || filters.language
    title += ` ${langName}`
    description += ` باللغة ${langName}`
    keywords.push(`أفلام ${langName}`)
  }

  title += ' - فور سيما'
  description = truncateDescription(description)

  return { title, description, keywords }
}

/**
 * Generates SEO data for Summaries pages based on filters
 */
export function generateSummariesSeoData(filters?: {
  type?: string
  genre?: string
  language?: string
}): SeoData {
  let title = 'ملخصات الأفلام'
  let description = 'شاهد ملخصات سريعة ومراجعات شاملة لأحدث الأفلام والمسلسلات'
  const keywords: string[] = ['ملخصات أفلام', 'مراجعات', 'نقد سينمائي']

  if (filters?.type) {
    const typeNames: Record<string, string> = {
      movie: 'الأفلام',
      series: 'المسلسلات',
      anime: 'الأنمي'
    }
    const typeName = typeNames[filters.type] || filters.type
    title = `ملخصات ${typeName}`
    description = `شاهد ملخصات سريعة ومراجعات شاملة لأحدث ${typeName}`
    keywords.push(`ملخصات ${typeName}`)
  }

  if (filters?.genre) {
    const genreNames: Record<string, string> = {
      drama: 'دراما',
      comedy: 'كوميديا',
      action: 'أكشن',
      horror: 'رعب',
      scifi: 'خيال علمي'
    }
    const genreName = genreNames[filters.genre] || filters.genre
    title += ` - ${genreName}`
    description += ` من نوع ${genreName}`
    keywords.push(genreName)
  }

  if (filters?.language) {
    const langNames: Record<string, string> = {
      ar: 'عربية',
      en: 'إنجليزية',
      kr: 'كورية',
      jp: 'يابانية'
    }
    const langName = langNames[filters.language] || filters.language
    title += ` ${langName}`
    description += ` باللغة ${langName}`
    keywords.push(`${langName}`)
  }

  title += ' - فور سيما'
  description = truncateDescription(description)

  return { title, description, keywords }
}
