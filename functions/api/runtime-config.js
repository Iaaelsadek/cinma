export async function onRequestGet(context) {
  const env = context?.env || {}
  const payload = {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
    VITE_TMDB_API_KEY: env.VITE_TMDB_API_KEY || '',
    VITE_API_BASE: env.VITE_API_BASE || '',
    VITE_DOMAIN: env.VITE_DOMAIN || 'https://cinma.online',
    VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || '',
    VITE_YOUTUBE_API_KEY: env.VITE_YOUTUBE_API_KEY || ''
  }
  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}
