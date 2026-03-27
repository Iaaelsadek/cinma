/**
 * Manual test file for slug generator
 * Run with: npm test src/lib/__tests__/slugGenerator.manual.test.ts
 */

import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug, extractIdFromSlug } from '../slugGenerator'

describe('Slug Generator - Manual Tests', () => {
  describe('generateSlug', () => {
    it('should convert English title to lowercase slug', () => {
      expect(generateSlug('Spider-Man')).toBe('spider-man')
    })

    it('should handle Arabic characters', () => {
      const slug = generateSlug('فيلم رائع')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(slug.length).toBeGreaterThan(0)
    })

    it('should append ID when provided', () => {
      expect(generateSlug('Spider-Man', 60282)).toBe('spider-man-60282')
    })

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('The Dark Knight')).toBe('the-dark-knight')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Movie: The Beginning!')).toBe('movie-the-beginning')
    })

    it('should collapse consecutive hyphens', () => {
      expect(generateSlug('Movie   Title')).toBe('movie-title')
    })

    it('should limit length to 100 characters', () => {
      const longTitle = 'A'.repeat(150)
      const slug = generateSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(100)
    })

    it('should reserve space for ID suffix when limiting length', () => {
      const longTitle = 'A'.repeat(150)
      const slug = generateSlug(longTitle, 12345)
      expect(slug.length).toBeLessThanOrEqual(100)
      expect(slug).toMatch(/-12345$/)
    })
  })

  describe('isValidSlug', () => {
    it('should validate correct slug', () => {
      expect(isValidSlug('spider-man')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(isValidSlug('')).toBe(false)
    })

    it('should reject uppercase characters', () => {
      expect(isValidSlug('Spider-Man')).toBe(false)
    })

    it('should reject consecutive hyphens', () => {
      expect(isValidSlug('spider--man')).toBe(false)
    })

    it('should reject leading hyphen', () => {
      expect(isValidSlug('-spider-man')).toBe(false)
    })

    it('should reject trailing hyphen', () => {
      expect(isValidSlug('spider-man-')).toBe(false)
    })

    it('should reject special characters', () => {
      expect(isValidSlug('spider-man!')).toBe(false)
    })
  })

  describe('extractIdFromSlug', () => {
    it('should extract ID from slug with ID suffix', () => {
      expect(extractIdFromSlug('spider-man-60282')).toBe(60282)
    })

    it('should return null for slug without ID', () => {
      expect(extractIdFromSlug('spider-man')).toBe(null)
    })

    it('should return null for empty string', () => {
      expect(extractIdFromSlug('')).toBe(null)
    })

    it('should extract ID from complex slug', () => {
      expect(extractIdFromSlug('the-dark-knight-rises-12345')).toBe(12345)
    })

    it('should not extract numbers in the middle', () => {
      expect(extractIdFromSlug('spider-man-2')).toBe(2)
    })
  })
})
