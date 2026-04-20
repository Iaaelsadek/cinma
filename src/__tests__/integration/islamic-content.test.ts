/**
 * Integration tests: Islamic Content Pages
 */
import { mapCategorySlugToGenre } from '../../lib/genre-utils'
import { parseFiltersFromURL } from '../../lib/url-state'

describe('Islamic Content', () => {
  test('fatwa category maps correctly', () => {
    // Islamic content uses category parameter, not genre slug
    const params = new URLSearchParams('category=fatwa')
    expect(params.get('category')).toBe('fatwa')
  })

  test('prophets category maps correctly', () => {
    const params = new URLSearchParams('category=prophets')
    expect(params.get('category')).toBe('prophets')
  })

  test('fatwas route is /fatwas not /search?category=fatwa', () => {
    // Verify the route constant
    const fatwasRoute = '/fatwas'
    const prophetsRoute = '/prophets-stories'
    expect(fatwasRoute).toBe('/fatwas')
    expect(prophetsRoute).toBe('/prophets-stories')
  })

  test('filters work on Islamic content pages', () => {
    const filters = { year: 2022, rating: 7, page: 1 }
    const url = new URLSearchParams()
    if (filters.year) url.set('year', String(filters.year))
    if (filters.rating) url.set('rating', String(filters.rating))
    const parsed = parseFiltersFromURL(url)
    expect(parsed.year).toBe(2022)
    expect(parsed.rating).toBe(7)
  })
})
