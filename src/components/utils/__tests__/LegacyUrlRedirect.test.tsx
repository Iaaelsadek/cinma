/**
 * Tests for LegacyUrlRedirect Component
 * 
 * Validates Requirements:
 * - 3.1: Middleware detects legacy URLs
 * - 3.2: Implements 301-like redirects for legacy URLs
 * - 3.3: Handles errors gracefully when redirect generation fails
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LegacyUrlRedirect } from '../LegacyUrlRedirect'

// Mock the url-utils module
vi.mock('../../../lib/url-utils', () => ({
  detectLegacyUrl: vi.fn(),
  parseWatchUrl: vi.fn(),
  generateRedirectUrl: vi.fn()
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('LegacyUrlRedirect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 3.1: Detect Legacy URLs', () => {
    it('should detect legacy URLs with IDs in watch paths', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      // Mock parseWatchUrl to return parsed data
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'movie',
        slug: 'spider-man-12345'
      })
      
      // Mock detectLegacyUrl to detect the legacy URL
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: true,
        id: 12345,
        cleanSlug: 'spider-man'
      })
      
      // Mock generateRedirectUrl to return clean URL
      ;(generateRedirectUrl as ReturnType<typeof vi.fn>).mockResolvedValue('/watch/movie/spider-man')
      
      const TestComponent = () => <div>Test Page</div>
      
      render(
        <MemoryRouter initialEntries={['/watch/movie/spider-man-12345']}>
          <LegacyUrlRedirect />
          <Routes>
            <Route path="/watch/:type/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify detectLegacyUrl was called
      expect(detectLegacyUrl).toHaveBeenCalledWith('spider-man-12345')
    })

    it('should not process non-watch URLs', async () => {
      const { detectLegacyUrl, parseWatchUrl } = await import('../../../lib/url-utils')
      
      const TestComponent = () => <div>Test Page</div>
      
      render(
        <MemoryRouter initialEntries={['/movie/spider-man-12345']}>
          <LegacyUrlRedirect />
          <Routes>
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should not call parseWatchUrl for non-watch URLs
      expect(parseWatchUrl).not.toHaveBeenCalled()
      expect(detectLegacyUrl).not.toHaveBeenCalled()
    })
  })

  describe('Requirement 3.2: Implement 301-like Redirects', () => {
    it('should redirect to clean URL when legacy URL is detected', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'movie',
        slug: 'spider-man-12345'
      })
      
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: true,
        id: 12345,
        cleanSlug: 'spider-man'
      })
      
      ;(generateRedirectUrl as ReturnType<typeof vi.fn>).mockResolvedValue('/watch/movie/spider-man')
      
      const TestComponent = () => <div>Test Page</div>
      
      render(
        <MemoryRouter initialEntries={['/watch/movie/spider-man-12345']}>
          <LegacyUrlRedirect />
          <Routes>
            <Route path="/watch/:type/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify generateRedirectUrl was called with correct parameters
      expect(generateRedirectUrl).toHaveBeenCalledWith(12345, 'movie', undefined, undefined)
    })

    it('should preserve season and episode in TV series redirects', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'tv',
        slug: 'breaking-bad-67890',
        season: 2,
        episode: 5
      })
      
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: true,
        id: 67890,
        cleanSlug: 'breaking-bad'
      })
      
      ;(generateRedirectUrl as ReturnType<typeof vi.fn>).mockResolvedValue('/watch/tv/breaking-bad/s2/ep5')
      
      const TestComponent = () => <div>Test Page</div>
      
      render(
        <MemoryRouter initialEntries={['/watch/tv/breaking-bad-67890/s2/ep5']}>
          <LegacyUrlRedirect />
          <Routes>
            <Route path="/watch/:type/:slug/:s/:e" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify season and episode are passed to generateRedirectUrl
      expect(generateRedirectUrl).toHaveBeenCalledWith(67890, 'tv', 2, 5)
    })
  })

  describe('Requirement 3.3: Handle Errors Gracefully', () => {
    it('should handle null redirect URL gracefully', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'movie',
        slug: 'non-existent-99999'
      })
      
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: true,
        id: 99999,
        cleanSlug: 'non-existent'
      })
      
      // Simulate content not found
      ;(generateRedirectUrl as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      
      const TestComponent = () => <div>Test Page</div>
      
      // Should not throw error
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/watch/movie/non-existent-99999']}>
            <LegacyUrlRedirect />
            <Routes>
              <Route path="/watch/:type/:slug" element={<TestComponent />} />
            </Routes>
          </MemoryRouter>
        )
      }).not.toThrow()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify generateRedirectUrl was called
      expect(generateRedirectUrl).toHaveBeenCalledWith(99999, 'movie', undefined, undefined)
    })

    it('should handle errors during redirect generation', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'movie',
        slug: 'spider-man-12345'
      })
      
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: true,
        id: 12345,
        cleanSlug: 'spider-man'
      })
      
      // Simulate error during redirect generation
      ;(generateRedirectUrl as any).mockRejectedValue(new Error('Database error'))
      
      const TestComponent = () => <div>Test Page</div>
      
      // Should not throw error
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/watch/movie/spider-man-12345']}>
            <LegacyUrlRedirect />
            <Routes>
              <Route path="/watch/:type/:slug" element={<TestComponent />} />
            </Routes>
          </MemoryRouter>
        )
      }).not.toThrow()
      
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should handle invalid URL parsing gracefully', async () => {
      const { parseWatchUrl } = await import('../../../lib/url-utils')
      
      // Mock parseWatchUrl to return null (invalid URL)
      ;(parseWatchUrl as any).mockReturnValue(null)
      
      const TestComponent = () => <div>Test Page</div>
      
      // Should not throw error
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/watch/invalid']}>
            <LegacyUrlRedirect />
            <Routes>
              <Route path="/watch/:type" element={<TestComponent />} />
            </Routes>
          </MemoryRouter>
        )
      }).not.toThrow()
      
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })

  describe('Clean URL Handling', () => {
    it('should not redirect clean URLs without IDs', async () => {
      const { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } = await import('../../../lib/url-utils')
      
      ;(parseWatchUrl as any).mockReturnValue({
        contentType: 'movie',
        slug: 'spider-man'
      })
      
      ;(detectLegacyUrl as any).mockReturnValue({
        isLegacy: false,
        id: null,
        cleanSlug: 'spider-man'
      })
      
      const TestComponent = () => <div>Test Page</div>
      
      render(
        <MemoryRouter initialEntries={['/watch/movie/spider-man']}>
          <LegacyUrlRedirect />
          <Routes>
            <Route path="/watch/:type/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should not call generateRedirectUrl for clean URLs
      expect(generateRedirectUrl).not.toHaveBeenCalled()
    })
  })

  describe('Component Rendering', () => {
    it('should not render any visible content', () => {
      const { container } = render(
        <MemoryRouter>
          <LegacyUrlRedirect />
        </MemoryRouter>
      )
      
      // Component should not render anything
      expect(container.firstChild).toBeNull()
    })
  })
})
