import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  assetsInclude: ['**/*.glsl'],
  define: {
    // Polyfill Buffer for browser
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      // Disable install prompt - we're promoting the Android app instead
      injectRegister: 'auto',
      manifest: false, // Disable manifest to prevent PWA install prompts
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
          },
          {
            urlPattern: /\/api\/db\/(movies|tv)\/(trending|search)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'crdb-api',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 }
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
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
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
            // Core React libraries (including router to avoid circular deps)
            if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/)) {
              return 'vendor-react';
            }
            
            // Animation and UI libraries
            if (id.includes('framer-motion')) {
              return 'vendor-ui';
            }
            
            if (id.includes('swiper')) {
              return 'vendor-ui';
            }
            
            if (id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            
            // Media
            if (id.includes('react-player')) {
              return 'vendor-media';
            }
            
            if (id.includes('recharts')) {
              return 'vendor-media';
            }
            
            // API and networking
            if (id.includes('@supabase') || id.includes('axios') || id.includes('ky')) {
              return 'vendor-api';
            }
            
            // State and data management
            if (id.includes('@tanstack') || id.includes('zustand') || id.includes('zod')) {
              return 'vendor-data';
            }
            
            // All other dependencies
            return 'vendor';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  }
})
