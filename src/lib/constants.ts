export const CONFIG = {
  SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  SUPABASE_ANON_KEY: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  TMDB_API_KEY: (import.meta.env.VITE_TMDB_API_KEY as string) || '',
  YOUTUBE_API_KEY: (import.meta.env.VITE_YOUTUBE_API_KEY as string) || '',
  DOMAIN: (import.meta.env.VITE_DOMAIN as string) || 'https://cinma.online',
  API_BASE: (import.meta.env.VITE_API_BASE as string) || ''
}

// Log warning if keys are missing (visible in browser console)
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase keys are missing! Check your environment variables.')
}

export const FLAGS = {
  ADS_ENABLED:
    import.meta.env.MODE === 'production' &&
    !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) &&
    /supabase\.co/.test(CONFIG.SUPABASE_URL),
}

export function assertEnv() {
  // Disabled to prevent crash
  // const values = Object.entries(CONFIG)
  // for (const [k, v] of values) {
  //   if (!v) throw new Error(`Missing env: ${k}`)
  // }
}
