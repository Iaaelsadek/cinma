# تصميم تحضير المشروع للإنتاج
# Production Deployment Preparation Design

## Overview

هذا المستند يحدد التصميم الكامل لتحضير مشروع cinma.online للنشر في بيئة الإنتاج. المشروع عبارة عن منصة محتوى عربية تستخدم:

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Primary Database**: CockroachDB (جميع المحتوى)
- **Auth Database**: Supabase (المصادقة وبيانات المستخدمين فقط)
- **Frontend Deployment**: Cloudflare Pages
- **Backend Deployment**: Qovery

This document defines the complete design for preparing the cinma.online project for production deployment.

### Design Goals

1. إصلاح جميع تحذيرات ESLint والبناء
2. تحسين أداء البناء وتقسيم الكود
3. إنشاء تكوينات النشر الكاملة
4. تحسين الأمان والأداء
5. إعداد مراقبة شاملة للأخطاء والأداء
6. توثيق كامل لعمليات النشر والاستعادة

### Key Principles

- Zero warnings في البناء النهائي
- Automated CI/CD pipeline
- Comprehensive error monitoring
- Security-first approach
- Performance optimization
- Complete documentation


---

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare CDN                             │
│              (SSL, DDoS Protection, Caching)                 │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐      ┌──────────────────────────┐
│  Cloudflare Pages      │      │    Qovery Backend        │
│  (React Frontend)      │◄────►│  (Node.js + Express)     │
│  - Static Assets       │      │  - API Endpoints         │
│  - Service Worker      │      │  - Rate Limiting         │
│  - PWA Features        │      │  - Security Headers      │
└────────────────────────┘      └──────────┬───────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │  CockroachDB     │  │    Supabase      │  │     Sentry       │
         │  (Content DB)    │  │  (Auth + Users)  │  │ (Error Monitor)  │
         │  - Movies        │  │  - Profiles      │  │  - Frontend      │
         │  - TV Series     │  │  - Watchlist     │  │  - Backend       │
         │  - Games         │  │  - History       │  └──────────────────┘
         │  - Software      │  └──────────────────┘
         │  - Reviews       │
         └──────────────────┘
```

### Deployment Architecture


#### Frontend Deployment (Cloudflare Pages)

```
GitHub Repository (main branch)
        │
        ▼
┌───────────────────────────────────────┐
│   GitHub Actions CI/CD                │
│   - Lint Check                        │
│   - Type Check                        │
│   - Unit Tests                        │
│   - Build                             │
└───────────┬───────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   Cloudflare Pages Build              │
│   - Node.js 20.x                      │
│   - npm run build                     │
│   - Output: dist/                     │
└───────────┬───────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   Cloudflare Global CDN               │
│   - Auto SSL                          │
│   - DDoS Protection                   │
│   - Edge Caching                      │
│   - Custom Domain: cinma.online       │
└───────────────────────────────────────┘
```

#### Backend Deployment (Qovery)

```
GitHub Repository (main branch)
        │
        ▼
┌───────────────────────────────────────┐
│   Qovery Auto-Deploy                  │
│   - Node.js 20.x Runtime              │
│   - npm run server                    │
│   - Port: 8080                        │
│   - Health Check: /health             │
└───────────┬───────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   Qovery Container                    │
│   - Auto-scaling (1-3 instances)      │
│   - Load Balancing                    │
│   - Environment Variables (Secrets)   │
└───────────────────────────────────────┘
```


### Build System Architecture

#### Current Issues

1. **ESLint Warnings (~50)**
   - Unused variables in test files
   - Explicit `any` types in mocks
   - Parsing error in `card-links-bug-exploration.test.ts` (lines 57-58)

2. **Vite Build Warnings**
   - Circular dependency: `vendor-react` ↔ `vendor` chunks
   - Dynamic/Static import conflicts: `Plays.tsx`, `Classics.tsx`, `Summaries.tsx`
   - Stream module externalization warning

3. **Missing Configurations**
   - No Cloudflare Pages configuration
   - No Qovery configuration file
   - Incomplete CI/CD workflows

#### Proposed Solutions

**ESLint Fixes:**
- Remove unused variables or prefix with `_`
- Replace `any` types with proper TypeScript types
- Fix parsing errors in test files
- Update ESLint configuration for stricter rules

**Vite Build Optimization:**
- Resolve circular dependencies in chunk splitting
- Convert conflicting imports to lazy loading only
- Remove stream module from browser bundle
- Optimize chunk size and splitting strategy

**Deployment Configurations:**
- Create `wrangler.toml` for Cloudflare Pages
- Create `.qovery.yml` for backend deployment
- Complete GitHub Actions workflows
- Document environment variables


---

## Components and Interfaces

### 1. ESLint Configuration Component

**Purpose**: Ensure code quality and consistency

**Files Modified:**
- `.eslintrc.cjs` - Update rules for production
- `src/**/*.{ts,tsx}` - Fix all warnings

**Configuration Changes:**

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error', // Changed from 'warn'
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-hooks/exhaustive-deps': 'error',
  },
}
```

**Fix Strategy:**

1. **Unused Variables**: Remove or prefix with `_`
2. **Explicit Any Types**: Replace with proper types
3. **Parsing Errors**: Fix syntax issues in test files


### 2. Vite Build Configuration Component

**Purpose**: Optimize build output and resolve warnings

