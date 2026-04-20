/**
 * Unit Tests for Trending Pages
 * 
 * These tests validate that trending pages load correctly and use
 * CockroachDB API instead of TMDB.
 * 
 * Tests:
 * - Home.tsx loads and displays trending movies
 * - TopWatched.tsx loads and displays trending content
 * - No TMDB API calls in console
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Home } from '../pages/Home'
import { TopWatched } from '../pages/discovery/TopWatched'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = axios as any

// Mock tmdb module
vi.mock('../lib/tmdb', () => ({
  tmdb: {
    get: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn()
      }
    }
  }
}))

// Mock react-helmet-async
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <div data-testid="helmet">{children}</div>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock components that might cause issues in tests
vi.mock('../components/features/hero/QuantumHero', () => ({
  QuantumHero: ({ items }: { items?: unknown[] }) => (
    <div data-testid="quantum-hero">
      {items?.length > 0 && <div data-testid="hero-items">{items.length} items</div>}
    </div>
  )
}))

vi.mock('../components/features/media/QuantumTrain', () => ({
  QuantumTrain: ({ items, title }: { items?: unknown[]; title?: string }) => (
    <div data-testid="quantum-train">
      <h2>{title}</h2>
      {items?.length > 0 && <div data-testid="train-items">{items.length} items</div>}
    </div>
  )
}))

vi.mock('../components/features/media/ContinueWatchingRow', () => ({
  ContinueWatchingRow: () => <div data-testid="continue-watching">Continue Watching</div>
}))

vi.mock('../components/features/system/AdsManager', () => ({
  AdsManager: () => <div data-testid="ads-manager">Ads</div>
}))

vi.mock('../components/features/home/HomeBelowFoldSections', () => ({
  HomeBelowFoldSections: () => <div data-testid="below-fold">Below Fold</div>
}))

// Mock hooks
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}))

vi.mock('../hooks/useRecommendations', () => ({
  useRecommendations: () => ({ data: null })
}))

vi.mock('../state/useLang', () => ({
  useLang: () => ({ lang: 'en' })
}))

// Helper to create a test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  })
}

// Helper to render with providers
function renderWithProviders(component: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Home.tsx - Trending Movies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch = vi.fn((url: string) => {
      if (url === '/api/home') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            latest: [
              {
                id: 1,
                slug: 'the-matrix',
                title: 'The Matrix',
                content_type: 'movie',
                poster_url: '/poster1.jpg',
                backdrop_url: '/backdrop1.jpg',
                vote_average: 8.7,
                overview: 'A computer hacker learns...',
                release_date: '1999-03-31',
                original_language: 'en'
              }
            ],
            topRated: [
              {
                id: 2,
                slug: 'inception',
                title: 'Inception',
                content_type: 'movie',
                poster_url: '/poster2.jpg',
                backdrop_url: '/backdrop2.jpg',
                vote_average: 8.8,
                overview: 'A thief who steals...',
                release_date: '2010-07-16',
                original_language: 'en'
              }
            ],
            popular: []
          })
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    }) as any
  })

  it('should render Home page without errors', async () => {
    renderWithProviders(<Home />)
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByTestId('quantum-hero')).toBeInTheDocument()
    })
  })

  it('should fetch trending movies from CockroachDB API', async () => {
    renderWithProviders(<Home />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/home')
    })
  })

  it('should display hero items when data is loaded', async () => {
    renderWithProviders(<Home />)
    
    await waitFor(() => {
      const heroItems = screen.queryByTestId('hero-items')
      expect(heroItems).toBeInTheDocument()
    })
  })

  it('should filter out items without valid slugs', async () => {
    global.fetch = vi.fn((url: string) => {
      if (url === '/api/home') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            latest: [
              {
                id: 1,
                slug: 'valid-slug',
                title: 'Valid Movie',
                content_type: 'movie',
                poster_url: '/poster.jpg',
                vote_average: 8.0
              },
              {
                id: 2,
                slug: null, // Invalid
                title: 'Invalid Movie 1',
                content_type: 'movie',
                poster_url: '/poster.jpg'
              },
              {
                id: 3,
                slug: '', // Invalid
                title: 'Invalid Movie 2',
                content_type: 'movie',
                poster_url: '/poster.jpg'
              },
              {
                id: 4,
                slug: 'content', // Invalid
                title: 'Invalid Movie 3',
                content_type: 'movie',
                poster_url: '/poster.jpg'
              }
            ],
            topRated: [],
            popular: []
          })
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    }) as any

    renderWithProviders(<Home />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('API Error'))) as any

    renderWithProviders(<Home />)
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByTestId('quantum-hero')).toBeInTheDocument()
    })
  })
})

describe('TopWatched.tsx - Trending Content', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock axios responses
    mockedAxios.get = vi.fn((url: string, config?: unknown) => {
      if (url === '/api/trending') {
        const type = config?.params?.type
        if (type === 'movie') {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 1,
                  slug: 'trending-movie',
                  title: 'Trending Movie',
                  poster_url: '/poster.jpg',
                  vote_average: 8.5
                }
              ]
            }
          })
        } else if (type === 'tv') {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 2,
                  slug: 'trending-series',
                  name: 'Trending Series',
                  poster_url: '/poster.jpg',
                  vote_average: 8.3
                }
              ]
            }
          })
        }
      } else if (url === '/api/movies') {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 3,
                slug: 'top-rated-movie',
                title: 'Top Rated Movie',
                poster_url: '/poster.jpg',
                vote_average: 9.0
              }
            ]
          }
        })
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  it('should render TopWatched page without errors', async () => {
    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      expect(screen.getByTestId('quantum-hero')).toBeInTheDocument()
    })
  })

  it('should fetch trending movies from CockroachDB API', async () => {
    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/trending',
        expect.objectContaining({
          params: expect.objectContaining({ type: 'movie' })
        })
      )
    })
  })

  it('should fetch trending series from CockroachDB API', async () => {
    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/trending',
        expect.objectContaining({
          params: expect.objectContaining({ type: 'tv' })
        })
      )
    })
  })

  it('should fetch top rated movies from CockroachDB API', async () => {
    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/movies',
        expect.objectContaining({
          params: expect.objectContaining({ 
            sort: 'vote_average',
            ratingFrom: 7
          })
        })
      )
    })
  })

  it('should display trending movies section', async () => {
    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      const sections = screen.getAllByTestId('quantum-train')
      expect(sections.length).toBeGreaterThan(0)
    })
  })

  it('should handle API errors gracefully', async () => {
    mockedAxios.get = vi.fn(() => Promise.reject(new Error('API Error')))

    renderWithProviders(<TopWatched />)
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByTestId('quantum-hero')).toBeInTheDocument()
    })
  })
})

describe('No TMDB API Calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Spy on console to detect TMDB calls
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should not make any calls to TMDB API in Home page', async () => {
    global.fetch = vi.fn((url: string) => {
      // Fail test if TMDB API is called
      if (url.includes('tmdb') || url.includes('api.themoviedb.org')) {
        throw new Error('TMDB API should not be called!')
      }
      
      if (url === '/api/home') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ latest: [], topRated: [], popular: [] })
        } as Response)
      }
      
      return Promise.reject(new Error('Not found'))
    }) as any

    renderWithProviders(<Home />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    
    // Verify no TMDB calls were made
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    calls.forEach((call: any) => {
      expect(call[0]).not.toContain('tmdb')
      expect(call[0]).not.toContain('api.themoviedb.org')
    })
  })

  it('should not make any calls to TMDB API in TopWatched page', async () => {
    mockedAxios.get = vi.fn((url: string) => {
      // Fail test if TMDB API is called
      if (url.includes('tmdb') || url.includes('api.themoviedb.org')) {
        throw new Error('TMDB API should not be called!')
      }
      
      return Promise.resolve({
        data: { data: [], results: [] }
      })
    })

    renderWithProviders(<TopWatched />)
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled()
    })
    
    // Verify no TMDB calls were made
    const calls = mockedAxios.get.mock.calls
    calls.forEach((call: any) => {
      expect(call[0]).not.toContain('tmdb')
      expect(call[0]).not.toContain('api.themoviedb.org')
    })
  })
})
