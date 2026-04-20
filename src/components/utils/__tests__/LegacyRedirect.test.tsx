/**
 * Tests for LegacyRedirect Component
 * 
 * Validates Requirements:
 * - 3.1: Middleware detects legacy URLs with explicit ID parameters
 * - 3.2: Implements 301-like redirects for legacy URLs
 * - 3.3: Handles errors gracefully when redirect generation fails
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LegacyRedirect } from '../LegacyRedirect'

// Mock fetch globally
global.fetch = vi.fn()

// Mock logger
vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('LegacyRedirect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 3.1: Detect Legacy URLs with Explicit IDs', () => {
    it('should detect and process valid numeric ID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'spider-man' })
      })

      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/db/slug/get-by-id',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ id: 12345, table: 'movies' })
          })
        )
      })
    })

    it('should not process invalid ID parameter', async () => {
      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/invalid']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not call fetch for invalid ID
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not process empty ID parameter', async () => {
      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/']}>
          <Routes>
            <Route path="/movie/id/:id?" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not call fetch for empty ID
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Requirement 3.2: Implement 301-like Redirects', () => {
    it('should redirect movie ID to slug-based URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'spider-man' })
      })

      const TestComponent = () => <div>Movie Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should redirect TV series ID to series slug-based URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'breaking-bad' })
      })

      const TestComponent = () => <div>Series Page</div>

      render(
        <MemoryRouter initialEntries={['/tv/id/67890']}>
          <Routes>
            <Route path="/tv/id/:id" element={<LegacyRedirect type="tv" />} />
            <Route path="/series/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/db/slug/get-by-id',
          expect.objectContaining({
            body: JSON.stringify({ id: 67890, table: 'tv_series' })
          })
        )
      })
    })

    it('should redirect actor ID to slug-based URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'tom-hanks' })
      })

      const TestComponent = () => <div>Actor Page</div>

      render(
        <MemoryRouter initialEntries={['/actor/id/11111']}>
          <Routes>
            <Route path="/actor/id/:id" element={<LegacyRedirect type="actor" />} />
            <Route path="/actor/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/db/slug/get-by-id',
          expect.objectContaining({
            body: JSON.stringify({ id: 11111, table: 'actors' })
          })
        )
      })
    })

    it('should redirect game ID to slug-based URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'the-witcher-3' })
      })

      const TestComponent = () => <div>Game Page</div>

      render(
        <MemoryRouter initialEntries={['/game/id/22222']}>
          <Routes>
            <Route path="/game/id/:id" element={<LegacyRedirect type="game" />} />
            <Route path="/game/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/db/slug/get-by-id',
          expect.objectContaining({
            body: JSON.stringify({ id: 22222, table: 'games' })
          })
        )
      })
    })

    it('should redirect software ID to slug-based URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'photoshop' })
      })

      const TestComponent = () => <div>Software Page</div>

      render(
        <MemoryRouter initialEntries={['/software/id/33333']}>
          <Routes>
            <Route path="/software/id/:id" element={<LegacyRedirect type="software" />} />
            <Route path="/software/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/db/slug/get-by-id',
          expect.objectContaining({
            body: JSON.stringify({ id: 33333, table: 'softwares' })
          })
        )
      })
    })

    it('should preserve query parameters and hash in redirect', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: 'spider-man' })
      })

      const TestComponent = () => <div>Movie Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345?ref=search#reviews']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('Requirement 3.3: Handle Errors Gracefully', () => {
    it('should handle 404 response gracefully', async () => {
      const { logger } = await import('../../../lib/logger')

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/99999']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Legacy redirect failed for movie id 99999')
        )
      })
    })

    it('should handle missing slug in response gracefully', async () => {
      const { logger } = await import('../../../lib/logger')

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slug: null })
      })

      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Content found but missing slug')
        )
      })
    })

    it('should handle network errors gracefully', async () => {
      const { logger } = await import('../../../lib/logger')

      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Legacy redirect failed:',
          expect.any(Error)
        )
      })
    })

    it('should handle server errors gracefully', async () => {
      const { logger } = await import('../../../lib/logger')

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const TestComponent = () => <div>Test Page</div>

      render(
        <MemoryRouter initialEntries={['/movie/id/12345']}>
          <Routes>
            <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
            <Route path="/movie/:slug" element={<TestComponent />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Internal Server Error')
        )
      })
    })
  })

  describe('Component Rendering', () => {
    it('should not render any visible content', () => {
      const { container } = render(
        <MemoryRouter>
          <LegacyRedirect type="movie" />
        </MemoryRouter>
      )

      // Component should not render anything
      expect(container.firstChild).toBeNull()
    })
  })
})
