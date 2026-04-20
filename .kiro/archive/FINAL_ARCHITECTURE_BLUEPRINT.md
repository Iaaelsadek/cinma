# FINAL ARCHITECTURE BLUEPRINT
## Cinema.online — Data Ingestion Pipeline & Database Rebuild
**Version:** 2.0 — APPROVED  
**Date:** 2026-04-02  
**Status:** ✅ FINAL — Ready for Implementation by Kiro  
**Decision:** 100% Clean Slate. All 318K existing records dropped.

---

## TABLE OF CONTENTS

1. [Architectural Constants & Non-Negotiables](#1-architectural-constants--non-negotiables)
2. [Environment Setup & Dependencies](#2-environment-setup--dependencies)
3. [The Smart Centralized Slug Engine](#3-the-smart-centralized-slug-engine)
4. [Source-Agnostic Ingestion Service (Adapter Pattern)](#4-source-agnostic-ingestion-service-adapter-pattern)
5. [Batch Processing Logic](#5-batch-processing-logic)
6. [Ingestion Log State Machine](#6-ingestion-log-state-machine)
7. [The Final CockroachDB SQL Schema (DDL)](#7-the-final-cockroachdb-sql-schema-ddl)
8. [Known Trade-offs & Architectural Decisions Log](#8-known-trade-offs--architectural-decisions-log)

---

## 1. ARCHITECTURAL CONSTANTS & NON-NEGOTIABLES

These rules are immutable. No code, no PR, no hotfix may violate them.

| # | Rule | Reason |
|---|------|--------|
| C-1 | `slug` is `UNIQUE NOT NULL` on all core content tables | No content enters DB without a valid slug |
| C-2 | Zero TMDB IDs or internal UUIDs in public URLs | All routing is by slug only |
| C-3 | URL formula for TV hierarchy: `/tv/[slug]/season/[number]/episode/[number]` | Non-negotiable routing constant |
| C-4 | `UUID DEFAULT gen_random_uuid()` for ALL primary keys | Prevents index hotspotting in CockroachDB distributed nodes |
| C-5 | JSONB for genres, cast, crew, networks, keywords | Read performance over relational flexibility (see Trade-offs §8) |
| C-6 | No junction tables | Deliberate denormalization — acknowledged trade-off |
| C-7 | `ON CONFLICT` upsert is the ONLY way to write content | No raw INSERT without conflict handling |
| C-8 | Slug uniqueness is per content-type (per table) | `/movie/the-batman-2022` and `/game/the-batman-2022` can coexist |
| C-9 | No TMDB API calls from the frontend | Frontend reads exclusively from CockroachDB API endpoints |
| C-10 | If an item has no valid slug, it is NOT rendered in the UI | Null/empty slug = invisible content |

---

## 2. ENVIRONMENT SETUP & DEPENDENCIES

### 2.1 Node.js Version
```
node >= 20.x LTS
npm >= 10.x
```

### 2.2 Project Structure
```
cinema-ingestion/
├── src/
│   ├── db/
│   │   ├── pool.js              # CockroachDB connection pool
│   │   └── queries.js           # Reusable parameterized queries
│   ├── slug/
│   │   └── SlugEngine.js        # The centralized slug engine (§3)
│   ├── adapters/
│   │   ├── BaseAdapter.js       # Abstract adapter interface
│   │   ├── TMDBAdapter.js       # TMDB-specific fetching & normalization
│   │   └── RAWGAdapter.js       # RAWG-specific (future)
│   ├── ingestion/
│   │   ├── CoreIngestor.js      # Source-agnostic write logic (§4)
│   │   ├── BatchProcessor.js    # Batch orchestration (§5)
│   │   └── StateManager.js      # ingestion_log state machine (§6)
│   └── validation/
│       └── ContentValidator.js  # Pre-insert validation rules
├── scripts/
│   └── schema.sql               # The DDL from §7
├── .env
└── package.json
```

### 2.3 Dependencies (`package.json`)
```json
{
  "dependencies": {
    "pg": "^8.12.0",
    "transliteration": "^2.3.5",
    "axios": "^1.7.2",
    "dotenv": "^16.4.5",
    "p-limit": "^5.0.0",
    "p-retry": "^6.2.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

**Dependency Rationale:**

| Package | Role | Why This One |
|---------|------|-------------|
| `pg` | CockroachDB driver (PostgreSQL-compatible) | CockroachDB is wire-compatible with pg |
| `transliteration` | Arabic → Latin character conversion | Best Unicode coverage for Arabic among Node.js libraries |
| `axios` | HTTP client for TMDB/RAWG API calls | Interceptors for retry, timeout, base URL |
| `dotenv` | Environment variable loading | Standard |
| `p-limit` | Concurrency control for parallel TMDB fetches | Prevents TMDB rate limit violations |
| `p-retry` | Retry logic with exponential backoff | For transient DB/API errors |
| `zod` | Runtime schema validation for TMDB responses | Type-safe validation before DB write |

### 2.4 Environment Variables (`.env`)
```env
# CockroachDB
COCKROACHDB_URL=postgresql://user:password@host:26257/defaultdb?sslmode=verify-full

# TMDB
TMDB_API_KEY=your_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original
TMDB_RATE_LIMIT_PER_SECOND=40

# RAWG (future)
RAWG_API_KEY=your_rawg_key_here

# Ingestion Config
BATCH_SIZE=50
MAX_CONCURRENT_FETCHES=10
MAX_SLUG_RETRY_ATTEMPTS=10
MAX_INGESTION_RETRY_COUNT=3
RETRY_BACKOFF_BASE_MS=1000
```

---

## 3. THE SMART CENTRALIZED SLUG ENGINE

**File:** `src/slug/SlugEngine.js`  
**Rule:** This is the ONLY place in the entire codebase where slugs are generated. No other file may contain slug generation logic.

### 3.1 Arabic Pre-Processing Pipeline

Before passing any text to the transliteration library, it MUST pass through these normalization steps in order:

```
RAW ARABIC TEXT
      │
      ▼
[Step 1] Strip Tashkeel (Diacritics)
  Remove: harakat (َ ِ ُ ً ٍ ٌ ّ ْ) — Unicode range U+064B–U+065F
      │
      ▼
[Step 2] Normalize Hamza Variants → ا
  Replace: أ (U+0623) → ا
  Replace: إ (U+0625) → ا
  Replace: آ (U+0622) → ا
  Replace: ٱ (U+0671) → ا
      │
      ▼
[Step 3] Normalize Taa Marbuta → ه
  Replace: ة (U+0629) → ه
      │
      ▼
[Step 4] Normalize Alef Maqsura → ي
  Replace: ى (U+0649) → ي
      │
      ▼
[Step 5] Normalize Waw with Hamza Above → و
  Replace: ؤ (U+0624) → و
      │
      ▼
[Step 6] Normalize Yaa with Hamza Below → ي
  Replace: ئ (U+0626) → ي
      │
      ▼
[NORMALIZED ARABIC TEXT]
      │
      ▼
[Step 7] transliteration.transliterate(text)
      │
      ▼
[LATIN TEXT]
      │
      ▼
[Step 8] Slugify
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')   ← strip non-alphanumeric
  .replace(/[\s]+/g, '-')          ← spaces → hyphens
  .replace(/-+/g, '-')             ← collapse multiple hyphens
  .replace(/^-+|-+$/g, '')         ← trim leading/trailing hyphens
      │
      ▼
[CLEAN SLUG BASE]
```

**Transformation Examples:**

| Arabic Title | After Pre-processing | After Transliteration | Final Base Slug |
|---|---|---|---|
| `مأوى` | `ماوى` | `mawy` | `mawy` |
| `أبو شنب` | `ابو شنب` | `abw shnb` | `abw-shnb` |
| `فيلم Action` | `فيلم Action` | `fylm Action` | `fylm-action` |
| `النهاية` | `النهاية` | `alnhayh` | `alnhayh` |
| `2001: A Space Odyssey` | (no Arabic) | (no change) | `2001-a-space-odyssey` |
| `!!!???` | (no Arabic) | (empty) | *(triggers fallback)* |

### 3.2 Fallback Strategy for Empty Slugs

If after all processing the slug base is empty or less than 2 characters:

```
1. Try: use original_title (English) through the same pipeline
2. If still empty: use content-type prefix + 4-char random alphanumeric
   Example: "movie-k7x2", "tv-p9q1"
3. NEVER use TMDB ID or internal UUID in the slug
```

### 3.3 Full Slug Generation Formula

```
FINAL_SLUG = [slug-base]-[year]

Where:
  slug-base = result of §3.1 pipeline
  year      = 4-digit release year (from release_date or first_air_date)

If year is NULL or invalid:
  FINAL_SLUG = [slug-base]   ← no year appended
```

### 3.4 Optimistic Concurrency Retry Loop (Race Condition Solution)

**Philosophy:** We do NOT use `SELECT FOR UPDATE`. We do NOT pre-check slug existence. We attempt the INSERT optimistically and handle conflicts at the DB constraint level. The DB is the single source of truth.

```
ATTEMPT 1:  INSERT slug = "alnhayh-2022"
            → SUCCESS → done ✅

ATTEMPT 1:  INSERT slug = "alnhayh-2022"
            → CONFLICT on slug unique constraint
ATTEMPT 2:  INSERT slug = "alnhayh-2022-2"
            → SUCCESS → done ✅

ATTEMPT 2:  INSERT slug = "alnhayh-2022-2"
            → CONFLICT on slug unique constraint
ATTEMPT 3:  INSERT slug = "alnhayh-2022-3"
            → ... up to MAX_SLUG_RETRY_ATTEMPTS (default: 10)

ATTEMPT 11: → HARD FAILURE → log to ingestion_log with status='failed'
            → error: "slug_exhausted" — manual review required
```

**Counter Format:**
- Base: `alnhayh-2022`
- Counter 2: `alnhayh-2022-2`
- Counter 3: `alnhayh-2022-3`
- **NEVER:** `alnhayh-2022-550` (no TMDB ID)

**Critical Implementation Note:**  
The slug retry loop is inside the `CoreIngestor`, not the `SlugEngine`. The `SlugEngine` only generates slug strings. The `CoreIngestor` owns the insert-retry loop.

### 3.5 SlugEngine Interface (Contract for Kiro)

```javascript
class SlugEngine {
  /**
   * Generates a slug candidate string. Does NOT check DB uniqueness.
   * Uniqueness is the CoreIngestor's responsibility.
   *
   * @param {string} title        - Primary title (may be Arabic)
   * @param {string} originalTitle - Fallback title (usually English)
   * @param {number|null} year    - Release year (4 digits) or null
   * @param {number} attempt      - Retry attempt number (1 = first try, 2+ = duplicates)
   * @returns {string}            - Slug candidate, never empty, never contains UUID/TMDB ID
   */
  generate(title, originalTitle, year, attempt = 1) { ... }

  /**
   * Arabic Unicode normalization step only.
   * Exposed for unit testing.
   * @param {string} text
   * @returns {string}
   */
  normalizeArabic(text) { ... }

  /**
   * Slugify a plain Latin string.
   * Exposed for unit testing.
   * @param {string} text
   * @returns {string}
   */
  slugify(text) { ... }
}
```

---

## 4. SOURCE-AGNOSTIC INGESTION SERVICE (ADAPTER PATTERN)

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EXTERNAL SOURCES                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ TMDBAdapter  │  │ RAWGAdapter  │  │ IGDBAdapter  │  │
│  │  (movies/tv) │  │  (games)     │  │  (games alt) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              STANDARDIZED CONTENT OBJECT                 │
│         (NormalizedContent — defined below)              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    CORE INGESTOR                         │
│                                                         │
│  1. Validate (ContentValidator)                         │
│  2. Generate slug (SlugEngine)                          │
│  3. Attempt INSERT with ON CONFLICT                     │
│  4. Retry slug on conflict (up to MAX attempts)         │
│  5. Update ingestion_log (StateManager)                 │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  CockroachDB  │
                    └───────────────┘
```

### 4.2 The Standardized Content Object (NormalizedContent)

Every adapter MUST return an object that matches this exact shape. The `CoreIngestor` does not know or care about TMDB, RAWG, or any source.

```typescript
interface NormalizedContent {
  // Source tracking
  external_source: string;       // 'TMDB', 'RAWG', 'IGDB', 'MANUAL'
  external_id: string;           // Source's unique ID (always string)
  content_type: 'movie' | 'tv_series' | 'game' | 'software' | 'actor';

  // Core fields (all content types)
  title: string;                 // Primary display title (Arabic if available)
  original_title: string;        // Original language title
  overview: string | null;
  poster_url: string | null;     // Full URL (pre-normalized)
  backdrop_url: string | null;   // Full URL (pre-normalized)
  release_year: number | null;   // 4-digit year, derived from release_date
  release_date: string | null;   // ISO date string 'YYYY-MM-DD'
  popularity: number;            // >= 0
  original_language: string | null; // ISO 639-1

  // Ratings
  vote_average: number;          // 0.0 – 10.0
  vote_count: number;            // >= 0

  // JSONB fields (pre-serialized arrays)
  genres: object[];              // [{ id, name }]
  cast_data: object[];           // [{ id, name, character, profile_path, order }]
  crew_data: object[];           // [{ id, name, job, department, profile_path }]
  videos: object[];              // [{ id, key, name, site, type, official }]
  keywords: object[];            // [{ id, name }]
  images: object[];              // [{ file_path, type, width, height }]

  // Type-specific fields (null if not applicable)
  // TV Series
  first_air_date: string | null;
  last_air_date: string | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  status: string | null;
  networks: object[] | null;     // [{ id, name, logo_path }]
  seasons: object[] | null;      // [{ id, season_number, name, episode_count, air_date, poster_path }]

  // Games / Software
  developer: string | null;
  publisher: string | null;
  platform: string[] | null;
  rating: number | null;
  metacritic_score: number | null;
}
```

### 4.3 BaseAdapter Interface (Contract)

```javascript
class BaseAdapter {
  /**
   * Fetch a single item from the source API by its external ID.
   * Must return a NormalizedContent object or throw.
   *
   * @param {string} externalId
   * @param {string} contentType
   * @returns {Promise<NormalizedContent>}
   */
  async fetchOne(externalId, contentType) {
    throw new Error('fetchOne() must be implemented by adapter');
  }

  /**
   * Search the source by title. Returns array of candidates.
   * Used when ingesting by title (not by known ID).
   *
   * @param {string} title
   * @param {string} contentType
   * @returns {Promise<NormalizedContent[]>}
   */
  async searchByTitle(title, contentType) {
    throw new Error('searchByTitle() must be implemented by adapter');
  }

  /**
   * Normalize a raw API response into NormalizedContent.
   * Must be implemented by each adapter.
   *
   * @param {object} rawData
   * @returns {NormalizedContent}
   */
  normalize(rawData) {
    throw new Error('normalize() must be implemented by adapter');
  }
}
```

### 4.4 TMDBAdapter Responsibilities

The TMDB adapter handles:
1. **Dual-language fetching:** Fetches Arabic (`ar-SA`) first, then English (`en-US`) as fallback
2. **Field localization:** Uses `localizeField(arabicValue, englishValue)` — prefers Arabic
3. **Image URL normalization:** Converts `/path.jpg` → full TMDB image URL
4. **Cast/Crew filtering:** Top 20 cast by order; crew filtered to Director/Writer/Producer/Executive Producer
5. **Video filtering:** YouTube only, max 10
6. **Keywords limit:** Max 20
7. **Seasons normalization:** `season_number >= 0` only (no specials with negative numbers)
8. **Appended response:** Uses `?append_to_response=credits,videos,keywords,images` to minimize API calls

### 4.5 ContentValidator Rules

Applied by `CoreIngestor` BEFORE slug generation. A failed validation results in `status='skipped'` in `ingestion_log`.

| Rule | Condition to SKIP (not insert) |
|------|-------------------------------|
| Missing poster | `poster_url` is null or empty |
| Missing overview | `overview` is null or empty string after trim |
| Future release | `release_date` is a valid date AND is in the future |
| Unreleased movie | `content_type == 'movie'` AND `status` is NOT 'Released' AND status is not null |
| Invalid vote_average | `vote_average < 0` OR `vote_average > 10` |
| Missing title | `title` is null or empty after trim |
| Adult content | `adult == true` (configurable via env flag `ALLOW_ADULT_CONTENT=false`) |

---

## 5. BATCH PROCESSING LOGIC

### 5.1 Batch Size & Rationale

```
BATCH_SIZE = 50 items per transaction
```

**Why 50:**
- CockroachDB transaction size limit: ~64MB
- Average content record with JSONB: ~8KB
- 50 × 8KB = ~400KB per transaction → well within limits
- Provides good throughput without overwhelming connection pool

### 5.2 Concurrency Model

```
┌─────────────────────────────────────────────────────┐
│                  BATCH PROCESSOR                    │
│                                                     │
│  Input: [id1, id2, id3, ... id1000]                 │
│                                                     │
│  Step 1: Split into chunks of BATCH_SIZE (50)       │
│  [chunk1: id1-50] [chunk2: id51-100] ...            │
│                                                     │
│  Step 2: Per chunk — fetch from API (parallel)      │
│  MAX_CONCURRENT_FETCHES = 10 (p-limit)              │
│  ┌────┐┌────┐┌────┐...┌────┐                       │
│  │ F1 ││ F2 ││ F3 │...│F10 │  ← 10 concurrent      │
│  └────┘└────┘└────┘...└────┘                       │
│                                                     │
│  Step 3: Validate all 50 results                    │
│                                                     │
│  Step 4: Write to DB in ONE transaction             │
│  (all 50 or nothing — atomic)                       │
│                                                     │
│  Step 5: WAIT 200ms between chunks                  │
│  (prevents DB connection exhaustion)                │
│                                                     │
│  Step 6: Repeat for next chunk                      │
└─────────────────────────────────────────────────────┘
```

### 5.3 Wait Times & Timeouts

| Parameter | Value | Reason |
|-----------|-------|--------|
| Wait between chunks | 200ms | Prevents CockroachDB connection pool exhaustion |
| TMDB API rate limit wait | 25ms between fetches | TMDB allows 40 req/sec; 25ms = 40 req/sec |
| DB transaction timeout | 30,000ms | CockroachDB default; sufficient for 50-item batch |
| TMDB fetch timeout (axios) | 10,000ms | Fail fast on slow TMDB responses |
| Max concurrent TMDB fetches | 10 | `p-limit(10)` — stay under TMDB rate limit |

### 5.4 Transaction Strategy

```javascript
// Pseudocode — CoreIngestor batch write
async function writeBatch(normalizedItems) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const item of normalizedItems) {
      // StateManager marks as 'processing'
      await stateManager.setProcessing(item.ingestion_log_id, client);
      
      // Slug generation + optimistic insert with retry
      let inserted = false;
      let attempt = 1;
      
      while (!inserted && attempt <= MAX_SLUG_RETRY_ATTEMPTS) {
        const slug = slugEngine.generate(
          item.title,
          item.original_title,
          item.release_year,
          attempt
        );
        
        try {
          await upsertContent(item, slug, client);
          await stateManager.setSuccess(item.ingestion_log_id, client);
          inserted = true;
        } catch (err) {
          if (isSlugConflict(err)) {
            attempt++;
            continue; // retry with next slug
          }
          // Non-slug error → fail this item, don't abort whole batch
          await stateManager.setFailed(item.ingestion_log_id, err.message, client);
          inserted = true; // exit retry loop
        }
      }
      
      if (!inserted) {
        // Exhausted all slug attempts
        await stateManager.setFailed(
          item.ingestion_log_id,
          'slug_exhausted: exceeded max slug retry attempts',
          client
        );
      }
    }
    
    await client.query('COMMIT');
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

**Key Design Decision:** Individual item failures (validation, slug exhaustion) do NOT abort the entire batch transaction. Only infrastructure failures (DB down, network loss) cause a full ROLLBACK.

### 5.5 Upsert SQL Pattern

The `ON CONFLICT` target must be the `UNIQUE` constraint on `(external_source, external_id)` — NOT the primary key UUID.

```sql
INSERT INTO movies (
  id, slug, external_source, external_id,
  title, original_title, overview,
  poster_url, backdrop_url,
  release_date, vote_average, vote_count, popularity,
  genres, cast_data, crew_data, videos, keywords, images,
  original_language, status, tagline, runtime,
  budget, revenue, adult,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), $1, $2, $3,
  $4, $5, $6,
  $7, $8,
  $9, $10, $11, $12,
  $13, $14, $15, $16, $17, $18,
  $19, $20, $21, $22,
  $23, $24, $25,
  NOW(), NOW()
)
ON CONFLICT (external_source, external_id) DO UPDATE SET
  title         = EXCLUDED.title,
  original_title = EXCLUDED.original_title,
  overview      = EXCLUDED.overview,
  poster_url    = EXCLUDED.poster_url,
  backdrop_url  = EXCLUDED.backdrop_url,
  release_date  = EXCLUDED.release_date,
  vote_average  = EXCLUDED.vote_average,
  vote_count    = EXCLUDED.vote_count,
  popularity    = EXCLUDED.popularity,
  genres        = EXCLUDED.genres,
  cast_data     = EXCLUDED.cast_data,
  crew_data     = EXCLUDED.crew_data,
  videos        = EXCLUDED.videos,
  keywords      = EXCLUDED.keywords,
  images        = EXCLUDED.images,
  status        = EXCLUDED.status,
  tagline       = EXCLUDED.tagline,
  runtime       = EXCLUDED.runtime,
  updated_at    = NOW()
  -- NOTE: slug is NOT updated on conflict.
  -- Once a slug is assigned, it is permanent.
  -- Changing slugs breaks all indexed URLs.
RETURNING id, slug;
```

**Critical Rule:** `slug` is NEVER updated in the `DO UPDATE` clause. A slug is assigned once and is immutable.

---

## 6. INGESTION LOG STATE MACHINE

### 6.1 States

```
                    ┌──────────────┐
                    │   pending    │  ← Initial state on queue entry
                    └──────┬───────┘
                           │ Worker picks up
                           ▼
                    ┌──────────────┐
                    │  processing  │  ← Worker actively processing
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ success  │  │  failed  │  │ skipped  │
       └──────────┘  └────┬─────┘  └──────────┘
                          │
                 retry_count < MAX (3)?
                          │
                    ┌─────┴─────┐
                    │           │
                   YES          NO
                    │           │
                    ▼           ▼
             ┌──────────┐  ┌──────────┐
             │ pending  │  │  failed  │  ← Permanent failure
             │(re-queue)│  │(final)   │
             └──────────┘  └──────────┘
```

### 6.2 State Transition Rules

| Transition | Trigger | Action |
|---|---|---|
| `pending → processing` | Worker claims the item | Set `status='processing'`, set `last_attempted_at=NOW()` |
| `processing → success` | Upsert completed without error | Set `status='success'`, set `processed_at=NOW()` |
| `processing → skipped` | ContentValidator rejected item | Set `status='skipped'`, write rejection reason to `last_error` |
| `processing → failed` | DB error, API error, slug exhausted | Increment `retry_count`, write error to `last_error`, compute `next_retry_at` |
| `failed → pending` | `retry_count < MAX_RETRIES (3)` AND `next_retry_at <= NOW()` | Set `status='pending'`, ready for re-queue |
| `failed → failed (permanent)` | `retry_count >= MAX_RETRIES (3)` | Stay `failed`, `next_retry_at = NULL`, requires manual intervention |

### 6.3 Retry Backoff Calculation

```
next_retry_at = NOW() + (RETRY_BACKOFF_BASE_MS × 2^retry_count) milliseconds

retry_count = 1: next_retry_at = NOW() + 2,000ms  (2 seconds)
retry_count = 2: next_retry_at = NOW() + 4,000ms  (4 seconds)
retry_count = 3: next_retry_at = NOW() + 8,000ms  (8 seconds — then permanent failure)
```

### 6.4 `skipped` vs `failed` Distinction

| Status | Meaning | Should Retry? |
|--------|---------|---------------|
| `skipped` | Item deliberately excluded by validator (no poster, future release, etc.) | ❌ No — it's not an error, it's a policy decision |
| `failed` | Transient error (API timeout, DB error, slug exhausted) | ✅ Yes — up to MAX_RETRIES |

### 6.5 Worker Query to Claim Pending Items

```sql
-- Atomic claim: fetch pending items and mark as 'processing' in one query
-- Prevents two workers from picking the same item (CockroachDB RETURNING FOR UPDATE equivalent)
UPDATE ingestion_log
SET status = 'processing', last_attempted_at = NOW()
WHERE id IN (
  SELECT id FROM ingestion_log
  WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT 50
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

**Note on `FOR UPDATE SKIP LOCKED`:** CockroachDB supports this syntax for worker queue patterns. It ensures multiple workers don't claim the same items.

---

## 7. THE FINAL COCKROACHDB SQL SCHEMA (DDL)

```sql
-- ============================================================
-- CINEMA.ONLINE — CLEAN SLATE SCHEMA
-- CockroachDB (PostgreSQL-compatible)
-- Version: 2.0
-- Date: 2026-04-02
-- ============================================================

-- Drop existing tables in dependency order (clean slate)
DROP TABLE IF EXISTS episodes        CASCADE;
DROP TABLE IF EXISTS seasons         CASCADE;
DROP TABLE IF EXISTS ingestion_log   CASCADE;
DROP TABLE IF EXISTS software        CASCADE;
DROP TABLE IF EXISTS games           CASCADE;
DROP TABLE IF EXISTS actors          CASCADE;
DROP TABLE IF EXISTS tv_series       CASCADE;
DROP TABLE IF EXISTS movies          CASCADE;

-- ============================================================
-- CORE CONTENT TABLES
-- ============================================================

-- ------------------------------------------------------------
-- MOVIES
-- ------------------------------------------------------------
CREATE TABLE movies (
  -- Primary Key (UUID to prevent index hotspotting)
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source Tracking
  external_source     VARCHAR(50)   NOT NULL,           -- 'TMDB', 'MANUAL', etc.
  external_id         VARCHAR(100)  NOT NULL,           -- Source's ID as string

  -- Slug (THE routing identifier — immutable after creation)
  slug                TEXT          NOT NULL UNIQUE,

  -- Basic Information
  title               TEXT          NOT NULL,
  original_title      TEXT,
  overview            TEXT,
  tagline             TEXT,

  -- Media Assets (full URLs, pre-normalized)
  poster_url          TEXT,
  backdrop_url        TEXT,

  -- Release & Ratings
  release_date        DATE,
  vote_average        FLOAT         NOT NULL DEFAULT 0
                      CHECK (vote_average >= 0 AND vote_average <= 10),
  vote_count          INTEGER       NOT NULL DEFAULT 0
                      CHECK (vote_count >= 0),
  popularity          FLOAT         NOT NULL DEFAULT 0
                      CHECK (popularity >= 0),

  -- Metadata
  adult               BOOLEAN       NOT NULL DEFAULT FALSE,
  original_language   VARCHAR(10),
  runtime             INTEGER       CHECK (runtime IS NULL OR runtime > 0),
  status              TEXT,
  budget              BIGINT        NOT NULL DEFAULT 0,
  revenue             BIGINT        NOT NULL DEFAULT 0,

  -- JSONB Rich Data (denormalized for read performance)
  genres              JSONB         NOT NULL DEFAULT '[]',
  cast_data           JSONB         NOT NULL DEFAULT '[]',
  crew_data           JSONB         NOT NULL DEFAULT '[]',
  similar_content     JSONB         NOT NULL DEFAULT '[]',
  production_companies JSONB        NOT NULL DEFAULT '[]',
  spoken_languages    JSONB         NOT NULL DEFAULT '[]',
  keywords            JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  images              JSONB         NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Composite unique constraint for upsert targeting
  CONSTRAINT uq_movies_source UNIQUE (external_source, external_id)
);

-- Indexes: movies
CREATE INDEX idx_movies_popularity     ON movies (popularity     DESC);
CREATE INDEX idx_movies_vote_average   ON movies (vote_average   DESC);
CREATE INDEX idx_movies_release_date   ON movies (release_date   DESC);
CREATE INDEX idx_movies_language       ON movies (original_language);
CREATE INDEX idx_movies_adult          ON movies (adult);
CREATE INDEX idx_movies_lang_pop       ON movies (original_language, popularity DESC);

-- Inverted (GIN) indexes for JSONB — CockroachDB syntax
CREATE INVERTED INDEX idx_movies_genres   ON movies (genres);
CREATE INVERTED INDEX idx_movies_keywords ON movies (keywords);
CREATE INVERTED INDEX idx_movies_cast     ON movies (cast_data);

-- Full-text search
CREATE INVERTED INDEX idx_movies_title_fts
  ON movies (to_tsvector('simple', title));


-- ------------------------------------------------------------
-- TV SERIES
-- ------------------------------------------------------------
CREATE TABLE tv_series (
  -- Primary Key
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source Tracking
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,

  -- Slug
  slug                TEXT          NOT NULL UNIQUE,

  -- Basic Information
  name                TEXT          NOT NULL,
  original_name       TEXT,
  overview            TEXT,
  tagline             TEXT,

  -- Media Assets
  poster_url          TEXT,
  backdrop_url        TEXT,

  -- Air Dates
  first_air_date      DATE,
  last_air_date       DATE,

  -- Ratings
  vote_average        FLOAT         NOT NULL DEFAULT 0
                      CHECK (vote_average >= 0 AND vote_average <= 10),
  vote_count          INTEGER       NOT NULL DEFAULT 0
                      CHECK (vote_count >= 0),
  popularity          FLOAT         NOT NULL DEFAULT 0
                      CHECK (popularity >= 0),

  -- Series Metadata
  adult               BOOLEAN       NOT NULL DEFAULT FALSE,
  original_language   VARCHAR(10),
  number_of_seasons   INTEGER       NOT NULL DEFAULT 0,
  number_of_episodes  INTEGER       NOT NULL DEFAULT 0,
  status              TEXT,
  type                TEXT,         -- 'Scripted', 'Documentary', 'Reality', etc.

  -- JSONB Rich Data
  genres              JSONB         NOT NULL DEFAULT '[]',
  cast_data           JSONB         NOT NULL DEFAULT '[]',
  crew_data           JSONB         NOT NULL DEFAULT '[]',
  similar_content     JSONB         NOT NULL DEFAULT '[]',
  production_companies JSONB        NOT NULL DEFAULT '[]',
  spoken_languages    JSONB         NOT NULL DEFAULT '[]',
  keywords            JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  images              JSONB         NOT NULL DEFAULT '[]',
  networks            JSONB         NOT NULL DEFAULT '[]',
  seasons             JSONB         NOT NULL DEFAULT '[]', -- Metadata snapshot only

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_tv_source UNIQUE (external_source, external_id)
);

-- Indexes: tv_series
CREATE INDEX idx_tv_popularity         ON tv_series (popularity     DESC);
CREATE INDEX idx_tv_vote_average       ON tv_series (vote_average   DESC);
CREATE INDEX idx_tv_first_air_date     ON tv_series (first_air_date DESC);
CREATE INDEX idx_tv_language           ON tv_series (original_language);
CREATE INDEX idx_tv_lang_pop           ON tv_series (original_language, popularity DESC);

CREATE INVERTED INDEX idx_tv_genres    ON tv_series (genres);
CREATE INVERTED INDEX idx_tv_keywords  ON tv_series (keywords);
CREATE INVERTED INDEX idx_tv_cast      ON tv_series (cast_data);
CREATE INVERTED INDEX idx_tv_networks  ON tv_series (networks);

CREATE INVERTED INDEX idx_tv_name_fts
  ON tv_series (to_tsvector('simple', name));


-- ------------------------------------------------------------
-- SEASONS (Child of tv_series)
-- NO SLUG — routing uses /tv/[series-slug]/season/[number]
-- ------------------------------------------------------------
CREATE TABLE seasons (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       UUID        NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
  season_number   INTEGER     NOT NULL CHECK (season_number >= 0),
  name            TEXT,
  overview        TEXT,
  poster_url      TEXT,
  air_date        DATE,
  episode_count   INTEGER     NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique: one record per season per series
  CONSTRAINT uq_season UNIQUE (series_id, season_number)
);

CREATE INDEX idx_seasons_series_id     ON seasons (series_id);
CREATE INDEX idx_seasons_number        ON seasons (season_number);


-- ------------------------------------------------------------
-- EPISODES (Child of seasons)
-- NO SLUG — routing uses /tv/[series-slug]/season/[num]/episode/[num]
-- ------------------------------------------------------------
CREATE TABLE episodes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID        NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number  INTEGER     NOT NULL CHECK (episode_number > 0),
  name            TEXT,
  overview        TEXT,
  still_url       TEXT,       -- Episode thumbnail (full URL)
  air_date        DATE,
  vote_average    FLOAT       NOT NULL DEFAULT 0
                  CHECK (vote_average >= 0 AND vote_average <= 10),
  vote_count      INTEGER     NOT NULL DEFAULT 0,
  runtime         INTEGER     CHECK (runtime IS NULL OR runtime > 0),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite unique: one record per episode per season
  CONSTRAINT uq_episode UNIQUE (season_id, episode_number)
);

CREATE INDEX idx_episodes_season_id    ON episodes (season_id);
CREATE INDEX idx_episodes_number       ON episodes (episode_number);


-- ------------------------------------------------------------
-- GAMES
-- ------------------------------------------------------------
CREATE TABLE games (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source (RAWG, IGDB, Steam, MANUAL)
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,

  -- Slug
  slug                TEXT          NOT NULL UNIQUE,

  -- Basic Information
  title               TEXT          NOT NULL,
  description         TEXT,

  -- Media Assets
  poster_url          TEXT,
  backdrop_url        TEXT,

  -- Release & Ratings
  release_date        DATE,
  rating              FLOAT         NOT NULL DEFAULT 0
                      CHECK (rating >= 0 AND rating <= 10),
  rating_count        INTEGER       NOT NULL DEFAULT 0
                      CHECK (rating_count >= 0),
  popularity          FLOAT         NOT NULL DEFAULT 0
                      CHECK (popularity >= 0),
  metacritic_score    INTEGER       CHECK (metacritic_score IS NULL OR
                                          (metacritic_score >= 0 AND metacritic_score <= 100)),

  -- Game Metadata
  developer           TEXT,
  publisher           TEXT,
  website             TEXT,

  -- JSONB Rich Data
  platform            JSONB         NOT NULL DEFAULT '[]',  -- ['PC', 'PS5', 'Xbox']
  genres              JSONB         NOT NULL DEFAULT '[]',
  tags                JSONB         NOT NULL DEFAULT '[]',
  screenshots         JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  system_requirements JSONB         NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_games_source UNIQUE (external_source, external_id)
);

CREATE INDEX idx_games_popularity      ON games (popularity DESC);
CREATE INDEX idx_games_rating          ON games (rating     DESC);
CREATE INDEX idx_games_release_date    ON games (release_date DESC);

CREATE INVERTED INDEX idx_games_genres    ON games (genres);
CREATE INVERTED INDEX idx_games_platform  ON games (platform);
CREATE INVERTED INDEX idx_games_tags      ON games (tags);

CREATE INVERTED INDEX idx_games_title_fts
  ON games (to_tsvector('simple', title));


-- ------------------------------------------------------------
-- SOFTWARE
-- ------------------------------------------------------------
CREATE TABLE software (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,

  -- Slug
  slug                TEXT          NOT NULL UNIQUE,

  -- Basic Information
  title               TEXT          NOT NULL,
  description         TEXT,
  version             TEXT,

  -- Media Assets
  poster_url          TEXT,
  backdrop_url        TEXT,

  -- Release & Ratings
  release_date        DATE,
  rating              FLOAT         NOT NULL DEFAULT 0
                      CHECK (rating >= 0 AND rating <= 10),
  rating_count        INTEGER       NOT NULL DEFAULT 0
                      CHECK (rating_count >= 0),
  popularity          FLOAT         NOT NULL DEFAULT 0
                      CHECK (popularity >= 0),

  -- Software Metadata
  developer           TEXT,
  publisher           TEXT,
  license_type        TEXT,         -- 'Free', 'Open Source', 'Commercial', 'Freemium'
  price               FLOAT         CHECK (price IS NULL OR price >= 0),
  website             TEXT,
  download_url        TEXT,
  file_size           TEXT,

  -- JSONB Rich Data
  platform            JSONB         NOT NULL DEFAULT '[]',  -- ['Windows', 'macOS', 'Linux']
  features            JSONB         NOT NULL DEFAULT '[]',
  screenshots         JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  system_requirements JSONB         NOT NULL DEFAULT '{}',
  languages           JSONB         NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_software_source UNIQUE (external_source, external_id)
);

CREATE INDEX idx_software_popularity   ON software (popularity DESC);
CREATE INDEX idx_software_release_date ON software (release_date DESC);

CREATE INVERTED INDEX idx_software_platform ON software (platform);

CREATE INVERTED INDEX idx_software_title_fts
  ON software (to_tsvector('simple', title));


-- ------------------------------------------------------------
-- ACTORS
-- ------------------------------------------------------------
CREATE TABLE actors (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,

  -- Slug
  slug                TEXT          NOT NULL UNIQUE,

  -- Identifiers
  imdb_id             TEXT,

  -- Basic Information
  name                TEXT          NOT NULL,
  original_name       TEXT,
  biography           TEXT,

  -- Media Assets
  profile_url         TEXT,

  -- Personal Information
  birthday            DATE,
  deathday            DATE,
  place_of_birth      TEXT,
  gender              SMALLINT      NOT NULL DEFAULT 0
                      CHECK (gender IN (0, 1, 2, 3)),
                      -- 0=Not set, 1=Female, 2=Male, 3=Non-binary (TMDB convention)

  -- Career
  known_for_department TEXT,
  popularity          FLOAT         NOT NULL DEFAULT 0
                      CHECK (popularity >= 0),
  adult               BOOLEAN       NOT NULL DEFAULT FALSE,
  homepage            TEXT,

  -- JSONB
  also_known_as       JSONB         NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_actors_source UNIQUE (external_source, external_id)
);

CREATE INDEX idx_actors_popularity     ON actors (popularity DESC);
CREATE INDEX idx_actors_known_for      ON actors (known_for_department);

CREATE INVERTED INDEX idx_actors_name_fts
  ON actors (to_tsvector('simple', name));


-- ============================================================
-- INGESTION LOG (State Machine Table)
-- ============================================================
CREATE TABLE ingestion_log (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What we're ingesting
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,
  content_type        VARCHAR(20)   NOT NULL
                      CHECK (content_type IN ('movie', 'tv_series', 'game', 'software', 'actor')),

  -- State Machine
  status              VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),

  -- Retry Logic
  retry_count         INTEGER       NOT NULL DEFAULT 0
                      CHECK (retry_count >= 0),
  last_error          TEXT,
  last_attempted_at   TIMESTAMPTZ,
  next_retry_at       TIMESTAMPTZ,

  -- Success tracking
  processed_at        TIMESTAMPTZ,
  result_id           UUID,         -- FK to the inserted content row (denormalized)
  result_slug         TEXT,         -- The final slug assigned (for quick lookup)

  -- Optional metadata
  requested_by        TEXT,         -- IP address or user ID of requester
  notes               TEXT,         -- Admin notes or reason for manual queue

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Unique: one active log entry per source item
  CONSTRAINT uq_ingestion_source UNIQUE (external_source, external_id, content_type)
);

CREATE INDEX idx_ingestion_status          ON ingestion_log (status);
CREATE INDEX idx_ingestion_created_at      ON ingestion_log (created_at DESC);
CREATE INDEX idx_ingestion_next_retry      ON ingestion_log (next_retry_at)
  WHERE status = 'pending';
CREATE INDEX idx_ingestion_failed          ON ingestion_log (status, retry_count)
  WHERE status = 'failed';
CREATE INDEX idx_ingestion_content_type    ON ingestion_log (content_type, status);


-- ============================================================
-- SCHEMA VERIFICATION QUERIES
-- (Run after applying schema to verify correctness)
-- ============================================================

-- Should return 7 tables
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- Should show UUID primary keys on all tables
-- SELECT table_name, column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE column_name = 'id' AND table_schema = 'public'
-- ORDER BY table_name;

-- Should show slug as NOT NULL UNIQUE on core tables
-- SELECT table_name, column_name, is_nullable
-- FROM information_schema.columns
-- WHERE column_name = 'slug' AND table_schema = 'public'
-- ORDER BY table_name;
```

---

## 8. KNOWN TRADE-OFFS & ARCHITECTURAL DECISIONS LOG

This section documents deliberate decisions and their consequences. Any future engineer working on this codebase must read this before proposing schema changes.

| Decision | What We Chose | What We Gave Up | Mitigation |
|---|---|---|---|
| **JSONB for genres/cast/crew** | Max read speed for content pages (no JOINs) | "All movies for actor X" requires full table scan | Add GIN index on `cast_data`; acceptable at current scale |
| **UUID primary keys** | No hotspotting in distributed CockroachDB nodes | Slightly larger index size vs INT8 | Negligible at this scale |
| **No slugs for seasons/episodes** | Simpler schema, numeric routing is clean | Cannot have "named" season URLs | Accepted. URL formula is `/season/1/episode/1` and is permanent |
| **Slug is immutable after creation** | Stable URLs, no 301 redirect hell | Content renames don't update the URL | Correct behavior — SEO requires stable URLs |
| **Single ingestion_log per (source, external_id, content_type)** | Prevents duplicate queue entries | Cannot queue the same item twice simultaneously | Use `ON CONFLICT` on upsert to update status back to `pending` if re-queue is needed |
| **`skipped` is not retried** | Prevents endless retry loops for invalid content | If TMDB adds a poster later, item stays `skipped` | Schedule a weekly "re-evaluate skipped" worker |
| **No junction tables** | Simpler schema, faster reads for the primary use case | Cross-referencing queries are expensive | Documented as known limitation; mitigated by GIN indexes |

---

*End of FINAL_ARCHITECTURE_BLUEPRINT.md — Version 2.0*  
*This document supersedes all previous architectural notes and Gemini reports.*  
*Approved for implementation. Kiro may proceed with Phase 1.*