**Files Modified:**
- `vite.config.ts` - Update build configuration
- Route files with dynamic imports

**Updated Configuration:**

```typescript
export default defineConfig({
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
            // React ecosystem (avoid circular deps)
            if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/)) {
              return 'vendor-react';
            }
            // React Router (separate from react core)
            if (id.match(/[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/)) {
              return 'vendor-router';
            }
            // UI Libraries
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('swiper')) return 'vendor-swiper';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-player')) return 'vendor-player';
            if (id.includes('recharts')) return 'vendor-charts';
            // API & State
            if (id.includes('@supabase') || id.includes('axios')) {
              return 'vendor-api';
            }
            if (id.includes('@tanstack') || id.includes('zustand')) {
              return 'vendor-state';
            }
            // Other dependencies
            return 'vendor-misc';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      // Remove stream polyfill for browser
      stream: false,
    },
  },
})
```


**Dynamic Import Strategy:**

Files with conflicting imports will be converted to lazy loading only:

```typescript
// Before (causes warning):
import Plays from './pages/discovery/Plays'
const PlaysLazy = lazy(() => import('./pages/discovery/Plays'))

// After (lazy only):
const Plays = lazy(() => import('./pages/discovery/Plays'))
```

### 3. Cloudflare Pages Configuration Component

**Purpose**: Configure frontend deployment

**New File**: `wrangler.toml`

```toml
name = "cinma-online"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[build]
command = "npm run build"
cwd = "."
watch_dir = "src"

[build.upload]
format = "service-worker"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

**Cloudflare Pages Settings:**
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: 20.x
- Environment variables: Set in Cloudflare dashboard


### 4. Qovery Configuration Component

**Purpose**: Configure backend deployment

**New File**: `.qovery.yml`

```yaml
---
application:
  name: cinma-backend
  project: cinma-online
  organization: cinma-org
  
  build:
    dockerfile_path: Dockerfile
  
  ports:
    - internal_port: 8080
      external_port: 443
      protocol: HTTPS
      publicly_accessible: true
  
  environment_variables:
    - key: NODE_ENV
      value: production
    - key: PORT
      value: "8080"
    - key: HOST
      value: "0.0.0.0"
  
  secrets:
    - key: COCKROACHDB_URL
    - key: SUPABASE_SERVICE_ROLE_KEY
    - key: GROQ_API_KEY
    - key: GEMINI_API_KEY
    - key: TMDB_API_KEY
    - key: ADMIN_SYNC_TOKEN
    - key: API_KEY
  
  healthchecks:
    liveness_probe:
      type: http
      http:
        path: /health
        port: 8080
      initial_delay_seconds: 30
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3
    
    readiness_probe:
      type: http
      http:
        path: /health
        port: 8080
      initial_delay_seconds: 10
      period_seconds: 5
      timeout_seconds: 3
      success_threshold: 1
      failure_threshold: 3
  
  resources:
    cpu: 500m
    memory: 512Mi
  
  auto_scaling:
    enabled: true
    min_replicas: 1
    max_replicas: 3
    cpu_threshold: 70
```


**Dockerfile** (if needed):

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "run", "server"]
```

### 5. CI/CD Pipeline Component

**Purpose**: Automate testing and deployment

**Updated File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  build:
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy-frontend:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: cinma-online
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

  deploy-backend:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Qovery
        uses: qovery/action-deploy@v1
        with:
          qovery-token: ${{ secrets.QOVERY_TOKEN }}
          qovery-organization-id: ${{ secrets.QOVERY_ORG_ID }}
          qovery-project-id: ${{ secrets.QOVERY_PROJECT_ID }}
```


### 6. Sentry Configuration Component

**Purpose**: Monitor errors in production

**Frontend Configuration** (`src/main.tsx`):

```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}
```

**Backend Configuration** (`server/index.js`):

```javascript
import * as Sentry from "@sentry/node";

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },
  });
  
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  
  // Error handler (must be before other error handlers)
  app.use(Sentry.Handlers.errorHandler());
}
```


### 7. Security Headers Component

**Purpose**: Implement comprehensive security headers

**Already Implemented in `server/index.js`:**

```javascript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});
```

**Additional CSP Header** (to be added):

```javascript
res.setHeader('Content-Security-Policy', 
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' https://api.themoviedb.org https://*.supabase.co; " +
  "media-src 'self' https: blob:; " +
  "frame-src 'self' https://www.youtube.com https://player.vimeo.com;"
);
```


### 8. Rate Limiting Component

**Purpose**: Protect API from abuse

**Already Implemented in `server/index.js`:**

```javascript
// General API: 500 requests/minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'كثرت الطلبات. حاول مرة أخرى بعد دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat API: 10 requests/minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
});

// Database API: 100 requests/minute
const dbLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
});

// Admin API: 100 requests/minute
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
});

// Search API: 200 requests/15 minutes
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
});
```

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets


---

## Data Models

### Environment Variables Model

**Frontend Environment Variables:**

```typescript
interface FrontendEnv {
  // Site Configuration
  VITE_SITE_NAME: string;           // Required
  VITE_DOMAIN: string;               // Required
  VITE_SITE_URL: string;             // Required
  
  // API Configuration
  VITE_API_URL: string;              // Required - Backend URL
  VITE_API_BASE: string;             // Required - API base path
  VITE_API_KEY: string;              // Required - API authentication
  
