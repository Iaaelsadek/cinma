# 🚀 MASTER INGESTION QUEUE - Production Guide

## 📋 Overview

MASTER_INGESTION_QUEUE is a Round-Robin ingestion system that processes 4 categories in rotation:
- Arabic Movies
- Foreign Movies
- TV Series
- Animation

**Status:** ✅ Production Ready (Verified 2026-04-14)

---

## 🎯 Quick Start

### 1. Start Ingestion (Terminal 1)
```bash
node scripts/ingestion/MASTER_INGESTION_QUEUE.js
```

### 2. Monitor Progress (Terminal 2)
```bash
node scripts/monitor-production-ingestion.js
```

---

## 📊 Monitoring Scripts

### Real-time Monitor
```bash
node scripts/monitor-production-ingestion.js
```
- Updates every 10 seconds
- Shows current counts and rates
- Checks for critical issues (series without seasons)
- Estimates time to completion

### Check Counts
```bash
node scripts/check-counts.js
```
- Quick snapshot of database counts
- Shows recent TV series with season counts

### Check Series Without Seasons
```bash
node scripts/check-series-without-seasons.js
```
- Critical check for "null series_id" bug
- Should always show 0 series without seasons

### Check Season Completeness
```bash
node scripts/check-season-completeness.js
```
- Verifies series have correct number of seasons
- Shows difference between our count and TMDB count
- Minor differences (1-2 seasons) are normal (Season 0 specials)

### Final Verification Report
```bash
node scripts/final-verification-report.js
```
- Comprehensive verification of all checks
- Run after ingestion completes

---

## ⚙️ Configuration

Edit `scripts/ingestion/config.json`:

```json
{
  "targets": {
    "arabicMovies": 250000,
    "foreignMovies": 250000,
    "tvSeries": 250000,
    "animation": 250000
  },
  "pagesPerRound": 10,
  "itemsPerPage": 20,
  "rateLimit": 50,
  "retryAfterBuffer": 1000,
  "maxRetries": 3,
  "statsInterval": 10000
}
```

### Key Settings:
- `pagesPerRound`: Pages to process per category per round (default: 10)
- `rateLimit`: Max concurrent TMDB API calls (default: 50 req/sec)
- `statsInterval`: Live stats update interval in ms (default: 10000 = 10s)

---

## 🔍 What to Monitor

### ✅ Good Signs:
- Series without seasons: **0**
- Average season difference: **≤2**
- Steady ingestion rate (30-40 movies/min, 5-10 series/min)
- No "null series_id" errors in logs

### ⚠️ Warning Signs:
- Average season difference: **2-5** (may indicate pagination issues)
- Ingestion rate drops significantly
- Occasional 429 errors (rate limiting - will auto-retry)

### ❌ Critical Issues:
- Series without seasons: **>0** (should NEVER happen)
- Average season difference: **>5** (pagination or rate limiting problem)
- Repeated "null series_id" errors (bug regression)

---

## 🐛 Troubleshooting

### Issue: Series without seasons
**Status:** ✅ FIXED (verified 2026-04-14)

If this happens again:
1. Stop ingestion immediately
2. Run `node scripts/check-series-without-seasons.js`
3. Check logs for "null series_id" errors
4. Report to development team

### Issue: High season difference (>5)
**Possible causes:**
- Pagination not working correctly
- Rate limiting too aggressive
- TMDB API returning incomplete data

**Solution:**
1. Check `pagesPerRound` setting (try reducing to 5)
2. Check `rateLimit` setting (try reducing to 30)
3. Add `sleep` between season fetches if needed

### Issue: 429 Rate Limit Errors
**Status:** ✅ Handled automatically

The script will:
1. Read `Retry-After` header from TMDB
2. Wait specified time + buffer (1000ms)
3. Retry the request

No action needed unless errors persist.

---

## 📈 Expected Performance

### Ingestion Rates:
- **Movies:** 30-40 items/min
- **TV Series:** 5-10 items/min (with seasons)
- **Seasons:** 50-100 items/min
- **Episodes:** 500-1000 items/min (if enabled)

### Total Time Estimates:
- **250K movies:** ~100-140 hours
- **250K TV series:** ~400-500 hours (with seasons)
- **1M total items:** ~20-30 days continuous

### Optimization Tips:
1. Run on a server with good internet connection
2. Use `screen` or `tmux` to keep process running
3. Monitor first 1 hour, then check every 6-12 hours
4. Keep `rateLimit` at 50 (TMDB allows up to 50 req/sec)

---

## 🔧 Advanced Usage

### Clean Database (CAUTION!)
```bash
node scripts/clean-database.js
```
⚠️ This will delete ALL content! Use only for testing.

### Test Run (1 minute)
```bash
# Start ingestion
node scripts/ingestion/MASTER_INGESTION_QUEUE.js

# Wait 60 seconds, then Ctrl+C

# Verify results
node scripts/final-verification-report.js
```

### Resume After Stop
The script automatically skips existing items (checks `external_id`).
Just restart and it will continue from where it left off.

---

## 📁 File Structure

```
scripts/
├── ingestion/
│   ├── MASTER_INGESTION_QUEUE.js  (main script)
│   ├── config.json                 (configuration)
│   └── README.md                   (this file)
├── monitor-production-ingestion.js (real-time monitor)
├── check-counts.js                 (quick counts)
├── check-series-without-seasons.js (critical check)
├── check-season-completeness.js    (season verification)
├── final-verification-report.js    (comprehensive report)
└── clean-database.js               (delete all content)
```

---

## ✅ Verification Checklist

Before starting production ingestion:
- [ ] TMDB API key is valid (`VITE_TMDB_API_KEY` in `.env`)
- [ ] CockroachDB connection works (`COCKROACHDB_URL` in `.env`)
- [ ] Test run completed successfully (1 minute)
- [ ] All verification checks passed (0 series without seasons)
- [ ] Monitor script is ready in separate terminal

During ingestion (check every hour):
- [ ] Series without seasons: 0
- [ ] Average season difference: ≤2
- [ ] Ingestion rate is steady
- [ ] No critical errors in logs

After completion:
- [ ] Run `final-verification-report.js`
- [ ] Verify all targets reached
- [ ] Check season completeness
- [ ] Celebrate! 🎉

---

## 🙏 Credits

- **Root Cause Fix:** Removed `::UUID` cast in SQL queries
- **CAO Review:** Identified re-select logic gaps and error counter issues
- **Verification:** Clean database test with 100% success rate

---

**Last Updated:** 2026-04-14  
**Status:** ✅ Production Ready  
**Bug Status:** ✅ "null series_id" bug completely fixed
