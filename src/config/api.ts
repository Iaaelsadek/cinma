/**
 * 🌐 API Configuration - Single Source of Truth
 * 
 * This file centralizes all API configuration to prevent inconsistencies.
 * All API calls MUST use these constants.
 */

// Environment detection
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

/**
 * API Base URL
 * - Development: http://localhost:3001
 * - Production: https://api.4cima.com
 */
export const API_BASE_URL = isDevelopment
  ? 'http://localhost:3001'
  : import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://api.4cima.com';

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Health & Status
  HEALTH: `${API_BASE_URL}/api/db/health`,
  
  // Content
  MOVIES: `${API_BASE_URL}/api/movies`,
  SERIES: `${API_BASE_URL}/api/series`,
  ACTORS: `${API_BASE_URL}/api/actors`,
  VIDEOS: `${API_BASE_URL}/api/videos`,
  
  // User
  RATINGS: `${API_BASE_URL}/api/ratings`,
  REVIEWS: `${API_BASE_URL}/api/reviews`,
  CONTINUE_WATCHING: `${API_BASE_URL}/api/continue-watching`,
  
  // Admin
  ADMIN_CONTENT: `${API_BASE_URL}/api/admin/content`,
  ADMIN_INGESTION: `${API_BASE_URL}/api/admin/ingestion`,
  ADMIN_SYSTEM: `${API_BASE_URL}/api/admin/system`,
  
  // Other
  CHAT: `${API_BASE_URL}/api/chat`,
  EMBED_PROXY: `${API_BASE_URL}/api/embed-proxy`,
  LINK_CHECKS: `${API_BASE_URL}/api/link-checks`,
  LOG: `${API_BASE_URL}/api/log`,
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Helper function to build API URL
 */
export function buildApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}

/**
 * Helper function to get API key from environment
 */
export function getApiKey(): string | undefined {
  return import.meta.env.VITE_API_KEY;
}

/**
 * Helper function to get admin key from environment
 */
export function getAdminKey(): string | undefined {
  return import.meta.env.VITE_ADMIN_KEY;
}

/**
 * Debug info (only in development)
 */
if (isDevelopment) {
  console.log('🌐 API Configuration:', {
    BASE_URL: API_BASE_URL,
    MODE: import.meta.env.MODE,
    DEV: isDevelopment,
    PROD: isProduction,
  });
}
