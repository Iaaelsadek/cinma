export const CONFIG = {
  SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL as string) || 'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  SUPABASE_ANON_KEY: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w',
  TMDB_API_KEY: (import.meta.env.VITE_TMDB_API_KEY as string) || 'afef094e7c0de13c1cac98227a61da4d',
  YOUTUBE_API_KEY: (import.meta.env.VITE_YOUTUBE_API_KEY as string) || 'AIzaSyCuGitj3yGAWG0K09mJ2NxyUXgfPKsVegc',
  GEMINI_API_KEY: (import.meta.env.VITE_GEMINI_API_KEY as string) || 'AIzaSyAAIMKLKZAkKCNy247cDDH6AE0tQ0nyMl8',
  DOMAIN: (import.meta.env.VITE_DOMAIN as string) || 'https://cinma.online',
  API_BASE: (import.meta.env.VITE_API_BASE as string) || ''
}

// Log warning if keys are missing (visible in browser console)
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  // console.warn('⚠️ Supabase keys are missing! Check your environment variables.')
}

export const FLAGS = {
  ADS_ENABLED: false,
}

export function assertEnv() {
  // Disabled to prevent crash
  // const values = Object.entries(CONFIG)
  // for (const [k, v] of values) {
  //   if (!v) throw new Error(`Missing env: ${k}`)
  // }
}
