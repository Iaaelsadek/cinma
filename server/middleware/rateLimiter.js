/**
 * Rate Limiter Middleware
 * 
 * Implements in-memory rate limiting for review and rating submissions.
 * Prevents spam and abuse by limiting action frequency per user.
 * 
 * Features:
 * - Configurable rate limits (maxRequests, windowMs)
 * - Automatic reset after time window
 * - Admin/supervisor exemption
 * - Descriptive error messages with resetIn time
 * 
 * Architecture:
 * - Uses NodeCache for in-memory storage
 * - Tracks requests per user_id
 * - Resets counters after window expires
 */

import NodeCache from 'node-cache'

// Create cache instance
const cache = new NodeCache({
  stdTTL: 3600, // Default 1 hour TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Better performance
})

/**
 * Create a rate limiter middleware
 * 
 * @param {Object} options - Rate limiter configuration
 * @param {number} options.maxRequests - Maximum requests allowed in window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} options.message - Error message when limit exceeded
 * @param {string} options.keyPrefix - Cache key prefix (e.g., 'review_', 'rating_')
 * @returns {Function} Express middleware function
 */
function createRateLimiter({ maxRequests, windowMs, message, keyPrefix }) {
  return async (req, res, next) => {
    try {
      // Get user from request (set by authenticateUser middleware)
      const userId = req.user?.id
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      // Check if user is admin or supervisor (exempt from rate limiting)
      const userRole = req.user?.role
      if (userRole === 'admin' || userRole === 'supervisor') {
        return next()
      }
      
      // Create cache key
      const cacheKey = `${keyPrefix}${userId}`
      
      // Get current rate limit data
      let rateLimitData = cache.get(cacheKey)
      
      if (!rateLimitData) {
        // First request in window
        rateLimitData = {
          count: 1,
          resetAt: Date.now() + windowMs
        }
        cache.set(cacheKey, rateLimitData, Math.ceil(windowMs / 1000))
        return next()
      }
      
      // Check if window has expired
      if (Date.now() > rateLimitData.resetAt) {
        // Reset counter
        rateLimitData = {
          count: 1,
          resetAt: Date.now() + windowMs
        }
        cache.set(cacheKey, rateLimitData, Math.ceil(windowMs / 1000))
        return next()
      }
      
      // Check if limit exceeded
      if (rateLimitData.count >= maxRequests) {
        const resetIn = Math.ceil((rateLimitData.resetAt - Date.now()) / 1000)
        return res.status(429).json({
          error: message,
          resetIn: resetIn,
          resetAt: new Date(rateLimitData.resetAt).toISOString()
        })
      }
      
      // Increment counter
      rateLimitData.count++
      cache.set(cacheKey, rateLimitData, Math.ceil(windowMs / 1000))
      
      next()
    } catch (error) {
      console.error('[RateLimiter] Error:', error)
      // On error, allow request to proceed (fail open)
      next()
    }
  }
}

/**
 * Rate limiter for review submissions
 * Limit: 10 reviews per hour
 */
const rateLimitReviews = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many reviews. Please try again later.',
  keyPrefix: 'review_limit_'
})

/**
 * Rate limiter for rating submissions
 * Limit: 50 ratings per hour
 * Note: Rating updates (changing existing rating) are excluded from limit
 */
const rateLimitRatings = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many ratings. Please try again later.',
  keyPrefix: 'rating_limit_'
})

export {
  createRateLimiter,
  rateLimitReviews,
  rateLimitRatings,
  cache // Export for testing
}
