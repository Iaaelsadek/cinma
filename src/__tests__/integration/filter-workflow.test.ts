/**
 * Integration tests: Filter Workflow
 * Tests that filter changes update URL and filter content correctly
 */
import { parseFiltersFromURL, serializeFiltersToURL, updateURLWithFilter, clearFilterFromURL } from '../../lib/url-state'

describe('Filter Workflow - URL State', () => {
  test('genre filter serializes to URL', () => {
    const url = serializeFiltersToURL({ genre: 'دراما', page: 1 })
    expect(url).toContain('genre=%D8%AF%D8%B1%D8%A7%D9%85%D8%A7')
  })

  test('year filter serializes to URL', () => {
    const url = serializeFiltersToURL({ year: 2022, page: 1 })
    expect(url).toContain('year=2022')
  })

  test('rating filter serializes to URL', () => {
    const url = serializeFiltersToURL({ rating: 8, page: 1 })
    expect(url).toContain('rating=8')
  })

  test('sortBy filter serializes to URL', () => {
    const url = serializeFiltersToURL({ sortBy: 'popularity', page: 1 })
    expect(url).toContain('sortBy=popularity')
  })

  test('null sortBy not included in URL', () => {
    const url = serializeFiltersToURL({ sortBy: null, page: 1 })
    expect(url).not.toContain('sortBy')
  })

  test('page 1 not included in URL', () => {
    const url = serializeFiltersToURL({ genre: 'دراما', page: 1 })
    expect(url).not.toContain('page=1')
  })

  test('page > 1 included in URL', () => {
    const url = serializeFiltersToURL({ genre: 'دراما', page: 3 })
    expect(url).toContain('page=3')
  })

  test('parseFiltersFromURL round-trip', () => {
    const original = { genre: 'حركة', year: 2020, rating: 7, sortBy: 'popularity', page: 2 }
    const urlStr = serializeFiltersToURL(original)
    const params = new URLSearchParams(urlStr)
    const parsed = parseFiltersFromURL(params)
    expect(parsed.genre).toBe('حركة')
    expect(parsed.year).toBe(2020)
    expect(parsed.rating).toBe(7)
    expect(parsed.sortBy).toBe('popularity')
    expect(parsed.page).toBe(2)
  })

  test('clearing filters removes URL parameters', () => {
    const params = new URLSearchParams('genre=%D8%AF%D8%B1%D8%A7%D9%85%D8%A7&year=2020')
    const cleared = clearFilterFromURL(params, 'genre')
    expect(cleared.has('genre')).toBe(false)
    expect(cleared.has('year')).toBe(true)
  })

  test('updating filter resets page', () => {
    const params = new URLSearchParams('genre=drama&page=3')
    const updated = updateURLWithFilter(params, 'year', '2021')
    expect(updated.has('page')).toBe(false)
    expect(updated.get('year')).toBe('2021')
  })

  test('multiple filters applied together', () => {
    const filters = { genre: 'كوميديا', year: 2019, rating: 6, sortBy: 'vote_average', page: 1 }
    const url = serializeFiltersToURL(filters)
    const params = new URLSearchParams(url)
    const parsed = parseFiltersFromURL(params)
    expect(parsed.genre).toBe('كوميديا')
    expect(parsed.year).toBe(2019)
    expect(parsed.rating).toBe(6)
    expect(parsed.sortBy).toBe('vote_average')
  })
})
