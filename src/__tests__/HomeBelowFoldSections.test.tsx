import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
// stub heavy child components to avoid bringing in swiper/react via QuantumTrain
jest.mock('../components/features/media/QuantumTrain', () => ({
  __esModule: true,
  QuantumTrain: ({ items }: any) => <div data-testid="quantum-train">{items?.length}</div>
}))

jest.mock('../components/features/media/MovieCard', () => ({
  __esModule: true,
  MovieCard: ({ movie }: any) => <div data-testid="movie-card">{movie?.id}</div>
}))

// prevent hooks from doing real network requests
jest.mock('../hooks/useFetchContent', () => ({
  useCategoryVideos: () => ({ data: [] }),
  useClassicVideos: () => ({ data: [] }),
  useCachedHomepage: () => ({ data: null })
}))

jest.mock('../hooks/useDailyMotion', () => ({
  useDailyMotion: () => ({ data: [] })
}))

jest.mock('../hooks/useTranslatedContent', () => ({
  useTranslatedContent: (items: any) => ({ data: items || [] })
}))

// ensure our fallback query is allowed by giving CONFIG a fake api key
jest.mock('../lib/constants', () => ({
  CONFIG: { TMDB_API_KEY: 'fake-key' }
}))

import { HomeBelowFoldSections } from '../components/features/home/HomeBelowFoldSections'

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}))

jest.mock('../state/useLang', () => ({
  useLang: () => ({ lang: 'en' })
}))

// stub out TMDB helper so the fallback query can resolve predictable data
jest.mock('../lib/tmdb', () => ({
  tmdb: {
    get: jest.fn()
  }
}))

const { tmdb } = require('../lib/tmdb') as { tmdb: { get: jest.Mock } }

describe('HomeBelowFoldSections component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
  })

  it('shows movies when topRatedMovies prop is provided', () => {
    const fakeMovies = [
      { id: 1, poster_path: '/p1.jpg', title: 'One', media_type: 'movie' }
    ]

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomeBelowFoldSections
            criticalHomeData={{ popularAr: [], arabicSeries: [], kids: [] }}
            topRatedMovies={fakeMovies as any}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // MovieCard stub renders a div with data-testid="movie-card"
    const cards = container.querySelectorAll('[data-testid="movie-card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('fetches and displays movies when prop missing', async () => {
    const fakeMovies = [
      { id: 2, poster_path: '/p2.jpg', title: 'Two', media_type: 'movie' }
    ]
    tmdb.get.mockResolvedValue({ data: { results: fakeMovies } })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomeBelowFoldSections
            criticalHomeData={{ popularAr: [], arabicSeries: [], kids: [] }}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const cards = container.querySelectorAll('[data-testid="movie-card"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  it('also fetches when prop is empty array', async () => {
    const fakeMovies = [
      { id: 3, poster_path: '/p3.jpg', title: 'Three', media_type: 'movie' }
    ]
    tmdb.get.mockResolvedValue({ data: { results: fakeMovies } })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomeBelowFoldSections
            criticalHomeData={{ popularAr: [], arabicSeries: [], kids: [] }}
            topRatedMovies={[] as any}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const cards = container.querySelectorAll('[data-testid="movie-card"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})