  // Supabase (Auth Only)
  VITE_SUPABASE_URL: string;         // Required
  VITE_SUPABASE_ANON_KEY: string;    // Required
  
  // TMDB (Images)
  VITE_TMDB_API_KEY: string;         // Required
  
  // AI Services
  VITE_GEMINI_API_KEY: string;       // Required
  VITE_GROQ_API_KEY?: string;        // Optional
  VITE_MISTRAL_API_KEY?: string;     // Optional
  
  // Monitoring
  VITE_SENTRY_DSN?: string;          // Optional - Production only
  
  // Features
  VITE_APK_DOWNLOAD_URL?: string;    // Optional
}
```

**Backend Environment Variables:**

```typescript
interface BackendEnv {
  // Server Configuration
  NODE_ENV: 'development' | 'production';  // Required
  PORT: number;                             // Required - Default: 8080
  HOST: string;                             // Required - Default: 0.0.0.0
  
  // Database
  COCKROACHDB_URL: string;                  // Required - Primary DB
  
  // Supabase (Auth Only)
  VITE_SUPABASE_URL: string;                // Required
  SUPABASE_SERVICE_ROLE_KEY: string;        // Required
  
  // API Keys
  API_KEY: string;                          // Required
  TMDB_API_KEY: string;                     // Required
  GEMINI_API_KEY: string;                   // Required
  GROQ_API_KEY?: string;                    // Optional
  
  // Admin
  ADMIN_SYNC_TOKEN: string;                 // Required
  ADMIN_CLAIM_TOKEN: string;                // Required
  
  // Monitoring
  SENTRY_DSN?: string;                      // Optional - Production only
  
  // CORS
  WEB_ORIGIN: string;                       // Required
}
```


### Health Check Response Model

```typescript
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;           // ISO 8601 format
  database: 'connected' | 'disconnected';
  uptime: number;              // Seconds
  error?: string;              // Only present if status is 'error'
}
```

**Example Responses:**

```json
// Healthy
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected",
  "uptime": 3600
}

// Unhealthy
{
  "status": "error",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "disconnected",
  "uptime": 3600,
  "error": "Connection timeout"
}
```

### Deployment Configuration Model

**Cloudflare Pages Configuration:**

```typescript
interface CloudflareConfig {
  name: string;                    // Project name
  compatibility_date: string;      // YYYY-MM-DD
  build: {
    command: string;               // Build command
    cwd: string;                   // Working directory
    watch_dir: string;             // Watch directory
  };
  site: {
    bucket: string;                // Output directory
  };
  redirects: Array<{
    from: string;                  // Source path
    to: string;                    // Target path
    status: number;                // HTTP status
  }>;
}
```

**Qovery Configuration:**

```typescript
interface QoveryConfig {
  application: {
    name: string;
    project: string;
    organization: string;
    ports: Array<{
      internal_port: number;
      external_port: number;
      protocol: 'HTTP' | 'HTTPS';
      publicly_accessible: boolean;
    }>;
    environment_variables: Array<{
      key: string;
      value: string;
    }>;
    secrets: Array<{
      key: string;
    }>;
    healthchecks: {
      liveness_probe: HealthProbe;
      readiness_probe: HealthProbe;
    };
    resources: {
      cpu: string;
      memory: string;
    };
    auto_scaling: {
      enabled: boolean;
      min_replicas: number;
      max_replicas: number;
      cpu_threshold: number;
    };
  };
}

interface HealthProbe {
  type: 'http';
  http: {
    path: string;
    port: number;
  };
  initial_delay_seconds: number;
  period_seconds: number;
  timeout_seconds: number;
  success_threshold: number;
  failure_threshold: number;
}
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection Analysis

بعد تحليل جميع معايير القبول، تم تحديد الخصائص القابلة للاختبار وإزالة التكرار:

**Properties Identified:**
- Configuration validation properties (deployment configs, environment variables)
- Code quality properties (linting, type safety, imports)
- Build optimization properties (chunk splitting, bundle size)
- Security properties (headers, rate limiting, CSRF)
- Runtime behavior properties (error monitoring, health checks)
- Documentation completeness properties

**Redundancies Eliminated:**
- Multiple configuration checks consolidated into single validation properties
- Similar header checks combined into comprehensive security header property
- Rate limiter configurations combined into single rate limiting property
- Documentation checks grouped by category


### Property 1: ESLint Zero Warnings

*For any* TypeScript/JavaScript file in `src/**/*.{ts,tsx,js,jsx}`, running ESLint should produce zero warnings and zero errors.

**Validates: Requirements 1.1, 1.4, 1.5, 1.6**

### Property 2: No Explicit Any Types

*For any* TypeScript file in the codebase (excluding test mocks where necessary), explicit `any` types should be replaced with proper TypeScript types or generic constraints.

**Validates: Requirements 1.3**

### Property 3: Import Consistency

*For any* component file, it should be imported either statically OR dynamically (lazy), but never both simultaneously in the same module.

**Validates: Requirements 2.3**

### Property 4: Chunk Size Limits

*For any* generated chunk in the build output, the compressed size should be below 800KB to avoid bundle size warnings.

**Validates: Requirements 2.5**

### Property 5: No Circular Dependencies

*For any* pair of chunks in the build output, there should be no circular dependency relationship between them (e.g., vendor-react ↔ vendor).

