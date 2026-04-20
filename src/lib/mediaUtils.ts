// src/lib/mediaUtils.ts
import { resolveTitleWithFallback } from './translation'

export type TmdbMedia = {
  id: number
  slug?: string | null
  title?: string
  title_ar?: string
  title_en?: string
  original_title?: string
  name?: string
  name_ar?: string
  name_en?: string
  original_name?: string
  media_type?: 'movie' | 'tv'
  poster_path?: string | null
  poster_url?: string | null  // CockroachDB format
  backdrop_path?: string | null
  backdrop_url?: string | null  // CockroachDB format
  vote_average?: number
  overview?: string
  release_date?: string
  first_air_date?: string
  primary_genre?: string
  original_language?: string
}

export const sanitizeMediaItems = (items: TmdbMedia[] | undefined) =>
  (items || []).filter((item) =>
    Boolean(item?.id) &&
    Boolean((item.poster_path && item.poster_path.trim()) || ((item as any).poster_url && (item as any).poster_url.trim())) &&
    Boolean(resolveTitleWithFallback(item)) &&
    // CRITICAL: Filter out items without valid slugs
    Boolean(item.slug && item.slug.trim() !== '' && item.slug !== 'content')
  )
