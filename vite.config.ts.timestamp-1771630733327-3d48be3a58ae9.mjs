// vite.config.ts
import { defineConfig } from "file:///D:/cinema_online/node_modules/vite/dist/node/index.js";
import react from "file:///D:/cinema_online/node_modules/@vitejs/plugin-react-swc/index.js";
import { VitePWA } from "file:///D:/cinema_online/node_modules/vite-plugin-pwa/dist/index.js";
import sitemap from "file:///D:/cinema_online/node_modules/vite-plugin-sitemap/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "\u0623\u0648\u0646\u0644\u0627\u064A\u0646 \u0633\u064A\u0646\u0645\u0627 | Online Cinema",
        short_name: "\u0633\u064A\u0646\u0645\u0627",
        description: "\u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0623\u0642\u0648\u0649 \u2014 \u0623\u0641\u0644\u0627\u0645 \u0648\u0645\u0633\u0644\u0633\u0644\u0627\u062A",
        theme_color: "#08080C",
        background_color: "#08080C",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        start_url: "/?source=pwa",
        scope: "/",
        dir: "rtl",
        lang: "ar",
        orientation: "any",
        categories: ["entertainment", "video"],
        icons: [
          { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          { src: "/logo.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    }),
    sitemap({
      hostname: "https://cinma.online",
      generateRobotsTxt: false,
      dynamicRoutes: [
        "/",
        "/movies",
        "/series",
        "/ramadan",
        "/plays",
        "/top-watched",
        "/search",
        "/login",
        "/profile",
        "/admin"
      ]
    })
  ],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/)) {
              return "vendor-react";
            }
            if (id.includes("framer-motion")) {
              return "vendor-framer";
            }
            if (id.includes("swiper")) {
              return "vendor-swiper";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            return "vendor";
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxjaW5lbWFfb25saW5lXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxjaW5lbWFfb25saW5lXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9jaW5lbWFfb25saW5lL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuaW1wb3J0IHNpdGVtYXAgZnJvbSAndml0ZS1wbHVnaW4tc2l0ZW1hcCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdcdTA2MjNcdTA2NDhcdTA2NDZcdTA2NDRcdTA2MjdcdTA2NEFcdTA2NDYgXHUwNjMzXHUwNjRBXHUwNjQ2XHUwNjQ1XHUwNjI3IHwgT25saW5lIENpbmVtYScsXG4gICAgICAgIHNob3J0X25hbWU6ICdcdTA2MzNcdTA2NEFcdTA2NDZcdTA2NDVcdTA2MjcnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1x1MDY0NVx1MDY0Nlx1MDYzNVx1MDYyOSBcdTA2MjdcdTA2NDRcdTA2NDVcdTA2MzRcdTA2MjdcdTA2NDdcdTA2MkZcdTA2MjkgXHUwNjI3XHUwNjQ0XHUwNjM5XHUwNjMxXHUwNjI4XHUwNjRBXHUwNjI5IFx1MDYyN1x1MDY0NFx1MDYyM1x1MDY0Mlx1MDY0OFx1MDY0OSBcdTIwMTQgXHUwNjIzXHUwNjQxXHUwNjQ0XHUwNjI3XHUwNjQ1IFx1MDY0OFx1MDY0NVx1MDYzM1x1MDY0NFx1MDYzM1x1MDY0NFx1MDYyN1x1MDYyQScsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzA4MDgwQycsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjMDgwODBDJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBkaXNwbGF5X292ZXJyaWRlOiBbJ3N0YW5kYWxvbmUnLCAnbWluaW1hbC11aScsICdicm93c2VyJ10sXG4gICAgICAgIHN0YXJ0X3VybDogJy8/c291cmNlPXB3YScsXG4gICAgICAgIHNjb3BlOiAnLycsXG4gICAgICAgIGRpcjogJ3J0bCcsXG4gICAgICAgIGxhbmc6ICdhcicsXG4gICAgICAgIG9yaWVudGF0aW9uOiAnYW55JyxcbiAgICAgICAgY2F0ZWdvcmllczogWydlbnRlcnRhaW5tZW50JywgJ3ZpZGVvJ10sXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICcvbG9nby5zdmcnLCBzaXplczogJ2FueScsIHR5cGU6ICdpbWFnZS9zdmcreG1sJywgcHVycG9zZTogJ2FueSBtYXNrYWJsZScgfSxcbiAgICAgICAgICB7IHNyYzogJy9sb2dvLnN2ZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9zdmcreG1sJywgcHVycG9zZTogJ2FueSBtYXNrYWJsZScgfVxuICAgICAgICBdLFxuICAgICAgICBwcmVmZXJfcmVsYXRlZF9hcHBsaWNhdGlvbnM6IGZhbHNlXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZjJ9J10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9pbWFnZVxcLnRtZGJcXC5vcmdcXC8uKi9pLFxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICd0bWRiLWltYWdlcycsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMjAwLCBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgZGV2T3B0aW9uczogeyBlbmFibGVkOiBmYWxzZSB9XG4gICAgfSksXG4gICAgc2l0ZW1hcCh7XG4gICAgICBob3N0bmFtZTogJ2h0dHBzOi8vY2lubWEub25saW5lJyxcbiAgICAgIGdlbmVyYXRlUm9ib3RzVHh0OiBmYWxzZSxcbiAgICAgIGR5bmFtaWNSb3V0ZXM6IFtcbiAgICAgICAgJy8nLFxuICAgICAgICAnL21vdmllcycsXG4gICAgICAgICcvc2VyaWVzJyxcbiAgICAgICAgJy9yYW1hZGFuJyxcbiAgICAgICAgJy9wbGF5cycsXG4gICAgICAgICcvdG9wLXdhdGNoZWQnLFxuICAgICAgICAnL3NlYXJjaCcsXG4gICAgICAgICcvbG9naW4nLFxuICAgICAgICAnL3Byb2ZpbGUnLFxuICAgICAgICAnL2FkbWluJ1xuICAgICAgXVxuICAgIH0pXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDgwMCxcbiAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocmVhY3R8cmVhY3QtZG9tfHJlYWN0LXJvdXRlcnxyZWFjdC1yb3V0ZXItZG9tfHNjaGVkdWxlcnxAcmVtaXgtcnVuKVtcXFxcL10vKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZyYW1lci1tb3Rpb24nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1mcmFtZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdzd2lwZXInKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1zd2lwZXInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdsdWNpZGUtcmVhY3QnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtB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
