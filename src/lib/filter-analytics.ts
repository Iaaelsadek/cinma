/**
 * Filter Usage Analytics
 * Tracks filter interactions respecting user privacy settings
 */

interface FilterEvent {
  type: 'genre' | 'year' | 'rating' | 'sortBy' | 'clear'
  contentType: string
  value: string | number | null
  timestamp: number
}

const eventQueue: FilterEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const BATCH_INTERVAL = 30000 // 30 seconds

function isAnalyticsAllowed(): boolean {
  try {
    // Respect user privacy - check if analytics consent given
    return localStorage.getItem('analytics_consent') !== 'false'
  } catch {
    return false
  }
}

function flushEvents() {
  if (eventQueue.length === 0) return
  const batch = [...eventQueue]
  eventQueue.length = 0
  // In production, send to analytics endpoint
  // For now, log to console in dev
  if (import.meta.env.DEV) {
    console.debug('[Analytics] Filter events batch:', batch)
  }
}

export function trackFilterChange(
  contentType: string,
  filterKey: string,
  value: string | number | null
) {
  if (!isAnalyticsAllowed()) return

  const type = filterKey as FilterEvent['type']
  eventQueue.push({ type, contentType, value, timestamp: Date.now() })

  // Batch send every 30 seconds
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushEvents()
      flushTimer = null
    }, BATCH_INTERVAL)
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents)
}
