// server/index.js - Cinema.online Complete Rebuild - Production-Ready Server
console.log('[BOOT FILE]', import.meta.url)
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import csrf from 'csurf'
import { v4 as uuidv4 } from 'uuid'
import chatHandler from './api/chat.js'
import embedProxyHandler from './api/embed-proxy.js'
import { registerDBRoutes } from './api/db.js'
import { registerGenreRoutes } from './api/genres.js'
import slugRoutes from './routes/slug.js'
import adminContentAPI from './api/admin-content.js'
import contentRoutes from './routes/content.js'
import homeRoutes from './routes/home.js'
import sitemapRoutes from './routes/sitemap.js'
import adminIngestionRoutes from './routes/admin-ingestion.js'
import adminSystemRoutes from './routes/admin-system.js'
import reviewsRoutes from './routes/reviews-all.js'
import serverConfigsRoutes from './routes/server-configs.js'
import continueWatchingRoutes from './routes/continue-watching.js'
import videosRoutes from './routes/videos.js'
import quranRoutes from './routes/quran.js'
import actorsRoutes from './routes/actors.js'
import linkChecksRoutes from './routes/link-checks.js'
import embedSourcesRoutes from './routes/embed-sources.js'
import adsRoutes from './routes/ads.js'
import settingsRoutes from './routes/settings.js'
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js'
import { optionalApiKey } from './middleware/apiAuth.js'
import { authenticateUser, requireAdmin } from './middleware/auth.js'
import pool from '../src/db/pool.js'

console.log('📦 Checking contentRoutes:', typeof contentRoutes, contentRoutes);

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
const PORT = process.env.PORT || 8080  // Koyeb default port
const HOST = process.env.HOST || '0.0.0.0'  // Koyeb requirement

// Admin key for protected endpoints
const ADMIN_KEY = process.env.ADMIN_KEY

console.log('[REGISTER] adminRouter mounted');
const adminRouter = express.Router();

// Admin cache clear endpoint - proxies to the real cache clear endpoint
adminRouter.post('/cache/clear', async (req, res) => {
  console.log('[CACHE CLEAR] HIT', req.method, req.originalUrl);

  // Protection: check admin key if configured
  if (ADMIN_KEY) {
    const key = req.headers['x-admin-key'];
    if (key !== ADMIN_KEY) {
      console.log('[CACHE CLEAR] FORBIDDEN - Invalid or missing admin key');
      return res.status(403).json({ success: false, error: 'forbidden' });
    }
  }

  try {
    // Call the real cache clear endpoint internally
    const baseUrl = `http://127.0.0.1:${PORT}`;
    const response = await fetch(`${baseUrl}/api/cache/clear`, {
      method: 'DELETE',
      headers: ADMIN_KEY ? { 'x-admin-key': ADMIN_KEY } : {}
    });
    const text = await response.text();

    console.log('[CACHE CLEAR] SUCCESS', response.status);
    return res.status(response.status).type('application/json').send(text);
  } catch (err) {
    console.error('[CACHE CLEAR] FAILED', err);
    return res.status(500).json({ success: false, error: 'cache_clear_failed' });
  }
});

// لازم قبل أي app.use('/api', ...) موجودة في الملف
app.use('/api/admin/cache', adminRouter);

// ✅ Request ID Middleware (Feature #14)
app.use((req, res, next) => {
  req.id = uuidv4()
  res.setHeader('X-Request-ID', req.id)
  console.log(`[${req.id}] ${req.method} ${req.path}`)
  next()
})

