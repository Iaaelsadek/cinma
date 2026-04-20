/**
 * Bug Condition Exploration Test - TV Series Title Hierarchy
 * 
 * **Property 1: Bug Condition** - TV Series Display English Title First
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * 
 * This test validates Requirements 1.8, 2.8
 * 
 * **Validates: Requirements 1.8, 2.8**
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
    resolveOverviewWithFallback: (content: any) => content.overview || '',
    resolveTitleWithFallback: (content: any) => content.title || content.name || ''
}))

vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { videos: '[]' } })
    }
}))

describe('Bug Condition Exploration - TV Series Title Hierarchy', () => {
    it('should FAIL: TV series displays English title as primary', () => {
        // Simulate TV series with both Arabic and English names
        const tvSeries = {
            id: 1234,
            slug: 'the-handmaids-tale',
            name: 'The Handmaid\'s Tale', // Original name
            name_ar: 'حكاية الخادمة', // Arabic name
            name_en: 'The Handmaid\'s Tale', // English name
            original_name: 'The Handmaid\'s Tale',
            first_air_date: '2017-04-26',
            poster_path: '/poster.jpg',
            vote_average: 8.2,
            overview: 'Set in a dystopian future',
            media_type: 'tv' as const,
            primary_genre: 'drama'
        }

        const { container } = render(
            <BrowserRouter>
                <MovieCard movie={tvSeries} index={0} isVisible={true} />
            </BrowserRouter>
        )

        console.log('🐛 TESTING TV SERIES TITLE HIERARCHY:')
        console.log('TV Series:', tvSeries.name)
        console.log('name_ar:', tvSeries.name_ar)
        console.log('name_en:', tvSeries.name_en)
        console.log('User language: Arabic (ar)')
        console.log('')

        // Get all text content from the card
        const cardText = container.textContent || ''
        console.log('Card displays:', cardText)

        // Check which title is displayed first/prominently
        const arabicTitle = tvSeries.name_ar
        const englishTitle = tvSeries.name_en

        const arabicIndex = cardText.indexOf(arabicTitle)
        const englishIndex = cardText.indexOf(englishTitle)

        console.log('')
        console.log('Arabic title position:', arabicIndex)
        console.log('English title position:', englishIndex)

        // EXPECTED BEHAVIOR (after fix): Arabic title should appear first (lower index)
        // CURRENT BEHAVIOR (bug): English title appears first or Arabic not shown

        if (arabicIndex === -1) {
            console.log('🐛 BUG FOUND: Arabic title NOT displayed at all')
            console.log('Expected: "حكاية الخادمة" should be the primary title')
            console.log('Actual: Arabic title is missing')
        } else if (englishIndex !== -1 && englishIndex < arabicIndex) {
            console.log('🐛 BUG FOUND: English title displayed before Arabic')
            console.log('Expected: Arabic title first, English as subtitle')
            console.log('Actual: English title appears first')
        } else {
            console.log('✅ Correct: Arabic title displayed first')
        }

        // This assertion should FAIL on unfixed code (proving the bug exists)
        // After fix, Arabic title should appear before English (or English not shown)
        expect(arabicIndex).not.toBe(-1) // Arabic should be displayed
        expect(arabicIndex).toBeLessThan(englishIndex === -1 ? Infinity : englishIndex) // Arabic should come first
    })

    it('should FAIL: Riverdale TV series shows English first', () => {
        const tvSeries = {
            id: 69050,
            slug: 'riverdale',
            name: 'Riverdale',
            name_ar: 'ريفرديل',
            name_en: 'Riverdale',
            original_name: 'Riverdale',
            first_air_date: '2017-01-26',
            poster_path: '/poster.jpg',
            vote_average: 7.2,
            overview: 'Set in the present',
            media_type: 'tv' as const,
            primary_genre: 'drama'
        }

        const { container } = render(
            <BrowserRouter>
                <MovieCard movie={tvSeries} index={0} isVisible={true} />
            </BrowserRouter>
        )

        console.log('🐛 COUNTEREXAMPLE FOUND:')
        console.log('TV Series: Riverdale')
        console.log('name_ar:', tvSeries.name_ar)
        console.log('name_en:', tvSeries.name_en)
        console.log('')

        const cardText = container.textContent || ''
        const arabicIndex = cardText.indexOf(tvSeries.name_ar)
        const englishIndex = cardText.indexOf(tvSeries.name_en)

        console.log('Card text:', cardText)
        console.log('Arabic "ريفرديل" position:', arabicIndex)
        console.log('English "Riverdale" position:', englishIndex)
        console.log('')
        console.log('Expected: Arabic title first with English subtitle')
        console.log('Actual: English title displayed first or Arabic missing')

        // Bug: English title appears first
        expect(arabicIndex).not.toBe(-1)
        expect(arabicIndex).toBeLessThan(englishIndex === -1 ? Infinity : englishIndex)
    })

    it('should FAIL: Breaking Bad shows English instead of Arabic', () => {
        const tvSeries = {
            id: 1396,
            slug: 'breaking-bad',
            name: 'Breaking Bad',
            name_ar: 'بريكنج باد',
            name_en: 'Breaking Bad',
            original_name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            poster_path: '/poster.jpg',
            vote_average: 9.5,
            overview: 'A high school chemistry teacher',
            media_type: 'tv' as const,
            primary_genre: 'drama'
        }

        const { container } = render(
            <BrowserRouter>
                <MovieCard movie={tvSeries} index={0} isVisible={true} />
            </BrowserRouter>
        )

        console.log('🐛 COUNTEREXAMPLE - Breaking Bad:')
        console.log('name_ar:', tvSeries.name_ar)
        console.log('name_en:', tvSeries.name_en)

        const cardText = container.textContent || ''
        const hasArabic = cardText.includes(tvSeries.name_ar)
        const hasEnglish = cardText.includes(tvSeries.name_en)

        console.log('Displays Arabic title:', hasArabic)
        console.log('Displays English title:', hasEnglish)

        if (!hasArabic && hasEnglish) {
            console.log('🐛 BUG: Only English title shown, Arabic missing')
        } else if (hasArabic && hasEnglish) {
            const arabicIndex = cardText.indexOf(tvSeries.name_ar)
            const englishIndex = cardText.indexOf(tvSeries.name_en)
            if (englishIndex < arabicIndex) {
                console.log('🐛 BUG: English title appears before Arabic')
            }
        }

        expect(hasArabic).toBe(true)
    })

    it('should work correctly: movies display Arabic title first (preservation)', () => {
        // Test that movies (not TV series) already work correctly
        const movie = {
            id: 550,
            slug: 'inception',
            title: 'Inception',
            title_ar: 'البداية',
            title_en: 'Inception',
            original_title: 'Inception',
            release_date: '2010-07-16',
            poster_path: '/poster.jpg',
            vote_average: 8.8,
            overview: 'A thief who steals corporate secrets',
            media_type: 'movie' as const,
            primary_genre: 'sci-fi'
        }

        const { container } = render(
            <BrowserRouter>
                <MovieCard movie={movie} index={0} isVisible={true} />
            </BrowserRouter>
        )

        console.log('✅ Movie title hierarchy test (preservation):')
        console.log('Movie:', movie.title)
        console.log('title_ar:', movie.title_ar)
        console.log('title_en:', movie.title_en)

        const cardText = container.textContent || ''
        const hasArabic = cardText.includes(movie.title_ar)

        console.log('Displays Arabic title:', hasArabic)
        console.log('This should already work correctly for movies')

        // Movies should already display Arabic title correctly
        expect(hasArabic).toBe(true)
    })

    it('should document the root cause: title field handling', () => {
        console.log('\n🔬 ROOT CAUSE ANALYSIS:')
        console.log('Issue: TV series use different field names than movies')
        console.log('')
        console.log('Movies use:')
        console.log('  - title_ar (Arabic title)')
        console.log('  - title_en (English title)')
        console.log('  - original_title (original language title)')
        console.log('')
        console.log('TV Series use:')
        console.log('  - name_ar (Arabic name)')
        console.log('  - name_en (English name)')
        console.log('  - original_name (original language name)')
        console.log('')
        console.log('Problem: useTripleTitles() or useDualTitles() hooks may not handle TV series fields correctly')
        console.log('Expected: name_ar should be prioritized over name_en for TV series')
        console.log('Actual: name_en or original_name displayed first')
        console.log('')
        console.log('Fix location: src/hooks/useTripleTitles.ts or src/hooks/useDualTitles.ts')
        console.log('Need to add TV series detection and proper field priority')

        // Verify the bug with a simple test
        const tvSeries = {
            id: 1,
            slug: 'test-series',
            name: 'Test Series',
            name_ar: 'مسلسل تجريبي',
            name_en: 'Test Series',
            original_name: 'Test Series',
            media_type: 'tv' as const,
            first_air_date: '2020-01-01',
            poster_path: '/poster.jpg',
            vote_average: 8.0,
            overview: 'Test',
            primary_genre: 'drama'
        }

        const { container } = render(
            <BrowserRouter>
                <MovieCard movie={tvSeries} index={0} isVisible={true} />
            </BrowserRouter>
        )

        const cardText = container.textContent || ''
        const arabicIndex = cardText.indexOf(tvSeries.name_ar)
        const englishIndex = cardText.indexOf(tvSeries.name_en)

        console.log('')
        console.log('Test result:')
        console.log('Arabic position:', arabicIndex)
        console.log('English position:', englishIndex)

        // Bug should exist
        expect(arabicIndex).not.toBe(-1)
        if (englishIndex !== -1) {
            expect(arabicIndex).toBeLessThan(englishIndex)
        }
    })
})
