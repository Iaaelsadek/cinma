import type { FilterState } from '../types/genre'

/** Parse filter state from URL search params */
export function parseFiltersFromURL(searchParams: URLSearchParams): Partial<FilterState> {
  const genre = searchParams.get('genre') || null
  const yearStr = searchParams.get('year')
  const ratingStr = searchParams.get('rating')
  const sortBy = searchParams.get('sortBy') || null
  const pageStr = searchParams.get('page')

  return {
    genre,
    year: yearStr ? parseInt(yearStr) : null,
    rating: ratingStr ? parseFloat(ratingStr) : null,
    sortBy,
    page: pageStr ? Math.max(1, parseInt(pageStr)) : 1,
  }
}

/** Serialize filter state to URL search params string */
export function serializeFiltersToURL(filters: Partial<FilterState>): string {
  const params = new URLSearchParams()
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.year) params.set('year', String(filters.year))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  return params.toString()
}

/** Update a single URL parameter, preserving others */
export function updateURLWithFilter(
  searchParams: URLSearchParams,
  key: string,
  value: string | null
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString())
  if (value === null || value === '') {
    next.delete(key)
  } else {
    next.set(key, value)
  }
  // Reset page when filter changes
  if (key !== 'page') next.delete('page')
  return next
}

/** Remove a single URL parameter */
export function clearFilterFromURL(
  searchParams: URLSearchParams,
  key: string
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString())
  next.delete(key)
  return next
}