**Validates: Requirements 2.2**


### Property 6: Environment Variables Documentation Completeness

*For any* required environment variable in the system, the documentation should include: variable name, required/optional status, example value, purpose description, and environment-specific values (dev vs prod).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

### Property 7: Security Headers Presence

*For any* HTTP response from the backend, the following security headers should be present: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Content-Security-Policy`.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5, 9.6**

### Property 8: HTTPS-Only HSTS Header

*For any* HTTP response served over HTTPS (or with `x-forwarded-proto: https`), the `Strict-Transport-Security` header should be present with appropriate max-age value.

**Validates: Requirements 9.4**

### Property 9: Rate Limit Headers

*For any* API response that is rate-limited, the response should include standard rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

**Validates: Requirements 10.7**


### Property 10: CSRF Protection for State-Changing Operations

*For any* state-changing HTTP method (POST, PUT, DELETE, PATCH) on protected routes, CSRF token validation should be enforced.

**Validates: Requirements 9.7**

### Property 11: Parameterized Database Queries

*For any* database query that includes user input, the query should use parameterized format (e.g., `$1`, `$2`) rather than string concatenation to prevent SQL injection.

**Validates: Requirements 9.9**

### Property 12: Sentry Error Filtering

*For any* error sent to Sentry, sensitive data fields (cookies, authorization headers, passwords) should be filtered out in the `beforeSend` hook.

**Validates: Requirements 7.5**

### Property 13: Frontend Error Capture

*For any* unhandled error or exception in the frontend (when in production mode), the error should be captured and sent to Sentry with appropriate context.

**Validates: Requirements 7.1**

### Property 14: Backend Error Capture

*For any* unhandled error or exception in the backend (when in production mode), the error should be captured and sent to Sentry with appropriate context.

**Validates: Requirements 7.2**


### Property 15: Lazy Loading for Images

*For any* image element in the frontend, it should have `loading="lazy"` attribute or use a lazy loading library to defer loading until needed.

**Validates: Requirements 8.5**

### Property 16: Code Splitting for Routes

*For any* route component in the application, it should be loaded using dynamic import (React.lazy) to enable code splitting.

**Validates: Requirements 8.6**

### Property 17: Cache Headers for Static Resources

*For any* static resource response (CSS, JS, images), appropriate cache-control headers should be set to enable browser caching.

**Validates: Requirements 8.9**

### Property 18: ARIA Labels for Interactive Elements

*For any* interactive element (buttons, links, inputs) in the frontend, appropriate ARIA labels or accessible names should be provided.

**Validates: Requirements 15.2**

### Property 19: Keyboard Navigation Support

*For any* interactive component in the frontend, keyboard event handlers (onKeyDown, onKeyPress) should be implemented to support keyboard navigation.

**Validates: Requirements 15.3**

### Property 20: Alt Text for Images

*For any* image element in the frontend, an `alt` attribute with descriptive text should be provided for screen reader accessibility.

**Validates: Requirements 15.5**


---

## Error Handling

### Build-Time Error Handling

**ESLint Errors:**
- Parsing errors: Fix syntax issues immediately
- Type errors: Replace `any` with proper types
- Unused variables: Remove or prefix with `_`
- Import errors: Resolve module paths

**Vite Build Errors:**
- Circular dependencies: Restructure chunk splitting
- Module resolution: Fix import paths
- External modules: Configure proper aliases

**Strategy:**
```typescript
// Error prevention through configuration
export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress specific warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        warn(warning);
      }
    }
  }
});
```

### Runtime Error Handling

**Frontend Error Boundaries:**

```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }
}
```


**Backend Error Handling:**

```javascript
// Global error handler
app.use((err, req, res, next) => {
  // Log error
  console.error(`[${req.id}] Error:`, err);
  
  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err, {
      user: { id: req.user?.id },
      tags: { path: req.path, method: req.method },
    });
  }
  
  // Send appropriate response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'حدث خطأ في السيرفر' 
    : err.message;
  
  res.status(statusCode).json({ 
    error: message,
    requestId: req.id 
  });
});
```

**Database Error Handling:**

```javascript
async function queryWithRetry(query, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      const isTimeout = error.message?.includes('timeout') || 
                       error.code === 'ETIMEDOUT';
      
      if (isTimeout && attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### Deployment Error Handling

**Failed Deployment Recovery:**

1. **Automatic Rollback**: GitHub Actions reverts to previous commit
2. **Manual Rollback**: Use Cloudflare/Qovery dashboard
3. **Health Check Failure**: Auto-restart container
4. **Database Connection Failure**: Retry with exponential backoff

**Monitoring and Alerts:**

- Sentry alerts for error rate spikes
- Health check failures trigger notifications
- Performance degradation alerts
- Rate limit exceeded notifications


---

## Testing Strategy

### Dual Testing Approach

This project uses both **unit tests** and **property-based tests** for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties across all inputs

Both are complementary and necessary for comprehensive coverage.

### Unit Testing

**Focus Areas:**
- Specific configuration examples (Cloudflare, Qovery configs)
- Health check endpoint responses
- Security header presence
- Rate limiter configuration values
- Error boundary behavior
- CSRF token validation

**Example Unit Tests:**

```typescript
describe('Health Check Endpoint', () => {
  it('should return 200 when database is connected', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('database', 'connected');
  });
  
  it('should return 503 when database is disconnected', async () => {
    // Mock database failure
    pool.query = vi.fn().mockRejectedValue(new Error('Connection failed'));
    
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('status', 'error');
    expect(response.body).toHaveProperty('database', 'disconnected');
  });
});
```


### Property-Based Testing

**Library**: `@fast-check/vitest` (already installed)

**Configuration**: Minimum 100 iterations per property test

**Test Tagging Format**: 
```typescript
// Feature: production-deployment-preparation, Property 1: ESLint Zero Warnings
```

**Example Property Tests:**

```typescript
import { fc, test } from '@fast-check/vitest';

describe('Property Tests - Production Deployment', () => {
  // Feature: production-deployment-preparation, Property 2: No Explicit Any Types
  test.prop([fc.string()])('should not contain explicit any types in source files', 
    async (filename) => {
      if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) return;
      
      const content = await fs.readFile(`src/${filename}`, 'utf-8');
      const hasExplicitAny = /:\s*any\b/.test(content);
      
      expect(hasExplicitAny).toBe(false);
    }, 
    { numRuns: 100 }
  );
  
  // Feature: production-deployment-preparation, Property 4: Chunk Size Limits
  test.prop([fc.string()])('all build chunks should be below 800KB', 
    async (chunkName) => {
      const chunkPath = `dist/assets/${chunkName}`;
      if (!fs.existsSync(chunkPath)) return;
      
      const stats = await fs.stat(chunkPath);
      const sizeKB = stats.size / 1024;
      
      expect(sizeKB).toBeLessThan(800);
    },
    { numRuns: 100 }
  );
  
  // Feature: production-deployment-preparation, Property 7: Security Headers Presence
  test.prop([fc.webPath()])('all API responses should have security headers', 
    async (path) => {
      const response = await request(app).get(`/api${path}`);
      
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('referrer-policy');
    },
    { numRuns: 100 }
  );
});
```


### Integration Testing

**Deployment Pipeline Testing:**

```yaml
# .github/workflows/test-deployment.yml
name: Test Deployment Pipeline

on:
  pull_request:
    branches: [main]

jobs:
  test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - name: Verify build output
        run: |
          test -d dist
          test -f dist/index.html
          test -f dist/assets/*.js
```

**Health Check Testing:**

```typescript
describe('Health Check Integration', () => {
  it('should complete within 5 seconds', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 80% code coverage
- **Property Tests**: All correctness properties implemented
- **Integration Tests**: All deployment workflows tested
- **E2E Tests**: Critical user flows verified


---

## Implementation Plan

### Phase 1: Code Quality Fixes (Priority: High)

**Tasks:**
1. Fix all ESLint warnings
   - Remove unused variables or prefix with `_`
   - Replace explicit `any` types with proper types
   - Fix parsing error in `card-links-bug-exploration.test.ts`
2. Update ESLint configuration for stricter rules
3. Run `npm run lint:fix` and verify zero warnings

**Estimated Time**: 2-3 hours

### Phase 2: Build Optimization (Priority: High)

**Tasks:**
1. Update `vite.config.ts` chunk splitting strategy
2. Remove stream module from browser bundle
3. Convert conflicting imports to lazy loading only
4. Verify build completes with zero warnings
5. Analyze bundle sizes

**Estimated Time**: 2-3 hours

### Phase 3: Deployment Configurations (Priority: High)

**Tasks:**
1. Create `wrangler.toml` for Cloudflare Pages
2. Create `.qovery.yml` for backend deployment
3. Create `Dockerfile` if needed
4. Update `.github/workflows/deploy.yml`
5. Document environment variables

**Estimated Time**: 3-4 hours

### Phase 4: Security & Performance (Priority: Medium)

**Tasks:**
1. Add CSP header to security middleware
2. Configure Sentry for frontend and backend
3. Verify rate limiting configuration
4. Implement lazy loading for images
5. Verify code splitting for routes
6. Add compression middleware (already done)

**Estimated Time**: 2-3 hours


### Phase 5: Documentation (Priority: Medium)

**Tasks:**
1. Create `DEPLOYMENT.md` with step-by-step guides
2. Create `ENVIRONMENT_VARIABLES.md` with complete documentation
3. Create `BACKUP_RECOVERY.md` with procedures
4. Create `TROUBLESHOOTING.md` with common issues
5. Update `README.md` with production deployment info

**Estimated Time**: 3-4 hours

### Phase 6: Testing & Validation (Priority: Low)

**Tasks:**
1. Write unit tests for health checks
2. Write property tests for correctness properties
3. Test deployment pipeline in staging
4. Verify monitoring and alerts
5. Conduct security audit

**Estimated Time**: 4-5 hours

---

## Dependencies and Prerequisites

### External Services Required

1. **Cloudflare Account**
   - Pages project created
   - API token generated
   - Custom domain configured

2. **Qovery Account**
   - Organization and project created
   - API token generated
   - Database connections configured

3. **Sentry Account**
   - Project created for frontend
   - Project created for backend
   - DSN keys obtained

4. **GitHub Secrets**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `QOVERY_TOKEN`
   - `QOVERY_ORG_ID`
   - `QOVERY_PROJECT_ID`
   - `SENTRY_DSN_FRONTEND`
   - `SENTRY_DSN_BACKEND`


### Package Dependencies

**Already Installed:**
- `@sentry/react: ^10.45.0` - Frontend error monitoring
- `express-rate-limit: ^8.3.1` - API rate limiting
- `compression: ^1.8.1` - Response compression
- `csurf: ^1.11.0` - CSRF protection
- `@fast-check/vitest: ^0.4.0` - Property-based testing

**To Be Installed:**
- `@sentry/node` - Backend error monitoring (if not already installed)

### Database Prerequisites

**CockroachDB:**
- Connection string configured
- SSL certificate in place
- Backup schedule configured
- Connection pooling enabled

**Supabase:**
- Auth configured
- User tables created
- Service role key secured
- RLS policies enabled

---

## Risk Assessment

### High Risk Items

1. **Circular Dependencies in Build**
   - Impact: Build failures or runtime errors
   - Mitigation: Restructure chunk splitting strategy
   - Fallback: Manual chunk configuration

2. **Environment Variable Misconfiguration**
   - Impact: Application failures in production
   - Mitigation: Comprehensive documentation and validation
   - Fallback: Environment variable validation script

3. **Database Connection Timeouts**
   - Impact: Service unavailability
   - Mitigation: Retry logic with exponential backoff
   - Fallback: Connection pool configuration tuning


### Medium Risk Items

1. **Rate Limiting Too Strict**
   - Impact: Legitimate users blocked
   - Mitigation: Monitor rate limit metrics
   - Fallback: Adjust limits based on usage patterns

2. **Sentry Quota Exceeded**
   - Impact: Missing error reports
   - Mitigation: Appropriate sample rates (10%)
   - Fallback: Increase quota or adjust sampling

3. **Build Size Exceeds Limits**
   - Impact: Slow page loads
   - Mitigation: Code splitting and lazy loading
   - Fallback: Further optimization or CDN caching

### Low Risk Items

1. **Documentation Outdated**
   - Impact: Developer confusion
   - Mitigation: Regular documentation reviews
   - Fallback: Version control for documentation

2. **Health Check False Positives**
   - Impact: Unnecessary alerts
   - Mitigation: Proper timeout configuration
   - Fallback: Adjust health check thresholds

---

## Performance Considerations

### Frontend Performance

**Optimization Strategies:**
1. Code splitting by route (React.lazy)
2. Image lazy loading
3. Service worker caching
4. Minification and compression
5. Tree shaking unused code

**Target Metrics:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Lighthouse Performance Score: > 90


### Backend Performance

**Optimization Strategies:**
1. Response compression (gzip)
2. Database connection pooling
3. Query optimization with indexes
4. Caching headers for static resources
5. Rate limiting to prevent abuse

**Target Metrics:**
- API Response Time: < 200ms (p95)
- Database Query Time: < 100ms (p95)
- Health Check Response: < 5s
- Error Rate: < 0.1%

### Database Performance

**CockroachDB Optimization:**
- Connection pool: 10-20 connections
- Query timeout: 30 seconds
- Retry logic: 3 attempts with exponential backoff
- Index optimization for frequent queries

**Supabase Optimization:**
- Connection pool: 5-10 connections
- RLS policies optimized
- Auth token caching

---

## Security Considerations

### Authentication & Authorization

**Supabase Auth:**
- JWT token validation
- Row Level Security (RLS) policies
- Service role key protection
- Session management

**API Authentication:**
- API key validation for protected endpoints
- CSRF token validation for state-changing operations
- Rate limiting per IP address


### Data Protection

**Sensitive Data Handling:**
1. Environment variables stored in platform secrets
2. Database credentials never in code
3. API keys rotated regularly
4. User passwords hashed (Supabase handles this)
5. PII filtered from error reports

**HTTPS Enforcement:**
- Strict-Transport-Security header
- Automatic HTTPS redirect
- SSL certificate auto-renewal

**Input Validation:**
- Parameterized database queries
- Input sanitization for user data
- XSS prevention through CSP headers
- SQL injection prevention

### Security Headers Summary

```javascript
// Complete security headers configuration
const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.themoviedb.org https://*.supabase.co",
    "media-src 'self' https: blob:",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com"
  ].join('; ')
};
```


---

## Monitoring and Observability

### Error Monitoring (Sentry)

**Frontend Monitoring:**
- Unhandled exceptions
- Promise rejections
- React error boundaries
- User session replay (10% sample)
- Performance traces (10% sample)

**Backend Monitoring:**
- Unhandled exceptions
- API errors
- Database errors
- Request traces (10% sample)

**Alert Configuration:**
- Error rate > 1%: Immediate alert
- Response time > 1s: Warning
- Database connection failures: Critical alert

### Performance Monitoring

**Metrics Collected:**
1. API response times (p50, p95, p99)
2. Database query times
3. Error rates by endpoint
4. Request throughput
5. CPU and memory usage
6. Cache hit rates

**Dashboards:**
- Real-time system health
- API performance metrics
- Error trends
- User activity patterns

### Health Checks

**Liveness Probe:**
- Endpoint: `/health`
- Interval: 10 seconds
- Timeout: 5 seconds
- Failure threshold: 3 consecutive failures

**Readiness Probe:**
- Endpoint: `/health`
- Interval: 5 seconds
- Timeout: 3 seconds
- Checks: Database connectivity, server uptime


---

## Deployment Procedures

### Pre-Deployment Checklist

**Code Quality:**
- [ ] All ESLint warnings fixed
- [ ] TypeScript compilation successful
- [ ] All tests passing
- [ ] Build completes without warnings
- [ ] Bundle sizes within limits

**Configuration:**
- [ ] Environment variables documented
- [ ] Cloudflare Pages configuration created
- [ ] Qovery configuration created
- [ ] GitHub Actions workflows updated
- [ ] Secrets configured in platforms

**Security:**
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] Sentry configured
- [ ] API keys rotated

**Database:**
- [ ] CockroachDB connection tested
- [ ] Supabase connection tested
- [ ] Backup schedule verified
- [ ] Connection pooling configured

### Deployment Steps

**Frontend Deployment (Cloudflare Pages):**

1. Push code to main branch
2. GitHub Actions runs CI checks
3. Build completes successfully
4. Cloudflare Pages auto-deploys
5. Verify deployment at cinma.online
6. Check Sentry for errors
7. Monitor performance metrics

**Backend Deployment (Qovery):**

1. Push code to main branch
2. GitHub Actions runs CI checks
3. Qovery pulls latest code
4. Container builds and deploys
5. Health checks pass
6. Auto-scaling configured
7. Monitor logs and metrics


### Post-Deployment Verification

**Automated Checks:**
```bash
# Health check
curl https://api.cinma.online/health

