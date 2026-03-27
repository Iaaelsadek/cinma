// 🛡️ Rate Limiter - Zero Budget Protection
// يمنع abuse ويحمي Free Tier limits

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private requests = new Map<string, number[]>()
  
  // Different limits for different resource types
  private limits: Record<string, RateLimitConfig> = {
    'tmdb': { maxRequests: 50, windowMs: 10000 },      // 50 requests per 10 seconds
    'supabase': { maxRequests: 60, windowMs: 10000 },  // 60 requests per 10 seconds
    'ai': { maxRequests: 10, windowMs: 60000 },        // 10 requests per minute
    'search': { maxRequests: 10, windowMs: 60000 },    // 10 searches per minute
  }

  async checkLimit(resource: string, identifier: string = 'global'): Promise<boolean> {
    const key = `${resource}:${identifier}`
    const config = this.limits[resource] || { maxRequests: 100, windowMs: 60000 }
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get existing requests for this key
    let timestamps = this.requests.get(key) || []
    
    // Remove old requests outside the window
    timestamps = timestamps.filter(t => t > windowStart)

    // Check if limit exceeded
    if (timestamps.length >= config.maxRequests) {
      const oldestRequest = timestamps[0]
      const waitTime = Math.ceil((oldestRequest + config.windowMs - now) / 1000)
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`)
    }

    // Add current request
    timestamps.push(now)
    this.requests.set(key, timestamps)

    return true
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, timestamps] of this.requests.entries()) {
      const maxWindow = Math.max(...Object.values(this.limits).map(l => l.windowMs))
      const filtered = timestamps.filter(t => t > now - maxWindow)
      if (filtered.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, filtered)
      }
    }
  }

  getStats(resource: string) {
    const config = this.limits[resource]
    if (!config) return null

    const now = Date.now()
    const windowStart = now - config.windowMs
    let total = 0

    for (const [key, timestamps] of this.requests.entries()) {
      if (key.startsWith(`${resource}:`)) {
        total += timestamps.filter(t => t > windowStart).length
      }
    }

    return {
      current: total,
      limit: config.maxRequests,
      window: config.windowMs / 1000,
      remaining: Math.max(0, config.maxRequests - total)
    }
  }
}

export const rateLimiter = new RateLimiter()

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup()
  }, 300000)
}
