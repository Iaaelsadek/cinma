// server/lib/logger.js - Backend Logger System
const isDev = process.env.NODE_ENV !== 'production'

/**
 * Structured logger for backend
 * In production, logs only errors to console
 * In development, logs everything
 */
const logger = {
  /**
   * Info level - general information
   */
  info: (message, data) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, data || '')
    }
    // TODO: Send to logging service in production (e.g., Sentry breadcrumb)
  },
  
  /**
   * Error level - errors that need attention
   */
  error: (message, data) => {
    console.error(`[ERROR] ${message}`, data || '')
    // TODO: Send to Sentry in production
  },
  
  /**
   * Warning level - potential issues
   */
  warn: (message, data) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data || '')
    }
    // TODO: Send to logging service in production
  },
  
  /**
   * Debug level - detailed debugging info
   */
  debug: (message, data) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, data || '')
    }
  },
  
  /**
   * Success level - successful operations
   */
  success: (message, data) => {
    if (isDev) {
      console.log(`[SUCCESS] ✅ ${message}`, data || '')
    }
  }
}

module.exports = logger
