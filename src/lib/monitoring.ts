// ✅ Monitoring & Error Tracking with Sentry
import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const ENVIRONMENT = import.meta.env.MODE

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initMonitoring() {
  if (!SENTRY_DSN) {
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Error Filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (ENVIRONMENT === 'development') {
        return null
      }
      
      // Filter out known errors
      const error = hint.originalException as Error
      if (error?.message?.includes('ResizeObserver loop')) {
        return null
      }
      
      return event
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  })
}

/**
 * Log custom event to Sentry
 */
export function logEvent(message: string, level: 'info' | 'warning' | 'error' = 'info', extra?: Record<string, any>) {
  Sentry.captureMessage(message, {
    level,
    extra,
  })
}

/**
 * Log error to Sentry
 */
export function logError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user)
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

/**
 * Start performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, (span) => span)
}

/**
 * Performance monitoring helper
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  return Sentry.startSpan({ name, op: 'function' }, () => {
    return fn()
  })
}

/**
 * Async performance monitoring helper
 */
export async function measurePerformanceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name, op: 'function' }, async () => {
    return await fn()
  })
}
