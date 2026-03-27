// ✅ Centralized Error Handler Middleware

/**
 * Error handler middleware for Express
 * Catches all errors and returns consistent error responses
 */
export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  })

  // Default error
  let statusCode = err.statusCode || 500
  let message = err.message || 'حدث خطأ في السيرفر'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'بيانات غير صحيحة'
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'غير مصرح لك بالوصول'
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403
    message = 'ممنوع الوصول'
  } else if (err.name === 'NotFoundError') {
    statusCode = 404
    message = 'غير موجود'
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503
    message = 'الخدمة غير متاحة حالياً'
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'حدث خطأ في السيرفر'
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details,
    }),
  })
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'المسار غير موجود',
    path: req.path,
  })
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
