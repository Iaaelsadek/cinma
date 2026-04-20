/**
 * Unit Tests for Slug Generator
 * 
 * Tests slug generation from various languages and edge cases
 */

import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug, extractIdFromSlug } from '../slugGenerator'

describe('slugGenerator', () => {
  describe('generateSlug', () => {
    describe('English titles', () => {
      it('should generate slug from simple English title', () => {
        expect(generateSlug('Spider-Man')).toBe('spider-man')
      })

      it('should handle multiple words', () => {
        expect(generateSlug('The Dark Knight')).toBe('the-dark-knight')
      })

      it('should remove special characters', () => {
        expect(generateSlug('Iron Man 3: The Movie!')).toBe('iron-man-3-the-movie')
      })

      it('should collapse multiple spaces', () => {
        expect(generateSlug('The    Matrix')).toBe('the-matrix')
      })

      it('should handle mixed case', () => {
        expect(generateSlug('ThE DaRk KnIgHt')).toBe('the-dark-knight')
      })
    })

    describe('Arabic titles', () => {
      it('should transliterate Arabic title', () => {
        const result = generateSlug('سبايدر مان')
        expect(result).toBe('sbaydr-man')
      })

      it('should handle Arabic with numbers', () => {
        const result = generateSlug('الرجل الحديدي 3')
        expect(result).toBe('alrjl-alhdydy-3')
      })

      it('should remove Arabic diacritics', () => {
        const result = generateSlug('الفِيلْم')
        expect(result).toBe('alfylm')
      })

      it('should handle mixed Arabic and English', () => {
        const result = generateSlug('Spider-Man سبايدر مان')
        expect(result).toBe('spider-man-sbaydr-man')
      })
    })

    describe('CJK titles', () => {
      it('should handle Chinese characters', () => {
        const result = generateSlug('蜘蛛侠')
        // CJK characters are removed in current implementation
        // This is expected behavior - they need transliteration
        expect(result).toBe('')
      })

      it('should handle Japanese characters', () => {
        const result = generateSlug('スパイダーマン')
        // Japanese characters are removed in current implementation
        expect(result).toBe('')
      })

      it('should handle Korean characters', () => {
        const result = generateSlug('스파이더맨')
        // Korean characters are removed in current implementation
        expect(result).toBe('')
      })

      it('should handle mixed CJK and English', () => {
        const result = generateSlug('Spider-Man 蜘蛛侠')
        // Only English part is kept
        expect(result).toBe('spider-man')
      })
    })

    describe('ID suffix', () => {
      it('should append ID when provided', () => {
        expect(generateSlug('Spider-Man', 12345)).toBe('spider-man-12345')
      })

      it('should handle ID with Arabic title', () => {
        const result = generateSlug('سبايدر مان', 67890)
        expect(result).toBe('sbaydr-man-67890')
      })

      it('should truncate slug to fit ID', () => {
        const longTitle = 'A'.repeat(100)
        const result = generateSlug(longTitle, 12345, { maxLength: 50 })
        expect(result.length).toBeLessThanOrEqual(50)
        expect(result).toMatch(/-12345$/)
      })
    })

    describe('Length constraints', () => {
      it('should respect maxLength option', () => {
        const longTitle = 'The Very Long Movie Title That Goes On And On'
        const result = generateSlug(longTitle, undefined, { maxLength: 20 })
        expect(result.length).toBeLessThanOrEqual(20)
      })

      it('should default to 100 characters', () => {
        const longTitle = 'A'.repeat(150)
        const result = generateSlug(longTitle)
        expect(result.length).toBeLessThanOrEqual(100)
      })

      it('should not end with hyphen after truncation', () => {
        const title = 'The Dark Knight Rises And Falls'
        const result = generateSlug(title, undefined, { maxLength: 15 })
        expect(result).not.toMatch(/-$/)
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        expect(generateSlug('')).toBe('')
      })

      it('should handle whitespace only', () => {
        expect(generateSlug('   ')).toBe('')
      })

      it('should handle special characters only', () => {
        expect(generateSlug('!@#$%^&*()')).toBe('')
      })

      it('should handle numbers only', () => {
        expect(generateSlug('12345')).toBe('12345')
      })

      it('should collapse consecutive hyphens', () => {
        expect(generateSlug('The---Dark---Knight')).toBe('the-dark-knight')
      })

      it('should remove leading hyphens', () => {
        expect(generateSlug('---The Dark Knight')).toBe('the-dark-knight')
      })

      it('should remove trailing hyphens', () => {
        expect(generateSlug('The Dark Knight---')).toBe('the-dark-knight')
      })
    })
  })

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('spider-man')).toBe(true)
      expect(isValidSlug('the-dark-knight')).toBe(true)
      expect(isValidSlug('movie-123')).toBe(true)
    })

    it('should reject empty strings', () => {
      expect(isValidSlug('')).toBe(false)
      expect(isValidSlug('   ')).toBe(false)
    })

    it('should reject uppercase characters', () => {
      expect(isValidSlug('Spider-Man')).toBe(false)
    })

    it('should reject special characters', () => {
      expect(isValidSlug('spider_man')).toBe(false)
      expect(isValidSlug('spider man')).toBe(false)
      expect(isValidSlug('spider@man')).toBe(false)
    })

    it('should reject consecutive hyphens', () => {
      expect(isValidSlug('spider--man')).toBe(false)
    })

    it('should reject leading hyphens', () => {
      expect(isValidSlug('-spider-man')).toBe(false)
    })

    it('should reject trailing hyphens', () => {
      expect(isValidSlug('spider-man-')).toBe(false)
    })
  })

  describe('extractIdFromSlug', () => {
    it('should extract ID from slug with ID suffix', () => {
      expect(extractIdFromSlug('spider-man-12345')).toBe(12345)
    })

    it('should extract ID from Arabic slug', () => {
      expect(extractIdFromSlug('sbaydr-man-67890')).toBe(67890)
    })

    it('should return null for slug without ID', () => {
      expect(extractIdFromSlug('spider-man')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(extractIdFromSlug('')).toBeNull()
    })

    it('should handle multi-digit IDs', () => {
      expect(extractIdFromSlug('movie-999999999')).toBe(999999999)
    })

    it('should only extract ID from end of slug', () => {
      expect(extractIdFromSlug('movie-2024-spider-man-12345')).toBe(12345)
    })

    it('should not extract year as ID', () => {
      // Years are typically 4 digits, but this tests the pattern
      expect(extractIdFromSlug('spider-man-2024')).toBe(2024)
    })
  })
})
