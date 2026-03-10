import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'أونلاين سينما | Online Cinema',
        short_name: 'سينما',
        description: 'منصة المشاهدة العربية الأقوى — أفلام ومسلسلات',
        theme_color: '#08080C',
        background_color: '#08080C',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        start_url: '/?source=pwa',
        scope: '/',
        dir: 'rtl',
        lang: 'ar',
        orientation: 'any',
        categories: ['entertainment', 'video'],
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\/3\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tmdb-api',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 12 }
            }
          },
          {
            urlPattern: /\/api\/home(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'home-api',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 }
            }
          },
          {
            urlPattern: /\/api\/runtime-config(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-config',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 }
            }
          },
          {
            urlPattern: /\/data\/homepage_cache\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'home-static-data',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    }),
    // DISABLED: We use backend/sitemap_generator.py for rich dynamic sitemap
    /* sitemap({ ... }) removed to prevent conflict */
  ],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/)) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('swiper')) {
              return 'vendor-swiper';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-player')) {
              return 'vendor-player';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@supabase') || id.includes('axios')) {
              return 'vendor-api';
            }
            if (id.includes('@tanstack') || id.includes('zod') || id.includes('zustand')) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