# Frontend accessibility
curl -I https://cinma.online

# API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.cinma.online/api/runtime-config

# Security headers
curl -I https://api.cinma.online | grep -E "X-Frame-Options|X-Content-Type-Options"
```

**Manual Verification:**
- [ ] Homepage loads correctly
- [ ] User authentication works
- [ ] Content displays properly
- [ ] Search functionality works
- [ ] Video playback works
- [ ] Mobile responsiveness verified
- [ ] No console errors

**Monitoring Verification:**
- [ ] Sentry receiving events
- [ ] Health checks passing
- [ ] Performance metrics normal
- [ ] No error rate spikes

### Rollback Procedures

**Frontend Rollback (Cloudflare Pages):**
1. Go to Cloudflare Pages dashboard
2. Select previous deployment
3. Click "Rollback to this deployment"
4. Verify rollback successful

**Backend Rollback (Qovery):**
1. Go to Qovery dashboard
2. Select application
3. Choose previous version
4. Click "Redeploy"
5. Wait for health checks to pass

**Emergency Rollback (Git):**
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to previous commit
git reset --hard <previous-commit-hash>
git push --force origin main
```


---

## Backup and Recovery

### Backup Strategy

**CockroachDB Backups:**
- **Frequency**: Daily automatic backups
- **Retention**: 30 days
- **Location**: Geographically separate region
- **Verification**: Weekly integrity checks
- **Type**: Full database backup

