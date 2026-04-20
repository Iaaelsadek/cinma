/**
 * Integration tests: Category Navigation
 */
import { mapCategorySlugToGenre, getGenreLabel } from '../../lib/genre-utils'

describe('Category Navigation', () => {
  test('valid slug maps to Arabic genre', () => {
    expect(mapCategorySlugToGenre('action')).toBe('حركة')
    expect(mapCategorySlugToGenre('drama')).toBe('دراما')
    expect(mapCategorySlugToGenre('comedy')).toBe('كوميديا')
  })

  test('invalid slug returns null', () => {
    expect(mapCategorySlugToGenre('invalid-slug')).toBeNull()
    expect(mapCategorySlugToGenre('')).toBeNull()
  })

  test('slug is case-insensitive', () => {
    expect(mapCategorySlugToGenre('ACTION')).toBe('حركة')
    expect(mapCategorySlugToGenre('Drama')).toBe('دراما')
  })

  test('genre label in Arabic', () => {
    expect(getGenreLabel('حركة', 'ar')).toBe('حركة')
    expect(getGenreLabel('دراما', 'ar')).toBe('دراما')
  })

  test('genre label in English', () => {
    expect(getGenreLabel('حركة', 'en')).toBe('Action')
    expect(getGenreLabel('دراما', 'en')).toBe('Drama')
    expect(getGenreLabel('كوميديا', 'en')).toBe('Comedy')
  })

  test('unknown genre returns Arabic value as fallback', () => {
    expect(getGenreLabel('تصنيف-جديد', 'en')).toBe('تصنيف-جديد')
  })

  test('sci-fi slug maps correctly', () => {
    expect(mapCategorySlugToGenre('sci-fi')).toBe('خيال-علمي')
    expect(mapCategorySlugToGenre('science-fiction')).toBe('خيال-علمي')
  })
})
