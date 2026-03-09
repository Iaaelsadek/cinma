import { supabase } from './supabase'

// Helper to get env var safely
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key]
  }
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    return (window as any).__RUNTIME_CONFIG__[key]
  }
  return ''
}

const GEMINI_API_KEY = getEnv('VITE_GEMINI_API_KEY')

export interface TranslatedContent {
  title_ar?: string
  overview_ar?: string
  title_en?: string
  overview_en?: string
}

export async function getTranslation(movie: any): Promise<TranslatedContent | null> {
  if (!movie || !movie.id) return null

  const mediaType = movie.media_type === 'tv' || movie.name ? 'tv' : 'movie'
  const originalTitle = movie.title || movie.name || ''
  const originalOverview = movie.overview || ''

  // 1. Check Supabase cache
  try {
    const { data, error } = await supabase
      .from('content_translations')
      .select('title_ar, overview_ar, title_en, overview_en')
      .eq('tmdb_id', movie.id)
      .eq('media_type', mediaType)
      .single()

    if (data && (data.title_ar || data.title_en)) {
      return data
    }
  } catch (e) {
    // Ignore error, proceed to translation
  }

  // 2. If missing, translate via Gemini
  if (!GEMINI_API_KEY) {
    console.warn('Missing Gemini API Key')
    return null
  }

  try {
    const prompt = `Translate the following to Arabic and English. If the original is already English, keep English as is. If original is Arabic, keep Arabic as is. Ensure strict translation without explanations.
    Original Title: "${originalTitle}"
    Original Overview: "${originalOverview}"
    
    Return strictly valid JSON:
    {
      "title_ar": "Arabic Title",
      "overview_ar": "Arabic Overview",
      "title_en": "English Title",
      "overview_en": "English Overview"
    }`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) return null

    // Extract JSON from markdown code block if present
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(jsonStr)

    // 3. Save to Supabase
    const { error: insertError } = await supabase.from('content_translations').upsert({
      tmdb_id: movie.id,
      media_type: mediaType,
      title_ar: result.title_ar,
      overview_ar: result.overview_ar,
      title_en: result.title_en,
      overview_en: result.overview_en
    }, { onConflict: 'tmdb_id,media_type' })

    if (insertError) {
        console.error('Failed to save translation:', insertError)
    }

    return result
  } catch (e) {
    console.error('Translation failed:', e)
    return null
  }
}
