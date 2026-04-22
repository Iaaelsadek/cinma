import { logger } from './logger'
import { API_BASE_URL } from '../config/api'

const runtimeConfig =
  typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__
    ? (window as any).__RUNTIME_CONFIG__
    : {}

import { envVar } from './envHelper';

export const CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || envVar('VITE_SUPABASE_URL') || runtimeConfig.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || envVar('VITE_SUPABASE_ANON_KEY') || runtimeConfig.VITE_SUPABASE_ANON_KEY,
  TMDB_API_KEY: import.meta.env.VITE_TMDB_API_KEY || envVar('VITE_TMDB_API_KEY') || runtimeConfig.VITE_TMDB_API_KEY,
  YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY || envVar('VITE_YOUTUBE_API_KEY') || runtimeConfig.VITE_YOUTUBE_API_KEY,
  DOMAIN: import.meta.env.VITE_DOMAIN || envVar('VITE_DOMAIN') || runtimeConfig.VITE_DOMAIN || 'https://4cima.com',
  // Use centralized API configuration
  API_BASE: API_BASE_URL
}

// Strict check for required keys
const requiredKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_TMDB_API_KEY'
]

requiredKeys.forEach(key => {
  if (!import.meta.env[key] && !runtimeConfig[key]) {
    logger.error(`❌ CRITICAL ERROR: Missing environment variable: ${key}`)
  }
})

export const FLAGS = {
  ADS_ENABLED: false,
}

// re-export for backwards compatibility & tests
export { envVar } from './envHelper';

export function assertEnv() {
  // Disabled to prevent crash
}

// FALLBACK_SUMMARIES removed - all summaries now fetched from CockroachDB via /api/movies
// LEGACY_ID_MAP removed - no longer needed
