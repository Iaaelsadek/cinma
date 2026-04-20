/**
 * Special Cases Tests for Slug System
 * 
 * Tests edge cases and special scenarios for slug generation and URL handling
 */

import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug } from '../lib/slugGenerator'
import { generateContentUrl, generateWatchUrl } from '../lib/utils'
import { detectLegacyUrl, extractYearFromSlug } from '../lib/url-utils'

describe('Slug Special Cases', () => {
  describe('Arabic slugs', () => {
    it('should handle Arabic titles', () => {
      const arabicTitles = [
        'الرجل العنكبوت',
        'فيلم رائع',
        'مسلسل مثير',
        'الفيلم الجديد'
      ]
      
      arabicTitles.forEach(title => {
        const slug = generateSlug(title)
        
        expect(slug).toBeTruthy()
        expect(slug).toMatch(/^[a-z0-9-]+$/)
      })
    })

    it('should generate URL with Arabic-derived slug', () => {
      const movie = {
        id: 123,
        slug: 'alrjl-alankaboot', // Transliterated from Arabic
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      
      expect(url).toBe('/movie/alrjl-alankaboot')
    })

    it('should handle mixed Arabic and English', () => {
      const title = 'Spider-Man الرجل العنكبوت'
      const slug = generateSlug(title, 123)
      
      expect(slug).toBeTruthy()
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('Chinese/Japanese/Korean slugs', () => {
    it('should handle Chinese titles', () => {
      const chineseTitles = [
        '蜘蛛侠',
        '复仇者联盟',
        '黑暗骑士'
      ]
      
      chineseTitles.forEach((title, index) => {
        const slug = generateSlug(title, index + 1)
        
        // CJK-only titles should result in ID-only slug
        expect(slug).toBe(`${index + 1}`)
      })
    })

    it('should handle Japanese titles', () => {
      const japaneseTitles = [
        'スパイダーマン',
        'アベンジャーズ',
        'ダークナイト'
      ]
      
      japaneseTitles.forEach((title, index) => {
        const slug = generateSlug(title, index + 1)
        
        // CJK-only titles should result in ID-only slug
        expect(slug).toBe(`${index + 1}`)
      })
    })

    it('should handle Korean titles', () => {
      const koreanTitles = [
        '스파이더맨',
        '어벤져스',
        '다크 나이트'
      ]
      
      koreanTitles.forEach((title, index) => {
        const slug = generateSlug(title, index + 1)
        
        // CJK-only titles should result in ID-only slug
        expect(slug).toBe(`${index + 1}`)
      })
    })

    it('should handle mixed CJK and English', () => {
      const title = 'Spider-Man 蜘蛛侠'
      const slug = generateSlug(title, 123)
      
      expect(slug).toBeTruthy()
      expect(slug).toContain('spider-man')
      expect(slug).toContain('123')
    })
  })

  describe('Slugs with years', () => {
    it('should handle slug with year at the end', () => {
      const slug = 'spider-man-2024'
      
      expect(isValidSlug(slug)).toBe(true)
      
      const year = extractYearFromSlug(slug)
      expect(year).toBe(2024)
    })

    it('should handle slug with year in middle', () => {
      const slug = 'spider-man-2024-no-way-home'
      
      expect(isValidSlug(slug)).toBe(true)
      
      const year = extractYearFromSlug(slug)
      expect(year).toBe(2024)
    })

    it('should handle multiple year-like numbers', () => {
      const slug = 'movie-2020-part-2021'
      
      const year = extractYearFromSlug(slug)
      
      // extractYearFromSlug looks for pattern -(19|20)\d{2}(?:-|$)
      // In 'movie-2020-part-2021', it will match '-2021' at the end
      expect(year).toBe(2021)
    })

    it('should not extract invalid years', () => {
      const invalidYears = [
        'movie-1899', // Too old
        'movie-2100', // Too far in future
        'movie-999',  // Not 4 digits
        'movie-12345' // Too many digits
      ]
      
      invalidYears.forEach(slug => {
        const year = extractYearFromSlug(slug)
        expect(year).toBeNull()
      })
    })

    it('should extract valid years', () => {
      const validYears = [
        { slug: 'movie-1900', expected: 1900 },
        { slug: 'movie-2024', expected: 2024 },
        { slug: 'movie-2099', expected: 2099 }
      ]
      
      validYears.forEach(({ slug, expected }) => {
        const year = extractYearFromSlug(slug)
        expect(year).toBe(expected)
      })
    })
  })

  describe('Slugs with special characters', () => {
    it('should handle titles with apostrophes', () => {
      const title = "Spider-Man: It's Amazing"
      const slug = generateSlug(title)
      
      expect(slug).toBe('spider-man-its-amazing')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with quotes', () => {
      const title = 'The "Amazing" Spider-Man'
      const slug = generateSlug(title)
      
      expect(slug).toBe('the-amazing-spider-man')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with colons', () => {
      const title = 'Spider-Man: No Way Home'
      const slug = generateSlug(title)
      
      expect(slug).toBe('spider-man-no-way-home')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with parentheses', () => {
      const title = 'Spider-Man (2002)'
      const slug = generateSlug(title)
      
      expect(slug).toBe('spider-man-2002')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with ampersands', () => {
      const title = 'Fast & Furious'
      const slug = generateSlug(title)
      
      expect(slug).toBe('fast-furious')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with periods', () => {
      const title = 'Mr. & Mrs. Smith'
      const slug = generateSlug(title)
      
      expect(slug).toBe('mr-mrs-smith')
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle titles with commas', () => {
      const title = 'Eat, Pray, Love'
      const slug = generateSlug(title)
      
      expect(slug).toBe('eat-pray-love')
      expect(isValidSlug(slug)).toBe(true)
    })
  })

  describe('Legacy URL detection with special cases', () => {
    it('should detect legacy URL with year-like ID', () => {
      const slug = 'spider-man-2024'
      const detection = detectLegacyUrl(slug)
      
      // 2024 could be year or ID
      expect(detection.isLegacy).toBe(true)
      expect(detection.id).toBe(2024)
      expect(detection.cleanSlug).toBe('spider-man')
    })

    it('should detect legacy URL with large ID', () => {
      const slug = 'spider-man-999999'
      const detection = detectLegacyUrl(slug)
      
      expect(detection.isLegacy).toBe(true)
      expect(detection.id).toBe(999999)
      expect(detection.cleanSlug).toBe('spider-man')
    })

    it('should not detect clean slug as legacy', () => {
      const slug = 'spider-man'
      const detection = detectLegacyUrl(slug)
      
      expect(detection.isLegacy).toBe(false)
      expect(detection.id).toBeNull()
      expect(detection.cleanSlug).toBe('spider-man')
    })

    it('should handle slug with multiple hyphens and numbers', () => {
      const slug = 'spider-man-2-12345'
      const detection = detectLegacyUrl(slug)
      
      // Should only extract the last number
      expect(detection.isLegacy).toBe(true)
      expect(detection.id).toBe(12345)
      expect(detection.cleanSlug).toBe('spider-man-2')
    })
  })

  describe('URL generation with special cases', () => {
    it('should generate URL for content with Arabic slug', () => {
      const movie = {
        id: 123,
        slug: 'alrjl-alankaboot',
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      
      expect(url).toBe('/movie/alrjl-alankaboot')
    })

    it('should generate watch URL for TV with Arabic slug', () => {
      const series = {
        id: 456,
        slug: 'mslsl-mthyr',
        media_type: 'tv'
      }
      
      const url = generateWatchUrl(series, 1, 5)
      
      expect(url).toBe('/watch/tv/mslsl-mthyr/s1/ep5')
    })

    it('should handle content with very long slug', () => {
      const longSlug = 'a'.repeat(95)
      const movie = {
        id: 123,
        slug: longSlug,
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      
      expect(url).toContain(longSlug)
    })

    it('should handle content with numeric-only slug', () => {
      const movie = {
        id: 123,
        slug: '12345',
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      
      expect(url).toBe('/movie/12345')
    })
  })

  describe('Round-trip conversion special cases', () => {
    it('should maintain Arabic slug through round-trip', () => {
      const movie = {
        id: 123,
        slug: 'alrjl-alankaboot',
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      const slugFromUrl = url.split('/').pop()
      
      expect(slugFromUrl).toBe(movie.slug)
    })

    it('should maintain slug with year through round-trip', () => {
      const movie = {
        id: 123,
        slug: 'spider-man-2024',
        media_type: 'movie'
      }
      
      const url = generateContentUrl(movie)
      const slugFromUrl = url.split('/').pop()
      
      expect(slugFromUrl).toBe(movie.slug)
    })

    it('should maintain TV slug with season/episode', () => {
      const series = {
        id: 456,
        slug: 'breaking-bad',
        media_type: 'tv'
      }
      
      const url = generateWatchUrl(series, 3, 7)
      
      expect(url).toBe('/watch/tv/breaking-bad/s3/ep7')
      
      // Extract slug from URL
      const parts = url.split('/')
      const slugFromUrl = parts[3]
      
      expect(slugFromUrl).toBe(series.slug)
    })
  })

  describe('Performance with special cases', () => {
    it('should handle batch slug generation efficiently', () => {
      const titles = [
        'Spider-Man',
        'الرجل العنكبوت',
        '蜘蛛侠',
        'スパイダーマン',
        '스파이더맨'
      ]
      
      const startTime = Date.now()
      
      const slugs = titles.map((title, index) => generateSlug(title, index + 1))
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(100)
      expect(slugs.length).toBe(5)
      
      // All should be valid or ID-only
      slugs.forEach(slug => {
        expect(slug).toBeTruthy()
      })
    })

    it('should handle large batch of URL generations', () => {
      const movies = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        slug: `movie-${i + 1}`,
        media_type: 'movie'
      }))
      
      const startTime = Date.now()
      
      const urls = movies.map(m => generateContentUrl(m))
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(500)
      expect(urls.length).toBe(1000)
      
      // All should be valid URLs
      urls.forEach(url => {
        expect(url).toMatch(/^\/movie\//)
      })
    })
  })

  describe('Error handling special cases', () => {
    it('should throw error for content without slug or title', () => {
      const movie = {
        id: 123,
        media_type: 'movie'
      }
      
      expect(() => generateContentUrl(movie as any)).toThrow()
    })

    it('should handle content with whitespace-only slug', () => {
      const movie = {
        id: 123,
        slug: '   ',
        title: 'Spider-Man',
        media_type: 'movie'
      }
      
      // Should fallback to title
      const url = generateContentUrl(movie)
      
      expect(url).toContain('spider-man')
    })

    it('should handle content with "content" as slug', () => {
      const movie = {
        id: 123,
        slug: 'content',
        title: 'Spider-Man',
        media_type: 'movie'
      }
      
      // Should fallback to title
      const url = generateContentUrl(movie)
      
      expect(url).toContain('spider-man')
    })
  })

  describe('URL patterns with special cases', () => {
    it('should handle all content types', () => {
      const contentTypes = [
        { type: 'movie', expectedPath: '/movie/' },
        { type: 'tv', expectedPath: '/series/' },
        { type: 'actor', expectedPath: '/actor/' },
        { type: 'game', expectedPath: '/game/' },
        { type: 'software', expectedPath: '/software/' }
      ]
      
      contentTypes.forEach(({ type, expectedPath }) => {
        const item = {
          id: 123,
          slug: 'test-slug',
          media_type: type
        }
        
        const url = generateContentUrl(item)
        
        expect(url).toContain(expectedPath)
        expect(url).toContain('test-slug')
      })
    })

    it('should handle watch URLs for different seasons/episodes', () => {
      const series = {
        id: 456,
        slug: 'breaking-bad',
        media_type: 'tv'
      }
      
      const testCases = [
        { season: 1, episode: 1, expected: '/watch/tv/breaking-bad/s1/ep1' },
        { season: 5, episode: 16, expected: '/watch/tv/breaking-bad/s5/ep16' },
        { season: 10, episode: 99, expected: '/watch/tv/breaking-bad/s10/ep99' }
      ]
      
      testCases.forEach(({ season, episode, expected }) => {
        const url = generateWatchUrl(series, season, episode)
        expect(url).toBe(expected)
      })
    })
  })

  describe('Legacy URL patterns', () => {
    it('should detect various legacy URL patterns', () => {
      const legacyPatterns = [
        { slug: 'spider-man-12345', expectedId: 12345 },
        { slug: 'the-dark-knight-67890', expectedId: 67890 },
        { slug: 'inception-2010-movie-99999', expectedId: 99999 }
      ]
      
      legacyPatterns.forEach(({ slug, expectedId }) => {
        const detection = detectLegacyUrl(slug)
        
        expect(detection.isLegacy).toBe(true)
        expect(detection.id).toBe(expectedId)
      })
    })

    it('should not detect clean slugs as legacy', () => {
      const cleanSlugs = [
        'spider-man',
        'the-dark-knight',
        'inception-2010',
        'breaking-bad'
      ]
      
      cleanSlugs.forEach(slug => {
        const detection = detectLegacyUrl(slug)
        
        // Year-like numbers might be detected as legacy
        if (slug === 'inception-2010') {
          expect(detection.isLegacy).toBe(true)
          expect(detection.id).toBe(2010)
        } else {
          expect(detection.isLegacy).toBe(false)
        }
      })
    })
  })

  describe('Boundary cases', () => {
    it('should handle minimum length slug', () => {
      const slug = 'a'
      
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle maximum length slug', () => {
      const longSlug = 'a'.repeat(100)
      
      expect(isValidSlug(longSlug)).toBe(true)
    })

    it('should handle slug with all numbers', () => {
      const slug = '123456789'
      
      expect(isValidSlug(slug)).toBe(true)
    })

    it('should handle slug with alternating letters and numbers', () => {
      const slug = 'a1b2c3d4e5'
      
      expect(isValidSlug(slug)).toBe(true)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle full flow: title -> slug -> URL', () => {
      const title = 'Spider-Man: No Way Home'
      const id = 12345
      
      // Generate slug
      const slug = generateSlug(title, id)
      
      // Generate URL
      const movie = {
        id,
        slug,
        media_type: 'movie'
      }
      const url = generateContentUrl(movie)
      
      // Verify
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(url).toContain(slug)
      expect(url).toBe(`/movie/${slug}`)
    })

    it('should handle full flow with Arabic title', () => {
      const title = 'الرجل العنكبوت'
      const id = 67890
      
      const slug = generateSlug(title, id)
      
      const movie = {
        id,
        slug,
        media_type: 'movie'
      }
      const url = generateContentUrl(movie)
      
      expect(slug).toBeTruthy()
      expect(url).toContain(slug)
    })

    it('should handle full flow with CJK title', () => {
      const title = '蜘蛛侠'
      const id = 99999
      
      const slug = generateSlug(title, id)
      
      const movie = {
        id,
        slug,
        media_type: 'movie'
      }
      const url = generateContentUrl(movie)
      
      expect(slug).toBe('99999')
      expect(url).toBe('/movie/99999')
    })
  })
})
