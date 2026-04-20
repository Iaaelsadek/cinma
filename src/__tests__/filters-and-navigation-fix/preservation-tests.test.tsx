/**
 * 🛡️ Preservation Tests - Filters and Navigation Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * @description Tests to verify unchanged behavior for unaffected sections
 * @spec .kiro/specs/filters-and-navigation-fix/bugfix.md
 * @author Cinema Online Team
 */

import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FilterTabs } from '../../components/features/filters/FilterTabs'
import { UnifiedFilters } from '../../components/unified/UnifiedFilters'
import type { ContentType } from '../../types/unified-section'

function isPreservationCase(input: { contentType?: ContentType; page?: string }): boolean {
  if (input.contentType === 'movies') return true
  if (input.contentType === 'series') return true
  if (input.contentType === 'anime') return true
  if (input.page === 'quran') return true
  return false
}

describe('Preservation Tests - Filters and Navigation Fix', () => {
  describe('Property 2: Preservation - Unchanged Behavior for Unaffected Sections', () => {
    test('Movies section shows all standard navigation tabs (Arabic)', () => {
      const contentType = 'movies' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType={contentType} activeFilter="all" lang="ar" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      const tabTexts = Array.from(tabs).map(tab => tab.textContent)
      
      expect(tabTexts).toContain('الكل')
      expect(tabTexts).toContain('الرائج')
      expect(tabTexts).toContain('الأعلى تقييماً')
      expect(tabTexts).toContain('الأحدث')
      expect(tabTexts).toContain('كلاسيكيات')
      expect(tabTexts).toContain('ملخصات')
      
      const hasPlatformTabs = tabTexts.some(text => 
        text?.includes('بلايستيشن') || text?.includes('إكس بوكس')
      )
      expect(hasPlatformTabs).toBe(false)
    })

    test('Movies section shows all standard navigation tabs (English)', () => {
      const contentType = 'movies' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType={contentType} activeFilter="all" lang="en" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      const tabTexts = Array.from(tabs).map(tab => tab.textContent)
      
      expect(tabTexts).toContain('All')
      expect(tabTexts).toContain('Trending')
      expect(tabTexts).toContain('Top Rated')
      expect(tabTexts).toContain('Latest')
      expect(tabTexts).toContain('Classics')
      expect(tabTexts).toContain('Summaries')
      
      const hasPlatformTabs = tabTexts.some(text => 
        text?.includes('PlayStation') || text?.includes('Xbox')
      )
      expect(hasPlatformTabs).toBe(false)
    })

    test('Movies section shows all standard filters (Arabic)', () => {
      const contentType = 'movies' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <UnifiedFilters contentType={contentType} onFilterChange={() => {}} onClearAll={() => {}} lang="ar" />
      )
      
      const filterContainer = container.querySelector('[role="region"]')
      expect(filterContainer).toBeTruthy()
      
      const text = container.textContent || ''
      expect(text).toContain('النوع')
      expect(text).toContain('السنة')
      expect(text).toContain('التقييم')
      expect(text).toContain('اللغة')
      expect(text).not.toContain('المنصة')
    })

    test('Movies section shows all standard filters (English)', () => {
      const contentType = 'movies' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <UnifiedFilters contentType={contentType} onFilterChange={() => {}} onClearAll={() => {}} lang="en" />
      )
      
      const filterContainer = container.querySelector('[role="region"]')
      expect(filterContainer).toBeTruthy()
      
      const text = container.textContent || ''
      expect(text).toContain('Genre')
      expect(text).toContain('Year')
      expect(text).toContain('Rating')
      expect(text).toContain('Language')
      expect(text).not.toContain('Platform')
    })

    test('Series section shows all standard navigation tabs including Ramadan (Arabic)', () => {
      const contentType = 'series' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType={contentType} activeFilter="all" lang="ar" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      const tabTexts = Array.from(tabs).map(tab => tab.textContent)
      
      expect(tabTexts).toContain('رمضان')
    })

    test('Series section shows all standard navigation tabs including Ramadan (English)', () => {
      const contentType = 'series' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType={contentType} activeFilter="all" lang="en" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      const tabTexts = Array.from(tabs).map(tab => tab.textContent)
      
      expect(tabTexts).toContain('Ramadan')
    })

    test('Anime section shows all standard navigation tabs', () => {
      const contentType = 'anime' as ContentType
      expect(isPreservationCase({ contentType })).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType={contentType} activeFilter="all" lang="ar" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      expect(tabs.length).toBeGreaterThan(4)
    })
  })

  describe('Real-World Preservation Scenarios', () => {
    test('Scenario 1: Movies section has 6 navigation tabs', () => {
      const input = { contentType: 'movies' as ContentType }
      expect(isPreservationCase(input)).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType="movies" activeFilter="all" lang="ar" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      expect(tabs.length).toBe(6)
    })

    test('Scenario 2: Series section has 7 navigation tabs including Ramadan', () => {
      const input = { contentType: 'series' as ContentType }
      expect(isPreservationCase(input)).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType="series" activeFilter="all" lang="ar" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      expect(tabs.length).toBe(7)
      
      const tabTexts = Array.from(tabs).map(tab => tab.textContent)
      expect(tabTexts).toContain('رمضان')
    })

    test('Scenario 3: Anime section has 9 navigation tabs', () => {
      const input = { contentType: 'anime' as ContentType }
      expect(isPreservationCase(input)).toBe(true)
      
      const { container } = render(
        <MemoryRouter>
          <FilterTabs contentType="anime" activeFilter="all" lang="en" />
        </MemoryRouter>
      )
      
      const tabs = container.querySelectorAll('a')
      expect(tabs.length).toBe(9)
    })
  })
})
