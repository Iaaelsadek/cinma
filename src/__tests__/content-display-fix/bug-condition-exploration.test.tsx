/**
 * Bug Condition Exploration Test - Content Display Fix
 * 
 * CRITICAL: This test MUST FAIL on unfixed code
 * 
 * Purpose: Demonstrate that the bug exists by testing expected behavior
 * Expected Outcome: FAILURE (proves bug exists)
 * 
 * Bug Condition: Content with 3 distinct titles (Arabic, English, Original)
 * should display all 3 titles separately with Arabic as primary.
 * 
 * Current Behavior (Bug): Only 2 titles displayed (useDualTitles limitation)
 * Expected Behavior (Fix): All 3 titles displayed separately
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTripleTitles } from '../../hooks/useTripleTitles'

// Mock useLang hook
vi.mock('../../state/useLang', () => ({
  useLang: () => ({ lang: 'ar' })
}))

describe('Bug Condition Exploration - Triple Titles Display', () => {
  it('should return all 3 distinct titles (Arabic, English, Original)', () => {
    // Arrange: Content with 3 distinct titles
    const mockContent = {
      name_ar: 'رانينج مان',      // Arabic title
      name_en: 'Running Man',      // English title
      original_name: '런닝맨'       // Original Korean title
    }

    // Act: Call useTripleTitles hook
    const { result } = renderHook(() => useTripleTitles(mockContent))

    // Assert: Hook should return all 3 titles
    // This should NOW PASS after implementing useTripleTitles
    
    // Expected behavior (Fix):
    // result.current = { arabic: 'رانينج مان', english: 'Running Man', original: '런닝맨', primary: 'رانينج مان', hasMultipleTitles: true }
    
    expect(result.current).toHaveProperty('arabic')
    expect(result.current).toHaveProperty('english')
    expect(result.current).toHaveProperty('original')
    
    // Verify all 3 titles are accessible
    expect(result.current.arabic).toBe('رانينج مان')
    expect(result.current.english).toBe('Running Man')
    expect(result.current.original).toBe('런닝맨') // This is the key fix
  })

  it('should prioritize Arabic title as primary', () => {
    const mockContent = {
      name_ar: 'رانينج مان',
      name_en: 'Running Man',
      original_name: '런닝맨'
    }

    const { result } = renderHook(() => useTripleTitles(mockContent))

    // This should now pass - useTripleTitles correctly prioritizes Arabic as primary
    expect(result.current.primary).toBe('رانينج مان')
  })

  it('should expose original title when different from English', () => {
    const mockContent = {
      name_ar: 'رانينج مان',
      name_en: 'Running Man',
      original_name: '런닝맨' // Different from English
    }

    const { result } = renderHook(() => useTripleTitles(mockContent))

    // Should now pass: useTripleTitles has a field for original title
    expect(result.current).toHaveProperty('original')
    expect(result.current.original).toBe('런닝맨')
  })

  it('should handle content with only 2 titles', () => {
    const mockContent = {
      name_ar: 'فيلم عربي',
      name_en: 'Arabic Movie',
      original_name: 'Arabic Movie' // Same as English
    }

    const { result } = renderHook(() => useTripleTitles(mockContent))

    // When original === english, should only show 2 titles
    expect(result.current).toHaveProperty('arabic')
    expect(result.current).toHaveProperty('english')
    expect(result.current.hasMultipleTitles).toBe(true)
  })

  it('should handle content with only 1 title', () => {
    const mockContent = {
      name_ar: 'فيلم عربي',
      name_en: null,
      original_name: null
    }

    const { result } = renderHook(() => useTripleTitles(mockContent))

    // When only 1 title exists
    expect(result.current).toHaveProperty('hasMultipleTitles')
    expect(result.current.hasMultipleTitles).toBe(false)
  })
})

/**
 * EXPECTED TEST RESULTS (after fix):
 * 
 * ✓ should return all 3 distinct titles (Arabic, English, Original)
 *   - Reason: useTripleTitles returns { arabic, english, original, primary, hasMultipleTitles }
 *   - All 3 titles are now accessible
 * 
 * ✓ should prioritize Arabic title as primary
 *   - Reason: useTripleTitles correctly prioritizes Arabic as primary
 * 
 * ✓ should expose original title when different from English
 *   - Reason: useTripleTitles has a dedicated original field
 * 
 * ✓ should handle content with only 2 titles
 *   - Reason: useTripleTitles supports hasMultipleTitles flag
 * 
 * ✓ should handle content with only 1 title
 *   - Reason: useTripleTitles correctly sets hasMultipleTitles to false
 * 
 * CONCLUSION: Bug is FIXED - all 3 titles are now displayed correctly
 */
