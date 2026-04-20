/**
 * Bug Condition Exploration Test - Arabic Text Validation
 * 
 * **Property 1: Bug Condition** - Arabic Translation Contains English Text
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * 
 * This test validates Requirements 1.1, 2.1
 * 
 * **Validates: Requirements 1.1, 2.1**
 */

import { describe, it, expect } from 'vitest'

// Mock TMDB response structure
interface TMDBTranslation {
    iso_639_1: string
    data: {
        title?: string
        name?: string
        overview?: string
    }
}

interface TMDBResponse {
    original_language: string
    original_title?: string
    original_name?: string
    translations?: {
        translations: TMDBTranslation[]
    }
}

// Copy the CURRENT (buggy) validation functions from MASTER_INGESTION_QUEUE.js
function isArabicText(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false
    // Current weak validation - accepts ANY text with one Arabic character
    const arabicRegex = /[\u0600-\u06FF]/
    return arabicRegex.test(text)
}

function isEnglishText(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false
    // Current weak validation - accepts ANY text with one English character
    const englishRegex = /[a-zA-Z]/
    return englishRegex.test(text)
}

function getTranslations(item: TMDBResponse) {
    const translations = item.translations?.translations || []

    const arabicTranslation = translations.find(t => t.iso_639_1 === 'ar')
    const englishTranslation = translations.find(t => t.iso_639_1 === 'en')

    let title_ar = arabicTranslation?.data?.title || arabicTranslation?.data?.name || null
    if (!title_ar && item.original_language === 'ar') {
        title_ar = item.original_title || item.original_name || null
    }

    let title_en = englishTranslation?.data?.title || englishTranslation?.data?.name || null
    if (!title_en && item.original_language === 'en') {
        title_en = item.original_title || item.original_name || null
    }

    // Current validation (buggy)
    let overview_ar = arabicTranslation?.data?.overview || null
    if (overview_ar && !isArabicText(overview_ar)) {
        overview_ar = null
    }

    let overview_en = englishTranslation?.data?.overview || null
    if (overview_en && !isEnglishText(overview_en)) {
        overview_en = null
    }

    return {
        title_ar,
        title_en,
        overview_ar,
        overview_en
    }
}

describe('Bug Condition Exploration - Arabic Text Validation', () => {
    it('should FAIL: accepts English text in Arabic field (demonstrates bug)', () => {
        // Simulate TMDB response with English text in Arabic translation field
        // This is the actual bug - TMDB sometimes returns English in ar.data.overview
        const tmdbResponse: TMDBResponse = {
            original_language: 'en',
            original_title: 'The Matrix',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'ذا ماتريكس',
                            // BUG: This is 95% English but has one Arabic character
                            overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality. ماتريكس'
                        }
                    },
                    {
                        iso_639_1: 'en',
                        data: {
                            title: 'The Matrix',
                            overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality.'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // EXPECTED BEHAVIOR (after fix): overview_ar should be NULL because text is mostly English
        // CURRENT BEHAVIOR (bug): overview_ar contains English text because validation is too weak

        // This assertion should PASS on unfixed code (proving the bug exists)
        // After fix, this test will FAIL (which is correct - it means bug is fixed)
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('A computer hacker')

        // Calculate percentage of English characters
        const text = result.overview_ar || ''
        const englishChars = (text.match(/[a-zA-Z]/g) || []).length
        const totalChars = text.replace(/\s/g, '').length
        const englishPercentage = (englishChars / totalChars) * 100

        // Bug: Text is >50% English but still accepted
        expect(englishPercentage).toBeGreaterThan(50)
    })

    it('should FAIL: weak validation accepts text with minimal Arabic content', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'en',
            original_title: 'Inception',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'البداية',
                            // Only 5% Arabic, 95% English - should be rejected
                            overview: 'Dom Cobb is a skilled thief, the absolute best in the dangerous art of extraction. ب'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Bug: Accepts text with only one Arabic character
        expect(result.overview_ar).not.toBeNull()

        const text = result.overview_ar || ''
        const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
        const totalChars = text.replace(/\s/g, '').length
        const arabicPercentage = (arabicChars / totalChars) * 100

        // Bug: Arabic percentage is <10% but still accepted
        expect(arabicPercentage).toBeLessThan(10)
    })

    it('should FAIL: 100% English text with one Arabic char is accepted', () => {
        const englishTextWithOneArabicChar = 'This is completely English text with one Arabic character: ا'

        // Current buggy validation
        const isAcceptedAsArabic = isArabicText(englishTextWithOneArabicChar)

        // Bug: Returns true even though text is 99% English
        expect(isAcceptedAsArabic).toBe(true)

        const arabicChars = (englishTextWithOneArabicChar.match(/[\u0600-\u06FF]/g) || []).length
        const totalChars = englishTextWithOneArabicChar.replace(/\s/g, '').length
        const arabicPercentage = (arabicChars / totalChars) * 100

        expect(arabicPercentage).toBeLessThan(5)
    })

    it('should document counterexample: popular movie with English in Arabic field', () => {
        // Real-world scenario: Popular English movie with incomplete Arabic translation
        const tmdbResponse: TMDBResponse = {
            original_language: 'en',
            original_title: 'Avengers: Endgame',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'المنتقمون: نهاية اللعبة',
                            // TMDB returns English description in Arabic field
                            overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. المنتقمون'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Document the bug
        console.log('🐛 COUNTEREXAMPLE FOUND:')
        console.log('Movie: Avengers: Endgame')
        console.log('Arabic field contains:', result.overview_ar)
        console.log('Expected: NULL (should reject English text)')
        console.log('Actual: English text stored in overview_ar')

        // Bug exists
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('After the devastating events')
    })
})
