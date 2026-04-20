/**
 * Rate Limiting Middleware for Content API
 * 
 * Prevents abuse and ensures fair usage
 */

import rateLimit from 'express-rate-limit';

/**
 * Content API rate limiter - 100 requests per IP per minute
 */
export const contentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { 
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost in development
  skip: (req) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1';
    return isDevelopment && isLocalhost;
  }
});

/**
 * Search API rate limiter - 30 requests per IP per minute (more restrictive)
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { 
    error: 'Too many search requests',
    message: 'You have exceeded the search rate limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default { contentLimiter, searchLimiter };
