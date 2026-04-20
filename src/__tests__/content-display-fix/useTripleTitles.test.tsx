/**
 * Unit Tests for useTripleTitles Hook
 * 
 * These tests verify that useTripleTitles correctly handles:
 * - 3 distinct titles (Arabic, English, Original)
 * - 2 titles (when original === english)
 * - 1 title
 * - Edge cases
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTripleTitles } from '../../hooks/useTripleTitles'

// Mock useLang hook
vi.mock('../../state/useLang', () => ({
  useLang: () => ({ lang: 'ar' })
}))

describe('useTripleTitles Hook', () => {
  describe('Triple Titles (Bug Fix Verification)', () => {
    it('should return all 3 distinct titles', () => {
      const content = {
        name_ar: 'رانينج مان',
        name_en: 'Running Man',
        original_name: '런닝맨'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      // All 3 titles should be accessible
      expect(result.current.arabic).toBe('رانينج مان')
      expect(result.current.english).toBe('Running Man')
      expect(result.current.original).toBe('런닝맨')
      expect(result.current.primary).toBe('رانينج مان') // Arabic is primary
      expect(result.current.hasMultipleTitles).toBe(true)
    })

    it('should prioritize Arabic as primary', () => {
      const content = {
        title_ar: 'عنوان عربي',
        title_en: 'English Title',
        original_title: 'Original Title'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.primary).toBe('عنوان عربي')
    })

    it('should not duplicate when original === english', () => {
      const content = {
        title_ar: 'فيلم عربي',
        title_en: 'Arabic Movie',
        original_title: 'Arabic Movie' // Same as English
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBe('فيلم عربي')
      expect(result.current.english).toBe('Arabic Movie')
      expect(result.current.original).toBeNull() // Should be null (duplicate)
      expect(result.current.hasMultipleTitles).toBe(true) // Still has 2 titles
    })

    it('should handle when arabic === english', () => {
      const content = {
        title_ar: 'Same Title',
        title_en: 'Same Title',
        original_title: 'Different Original'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBe('Same Title')
      expect(result.current.english).toBeNull() // Duplicate removed
      expect(result.current.original).toBe('Different Original')
      expect(result.current.hasMultipleTitles).toBe(true)
    })
  })

  describe('Two Titles', () => {
    it('should handle Arabic and English only', () => {
      const content = {
        title_ar: 'فيلم',
        title_en: 'Movie',
        original_title: null
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBe('فيلم')
      expect(result.current.english).toBe('Movie')
      expect(result.current.original).toBeNull()
      expect(result.current.hasMultipleTitles).toBe(true)
    })
  })

  describe('Single Title', () => {
    it('should handle only Arabic title', () => {
      const content = {
        title_ar: 'فيلم عربي',
        title_en: null,
        original_title: null
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBe('فيلم عربي')
      expect(result.current.english).toBeNull()
      expect(result.current.original).toBeNull()
      expect(result.current.primary).toBe('فيلم عربي')
      expect(result.current.hasMultipleTitles).toBe(false)
    })

    it('should handle only English title', () => {
      const content = {
        title_ar: null,
        title_en: 'English Movie',
        original_title: null
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBeNull()
      expect(result.current.english).toBe('English Movie')
      expect(result.current.original).toBeNull()
      expect(result.current.primary).toBe('English Movie')
      expect(result.current.hasMultipleTitles).toBe(false)
    })
  })

  describe('Fallback Behavior', () => {
    it('should use fallback when no titles available', () => {
      const content = {
        title_ar: null,
        title_en: null,
        original_title: null
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.primary).toBeTruthy()
      expect(result.current.primary).toMatch(/بدون عنوان|Untitled/)
      expect(result.current.hasMultipleTitles).toBe(false)
    })
  })

  describe('Field Name Support', () => {
    it('should support both title_* and name_* fields', () => {
      const content = {
        name_ar: 'اسم عربي',
        name_en: 'English Name',
        original_name: 'Original Name'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      expect(result.current.arabic).toBe('اسم عربي')
      expect(result.current.english).toBe('English Name')
      expect(result.current.original).toBe('Original Name')
    })

    it('should prioritize title_* over name_*', () => {
      const content = {
        title_ar: 'عنوان',
        name_ar: 'اسم',
        title_en: 'Title',
        name_en: 'Name'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      // title_* should be picked first
      expect(result.current.arabic).toBe('عنوان')
      expect(result.current.english).toBe('Title')
    })
  })

  describe('Edge Cases', () => {
    it('should handle whitespace-only titles', () => {
      const content = {
        title_ar: '   ',
        title_en: '  ',
        original_title: '   '
      }

      const { result } = renderHook(() => useTripleTitles(content))

      // Whitespace should be trimmed and treated as empty
      expect(result.current.arabic).toBeNull()
      expect(result.current.english).toBeNull()
      expect(result.current.original).toBeNull()
    })

    it('should handle undefined content', () => {
      const { result } = renderHook(() => useTripleTitles(undefined))

      expect(result.current.primary).toBeTruthy()
      expect(result.current.hasMultipleTitles).toBe(false)
    })

    it('should handle null content', () => {
      const { result } = renderHook(() => useTripleTitles(null))

      expect(result.current.primary).toBeTruthy()
      expect(result.current.hasMultipleTitles).toBe(false)
    })
  })

  describe('Return Type Consistency', () => {
    it('should always return the correct structure', () => {
      const content = {
        title_ar: 'عنوان',
        title_en: 'Title'
      }

      const { result } = renderHook(() => useTripleTitles(content))

      // Verify structure
      expect(result.current).toHaveProperty('arabic')
      expect(result.current).toHaveProperty('english')
      expect(result.current).toHaveProperty('original')
      expect(result.current).toHaveProperty('primary')
      expect(result.current).toHaveProperty('hasMultipleTitles')

      // Verify types
      expect(typeof result.current.primary).toBe('string')
      expect(typeof result.current.hasMultipleTitles).toBe('boolean')
    })
  })
})
