import { supabase } from './supabase'

const OS_API_KEY = import.meta.env.VITE_OPENSUBTITLES_KEY || ''
const BASE_URL = 'https://api.opensubtitles.com/api/v1'

export type SubtitleTrack = {
  label: string
  src: string
  srcLang: string
  default?: boolean
}

export async function fetchSubtitles(tmdbId: number | string, imdbId?: string, lang = 'ar'): Promise<SubtitleTrack[]> {
  // 1. Try to get from Supabase first (if we have stored subtitles)
  const { data: storedSubs } = await supabase
    .from('subtitles')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('lang', lang)
  
  if (storedSubs && storedSubs.length > 0) {
    return storedSubs.map(sub => ({
      label: sub.language || 'Arabic',
      src: sub.url,
      srcLang: sub.lang,
      default: true
    }))
  }

  // 2. If no stored subs, try OpenSubtitles (if Key is present)
  if (OS_API_KEY && imdbId) {
    try {
      const response = await fetch(`${BASE_URL}/subtitles?imdb_id=${imdbId.replace('tt', '')}&languages=${lang}`, {
        headers: {
          'Api-Key': OS_API_KEY,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        // Return the best match (e.g. most downloaded)
        const best = data.data.sort((a: any, b: any) => b.attributes.download_count - a.attributes.download_count)[0]
        if (best && best.attributes.files[0]) {
             // We need to get the download link. OpenSubtitles requires a separate call for download usually or provides a link.
             // For the REST API, we might need to request a download link.
             // For simplicity in this demo, we'll return a placeholder if we can't get the direct link without auth.
             // But actually, `best.attributes.files[0].file_id` is needed to download.
             
             const downloadRes = await fetch(`${BASE_URL}/download`, {
                method: 'POST',
                headers: { 'Api-Key': OS_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: best.attributes.files[0].file_id })
             })
             const downloadData = await downloadRes.json()
             if (downloadData.link) {
                 return [{
                     label: 'Arabic (Auto)',
                     src: downloadData.link,
                     srcLang: lang,
                     default: true
                 }]
             }
        }
      }
    } catch (e) {
      console.error('Failed to fetch subtitles:', e)
    }
  }

  return []
}
