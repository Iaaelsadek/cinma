import { GENRES } from './genres'

export const slugify = (text: string) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
}

export const getGenreSlug = (genreId: number) => {
  const genre = GENRES[genreId]?.en || 'General'
  return slugify(genre)
}

export const generateWatchPath = (item: any) => {
  const title = slugify(item.title || item.name || 'untitled')
  
  // Handle YouTube/Video content separately
  if (item.media_type === 'video' || item.is_video) {
    let category = 'general'
    if (item.category) category = slugify(item.category)
    
    // Special path for Summaries
    if (category === 'summary' || category === 'summaries') {
      return `/watch/arabic/summaries/${category}/${title}-${item.id}`
    }
    
    // Generic Video Path
    return `/watch/arabic/video/${category}/${category}/${title}-${item.id}`
  }

  // Determine Type
  let type = 'movies'
  if (item.media_type === 'tv' || item.media_type === 'anime') type = 'series'
  
  // Special Type: Plays (from TMDB)
  if (item.is_play || (item.category && item.category.toLowerCase().includes('play'))) {
    type = 'plays'
  }
  
  // Determine Language
  let lang = 'english'
  if (item.original_language === 'ar') lang = 'arabic'
  else if (item.original_language === 'ja') lang = 'japanese'
  else if (item.original_language === 'ko') lang = 'korean'
  else if (item.original_language === 'tr') lang = 'turkish'
  else if (item.original_language === 'hi') lang = 'indian'
  else if (item.media_type === 'anime') lang = 'japanese' // Default to JA for anime if missing

  // Determine Genre
  let genre = 'general'
  if (item.category && typeof item.category === 'string') {
    genre = slugify(item.category)
  } else {
    const genreId = item.genre_ids?.[0] || item.genres?.[0]?.id
    if (genreId) {
      genre = getGenreSlug(genreId) || 'general'
    }
  }

  // Return the SEO friendly path
  // Format: /watch/english/movies/sci-fi/primate
  return `/watch/${lang}/${type}/${genre}/${title}-${item.id}`
}

export const parseWatchPath = (slug: string) => {
  // Extract ID from the end of the slug (e.g., "primate-12345" -> 12345)
  const parts = slug.split('-')
  const id = parts[parts.length - 1]
  return /^\d+$/.test(id) ? parseInt(id) : null
}
