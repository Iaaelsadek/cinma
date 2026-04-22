# 🎬 4CIMA - فور سيما

منصة مشاهدة أفلام ومسلسلات

## 🏗️ Architecture

```
Frontend  → Cloudflare Pages (React + Vite)
Backend   → Qovery (Node.js + Express)
Auth      → Supabase (users only)
Content   → CockroachDB (movies, series, actors...)
```

## ⚠️ القاعدة الذهبية

```
Supabase  = Auth & User Data ONLY
CockroachDB = ALL Content (movies, tv, actors...)
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Fill in your values

# 3. Run development
npm run dev        # Frontend (port 5173)
npm run server     # Backend (port 3001)
```

## 📦 Content Ingestion

```bash
# Import movies from TMDB
node scripts/ingestion/INGEST-MOVIES.js

# Import TV series from TMDB
node scripts/ingestion/INGEST-SERIES.js

# Find missing pages from past runs
node scripts/ingestion/FIND-MISSING-PAGES.js all

# Retry failed pages
node scripts/ingestion/RETRY-FAILED-PAGES.js all
```

## 🔧 Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Database:** CockroachDB (content) + Supabase (auth)
- **Deployment:** Cloudflare Pages + Qovery
- **CI/CD:** GitHub Actions

## 📁 Project Structure

```
src/          # Frontend React app
server/       # Backend Express API
scripts/
  ingestion/  # TMDB data ingestion scripts
  services/   # Translation & AI services
.github/
  workflows/  # CI/CD pipelines
```

## 🔑 Required GitHub Secrets

```
COCKROACHDB_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_TMDB_API_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
QOVERY_TOKEN
QOVERY_ORG_ID
QOVERY_PROJECT_ID
QOVERY_ENV_ID
MISTRAL_API_KEY
```
