/**
 * Actor Translation Helper
 * Handles fetching actor details and translating names/biographies
 */

import { translateContent } from '../services/translation-service.js';

/**
 * Check if text is Arabic (>50% Arabic characters)
 */
export function isArabicText(text) {
    if (!text || typeof text !== 'string') return false;
    const textWithoutSpaces = text.replace(/\s/g, '');
    if (textWithoutSpaces.length === 0) return false;
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const arabicPercentage = (arabicChars / textWithoutSpaces.length) * 100;
    return arabicPercentage > 50;
}

/**
 * Fetch actor details with translations from TMDB
 * @param {Function} fetchFromTMDB - TMDB fetch function
 * @param {number} actorId - TMDB actor ID
 * @param {string} actorName - Actor name from cast
 * @returns {Promise<Object>} { name_en, name_ar, biography_ar }
 */
export async function fetchActorWithTranslations(fetchFromTMDB, actorId, actorName) {
    let name_en = actorName;
    let name_ar = null;
    let biography_ar = null;

    try {
        // Fetch actor details with translations
        const actorDetails = await fetchFromTMDB(`/person/${actorId}`, {
            append_to_response: 'translations'
        });

        const translations = actorDetails.translations?.translations || [];
        const arTranslation = translations.find(t => t.iso_639_1 === 'ar');
        const enTranslation = translations.find(t => t.iso_639_1 === 'en');

        // English name
        name_en = enTranslation?.data?.name || actorDetails.name || actorName;

        // Arabic name from TMDB
        name_ar = arTranslation?.data?.name || null;

        // Arabic biography from TMDB
        let bio_ar_raw = arTranslation?.data?.biography || null;
        if (bio_ar_raw && isArabicText(bio_ar_raw)) {
            biography_ar = bio_ar_raw;
        }

        // If no Arabic name → translate
        if (!name_ar && name_en) {
            console.log(`   🌐 ترجمة اسم الممثل: "${name_en}"`);
            const translated = await translateContent({ title_en: name_en });
            name_ar = translated.title_ar;
            if (name_ar) {
                console.log(`   ✅ اسم مترجم: "${name_ar}"`);
            }
        }

        // If no Arabic biography → translate from English
        if (!biography_ar) {
            const bio_en = enTranslation?.data?.biography || actorDetails.biography || null;
            if (bio_en && bio_en.length > 10) {
                console.log(`   🌐 ترجمة سيرة الممثل (${bio_en.length} حرف)...`);
                const translated = await translateContent({ overview_en: bio_en });
                biography_ar = translated.overview_ar;
                if (biography_ar) {
                    console.log(`   ✅ سيرة مترجمة (${biography_ar.length} حرف)`);
                }
            }
        }

    } catch (detailError) {
        console.log(`   ⚠️  فشل جلب تفاصيل الممثل: ${detailError.message}`);
    }

    return { name_en, name_ar, biography_ar };
}
