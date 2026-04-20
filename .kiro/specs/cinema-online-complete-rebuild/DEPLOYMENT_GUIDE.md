# 🚀 Cinema.online - Deployment Guide to Koyeb

## Overview

This guide walks you through deploying the Cinema.online backend to Koyeb and connecting it with your frontend.

---

## Prerequisites

- ✅ Koyeb account (https://app.koyeb.com)
- ✅ GitHub repository with your code
- ✅ CockroachDB connection string
- ✅ TMDB API key
- ✅ Supabase credentials

---

## Step 1: Prepare Your Repository

### 1.1 Ensure All Files Are Committed

```bash
git add .
git commit -m "Phase 5 complete: Admin Dashboard Integration"
git push origin main
```

### 1.2 Verify Required Files Exist

- ✅ `server/index.js` - Main server file
- ✅ `package.json` - With `"server": "node server/index.js"` script
- ✅ All server routes in `server/routes/`
- ✅ All ingestion files in `src/ingestion/`, `src/adapters/`, `src/validation/`

---

## Step 2: Deploy Backend to Koyeb

### 2.1 Create New App

1. Go to https://app.koyeb.com
2. Click "Create App"
3. Select "GitHub" as source
4. Connect your repository
5. Select branch: `main`

### 2.2 Configure Build Settings

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm run server
```

**Port:** `8080`

### 2.3 Set Environment Variables

Click "Environment Variables" and add:

```env
# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=8080

# Database
COCKROACHDB_URL=postgresql://cinma-db:YOUR_PASSWORD@prying-squid-23421.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full

# TMDB API
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original
TMDB_RATE_LIMIT_PER_SECOND=40

# API Security
API_KEY=your-production-api-key-here-change-this

# Supabase (for admin auth)
VITE_SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# CORS Origins (optional, for additional domains)
VITE_APP_URL=https://cinma.online
```

**IMPORTANT**: 
- Replace `YOUR_PASSWORD` with your actual CockroachDB password
- Replace `your_tmdb_api_key_here` with your TMDB API key
- Replace `your-production-api-key-here-change-this` with a strong random key
- Replace `your_supabase_anon_key_here` with your Supabase anon key

### 2.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete (2-5 minutes)
3. Note your Koyeb URL (e.g., `https://cinema-api-your-app.koyeb.app`)

### 2.5 Verify Deployment

Test the health endpoint:

```bash
curl https://cinema-api-your-app.koyeb.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-02T...",
  "database": "connected",
  "uptime": 123.456
}
```

---

## Step 3: Update Frontend Configuration

### 3.1 Update `.env.local`

Create or update `.env.local` in your frontend project:

```env
# API Configuration - PRODUCTION
VITE_API_URL=https://cinema-api-your-app.koyeb.app
VITE_API_BASE=https://cinema-api-your-app.koyeb.app
VITE_API_KEY=your-production-api-key-here-change-this

# Supabase (Auth)
VITE_SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Site Settings
VITE_SITE_NAME="اونلاين سينما"
VITE_DOMAIN="cinma.online"
VITE_SITE_URL="https://cinma.online"

# TMDB (for frontend image URLs)
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

**IMPORTANT**: Replace `cinema-api-your-app.koyeb.app` with your actual Koyeb URL

### 3.2 Test Locally with Production Backend

```bash
npm run dev
```

Open `http://localhost:5173/admin/ingestion` and verify:
- ✅ Statistics load
- ✅ Log table loads
- ✅ Can queue items
- ✅ Can trigger processing

---

## Step 4: Deploy Frontend

### Option A: Vercel

1. Go to https://vercel.com
2. Import your repository
3. Set environment variables (same as `.env.local`)
4. Deploy

### Option B: Netlify

1. Go to https://netlify.com
2. Import your repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables
6. Deploy

### Option C: Cloudflare Pages

1. Go to https://pages.cloudflare.com
2. Connect your repository
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Set environment variables
6. Deploy

---

## Step 5: Test Production Deployment

### 5.1 Test Backend Endpoints

```bash
# Health check
curl https://cinema-api-your-app.koyeb.app/health

# Movies list
curl https://cinema-api-your-app.koyeb.app/api/movies?limit=10

# Search
curl https://cinema-api-your-app.koyeb.app/api/search?q=batman

# Sitemap
curl https://cinema-api-your-app.koyeb.app/sitemap.xml
```

### 5.2 Test Admin Dashboard

1. Go to `https://cinma.online/admin/ingestion`
2. Login as admin
3. Verify all features work:
   - ✅ Statistics display
   - ✅ Log table loads
   - ✅ Can queue items
   - ✅ Can re-queue failed
   - ✅ Can trigger processing
   - ✅ Auto-refresh works

### 5.3 Test Ingestion Flow

1. Queue a test movie (TMDB ID: 550)
2. Trigger processing
3. Wait for success status
4. Verify movie appears on site

---

## Step 6: Monitor and Maintain

### 6.1 Koyeb Monitoring

- Check logs: Koyeb Dashboard → Your App → Logs
- Monitor metrics: CPU, Memory, Network
- Set up alerts for errors

### 6.2 Database Monitoring

- CockroachDB Console: https://cockroachlabs.cloud
- Monitor query performance
- Check connection pool usage

### 6.3 Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- DataDog for APM

---

## Troubleshooting

### Backend Won't Start

**Check Koyeb logs:**
```
Koyeb Dashboard → Your App → Logs
```

**Common issues:**
- Missing environment variables
- Invalid CockroachDB connection string
- Port binding issues (must be 0.0.0.0:8080)

### Database Connection Fails

**Verify connection string:**
```bash
# Test locally first
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: 'YOUR_CONNECTION_STRING' }); pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error)"
```

**Check:**
- Password is correct
- SSL mode is `verify-full`
- Certificate is accessible

### CORS Errors

**Update allowed origins in `server/index.js`:**
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://cinma.online',
  'https://www.cinma.online',
  'https://your-vercel-domain.vercel.app', // Add your frontend domain
]
```

Redeploy backend after changes.

### API Key Authentication Fails

**Verify:**
1. `VITE_API_KEY` in frontend matches `API_KEY` in backend
2. Header is sent: `X-API-Key: your-key`
3. Check browser console for errors

### Ingestion Not Working

**Check:**
1. TMDB API key is valid
2. CockroachDB has `ingestion_log` table
3. Backend logs for errors
4. Rate limiting (40 req/sec for TMDB)

---

## Performance Optimization

### 1. Enable Caching

Already implemented:
- ✅ In-memory cache (10 min TTL)
- ✅ Compression (gzip)

### 2. CDN for Static Assets

Use Cloudflare or similar for:
- Images
- CSS/JS bundles
- Fonts

### 3. Database Optimization

- ✅ Indexes already created
- ✅ Connection pooling configured
- Consider read replicas for high traffic

### 4. Rate Limiting

Already implemented:
- ✅ API: 200 req/min
- ✅ Admin: 10 req/min
- ✅ DB: 100 req/min

---

## Security Checklist

- ✅ API Key protection enabled
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ CSRF protection enabled
- ✅ Security headers set
- ✅ HTTPS enforced (via Koyeb)
- ✅ Environment variables secured
- ⚠️ TODO: Add JWT verification for admin routes
- ⚠️ TODO: Add IP whitelisting for admin endpoints

---

## Backup and Recovery

### Database Backups

CockroachDB automatic backups:
- Daily backups enabled by default
- 30-day retention
- Point-in-time recovery available

### Code Backups

- ✅ Git repository (GitHub)
- ✅ Koyeb deployment history
- Consider: Regular exports of critical data

---

## Scaling

### Horizontal Scaling

Koyeb auto-scaling:
- Set min/max instances
- Auto-scale based on CPU/Memory
- Load balancing automatic

### Database Scaling

CockroachDB:
- Add nodes for more capacity
- Upgrade plan for more resources
- Consider sharding for massive scale

---

## Cost Estimation

### Koyeb (Backend)

- Starter: $5-10/month (1 instance)
- Pro: $20-50/month (2-3 instances)
- Enterprise: Custom pricing

### CockroachDB

- Serverless: Pay per request (~$10-50/month)
- Dedicated: $295+/month

### Frontend Hosting

- Vercel: Free tier available
- Netlify: Free tier available
- Cloudflare Pages: Free tier available

**Total Estimated Cost**: $15-100/month depending on traffic

---

## Support and Resources

### Documentation

- [Final Integration Report](.kiro/specs/cinema-online-complete-rebuild/FINAL_INTEGRATION_REPORT.md)
- [Dashboard User Guide (Arabic)](.kiro/specs/cinema-online-complete-rebuild/DASHBOARD_USER_GUIDE_AR.md)
- [Technical README](../../src/pages/admin/README.md)

### External Resources

- Koyeb Docs: https://www.koyeb.com/docs
- CockroachDB Docs: https://www.cockroachlabs.com/docs
- TMDB API Docs: https://developers.themoviedb.org

---

## Rollback Plan

If deployment fails:

1. **Revert to previous version:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Koyeb will auto-deploy the reverted version**

3. **Or manually rollback in Koyeb:**
   - Dashboard → Your App → Deployments
   - Click on previous successful deployment
   - Click "Redeploy"

---

## Post-Deployment Checklist

- [ ] Backend deployed to Koyeb
- [ ] Health check returns OK
- [ ] Frontend deployed to production
- [ ] Admin dashboard accessible
- [ ] Can queue items successfully
- [ ] Can trigger processing
- [ ] Movies appear on site after ingestion
- [ ] All API endpoints working
- [ ] Sitemap generating correctly
- [ ] Monitoring set up
- [ ] Backups verified
- [ ] Team notified of deployment

---

**Deployment Date**: 2026-04-02  
**Version**: 1.0.0  
**Status**: Ready for Production  

**🎊 Good luck with your deployment! 🎊**