**Supabase Backups:**
- **Frequency**: Daily automatic backups (managed by Supabase)
- **Retention**: 7 days (free tier) / 30 days (paid tier)
- **Type**: Point-in-time recovery available

**Code Backups:**
- **Location**: GitHub repository
- **Branches**: main, develop, feature branches
- **Tags**: Version tags for releases
- **Frequency**: Continuous (every commit)

### Recovery Procedures

**Database Recovery (CockroachDB):**

```bash
# 1. Stop application to prevent new writes
# 2. Restore from backup
cockroach sql --url="$COCKROACHDB_URL" < backup-2025-01-15.sql

# 3. Verify data integrity
cockroach sql --url="$COCKROACHDB_URL" -e "SELECT COUNT(*) FROM movies;"

# 4. Restart application
# 5. Monitor for errors
```

**Application Recovery:**

```bash
# 1. Identify last known good commit
git log --oneline

# 2. Rollback to that commit
git reset --hard <commit-hash>
git push --force origin main

# 3. Trigger redeployment
# 4. Verify deployment successful
```


### Recovery Time Objectives (RTO)

- **Critical Services**: 15 minutes
  - Frontend (Cloudflare Pages)
  - Backend API (Qovery)
  - Database (CockroachDB)

- **Non-Critical Services**: 1 hour
  - Monitoring dashboards
  - Analytics
  - Background jobs

