export async function onRequestGet(context) {
  const env = context?.env || {}
  const runtime = typeof process !== 'undefined' ? process.env || {} : {}
  const getVal = (key, fallback = '') => env[key] || runtime[key] || fallback
  const payload = {
    VITE_SUPABASE_URL: getVal('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getVal('VITE_SUPABASE_ANON_KEY'),
    VITE_TMDB_API_KEY: getVal('VITE_TMDB_API_KEY'),
    VITE_API_BASE: getVal('VITE_API_BASE'),
    VITE_DOMAIN: getVal('VITE_DOMAIN', 'https://cinma.online'),
    VITE_GEMINI_API_KEY: getVal('VITE_GEMINI_API_KEY'),
    VITE_YOUTUBE_API_KEY: getVal('VITE_YOUTUBE_API_KEY')
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}
