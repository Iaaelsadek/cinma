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
  // Determine Type
  let type = 'movie'
  if (item.media_type === 'tv' || item.media_type === 'anime' || item.name) type = 'tv'
  if (item.media_type === 'movie' || item.title) type = 'movie'
  
  const id = item.id

  if (type === 'tv') {
    return `/watch/tv/${id}/s1/ep1`
  }
  
  return `/watch/movie/${id}`
}

export const parseWatchPath = (slug: string) => {
  // Extract ID from the end of the slug (e.g., "primate-12345" -> 12345)
  const parts = slug.split('-')
  const id = parts[parts.length - 1]
  return /^\d+$/.test(id) ? parseInt(id) : null
}

export const isCJK = (text: string) => {
  if (!text) return false
  // Range covers Chinese, Japanese, Korean characters
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)
}
