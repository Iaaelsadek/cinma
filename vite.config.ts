import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
// import { VitePWA } from 'vite-plugin-pwa' // Disabled - not needed
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
    // VitePWA disabled - not needed for now
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