// DEBUG: Test endpoint for tmdb_id
app.get('/api/test-direct', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, tmdb_id, slug, title
      FROM movies
      WHERE slug = 'waitress'
      LIMIT 1
    `);
    res.json({
      success: true,
      data: result.rows[0],
      keys: Object.keys(result.rows[0] || {})
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// ✅ Rate limiting للـ API العام - 500 طلب كل دقيقة
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ✅ Rate limiting للـ admin operations - 100 طلبات كل دقيقة
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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
  'https://cinma.pages.dev',
  process.env.VITE_APP_URL
].filter(Boolean)

// ✅ Compression Middleware (Feature #12)
app.use(compression())

// ✅ CORS Dynamic Origins (Feature #16)
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

// ✅ Cache headers for static resources (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist', {
    maxAge: '1y', // 1 year for immutable assets
    immutable: true,
    setHeaders: (res, path) => {
      // Cache CSS, JS, images for 1 year (they have hashed names)
      if (path.match(/\.(css|js|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
      // Cache HTML for 5 minutes (for SPA routing)
      else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
      }
    }
  }))
}

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

  // 🧹 Permissions-Policy: استخدام الأسماء الحديثة المعترف بها
  // تم استبدال 'popup' بـ 'window-management' (الاسم الحديث)
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
    'accelerometer=(), gyroscope=(), magnetometer=(), window-management=()'
  )

  // Content-Security-Policy: حماية شاملة من XSS و injection attacks
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: http:",
    "media-src 'self' https: http: blob:",
    "connect-src 'self' https://lhpuwupbhpcqkwqugkhh.supabase.co https://api.themoviedb.org https://prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud wss://lhpuwupbhpcqkwqugkhh.supabase.co",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.dailymotion.com https://geo.dailymotion.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
  res.setHeader('Content-Security-Policy', cspDirectives)

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

// مسار الـ embed proxy (بدون rate limiting عشان الفيديوهات)
app.get('/api/embed-proxy', asyncHandler(async (req, res) => {
  await embedProxyHandler(req, res)
}))

// ✅ مسار runtime config (للفرونت إند)
app.get('/api/runtime-config', (req, res) => {
  res.json({
    VITE_TMDB_API_KEY: process.env.VITE_TMDB_API_KEY || '',
    VITE_SITE_NAME: process.env.VITE_SITE_NAME || 'اونلاين سينما',
    VITE_DOMAIN: process.env.VITE_DOMAIN || 'cinma.online',
    VITE_SITE_URL: process.env.VITE_SITE_URL || 'https://cinma.online'
  })
})

// ✅ مسار تسجيل الأخطاء (للفرونت إند)
app.post('/api/log', (req, res) => {
  const { level, message, data } = req.body
  console.log(`[Frontend ${level?.toUpperCase() || 'LOG'}] ${message}`, data || '')
  res.status(200).json({ success: true })
})

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

// ✅ Rate limiting for Genre API - 100 requests per 15 minutes
const genreLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many genre requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ✅ Rate limiting for search endpoints - 200 requests per 15 minutes
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many search requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/genres', genreLimiter)
app.use('/api/db/movies/search', searchLimiter)
app.use('/api/db/tv/search', searchLimiter)
app.use('/api/db/software/search', searchLimiter)
app.use('/api/db/anime/search', searchLimiter)

// ✅ Register Genre API routes
registerGenreRoutes(app)

// ✅ Register slug resolution routes
app.use('/api/db/', slugRoutes)

// ✅ Register new content API routes (Phase 4)
console.log('🔧 Registering contentRoutes...');
app.use('/api', contentRoutes);
console.log('✅ contentRoutes registered!');

// ✅ Register home page route
app.use('/api', homeRoutes);

// ✅ Register reviews and ratings routes
app.use('/api', reviewsRoutes)

// ✅ Register server configurations routes (CockroachDB)
app.use('/api/server-configs', serverConfigsRoutes)

// ✅ Register continue watching route (Supabase user data)
app.use('/api/continue-watching', continueWatchingRoutes)

// ✅ Register videos route (TEMPORARY - should be moved to CockroachDB)
app.use('/api/videos', videosRoutes)

// ✅ Register Quran routes (reciters, sermons, stories)
app.use('/api', quranRoutes)

// ✅ Register actors routes (CockroachDB)
app.use('/api', actorsRoutes)

// ✅ Register link checks routes (CockroachDB)
app.use('/api/link-checks', linkChecksRoutes)

// ✅ Register embed sources routes (CockroachDB)
app.use('/api/embed-sources', embedSourcesRoutes)

// ✅ Register ads routes (CockroachDB - migrated from Supabase)
app.use('/api/ads', adsRoutes)

// ✅ Register settings routes (CockroachDB - migrated from Supabase)
app.use('/api/settings', settingsRoutes)

// ❌ DISABLED: Translations routes (not needed - using title_ar/title_en directly)
// import translationsRoutes from './routes/translations.js'
// app.use('/api', translationsRoutes)

// ✅ Register admin ingestion routes (NO authentication for viewing stats/log)
app.use('/api/admin/ingestion', adminLimiter, adminIngestionRoutes)

// ✅ Register admin system control routes (with authentication)
app.use('/api/admin', adminLimiter, adminSystemRoutes)

// ✅ Register admin content routes (with authentication)
app.get('/api/admin/series/:id', authenticateUser, requireAdmin, adminLimiter, asyncHandler(adminContentAPI.getSeriesWithSeasons))
app.put('/api/admin/series/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.updateSeries))
app.delete('/api/admin/series/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.deleteSeries))
app.post('/api/admin/seasons', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.createSeason))
app.put('/api/admin/seasons/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.updateSeason))
app.delete('/api/admin/seasons/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.deleteSeason))
app.post('/api/admin/episodes', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.createEpisode))
app.put('/api/admin/episodes/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.updateEpisode))
app.delete('/api/admin/episodes/:id', authenticateUser, requireAdmin, csrfProtection, adminLimiter, asyncHandler(adminContentAPI.deleteEpisode))
app.get('/api/admin/content-health', authenticateUser, requireAdmin, adminLimiter, asyncHandler(adminContentAPI.getContentHealth))

// ✅ Sitemap generation (MUST be after specific routes to avoid catching everything)
app.use('/', sitemapRoutes)

// ✅ 404 handler for undefined routes
app.use(notFoundHandler)

// ✅ Error handler middleware (must be last)
app.use(errorHandler)

// ✅ Graceful Shutdown (Feature #13)
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Cinema.online Server running on ${HOST}:${PORT}`)
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api-docs`)
  console.log(`🗄️  Database: CockroachDB (Primary Content)`)
  console.log(`🔐 Auth: Supabase (User Data Only)`)
})

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`)

  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed')

    try {
      // Close database pool
      await pool.end()
      console.log('✅ Database connections closed')

      console.log('✅ Graceful shutdown complete')
      process.exit(0)
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
      process.exit(1)
    }
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
