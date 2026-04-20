/**
 * Bug Condition Exploration Test - Genre Display in Similar Content
 * 
 * **Property 1: Bug Condition** - Genre Missing in Similar Content Section
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * 
 * This test validates Requirements 1.3, 2.3
 * 
 * **Validates: Requirements 1.3, 2.3**
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MovieCard } from '../../components/features/media/MovieCard'

// Mock dependencies
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: null })
}))

vi.mock('../../state/useLang', () => ({
    useLang: () => ({ lang: 'ar' })
}))

vi.mock('../../lib/supabase', () => ({
    addToWatchlist: vi.fn(),
    isInWatchlist: vi.fn().mockResolvedValue(false),
    removeFromWatchlist: vi.fn()
}))

vi.mock('../../lib/translation', () => ({
    getTranslation: vi.fn().mockResolvedValue(null),
    resolveOverviewWithFallback: (movie: any) => movie.overview || '',
    resolveTitleWithFallback: (movie: any) => movie.title || movie.name || ''
}))

vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { videos: '[]' } })
    }
}))

describe('Bug Condition Exploration - Genre Display in Similar Content', () => {
    const mockMovie = {
        id: 550,
        slug: 'inception',
        title: 'Inception',
        title_ar: 'البداية',
        title_en: 'Inception',
        release_date: '2010-07-16',
        poster_path: '/poster.jpg',
        vote_average: 8.8,
        overview: 'A thief who steals corporate secrets',
        media_type: 'movie' as const,
        primary_genre: 'sci-fi', // Genre exists in database
        genre_ids: [878, 28, 53]
    }

    it('should display genre in MovieCard', () => {
        render(
            <BrowserRouter>
                <MovieCard movie={mockMovie} index={0} isVisible={true} />
            </BrowserRouter>
        )

        // Check if genre is displayed
        const genreText = screen.queryByText(/خيال علمي|sci-fi/i)

        // EXPECTED BEHAVIOR: Genre should be displayed
        // CURRENT BEHAVIOR: Check if genre is visible
        if (genreText) {
            console.log('✅ Genre is displayed:', genreText.textContent)
            expect(genreText).toBeInTheDocument()
        } else {
            console.log('🐛 BUG FOUND: Genre is NOT displayed in MovieCard')
            console.log('Movie has primary_genre:', mockMovie.primary_genre)
            console.log('Expected to see: "خيال علمي" (Arabic) or "sci-fi" (English)')

            // This assertion will FAIL if bug exists (genre not displayed)
            expect(genreText).toBeInTheDocument()
        }
    })

    it('should display genre when rendered in similar content context', () => {
        // Simulate rendering in "You Might Also Like" section
        const similarMovie = {
            ...mockMovie,
            id: 551,
            slug: 'the-matrix',
            title: 'The Matrix',
            title_ar: 'ذا ماتريكس',
            primary_genre: 'action'
        }

        render(
            <BrowserRouter>
                <div data-testid="similar-content-section">
                    <MovieCard movie={similarMovie} index={0} isVisible={true} />
                </div>
            </BrowserRouter>
        )

        // Check if genre is displayed in similar content section
        const genreText = screen.queryByText(/أكشن|action/i)

        if (genreText) {
            console.log('✅ Genre is displayed in similar content:', genreText.textContent)
            expect(genreText).toBeInTheDocument()
        } else {
            console.log('🐛 COUNTEREXAMPLE FOUND:')
            console.log('Movie: The Matrix')
            console.log('Context: Similar Content Section')
            console.log('primary_genre:', similarMovie.primary_genre)
            console.log('Expected: Genre should be displayed')
            console.log('Actual: Genre is NOT displayed')

            // Document the bug
            expect(genreText).toBeInTheDocument()
        }
    })

    it('should display genre for all movies with primary_genre field', () => {
        const moviesWithGenres = [
            { ...mockMovie, id: 1, slug: 'movie-1', primary_genre: 'action', title: 'Action Movie' },
            { ...mockMovie, id: 2, slug: 'movie-2', primary_genre: 'comedy', title: 'Comedy Movie' },
            { ...mockMovie, id: 3, slug: 'movie-3', primary_genre: 'drama', title: 'Drama Movie' }
        ]

        // Genre translations for validation
        const genreTranslations: Record<string, string> = {
            'action': 'أكشن',
            'comedy': 'كوميدي',
            'drama': 'دراما'
        }

        moviesWithGenres.forEach((movie) => {
            const { unmount } = render(
                <BrowserRouter>
                    <MovieCard movie={movie} index={0} isVisible={true} />
                </BrowserRouter>
            )

            // Check if genre is displayed (search for both Arabic and English)
            const arabicGenre = genreTranslations[movie.primary_genre]
            const hasGenre = screen.queryByText(new RegExp(`${arabicGenre}|${movie.primary_genre}`, 'i'))

            if (!hasGenre) {
                console.log(`🐛 Bug: Genre "${movie.primary_genre}" (${arabicGenre}) not displayed for movie "${movie.title}"`)
            }

            expect(hasGenre).toBeInTheDocument()
            unmount()
        })
    })

    it('should translate genre to Arabic when lang=ar', () => {
        const movieWithAction = {
            ...mockMovie,
            id: 999,
            slug: 'action-movie',
            title: 'Action Movie',
            primary_genre: 'action'
        }

        render(
            <BrowserRouter>
                <MovieCard movie={movieWithAction} index={0} isVisible={true} />
            </BrowserRouter>
        )

        // Should display Arabic translation "أكشن"
        const arabicGenre = screen.queryByText(/أكشن/i)

        if (arabicGenre) {
            console.log('✅ Genre is translated to Arabic:', arabicGenre.textContent)
            expect(arabicGenre).toBeInTheDocument()
        } else {
            console.log('🐛 Bug: Genre not translated to Arabic')
            console.log('Expected: "أكشن"')
            console.log('Actual: Genre not found or not translated')

            // Check if English genre is displayed instead
            const englishGenre = screen.queryByText(/action/i)
            if (englishGenre) {
                console.log('Found English genre instead:', englishGenre.textContent)
            }

            expect(arabicGenre).toBeInTheDocument()
        }
    })
})
