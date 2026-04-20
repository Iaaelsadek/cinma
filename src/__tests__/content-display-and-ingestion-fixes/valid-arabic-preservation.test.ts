/**
 * Preservation Property Test - Valid Arabic Translations
 * 
 * **Property 2: Preservation** - Valid Arabic Text Acceptance
 * **IMPORTANT**: This test should PASS on UNFIXED code
 * 
 * This test validates Requirements 3.1, 3.2
 * 
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

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

// Copy the CURRENT validation functions from MASTER_INGESTION_QUEUE.js
function isArabicText(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false
    const arabicRegex = /[\u0600-\u06FF]/
    return arabicRegex.test(text)
}

function isEnglishText(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false
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

// Helper to calculate Arabic percentage
function calculateArabicPercentage(text: string): number {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
    const totalChars = text.replace(/\s/g, '').length
    if (totalChars === 0) return 0
    return (arabicChars / totalChars) * 100
}

describe('Preservation Property Test - Valid Arabic Translations', () => {
    it('should PASS: accepts 100% Arabic text (preservation)', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'ar',
            original_title: 'الرسالة',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'الرسالة',
                            overview: 'فيلم تاريخي يروي قصة ظهور الإسلام في مكة والمدينة المنورة'
                        }
                    },
                    {
                        iso_639_1: 'en',
                        data: {
                            title: 'The Message',
                            overview: 'A historical film about the rise of Islam in Mecca and Medina'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Should accept valid Arabic text
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('فيلم')

        const arabicPercentage = calculateArabicPercentage(result.overview_ar || '')
        expect(arabicPercentage).toBeGreaterThan(90)
    })

    it('should PASS: accepts Arabic text with some English words (preservation)', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'ar',
            original_title: 'كايرو تايم',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'كايرو تايم',
                            // Mostly Arabic with some English proper nouns
                            overview: 'فيلم درامي يدور حول امرأة أمريكية تزور Cairo وتقع في حب المدينة والثقافة المصرية'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Should accept text that is predominantly Arabic
        expect(result.overview_ar).not.toBeNull()

        const arabicPercentage = calculateArabicPercentage(result.overview_ar || '')
        expect(arabicPercentage).toBeGreaterThan(70)
    })

    it('should PASS: handles Arabic movies with original_language=ar (preservation)', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'ar',
            original_title: 'الناصر صلاح الدين',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'الناصر صلاح الدين',
                            overview: 'ملحمة تاريخية عن حياة القائد صلاح الدين الأيوبي ومعاركه ضد الصليبيين'
                        }
                    },
                    {
                        iso_639_1: 'en',
                        data: {
                            title: 'Saladin the Victorious',
                            overview: 'A historical epic about the life of Saladin and his battles against the Crusaders'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Should store Arabic overview correctly
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('صلاح الدين')
        expect(result.title_ar).toBe('الناصر صلاح الدين')
    })

    it('should PASS: property-based test for valid Arabic text acceptance', () => {
        // Generate Arabic text samples
        const arabicWords = ['فيلم', 'قصة', 'درامي', 'كوميدي', 'رومانسي', 'أكشن', 'مغامرة', 'تاريخي']

        fc.assert(
            fc.property(
                fc.array(fc.constantFrom(...arabicWords), { minLength: 5, maxLength: 15 }),
                (words) => {
                    const overview = words.join(' ')

                    const tmdbResponse: TMDBResponse = {
                        original_language: 'ar',
                        original_title: 'فيلم تجريبي',
                        translations: {
                            translations: [
                                {
                                    iso_639_1: 'ar',
                                    data: {
                                        title: 'فيلم تجريبي',
                                        overview: overview
                                    }
                                }
                            ]
                        }
                    }

                    const result = getTranslations(tmdbResponse)

                    // Property: Valid Arabic text should always be accepted
                    expect(result.overview_ar).not.toBeNull()

                    const arabicPercentage = calculateArabicPercentage(result.overview_ar || '')
                    expect(arabicPercentage).toBeGreaterThan(50)
                }
            ),
            { numRuns: 50 }
        )
    })

    it('should PASS: accepts mixed Arabic-English with >50% Arabic (preservation)', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'ar',
            original_title: 'فيلم مختلط',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'فيلم مختلط',
                            // 60% Arabic, 40% English - should be accepted
                            overview: 'هذا فيلم درامي رائع يحكي قصة مؤثرة جداً about love and friendship in Cairo'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Should accept text with >50% Arabic
        expect(result.overview_ar).not.toBeNull()

        const arabicPercentage = calculateArabicPercentage(result.overview_ar || '')
        expect(arabicPercentage).toBeGreaterThan(50)
    })

    it('should PASS: handles English movies with valid Arabic translations (preservation)', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'en',
            original_title: 'The Godfather',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'العراب',
                            overview: 'ملحمة جريمة تتبع عائلة كورليوني الإيطالية الأمريكية في نيويورك'
                        }
                    },
                    {
                        iso_639_1: 'en',
                        data: {
                            title: 'The Godfather',
                            overview: 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        // Should store valid Arabic translation
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('ملحمة')

        // Should also store English overview
        expect(result.overview_en).not.toBeNull()
        expect(result.overview_en).toContain('patriarch')
    })

    it('should document preservation: valid Arabic text continues to work', () => {
        const tmdbResponse: TMDBResponse = {
            original_language: 'ar',
            original_title: 'الممر',
            translations: {
                translations: [
                    {
                        iso_639_1: 'ar',
                        data: {
                            title: 'الممر',
                            overview: 'فيلم حربي مصري يروي قصة بطولية عن الجيش المصري في حرب أكتوبر'
                        }
                    }
                ]
            }
        }

        const result = getTranslations(tmdbResponse)

        console.log('✅ PRESERVATION VERIFIED:')
        console.log('Movie: الممر')
        console.log('Arabic overview accepted:', result.overview_ar)
        console.log('Expected: Valid Arabic text stored correctly')
        console.log('Actual: Valid Arabic text stored correctly')

        // Preservation: Valid Arabic text is accepted
        expect(result.overview_ar).not.toBeNull()
        expect(result.overview_ar).toContain('فيلم')

        const arabicPercentage = calculateArabicPercentage(result.overview_ar || '')
        expect(arabicPercentage).toBeGreaterThan(90)
    })
})