### Recovery Point Objectives (RPO)

- **Database**: 24 hours (daily backups)
- **Application Code**: 0 (continuous Git commits)
- **User Data**: 24 hours (Supabase daily backups)

### Disaster Recovery Checklist

**Immediate Actions (0-15 minutes):**
- [ ] Assess impact and scope
- [ ] Notify team members
- [ ] Check monitoring dashboards
- [ ] Identify root cause
- [ ] Initiate rollback if needed

**Short-term Actions (15-60 minutes):**
- [ ] Restore from backup if needed
- [ ] Verify data integrity
- [ ] Test critical functionality
- [ ] Monitor error rates
- [ ] Update status page

**Post-Recovery Actions:**
- [ ] Document incident
- [ ] Analyze root cause
- [ ] Implement preventive measures
- [ ] Update runbooks
- [ ] Conduct post-mortem


---

## Troubleshooting Guide

### Common Issues and Solutions

**Issue 1: Build Fails with Circular Dependency Warning**

**Symptoms:**
```
(!) Circular dependency
node_modules/react/index.js -> node_modules/react-dom/index.js -> node_modules/react/index.js
```

**Solution:**
```typescript
// Update vite.config.ts chunk splitting
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/)) {
      return 'vendor-react';
    }
    if (id.match(/[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/)) {
      return 'vendor-router'; // Separate from react core
    }
  }
}
```

