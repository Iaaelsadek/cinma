// ✅ Centralized Error Logging System
import { logger } from './logger'

interface ErrorLog {
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'network' | 'auth' | 'database' | 'ui' | 'api' | 'unknown'
  context?: Record<string, any>
  timestamp?: string
  userId?: string
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 100

  logError(error: ErrorLog) {
    const log: ErrorLog = {
      ...error,
      timestamp: new Date().toISOString(),
    }

    // Add to memory
    this.logs.unshift(log)
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }

    // Console log in development
    if (import.meta.env.DEV) {
      const emoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
      }[error.severity]

      logger.error(`${emoji} [${error.category.toUpperCase()}] ${error.message}`, {
        severity: error.severity,
        timestamp: log.timestamp,
        context: error.context
      })
    }

    // Send to monitoring service in production
    if (import.meta.env.PROD) {
      this.sendToMonitoring(log)
    }
  }

  private async sendToMonitoring(log: ErrorLog) {
    try {
      // TODO: Integrate with Sentry, LogRocket, or similar
      const apiUrl = import.meta.env.VITE_API_URL || ''
      await fetch(`${apiUrl}/api/log-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
    } catch (e: any) {
      // Silent fail - don't break app if logging fails
      console.error('Failed to send error log:', e)
    }
  }

  getLogs(filter?: { severity?: string; category?: string }) {
    let filtered = this.logs

    if (filter?.severity) {
      filtered = filtered.filter((log) => log.severity === filter.severity)
    }

    if (filter?.category) {
      filtered = filtered.filter((log) => log.category === filter.category)
    }

    return filtered
  }

  clearLogs() {
    this.logs = []
  }

  getCriticalErrors() {
    return this.logs.filter((log) => log.severity === 'critical')
  }
}

export const errorLogger = new ErrorLogger()

// ✅ Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.logError({
      message: event.message,
      severity: 'high',
      category: 'unknown',
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.logError({
      message: 'Unhandled Promise Rejection',
      severity: 'high',
      category: 'unknown',
      context: {
        reason: event.reason,
      },
    })
  })
}
