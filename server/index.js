// server/index.js - Express Server للشات
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import csrf from 'csurf'
import chatHandler from './api/chat.js'
import embedProxyHandler from './api/embed-proxy.js'
import { registerDBRoutes } from './api/db.js'
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js'

// تحميل المتغيرات
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

import swaggerUi from 'swagger-ui-express'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const swaggerDocument = require('./docs/swagger.json')

const app = express()
const PORT = process.env.PORT || 3001

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// Rate limiting للشات - 10 طلبات كل دقيقة لكل IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 دقيقة
  max: 10, // 10 طلبات
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ✅ Rate limiting للـ database queries - 100 طلب كل دقيقة
const dbLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ✅ Rate limiting للـ API العام - 200 طلب كل دقيقة
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ✅ Rate limiting للـ admin operations - 10 طلبات كل دقيقة
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// الإعدادات - Dynamic CORS for multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://cinma.online',
  'https://www.cinma.online',
  process.env.VITE_APP_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// ✅ Apply API rate limiter to all routes
app.use('/api/', apiLimiter)

// Security Headers Middleware
app.use((req, res, next) => {
  // X-Frame-Options: منع تضمين الموقع في iframe من مواقع تانية
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  
  // X-Content-Type-Options: منع المتصفح من تخمين نوع الملف
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // X-XSS-Protection: حماية من XSS attacks (للمتصفحات القديمة)
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Referrer-Policy: التحكم في معلومات الـ referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions-Policy: التحكم في الـ browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), popup=()')
  
  // Strict-Transport-Security: إجبار HTTPS (بس لو الموقع على HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  next()
})

// ✅ CSRF Protection (enabled for production)
const csrfProtection = csrf({ cookie: true })

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// مسار الشات مع rate limiting و CSRF protection
app.post('/api/chat', csrfProtection, chatLimiter, async (req, res) => {
  try {
    await chatHandler(req, res)
  } catch (error) {
    console.error('خطأ في الشات:', error)
    res.status(500).json({ error: 'حدث خطأ في السيرفر' })
  }
})

// مسار الـ TMDB proxy (بدون rate limiting عشان الطلبات كتير)
app.use('/api/tmdb', asyncHandler(async (req, res) => {
  const tmdbProxyHandler = (await import('./api/tmdb-proxy.js')).default
  await tmdbProxyHandler(req, res)
}))

// مسار الـ embed proxy (بدون rate limiting عشان الفيديوهات)
app.get('/api/embed-proxy', asyncHandler(async (req, res) => {
  await embedProxyHandler(req, res)
}))

// ✅ مسار معالجة طلبات المحتوى (admin only)
app.post('/api/admin/process-request', csrfProtection, adminLimiter, asyncHandler(async (req, res) => {
  const processRequestHandler = (await import('./api/process-request.js')).default
  await processRequestHandler(req, res)
}))

// ✅ مسار إدارة الطلبات المعلقة للإدمن (admin only)
app.all('/api/admin/requests', csrfProtection, adminLimiter, asyncHandler(async (req, res) => {
  const requestsHandler = (await import('./api/requests.js')).default
  await requestsHandler(req, res)
}))

// ✅ مسار الإضافة الفورية مع rate limiting
app.post('/api/instant-add', csrfProtection, apiLimiter, asyncHandler(async (req, res) => {
  const instantAddHandler = (await import('./api/instant-add.js')).default
  await instantAddHandler(req, res)
}))

// ✅ Register DB routes with rate limiting
app.use('/api/db/', dbLimiter)
registerDBRoutes(app)

// ✅ 404 handler for undefined routes
app.use(notFoundHandler)

// ✅ Error handler middleware (must be last)
app.use(errorHandler)

// تشغيل السيرفر - Koyeb-ready (listen on 0.0.0.0)
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`)
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api-docs`)
})