**Issue 2: ESLint Parsing Error in Test Files**

**Symptoms:**
```
Parsing error: Unexpected token 'any'
```

**Solution:**
```typescript
// Replace explicit any with proper types
// Before:
const mockFn = vi.fn() as any;

// After:
const mockFn = vi.fn() as jest.Mock<ReturnType, Parameters>;
```

**Issue 3: Health Check Fails in Production**

**Symptoms:**
- 503 Service Unavailable
- Database connection timeout

**Solution:**
```javascript
// Add retry logic to database connection
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```


**Issue 4: Rate Limit Exceeded**

**Symptoms:**
```json
{
  "error": "كثرت الطلبات. حاول مرة أخرى بعد دقيقة.",
  "status": 429
}
```

**Solution:**
- Check if legitimate traffic spike
- Adjust rate limits if needed
- Implement request queuing on client
- Add retry logic with exponential backoff

**Issue 5: Sentry Not Receiving Events**

**Symptoms:**
- No errors in Sentry dashboard
- Events not being captured

**Solution:**
```typescript
// Verify Sentry initialization
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // ... other config
  });
  
  // Test Sentry
  Sentry.captureMessage('Sentry is working!');
}
```

**Issue 6: Environment Variables Not Loading**

**Symptoms:**
- `undefined` values for environment variables
- Application fails to start

**Solution:**
1. Verify variables are set in platform (Cloudflare/Qovery)
2. Check variable names match exactly (case-sensitive)
3. Restart application after adding variables
4. Use validation script:

```javascript
// validate-env.js
const required = [
  'COCKROACHDB_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'GEMINI_API_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```


---

## Documentation Requirements

### DEPLOYMENT.md

**Contents:**
1. Prerequisites and setup
2. Frontend deployment steps (Cloudflare Pages)
3. Backend deployment steps (Qovery)
4. Environment variables configuration
5. Post-deployment verification
6. Rollback procedures
7. Troubleshooting common issues

### ENVIRONMENT_VARIABLES.md

**Contents:**
1. Complete list of all variables
2. Required vs optional designation
3. Example values
4. Purpose and usage
5. Development vs production values
6. Security considerations
7. Validation script

### BACKUP_RECOVERY.md

**Contents:**
1. Backup strategy overview
2. Backup schedules and retention
3. Database backup procedures
4. Application backup procedures
5. Recovery procedures
6. RTO and RPO definitions
7. Disaster recovery checklist
8. Testing backup restoration

### TROUBLESHOOTING.md

**Contents:**
1. Common deployment issues
2. Build and compilation errors
3. Runtime errors
4. Database connection issues
5. Performance problems
6. Security issues
7. Monitoring and debugging tools


---

## Success Criteria

### Code Quality Metrics

- ✅ Zero ESLint warnings
- ✅ Zero TypeScript compilation errors
- ✅ Zero Vite build warnings
- ✅ All tests passing
- ✅ Code coverage > 80%

### Build Metrics

- ✅ Build time < 5 minutes
- ✅ All chunks < 800KB
- ✅ No circular dependencies
- ✅ Proper code splitting implemented
- ✅ Tree shaking effective

### Deployment Metrics

- ✅ Deployment time < 10 minutes
- ✅ Zero-downtime deployment
- ✅ Health checks passing
- ✅ Auto-scaling configured
- ✅ Rollback capability verified

### Performance Metrics

- ✅ Lighthouse Performance Score > 90
- ✅ First Contentful Paint < 1.5s
- ✅ Largest Contentful Paint < 2.5s
- ✅ Time to Interactive < 3.5s
- ✅ API Response Time < 200ms (p95)

### Security Metrics

- ✅ All security headers present
- ✅ HTTPS enforced
- ✅ Rate limiting active
- ✅ CSRF protection enabled
- ✅ No sensitive data in logs

### Monitoring Metrics

- ✅ Sentry capturing errors
- ✅ Health checks responding
- ✅ Performance metrics tracked
- ✅ Alerts configured
- ✅ Dashboards accessible


---

## Conclusion

This design document provides a comprehensive plan for preparing the cinma.online project for production deployment. The implementation follows a phased approach:

1. **Phase 1**: Fix code quality issues (ESLint, TypeScript)
2. **Phase 2**: Optimize build configuration (Vite, chunks)
3. **Phase 3**: Create deployment configurations (Cloudflare, Qovery)
4. **Phase 4**: Enhance security and performance
5. **Phase 5**: Complete documentation
6. **Phase 6**: Testing and validation

### Key Achievements

- **Zero Warnings**: Clean build with no ESLint or Vite warnings
- **Optimized Performance**: Fast load times and efficient code splitting
- **Secure Deployment**: Comprehensive security headers and protections
- **Automated CI/CD**: Fully automated testing and deployment pipeline
- **Complete Monitoring**: Error tracking and performance monitoring
- **Comprehensive Documentation**: Complete guides for deployment and recovery

### Next Steps

After design approval, proceed to task creation phase where each component will be broken down into actionable implementation tasks with clear acceptance criteria and testing requirements.

---

**تاريخ الإنشاء / Created**: 2025-01-15  
**الحالة / Status**: مكتمل للمراجعة / Complete for Review  
**الإصدار / Version**: 1.0

