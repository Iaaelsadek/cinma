# Design Document: Cinema.online Complete Rebuild

## Overview

This is a complete clean slate rebuild of Cinema.online's data ingestion pipeline and database architecture. All 318,000 existing records will be dropped and rebuilt from scratch using a source-agnostic ingestion system with a centralized slug engine. The system uses CockroachDB as the primary database for all content (movies, TV series, games, software, actors) with Supabase reserved exclusively for authentication and user data.

The architecture implements an adapter pattern for multi-source data ingestion (TMDB, RAWG, IGDB), a sophisticated Arabic-aware slug generation engine, and a state machine-based ingestion log for reliable batch processing with automatic retry logic.

## Architectural Constants (Non-Negotiables)

These 10 rules are immutable and must never be violated:

1. **C-1:** `slug` is `UNIQUE NOT NULL` on all core content tables — no content enters DB without a valid slug
2. **C-2:** Zero TMDB IDs or internal UUIDs in public URLs — all routing is by slug only
3. **C-3:** URL formula for TV hierarchy: `/tv/[slug]/season/[number]/episode/[number]`
4. **C-4:** `UUID DEFAULT gen_random_uuid()` for ALL primary keys (prevents CockroachDB index hotspotting)
5. **C-5:** JSONB for genres, cast, crew, networks, keywords (read performance over relational flexibility)
6. **C-6:** No junction tables (deliberate denormalization)
7. **C-7:** `ON CONFLICT` upsert is the ONLY way to write content (no raw INSERT without conflict handling)
8. **C-8:** Slug uniqueness is per content-type (per table) — `/movie/the-batman-2022` and `/game/the-batman-2022` can coexist
9. **C-9:** No TMDB API calls from the frontend — frontend reads exclusively from CockroachDB API endpoints
10. **C-10:** If an item has no valid slug, it is NOT rendered in the UI (null/empty slug = invisible content)

## System Architecture


```mermaid
graph TB
    subgraph "External Data Sources"
        TMDB[TMDB API<br/>Movies & TV]
        RAWG[RAWG API<br/>Games]
        IGDB[IGDB API<br/>Games Alt]
    end
    
    subgraph "Ingestion Service Layer"
        TMDBAdapter[TMDBAdapter<br/>Dual-language fetch]
        RAWGAdapter[RAWGAdapter<br/>Future]
        IGDBAdapter[IGDBAdapter<br/>Future]
        
        BaseAdapter[BaseAdapter Interface]
        TMDBAdapter -.implements.-> BaseAdapter
        RAWGAdapter -.implements.-> BaseAdapter
        IGDBAdapter -.implements.-> BaseAdapter
    end
    
    subgraph "Core Processing"
        Validator[ContentValidator<br/>Pre-insert rules]
        SlugEngine[SlugEngine<br/>Arabic-aware]
        CoreIngestor[CoreIngestor<br/>Upsert + Retry]
        StateManager[StateManager<br/>State machine]
        BatchProcessor[BatchProcessor<br/>Concurrency control]
    end
    
    subgraph "Database Layer"
        CockroachDB[(CockroachDB<br/>Primary Content DB)]
        IngestionLog[(ingestion_log<br/>State tracking)]
    end
    
    subgraph "Backend API"
        ExpressServer[Express.js Server<br/>Koyeb-ready]
        ContentAPI[Content API<br/>Slug-based routes]
        AdminAPI[Admin API<br/>Ingestion control]
    end
    
    subgraph "Frontend"
        AdminDash[Admin Dashboard<br/>Ingestion monitor]
    end
    
    TMDB --> TMDBAdapter
    RAWG --> RAWGAdapter
    IGDB --> IGDBAdapter
    
    TMDBAdapter --> Validator
    RAWGAdapter --> Validator
    IGDBAdapter --> Validator
    
    Validator --> SlugEngine
    SlugEngine --> CoreIngestor
    CoreIngestor --> StateManager
    StateManager --> IngestionLog
    
    BatchProcessor --> CoreIngestor
    CoreIngestor --> CockroachDB
    
    CockroachDB --> ContentAPI
    IngestionLog --> AdminAPI
    
    ContentAPI --> ExpressServer
    AdminAPI --> ExpressServer
    
    ExpressServer --> AdminDash

```

## Main Data Flow Sequence

```mermaid
sequenceDiagram
    participant BP as BatchProcessor
    participant Adapter as TMDBAdapter
    participant Val as ContentValidator
    participant SE as SlugEngine
    participant CI as CoreIngestor
    participant SM as StateManager
    participant DB as CockroachDB
    participant IL as ingestion_log
    
    BP->>IL: Claim 50 pending items
    IL-->>BP: Return items (status=processing)
    
    loop For each item (max 10 concurrent)
        BP->>Adapter: fetchOne(external_id)
        Adapter->>Adapter: Fetch Arabic (ar-SA)
        Adapter->>Adapter: Fetch English (en-US)
        Adapter->>Adapter: Merge & normalize
        Adapter-->>BP: NormalizedContent
    end
    
    BP->>Val: Validate batch
    Val-->>BP: Valid items only
    
    BP->>CI: writeBatch(items)
    CI->>DB: BEGIN TRANSACTION
    
    loop For each item
        CI->>SM: setProcessing(item)
        SM->>IL: UPDATE status=processing
        
        loop Retry up to 10 times
            CI->>SE: generate(title, year, attempt)
            SE->>SE: normalizeArabic()
            SE->>SE: transliterate()
            SE->>SE: slugify()
            SE-->>CI: slug candidate
            
            CI->>DB: INSERT ... ON CONFLICT
            alt Success
                DB-->>CI: Row inserted
                CI->>SM: setSuccess(item)
                SM->>IL: UPDATE status=success
            else Slug conflict
                DB-->>CI: Unique violation
                Note over CI: Increment attempt, retry
            else Other error
                CI->>SM: setFailed(item, error)
                SM->>IL: UPDATE status=failed, retry_count++
            end
        end
    end
    
    CI->>DB: COMMIT
    DB-->>CI: Success
    
    BP->>BP: Wait 200ms
    BP->>IL: Claim next batch

```

## Components and Interfaces

### Component 1: SlugEngine

**Purpose:** Centralized slug generation with Arabic Unicode normalization and transliteration. This is the ONLY place in the codebase where slugs are generated.

**Interface:**
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
  generate(title, originalTitle, year, attempt = 1) { }

  /**
   * Arabic Unicode normalization step only.
   * Exposed for unit testing.
   * @param {string} text
   * @returns {string}
   */
  normalizeArabic(text) { }

  /**
   * Slugify a plain Latin string.
   * Exposed for unit testing.
   * @param {string} text
   * @returns {string}
   */
  slugify(text) { }
}
```

**Responsibilities:**
- Execute 6-step Arabic pre-processing pipeline (strip diacritics, normalize hamza variants, taa marbuta, alef maqsura, waw/yaa with hamza)
- Transliterate Arabic to Latin using `transliteration` library
- Apply slugify algorithm (lowercase, strip non-alphanumeric, collapse hyphens)
- Append year to slug base: `[slug-base]-[year]`
- Handle empty slug fallback (use original_title, or generate random: `movie-k7x2`)
- Append attempt counter for duplicate resolution: `alnhayh-2022-2`

### Component 2: BaseAdapter (Abstract Interface)

**Purpose:** Define contract for all external data source adapters

**Interface:**
```javascript
class BaseAdapter {
  /**
   * Fetch a single item from the source API by its external ID.
   * Must return a NormalizedContent object or throw.
   */
  async fetchOne(externalId, contentType) { }

  /**
   * Search the source by title. Returns array of candidates.
   * Used when ingesting by title (not by known ID).
   */
  async searchByTitle(title, contentType) { }

  /**
   * Normalize a raw API response into NormalizedContent.
   * Must be implemented by each adapter.
   */
  normalize(rawData) { }
}
```

**Responsibilities:**
- Define standard interface for all adapters
- Ensure all adapters return NormalizedContent objects
- Abstract away source-specific API details



### Component 3: TMDBAdapter

**Purpose:** TMDB-specific data fetching and normalization with dual-language support

**Interface:**
```javascript
class TMDBAdapter extends BaseAdapter {
  async fetchOne(externalId, contentType) { }
  async searchByTitle(title, contentType) { }
  normalize(rawData) { }
  
  // TMDB-specific methods
  async fetchWithLanguage(externalId, contentType, language) { }
  localizeField(arabicValue, englishValue) { }
  normalizeImageUrl(path) { }
  filterCastCrew(credits) { }
}
```

**Responsibilities:**
- Fetch Arabic (`ar-SA`) data first, then English (`en-US`) as fallback
- Use `localizeField()` to prefer Arabic values when available
- Convert TMDB image paths to full URLs: `/path.jpg` → `https://image.tmdb.org/t/p/original/path.jpg`
- Filter cast to top 20 by order
- Filter crew to Director, Writer, Producer, Executive Producer only
- Filter videos to YouTube only, max 10
- Limit keywords to max 20
- Normalize seasons: `season_number >= 0` only (exclude specials with negative numbers)
- Use `?append_to_response=credits,videos,keywords,images` to minimize API calls

### Component 4: ContentValidator

**Purpose:** Pre-insert validation rules to skip invalid content

**Interface:**
```javascript
class ContentValidator {
  /**
   * Validate a NormalizedContent object.
   * @returns {object} { valid: boolean, reason: string|null }
   */
  validate(content) { }
  
  // Individual validation rules
  hasPoster(content) { }
  hasOverview(content) { }
  isNotFutureRelease(content) { }
  isReleased(content) { }
  hasValidRating(content) { }
  hasTitle(content) { }
  isNotAdult(content) { }
}
```

**Responsibilities:**
- Validate poster_url is not null/empty
- Validate overview is not null/empty after trim
- Reject future releases (release_date > NOW())
- Reject unreleased movies (status != 'Released')
- Validate vote_average is 0-10
- Validate title is not null/empty
- Reject adult content (configurable via `ALLOW_ADULT_CONTENT` env flag)
- Return validation result with reason for rejection



### Component 5: CoreIngestor

**Purpose:** Source-agnostic write logic with optimistic concurrency retry for slug conflicts

**Interface:**
```javascript
class CoreIngestor {
  constructor(slugEngine, stateManager, pool) { }
  
  /**
   * Write a batch of normalized items to the database.
   * Handles slug retry loop and state transitions.
   */
  async writeBatch(normalizedItems) { }
  
  /**
   * Upsert a single content item with generated slug.
   */
  async upsertContent(item, slug, client) { }
  
  /**
   * Check if error is a slug uniqueness conflict.
   */
  isSlugConflict(error) { }
}
```

**Responsibilities:**
- Execute database transaction for batch writes
- Generate slug using SlugEngine
- Attempt INSERT with ON CONFLICT upsert
- Retry slug generation on uniqueness conflict (up to MAX_SLUG_RETRY_ATTEMPTS = 10)
- Update ingestion_log state via StateManager
- Handle individual item failures without aborting entire batch
- Return inserted row ID and slug

### Component 6: StateManager

**Purpose:** Manage ingestion_log state machine transitions

**Interface:**
```javascript
class StateManager {
  constructor(pool) { }
  
  async setProcessing(ingestionLogId, client) { }
  async setSuccess(ingestionLogId, resultId, resultSlug, client) { }
  async setFailed(ingestionLogId, errorMessage, client) { }
  async setSkipped(ingestionLogId, reason, client) { }
  
  /**
   * Calculate next retry timestamp with exponential backoff.
   */
  calculateNextRetry(retryCount) { }
  
  /**
   * Check if item should be permanently failed.
   */
  shouldPermanentlyFail(retryCount) { }
}
```

**Responsibilities:**
- Update ingestion_log status field
- Set timestamps: last_attempted_at, processed_at, next_retry_at
- Increment retry_count on failure
- Calculate exponential backoff: `next_retry_at = NOW() + (1000ms × 2^retry_count)`
- Mark permanent failure when retry_count >= MAX_INGESTION_RETRY_COUNT (3)
- Store error messages in last_error field
- Store result metadata (result_id, result_slug) on success



### Component 7: BatchProcessor

**Purpose:** Orchestrate batch ingestion with concurrency control and rate limiting

**Interface:**
```javascript
class BatchProcessor {
  constructor(adapter, validator, coreIngestor, stateManager) { }
  
  /**
   * Process a batch of external IDs.
   * @param {string[]} externalIds - Array of source IDs to ingest
   * @param {string} contentType - 'movie', 'tv_series', 'game', etc.
   */
  async processBatch(externalIds, contentType) { }
  
  /**
   * Claim pending items from ingestion_log.
   */
  async claimPendingItems(batchSize) { }
  
  /**
   * Wait between batches to prevent connection exhaustion.
   */
  async waitBetweenBatches() { }
}
```

**Responsibilities:**
- Split input into chunks of BATCH_SIZE (50 items)
- Fetch from API with MAX_CONCURRENT_FETCHES (10) using `p-limit`
- Validate all fetched items using ContentValidator
- Pass valid items to CoreIngestor for database write
- Wait 200ms between chunks to prevent CockroachDB connection pool exhaustion
- Claim pending items from ingestion_log using atomic UPDATE query with FOR UPDATE SKIP LOCKED
- Handle transient errors with retry logic using `p-retry`

## Data Models

### Model 1: NormalizedContent

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

**Validation Rules:**
- external_source and external_id are required
- title must not be empty after trim
- vote_average must be 0-10
- vote_count and popularity must be >= 0
- poster_url and overview required for content to be visible
- release_date must not be in the future



### Model 2: Database Schema - Movies Table

```sql
CREATE TABLE movies (
  -- Primary Key (UUID to prevent index hotspotting)
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External Source Tracking
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,

  -- Slug (THE routing identifier — immutable after creation)
  slug                VARCHAR(255)  NOT NULL UNIQUE,  -- MODIFIED: TEXT → VARCHAR(255)

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

-- Standard indexes
CREATE INDEX idx_movies_popularity     ON movies (popularity     DESC);
CREATE INDEX idx_movies_vote_average   ON movies (vote_average   DESC);
CREATE INDEX idx_movies_release_date   ON movies (release_date   DESC);
CREATE INDEX idx_movies_language       ON movies (original_language);
CREATE INDEX idx_movies_adult          ON movies (adult);
CREATE INDEX idx_movies_lang_pop       ON movies (original_language, popularity DESC);

-- Inverted (GIN) indexes for JSONB
CREATE INVERTED INDEX idx_movies_genres   ON movies (genres);
CREATE INVERTED INDEX idx_movies_keywords ON movies (keywords);
CREATE INVERTED INDEX idx_movies_cast     ON movies (cast_data);

-- Full-text search with pg_trgm (MODIFIED)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INVERTED INDEX idx_movies_title_fts ON movies (to_tsvector('simple', title));
CREATE INDEX idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops);
```

**Validation Rules:**
- slug is UNIQUE NOT NULL (changed to VARCHAR(255))
- vote_average constrained to 0-10 range
- vote_count and popularity must be non-negative
- runtime must be positive if not null
- All JSONB fields default to empty arrays
- Upsert target is (external_source, external_id), NOT slug



### Model 3: Database Schema - TV Series Table

```sql
CREATE TABLE tv_series (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,
  slug                VARCHAR(255)  NOT NULL UNIQUE,  -- MODIFIED: TEXT → VARCHAR(255)

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
  type                TEXT,

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
  seasons             JSONB         NOT NULL DEFAULT '[]',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_tv_source UNIQUE (external_source, external_id)
);

-- Indexes
CREATE INDEX idx_tv_popularity         ON tv_series (popularity     DESC);
CREATE INDEX idx_tv_vote_average       ON tv_series (vote_average   DESC);
CREATE INDEX idx_tv_first_air_date     ON tv_series (first_air_date DESC);
CREATE INDEX idx_tv_language           ON tv_series (original_language);
CREATE INDEX idx_tv_lang_pop           ON tv_series (original_language, popularity DESC);

CREATE INVERTED INDEX idx_tv_genres    ON tv_series (genres);
CREATE INVERTED INDEX idx_tv_keywords  ON tv_series (keywords);
CREATE INVERTED INDEX idx_tv_cast      ON tv_series (cast_data);
CREATE INVERTED INDEX idx_tv_networks  ON tv_series (networks);

-- Full-text search with pg_trgm (MODIFIED)
CREATE INVERTED INDEX idx_tv_name_fts ON tv_series (to_tsvector('simple', name));
CREATE INDEX idx_tv_name_trgm ON tv_series USING GIN (name gin_trgm_ops);
```



### Model 4: Database Schema - Seasons & Episodes Tables

```sql
-- SEASONS (Child of tv_series)
-- NO SLUG — routing uses /tv/[series-slug]/season/[number]
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

  CONSTRAINT uq_season UNIQUE (series_id, season_number)
);

CREATE INDEX idx_seasons_series_id     ON seasons (series_id);
CREATE INDEX idx_seasons_number        ON seasons (season_number);

-- EPISODES (Child of seasons)
-- NO SLUG — routing uses /tv/[series-slug]/season/[num]/episode/[num]
CREATE TABLE episodes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID        NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number  INTEGER     NOT NULL CHECK (episode_number > 0),
  name            TEXT,
  overview        TEXT,
  still_url       TEXT,
  air_date        DATE,
  vote_average    FLOAT       NOT NULL DEFAULT 0
                  CHECK (vote_average >= 0 AND vote_average <= 10),
  vote_count      INTEGER     NOT NULL DEFAULT 0,
  runtime         INTEGER     CHECK (runtime IS NULL OR runtime > 0),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_episode UNIQUE (season_id, episode_number)
);

CREATE INDEX idx_episodes_season_id    ON episodes (season_id);
CREATE INDEX idx_episodes_number       ON episodes (episode_number);
```

**Validation Rules:**
- Seasons and episodes have NO slug column
- URL routing is hierarchical: `/tv/[series-slug]/season/1/episode/5`
- season_number must be >= 0 (includes specials at 0)
- episode_number must be > 0
- Cascade delete: deleting series deletes seasons; deleting season deletes episodes



### Model 5: Database Schema - Games, Software, Actors Tables

```sql
-- GAMES
CREATE TABLE games (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,
  slug                VARCHAR(255)  NOT NULL UNIQUE,  -- MODIFIED: TEXT → VARCHAR(255)

  title               TEXT          NOT NULL,
  description         TEXT,
  poster_url          TEXT,
  backdrop_url        TEXT,

  release_date        DATE,
  rating              FLOAT         NOT NULL DEFAULT 0
                      CHECK (rating >= 0 AND rating <= 10),
  rating_count        INTEGER       NOT NULL DEFAULT 0,
  popularity          FLOAT         NOT NULL DEFAULT 0,
  metacritic_score    INTEGER       CHECK (metacritic_score IS NULL OR
                                          (metacritic_score >= 0 AND metacritic_score <= 100)),

  developer           TEXT,
  publisher           TEXT,
  website             TEXT,

  platform            JSONB         NOT NULL DEFAULT '[]',
  genres              JSONB         NOT NULL DEFAULT '[]',
  tags                JSONB         NOT NULL DEFAULT '[]',
  screenshots         JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  system_requirements JSONB         NOT NULL DEFAULT '{}',

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

-- Full-text search with pg_trgm (MODIFIED)
CREATE INVERTED INDEX idx_games_title_fts ON games (to_tsvector('simple', title));
CREATE INDEX idx_games_title_trgm ON games USING GIN (title gin_trgm_ops);

-- SOFTWARE
CREATE TABLE software (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,
  slug                VARCHAR(255)  NOT NULL UNIQUE,  -- MODIFIED: TEXT → VARCHAR(255)

  title               TEXT          NOT NULL,
  description         TEXT,
  version             TEXT,
  poster_url          TEXT,
  backdrop_url        TEXT,

  release_date        DATE,
  rating              FLOAT         NOT NULL DEFAULT 0,
  rating_count        INTEGER       NOT NULL DEFAULT 0,
  popularity          FLOAT         NOT NULL DEFAULT 0,

  developer           TEXT,
  publisher           TEXT,
  license_type        TEXT,
  price               FLOAT         CHECK (price IS NULL OR price >= 0),
  website             TEXT,
  download_url        TEXT,
  file_size           TEXT,

  platform            JSONB         NOT NULL DEFAULT '[]',
  features            JSONB         NOT NULL DEFAULT '[]',
  screenshots         JSONB         NOT NULL DEFAULT '[]',
  videos              JSONB         NOT NULL DEFAULT '[]',
  system_requirements JSONB         NOT NULL DEFAULT '{}',
  languages           JSONB         NOT NULL DEFAULT '[]',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_software_source UNIQUE (external_source, external_id)
);

CREATE INDEX idx_software_popularity   ON software (popularity DESC);
CREATE INDEX idx_software_release_date ON software (release_date DESC);
CREATE INVERTED INDEX idx_software_platform ON software (platform);

-- Full-text search with pg_trgm (MODIFIED)
CREATE INVERTED INDEX idx_software_title_fts ON software (to_tsvector('simple', title));
CREATE INDEX idx_software_title_trgm ON software USING GIN (title gin_trgm_ops);

-- ACTORS
CREATE TABLE actors (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source     VARCHAR(50)   NOT NULL,
  external_id         VARCHAR(100)  NOT NULL,
  slug                VARCHAR(255)  NOT NULL UNIQUE,  -- MODIFIED: TEXT → VARCHAR(255)

  imdb_id             TEXT,
  name                TEXT          NOT NULL,
  original_name       TEXT,
  biography           TEXT,
  profile_url         TEXT,

  birthday            DATE,
  deathday            DATE,
  place_of_birth      TEXT,
  gender              SMALLINT      NOT NULL DEFAULT 0
                      CHECK (gender IN (0, 1, 2, 3)),

  known_for_department TEXT,
  popularity          FLOAT         NOT NULL DEFAULT 0,
  adult               BOOLEAN       NOT NULL DEFAULT FALSE,
  homepage            TEXT,

  also_known_as       JSONB         NOT NULL DEFAULT '[]',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_actors_source UNIQUE (external_source, external_id)
);

CREATE INDEX idx_actors_popularity     ON actors (popularity DESC);
CREATE INDEX idx_actors_known_for      ON actors (known_for_department);

-- Full-text search with pg_trgm (MODIFIED)
CREATE INVERTED INDEX idx_actors_name_fts ON actors (to_tsvector('simple', name));
CREATE INDEX idx_actors_name_trgm ON actors USING GIN (name gin_trgm_ops);
```



### Model 6: Database Schema - Ingestion Log (State Machine)

```sql
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
  result_id           UUID,
  result_slug         TEXT,

  -- Optional metadata
  requested_by        TEXT,
  notes               TEXT,

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_ingestion_source UNIQUE (external_source, external_id, content_type)
);

CREATE INDEX idx_ingestion_status          ON ingestion_log (status);
CREATE INDEX idx_ingestion_created_at      ON ingestion_log (created_at DESC);
CREATE INDEX idx_ingestion_next_retry      ON ingestion_log (next_retry_at)
  WHERE status = 'pending';
CREATE INDEX idx_ingestion_failed          ON ingestion_log (status, retry_count)
  WHERE status = 'failed';
CREATE INDEX idx_ingestion_content_type    ON ingestion_log (content_type, status);
```

**State Machine Diagram:**

```mermaid
stateDiagram-v2
    [*] --> pending: Item queued
    pending --> processing: Worker claims
    
    processing --> success: Insert successful
    processing --> skipped: Validation failed
    processing --> failed: Error occurred
    
    failed --> pending: retry_count < 3
    failed --> failed: retry_count >= 3 (permanent)
    
    success --> [*]
    skipped --> [*]
    failed --> [*]: Permanent failure
```

**State Transition Rules:**
- `pending → processing`: Worker claims item, sets last_attempted_at
- `processing → success`: Upsert completed, sets processed_at, result_id, result_slug
- `processing → skipped`: ContentValidator rejected, sets last_error with reason
- `processing → failed`: DB/API error or slug exhausted, increments retry_count, calculates next_retry_at
- `failed → pending`: If retry_count < 3 AND next_retry_at <= NOW()
- `failed → failed (permanent)`: If retry_count >= 3, sets next_retry_at = NULL

**Retry Backoff Formula:**
```
next_retry_at = NOW() + (1000ms × 2^retry_count)

retry_count = 1: +2 seconds
retry_count = 2: +4 seconds
retry_count = 3: +8 seconds (then permanent failure)
```



## Algorithmic Pseudocode

### Algorithm 1: Arabic Slug Generation Pipeline

```pascal
ALGORITHM generateSlug(title, originalTitle, year, attempt)
INPUT: 
  title: string (may contain Arabic)
  originalTitle: string (fallback, usually English)
  year: integer or null (4-digit release year)
  attempt: integer (retry counter, starts at 1)
OUTPUT: 
  slug: string (URL-safe slug, never empty)

PRECONDITIONS:
  - title is not null
  - attempt >= 1
  - year is null OR (year >= 1800 AND year <= 2100)

POSTCONDITIONS:
  - slug is non-empty string
  - slug contains only lowercase letters, numbers, and hyphens
  - slug does NOT contain TMDB ID or UUID
  - If attempt > 1, slug ends with "-{attempt}"

BEGIN
  // Step 1: Normalize Arabic text
  normalizedText ← normalizeArabic(title)
  
  // Step 2: Transliterate to Latin
  latinText ← transliterate(normalizedText)
  
  // Step 3: Slugify
  slugBase ← slugify(latinText)
  
  // Step 4: Fallback if empty
  IF length(slugBase) < 2 THEN
    normalizedOriginal ← normalizeArabic(originalTitle)
    latinOriginal ← transliterate(normalizedOriginal)
    slugBase ← slugify(latinOriginal)
  END IF
  
  // Step 5: Final fallback - random slug
  IF length(slugBase) < 2 THEN
    contentType ← inferContentType()
    randomSuffix ← generateRandom(4)  // e.g., "k7x2"
    slugBase ← contentType + "-" + randomSuffix
  END IF
  
  // Step 6: Append year
  IF year IS NOT NULL THEN
    slug ← slugBase + "-" + toString(year)
  ELSE
    slug ← slugBase
  END IF
  
  // Step 7: Append attempt counter for duplicates
  IF attempt > 1 THEN
    slug ← slug + "-" + toString(attempt)
  END IF
  
  ASSERT length(slug) >= 2
  ASSERT slug matches pattern "^[a-z0-9-]+$"
  
  RETURN slug
END

ALGORITHM normalizeArabic(text)
INPUT: text: string (may contain Arabic Unicode)
OUTPUT: normalized: string (Arabic with normalized characters)

BEGIN
  normalized ← text
  
  // Step 1: Strip tashkeel (diacritics) U+064B–U+065F
  normalized ← removeDiacritics(normalized)
  
  // Step 2: Normalize hamza variants → ا
  normalized ← replace(normalized, 'أ', 'ا')  // U+0623
  normalized ← replace(normalized, 'إ', 'ا')  // U+0625
  normalized ← replace(normalized, 'آ', 'ا')  // U+0622
  normalized ← replace(normalized, 'ٱ', 'ا')  // U+0671
  
  // Step 3: Normalize taa marbuta → ه
  normalized ← replace(normalized, 'ة', 'ه')  // U+0629
  
  // Step 4: Normalize alef maqsura → ي
  normalized ← replace(normalized, 'ى', 'ي')  // U+0649
  
  // Step 5: Normalize waw with hamza → و
  normalized ← replace(normalized, 'ؤ', 'و')  // U+0624
  
  // Step 6: Normalize yaa with hamza → ي
  normalized ← replace(normalized, 'ئ', 'ي')  // U+0626
  
  RETURN normalized
END

ALGORITHM slugify(text)
INPUT: text: string (Latin characters)
OUTPUT: slug: string (URL-safe)

BEGIN
  slug ← toLowerCase(text)
  slug ← trim(slug)
  slug ← replacePattern(slug, "[^a-z0-9\\s-]", "")  // strip non-alphanumeric
  slug ← replacePattern(slug, "[\\s]+", "-")         // spaces → hyphens
  slug ← replacePattern(slug, "-+", "-")             // collapse hyphens
  slug ← replacePattern(slug, "^-+|-+$", "")         // trim edge hyphens
  
  RETURN slug
END
```

**Transformation Examples:**

| Input Title | After normalizeArabic | After transliterate | After slugify | With Year | Final (attempt=2) |
|---|---|---|---|---|---|
| `مأوى` | `ماوى` | `mawy` | `mawy` | `mawy-2022` | `mawy-2022-2` |
| `أبو شنب` | `ابو شنب` | `abw shnb` | `abw-shnb` | `abw-shnb-2021` | `abw-shnb-2021-2` |
| `النهاية` | `النهاية` | `alnhayh` | `alnhayh` | `alnhayh-2020` | `alnhayh-2020-2` |
| `2001: A Space Odyssey` | (no change) | (no change) | `2001-a-space-odyssey` | `2001-a-space-odyssey-1968` | `2001-a-space-odyssey-1968-2` |



### Algorithm 2: Batch Processing with Concurrency Control

```pascal
ALGORITHM processBatch(externalIds, contentType, adapter, validator, ingestor)
INPUT:
  externalIds: array of strings (source IDs to fetch)
  contentType: string ('movie', 'tv_series', 'game', etc.)
  adapter: BaseAdapter instance
  validator: ContentValidator instance
  ingestor: CoreIngestor instance
OUTPUT:
  results: object { success: integer, failed: integer, skipped: integer }

PRECONDITIONS:
  - externalIds is non-empty array
  - contentType is valid enum value
  - All service instances are initialized

POSTCONDITIONS:
  - All items processed (success, failed, or skipped)
  - Database state is consistent
  - ingestion_log updated for all items

BEGIN
  CONST BATCH_SIZE ← 50
  CONST MAX_CONCURRENT ← 10
  CONST WAIT_BETWEEN_BATCHES_MS ← 200
  
  results ← { success: 0, failed: 0, skipped: 0 }
  chunks ← splitIntoChunks(externalIds, BATCH_SIZE)
  
  FOR each chunk IN chunks DO
    // Step 1: Fetch from API with concurrency limit
    fetchedItems ← []
    limiter ← createConcurrencyLimiter(MAX_CONCURRENT)
    
    FOR each id IN chunk DO CONCURRENTLY WITH limiter
      TRY
        item ← adapter.fetchOne(id, contentType)
        fetchedItems.append(item)
      CATCH error
        logError(id, error)
        // Continue with other items
      END TRY
    END FOR
    
    // Step 2: Validate all fetched items
    validItems ← []
    FOR each item IN fetchedItems DO
      validationResult ← validator.validate(item)
      IF validationResult.valid THEN
        validItems.append(item)
      ELSE
        results.skipped ← results.skipped + 1
        stateManager.setSkipped(item.ingestion_log_id, validationResult.reason)
      END IF
    END FOR
    
    // Step 3: Write valid items to database
    IF length(validItems) > 0 THEN
      batchResults ← ingestor.writeBatch(validItems)
      results.success ← results.success + batchResults.success
      results.failed ← results.failed + batchResults.failed
    END IF
    
    // Step 4: Wait between batches
    sleep(WAIT_BETWEEN_BATCHES_MS)
  END FOR
  
  RETURN results
END

ALGORITHM writeBatch(normalizedItems, slugEngine, stateManager, dbPool)
INPUT:
  normalizedItems: array of NormalizedContent objects
  slugEngine: SlugEngine instance
  stateManager: StateManager instance
  dbPool: database connection pool
OUTPUT:
  results: object { success: integer, failed: integer }

PRECONDITIONS:
  - normalizedItems is non-empty array
  - All items have valid external_source and external_id
  - Database connection pool is available

POSTCONDITIONS:
  - Transaction committed or rolled back atomically
  - ingestion_log updated for all items
  - Slugs are unique or retry exhausted

BEGIN
  CONST MAX_SLUG_RETRY ← 10
  
  results ← { success: 0, failed: 0 }
  client ← dbPool.connect()
  
  TRY
    client.query("BEGIN")
    
    FOR each item IN normalizedItems DO
      stateManager.setProcessing(item.ingestion_log_id, client)
      
      inserted ← false
      attempt ← 1
      
      WHILE NOT inserted AND attempt <= MAX_SLUG_RETRY DO
        // Generate slug candidate
        slug ← slugEngine.generate(
          item.title,
          item.original_title,
          item.release_year,
          attempt
        )
        
        TRY
          // Attempt upsert with ON CONFLICT
          result ← upsertContent(item, slug, client)
          stateManager.setSuccess(
            item.ingestion_log_id,
            result.id,
            result.slug,
            client
          )
          results.success ← results.success + 1
          inserted ← true
          
        CATCH error
          IF isSlugConflict(error) THEN
            attempt ← attempt + 1
            // Retry with next slug
          ELSE
            // Non-slug error - fail this item
            stateManager.setFailed(
              item.ingestion_log_id,
              error.message,
              client
            )
            results.failed ← results.failed + 1
            inserted ← true  // Exit retry loop
          END IF
        END TRY
      END WHILE
      
      // Exhausted all slug attempts
      IF NOT inserted THEN
        stateManager.setFailed(
          item.ingestion_log_id,
          "slug_exhausted: exceeded max retry attempts",
          client
        )
        results.failed ← results.failed + 1
      END IF
    END FOR
    
    client.query("COMMIT")
    
  CATCH error
    client.query("ROLLBACK")
    THROW error
  FINALLY
    client.release()
  END TRY
  
  RETURN results
END
```

**Loop Invariants:**
- **Batch Processing Loop:** All previously processed chunks have updated ingestion_log entries
- **Slug Retry Loop:** All previous slug attempts have failed with uniqueness conflict
- **Transaction Loop:** Database state remains consistent; partial failures don't corrupt data



### Algorithm 3: Content Validation

```pascal
ALGORITHM validateContent(content)
INPUT: content: NormalizedContent object
OUTPUT: result: { valid: boolean, reason: string | null }

PRECONDITIONS:
  - content is defined (not null/undefined)
  - content has required fields: title, external_source, external_id

POSTCONDITIONS:
  - Returns validation result with boolean and optional reason
  - No mutations to content parameter
  - If valid=false, reason contains human-readable explanation

BEGIN
  // Rule 1: Missing poster
  IF content.poster_url IS NULL OR isEmpty(content.poster_url) THEN
    RETURN { valid: false, reason: "missing_poster" }
  END IF
  
  // Rule 2: Missing overview
  IF content.overview IS NULL OR isEmpty(trim(content.overview)) THEN
    RETURN { valid: false, reason: "missing_overview" }
  END IF
  
  // Rule 3: Future release
  IF content.release_date IS NOT NULL THEN
    releaseDate ← parseDate(content.release_date)
    IF releaseDate > NOW() THEN
      RETURN { valid: false, reason: "future_release" }
    END IF
  END IF
  
  // Rule 4: Unreleased movie
  IF content.content_type = "movie" THEN
    IF content.status IS NOT NULL AND content.status ≠ "Released" THEN
      RETURN { valid: false, reason: "unreleased_movie" }
    END IF
  END IF
  
  // Rule 5: Invalid rating
  IF content.vote_average < 0 OR content.vote_average > 10 THEN
    RETURN { valid: false, reason: "invalid_vote_average" }
  END IF
  
  // Rule 6: Missing title
  IF content.title IS NULL OR isEmpty(trim(content.title)) THEN
    RETURN { valid: false, reason: "missing_title" }
  END IF
  
  // Rule 7: Adult content (configurable)
  IF content.adult = true AND NOT ALLOW_ADULT_CONTENT THEN
    RETURN { valid: false, reason: "adult_content_filtered" }
  END IF
  
  // All validations passed
  RETURN { valid: true, reason: null }
END
```

**Preconditions:**
- content parameter exists and has basic structure
- Environment variable ALLOW_ADULT_CONTENT is defined

**Postconditions:**
- Returns validation result object
- No side effects on input
- Reason field populated only when valid=false

**Loop Invariants:** N/A (no loops in this algorithm)



### Algorithm 4: State Machine Transitions

```pascal
ALGORITHM transitionState(ingestionLogId, newStatus, metadata, client)
INPUT:
  ingestionLogId: UUID
  newStatus: string ('processing', 'success', 'failed', 'skipped')
  metadata: object (error message, result_id, result_slug, etc.)
  client: database client (transaction context)
OUTPUT:
  success: boolean

PRECONDITIONS:
  - ingestionLogId exists in ingestion_log table
  - newStatus is valid enum value
  - client is within active transaction

POSTCONDITIONS:
  - ingestion_log row updated with new status
  - Timestamps updated appropriately
  - Retry logic applied for 'failed' status

BEGIN
  currentTime ← NOW()
  
  MATCH newStatus WITH
    CASE "processing":
      UPDATE ingestion_log
      SET status = 'processing',
          last_attempted_at = currentTime,
          updated_at = currentTime
      WHERE id = ingestionLogId
      
    CASE "success":
      UPDATE ingestion_log
      SET status = 'success',
          processed_at = currentTime,
          result_id = metadata.result_id,
          result_slug = metadata.result_slug,
          updated_at = currentTime
      WHERE id = ingestionLogId
      
    CASE "skipped":
      UPDATE ingestion_log
      SET status = 'skipped',
          last_error = metadata.reason,
          updated_at = currentTime
      WHERE id = ingestionLogId
      
    CASE "failed":
      // Fetch current retry_count
      row ← SELECT retry_count FROM ingestion_log WHERE id = ingestionLogId
      newRetryCount ← row.retry_count + 1
      
      IF newRetryCount < MAX_INGESTION_RETRY_COUNT THEN
        // Calculate exponential backoff
        backoffMs ← RETRY_BACKOFF_BASE_MS × (2 ^ newRetryCount)
        nextRetry ← currentTime + backoffMs
        
        UPDATE ingestion_log
        SET status = 'failed',
            retry_count = newRetryCount,
            last_error = metadata.error,
            next_retry_at = nextRetry,
            updated_at = currentTime
        WHERE id = ingestionLogId
      ELSE
        // Permanent failure
        UPDATE ingestion_log
        SET status = 'failed',
            retry_count = newRetryCount,
            last_error = metadata.error,
            next_retry_at = NULL,
            updated_at = currentTime
        WHERE id = ingestionLogId
      END IF
  END MATCH
  
  RETURN true
END

ALGORITHM claimPendingItems(batchSize, dbPool)
INPUT:
  batchSize: integer (number of items to claim)
  dbPool: database connection pool
OUTPUT:
  items: array of ingestion_log rows

PRECONDITIONS:
  - batchSize > 0
  - Database connection available

POSTCONDITIONS:
  - Claimed items have status='processing'
  - No other worker can claim the same items (atomic operation)
  - Returns empty array if no pending items

BEGIN
  client ← dbPool.connect()
  
  TRY
    // Atomic claim with FOR UPDATE SKIP LOCKED
    items ← client.query("""
      UPDATE ingestion_log
      SET status = 'processing',
          last_attempted_at = NOW()
      WHERE id IN (
        SELECT id FROM ingestion_log
        WHERE status = 'pending'
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    """, [batchSize])
    
    RETURN items
    
  FINALLY
    client.release()
  END TRY
END
```

**Preconditions:**
- ingestion_log table exists and has valid schema
- MAX_INGESTION_RETRY_COUNT and RETRY_BACKOFF_BASE_MS are defined
- Database supports FOR UPDATE SKIP LOCKED (CockroachDB does)

**Postconditions:**
- State transitions are atomic
- Retry backoff follows exponential pattern
- Permanent failures have next_retry_at = NULL

**Loop Invariants:** N/A (no loops in these algorithms)



## Key Functions with Formal Specifications

### Function 1: upsertContent()

```javascript
async function upsertContent(item, slug, client)
```

**Preconditions:**
- `item` is a valid NormalizedContent object
- `slug` is non-empty string matching pattern `^[a-z0-9-]+$`
- `client` is an active database client within a transaction
- `item.external_source` and `item.external_id` are non-empty strings

**Postconditions:**
- Returns object `{ id: UUID, slug: string }` on success
- If `(external_source, external_id)` exists, updates existing row (except slug)
- If slug conflict occurs, throws error with code '23505' (unique violation)
- Slug is NEVER updated on conflict (immutable after first insert)
- All JSONB fields are properly serialized
- Timestamps `created_at` and `updated_at` are set

**Loop Invariants:** N/A (no loops)

### Function 2: fetchWithDualLanguage()

```javascript
async function fetchWithDualLanguage(externalId, contentType)
```

**Preconditions:**
- `externalId` is valid TMDB ID (positive integer as string)
- `contentType` is 'movie' or 'tv_series'
- TMDB API key is configured
- Network connection is available

**Postconditions:**
- Returns NormalizedContent object with merged Arabic/English data
- Arabic values preferred when available (title, overview, etc.)
- Image URLs are fully qualified (not relative paths)
- Cast limited to top 20 by order
- Crew filtered to Director, Writer, Producer, Executive Producer
- Videos filtered to YouTube only, max 10
- Keywords limited to max 20
- Seasons filtered to season_number >= 0

**Loop Invariants:**
- **Cast filtering loop:** All previously processed cast members have order <= 20
- **Crew filtering loop:** All previously processed crew members have job in allowed list
- **Video filtering loop:** All previously processed videos are YouTube and count <= 10



### Function 3: normalizeArabic()

```javascript
function normalizeArabic(text)
```

**Preconditions:**
- `text` is a string (may be empty, may contain Arabic Unicode)

**Postconditions:**
- Returns string with normalized Arabic characters
- All hamza variants replaced with ا (U+0627)
- Taa marbuta (ة) replaced with ه
- Alef maqsura (ى) replaced with ي
- Waw with hamza (ؤ) replaced with و
- Yaa with hamza (ئ) replaced with ي
- All diacritics (tashkeel) removed
- Non-Arabic characters unchanged
- No side effects on input

**Loop Invariants:**
- **Character replacement loop:** All previously processed characters are normalized

### Function 4: localizeField()

```javascript
function localizeField(arabicValue, englishValue)
```

**Preconditions:**
- `arabicValue` and `englishValue` are strings or null

**Postconditions:**
- Returns arabicValue if non-empty, otherwise englishValue
- Returns null if both are empty/null
- Prefers Arabic content when available
- No side effects on inputs

**Loop Invariants:** N/A (no loops)

## Example Usage

### Example 1: Basic Movie Ingestion

```javascript
// Initialize services
const slugEngine = new SlugEngine();
const validator = new ContentValidator();
const stateManager = new StateManager(pool);
const coreIngestor = new CoreIngestor(slugEngine, stateManager, pool);
const tmdbAdapter = new TMDBAdapter(TMDB_API_KEY);
const batchProcessor = new BatchProcessor(tmdbAdapter, validator, coreIngestor, stateManager);

// Queue TMDB movie IDs for ingestion
const movieIds = ['550', '551', '552', '553', '554'];  // Fight Club, etc.

// Process batch
const results = await batchProcessor.processBatch(movieIds, 'movie');

console.log(`Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}`);
// Output: Success: 4, Failed: 0, Skipped: 1
```

### Example 2: Arabic Movie with Slug Conflict

```javascript
// First movie: "النهاية" (2020)
const movie1 = await tmdbAdapter.fetchOne('12345', 'movie');
// Normalized: { title: 'النهاية', original_title: 'The End', release_year: 2020 }

const slug1 = slugEngine.generate(movie1.title, movie1.original_title, movie1.release_year, 1);
// Result: "alnhayh-2020"

await coreIngestor.upsertContent(movie1, slug1, client);
// Success: slug="alnhayh-2020" inserted

// Second movie: "النهاية" (2020) - different TMDB ID, same title/year
const movie2 = await tmdbAdapter.fetchOne('67890', 'movie');
// Normalized: { title: 'النهاية', original_title: 'The End', release_year: 2020 }

const slug2_attempt1 = slugEngine.generate(movie2.title, movie2.original_title, movie2.release_year, 1);
// Result: "alnhayh-2020" (same as movie1)

await coreIngestor.upsertContent(movie2, slug2_attempt1, client);
// Error: Unique constraint violation on slug

const slug2_attempt2 = slugEngine.generate(movie2.title, movie2.original_title, movie2.release_year, 2);
// Result: "alnhayh-2020-2"

await coreIngestor.upsertContent(movie2, slug2_attempt2, client);
// Success: slug="alnhayh-2020-2" inserted
```

### Example 3: TV Series with Seasons

```javascript
// Fetch TV series
const series = await tmdbAdapter.fetchOne('1399', 'tv_series');  // Game of Thrones
// Normalized: { 
//   title: 'Game of Thrones',
//   seasons: [
//     { season_number: 1, episode_count: 10, ... },
//     { season_number: 2, episode_count: 10, ... }
//   ]
// }

// Insert series
const seriesResult = await coreIngestor.upsertContent(series, 'game-of-thrones-2011', client);
// Returns: { id: 'uuid-123', slug: 'game-of-thrones-2011' }

// Insert seasons (separate operation)
for (const seasonData of series.seasons) {
  await client.query(`
    INSERT INTO seasons (series_id, season_number, name, episode_count, air_date, poster_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (series_id, season_number) DO UPDATE
    SET name = EXCLUDED.name,
        episode_count = EXCLUDED.episode_count,
        air_date = EXCLUDED.air_date,
        poster_url = EXCLUDED.poster_url,
        updated_at = NOW()
  `, [seriesResult.id, seasonData.season_number, seasonData.name, 
      seasonData.episode_count, seasonData.air_date, seasonData.poster_path]);
}

// URL routing: /tv/game-of-thrones-2011/season/1/episode/1
```



### Example 4: Validation Rejection

```javascript
// Movie with missing poster
const invalidMovie = {
  external_source: 'TMDB',
  external_id: '999',
  title: 'Test Movie',
  poster_url: null,  // Missing!
  overview: 'A test movie',
  release_year: 2024
};

const validationResult = validator.validate(invalidMovie);
// Returns: { valid: false, reason: 'missing_poster' }

// This item will be marked as 'skipped' in ingestion_log
await stateManager.setSkipped(ingestionLogId, validationResult.reason);
```

### Example 5: Worker Claiming Pending Items

```javascript
// Worker process claims batch
const pendingItems = await batchProcessor.claimPendingItems(50);
// SQL executed:
// UPDATE ingestion_log
// SET status = 'processing', last_attempted_at = NOW()
// WHERE id IN (
//   SELECT id FROM ingestion_log
//   WHERE status = 'pending'
//     AND (next_retry_at IS NULL OR next_retry_at <= NOW())
//   ORDER BY created_at ASC
//   LIMIT 50
//   FOR UPDATE SKIP LOCKED
// )
// RETURNING *

console.log(`Claimed ${pendingItems.length} items for processing`);

// Process each item
for (const item of pendingItems) {
  try {
    const content = await tmdbAdapter.fetchOne(item.external_id, item.content_type);
    const validation = validator.validate(content);
    
    if (validation.valid) {
      await coreIngestor.writeBatch([content]);
    } else {
      await stateManager.setSkipped(item.id, validation.reason);
    }
  } catch (error) {
    await stateManager.setFailed(item.id, error.message);
  }
}
```

## Correctness Properties

### Property 1: Slug Uniqueness Per Content Type

**Universal Quantification:**
```
∀ content_type ∈ {movie, tv_series, game, software, actor}:
  ∀ row1, row2 ∈ table(content_type):
    row1.slug = row2.slug ⟹ row1.id = row2.id
```

**Meaning:** Within each content table, no two different rows can have the same slug.

**Enforcement:** Database UNIQUE constraint on slug column in each table.

### Property 2: Slug Immutability

**Universal Quantification:**
```
∀ content_type ∈ {movie, tv_series, game, software, actor}:
  ∀ row ∈ table(content_type):
    ∀ t1, t2 where t1 < t2:
      slug_at(row, t1) ≠ NULL ⟹ slug_at(row, t2) = slug_at(row, t1)
```

**Meaning:** Once a slug is assigned to a content row, it never changes.

**Enforcement:** ON CONFLICT DO UPDATE clause excludes slug field; application logic never updates slug.

### Property 3: External Source Uniqueness

**Universal Quantification:**
```
∀ content_type ∈ {movie, tv_series, game, software, actor}:
  ∀ row1, row2 ∈ table(content_type):
    (row1.external_source = row2.external_source ∧ 
     row1.external_id = row2.external_id) ⟹ row1.id = row2.id
```

**Meaning:** Each (external_source, external_id) pair maps to exactly one content row.

**Enforcement:** Database UNIQUE constraint on (external_source, external_id) in each table.

### Property 4: Slug Format Validity

**Universal Quantification:**
```
∀ content_type ∈ {movie, tv_series, game, software, actor}:
  ∀ row ∈ table(content_type):
    row.slug ≠ NULL ⟹ 
      (row.slug matches "^[a-z0-9-]+$" ∧
       length(row.slug) >= 2 ∧
       row.slug does not contain UUID ∧
       row.slug does not contain TMDB ID)
```

**Meaning:** All slugs are lowercase alphanumeric with hyphens, at least 2 characters, and contain no IDs.

**Enforcement:** SlugEngine.generate() algorithm; application-level validation.



### Property 5: State Machine Validity

**Universal Quantification:**
```
∀ row ∈ ingestion_log:
  row.status ∈ {pending, processing, success, failed, skipped} ∧
  (row.status = 'success' ⟹ row.processed_at ≠ NULL ∧ row.result_slug ≠ NULL) ∧
  (row.status = 'failed' ∧ row.retry_count < 3 ⟹ row.next_retry_at ≠ NULL) ∧
  (row.status = 'failed' ∧ row.retry_count >= 3 ⟹ row.next_retry_at = NULL) ∧
  (row.status = 'skipped' ⟹ row.last_error ≠ NULL)
```

**Meaning:** State machine transitions maintain data integrity invariants.

**Enforcement:** StateManager class enforces transition rules; database CHECK constraints on status enum.

### Property 6: Retry Backoff Monotonicity

**Universal Quantification:**
```
∀ row ∈ ingestion_log:
  row.status = 'failed' ∧ row.retry_count > 0 ⟹
    next_retry_at = last_attempted_at + (1000ms × 2^retry_count)
```

**Meaning:** Retry delays follow exponential backoff pattern.

**Enforcement:** StateManager.calculateNextRetry() function.

### Property 7: No Public ID Exposure

**Universal Quantification:**
```
∀ url ∈ public_urls:
  url does not contain UUID ∧
  url does not contain TMDB ID ∧
  url does not contain external_id
```

**Meaning:** All public URLs use slugs only, never internal or external IDs.

**Enforcement:** Backend API routing; frontend URL generation; architectural constant C-2.

## Error Handling

### Error Scenario 1: Slug Uniqueness Conflict

**Condition:** INSERT attempts to use a slug that already exists in the table

**Response:** 
- Catch PostgreSQL error code '23505' (unique_violation)
- Check if constraint name contains 'slug'
- Increment attempt counter
- Generate new slug with attempt suffix: `slug-{attempt}`
- Retry INSERT with new slug

**Recovery:**
- Retry up to MAX_SLUG_RETRY_ATTEMPTS (10) times
- If all attempts exhausted, mark as 'failed' in ingestion_log with reason 'slug_exhausted'
- Manual intervention required for slug_exhausted items

### Error Scenario 2: TMDB API Rate Limit

**Condition:** TMDB returns HTTP 429 (Too Many Requests)

**Response:**
- Catch axios error with status 429
- Extract Retry-After header if present
- Wait for specified duration (or default 1 second)
- Retry request using p-retry with exponential backoff

**Recovery:**
- Automatic retry with backoff
- If retries exhausted, mark item as 'failed' in ingestion_log
- Item will be re-queued based on retry_count and next_retry_at

### Error Scenario 3: Database Connection Loss

**Condition:** CockroachDB connection drops during transaction

**Response:**
- Catch connection error (ECONNREFUSED, ETIMEDOUT, etc.)
- ROLLBACK transaction if in progress
- Release database client back to pool
- Log error with full context

**Recovery:**
- Batch processor catches error and continues with next batch
- Failed items remain in 'processing' state
- Separate cleanup job resets stale 'processing' items to 'pending' after timeout (e.g., 5 minutes)



### Error Scenario 4: Content Validation Failure

**Condition:** NormalizedContent object fails ContentValidator rules

**Response:**
- Validator returns `{ valid: false, reason: 'missing_poster' }` (or other reason)
- StateManager marks item as 'skipped' in ingestion_log
- Store reason in last_error field
- Do NOT retry skipped items

**Recovery:**
- No automatic recovery (skipped is terminal state)
- Weekly scheduled job can re-evaluate skipped items (e.g., if TMDB adds poster later)
- Admin dashboard allows manual re-queue of skipped items

### Error Scenario 5: Transient API Timeout

**Condition:** TMDB API request times out (>10 seconds)

**Response:**
- Axios timeout triggers error
- p-retry catches error and retries with exponential backoff
- Max 3 retries per API call

**Recovery:**
- If all retries fail, mark item as 'failed' in ingestion_log
- Item will be re-queued based on retry_count (max 3 ingestion retries)
- After 3 ingestion retries, becomes permanent failure requiring manual intervention

### Error Scenario 6: Invalid TMDB Response Schema

**Condition:** TMDB returns data that doesn't match expected schema

**Response:**
- Zod validation throws error during normalize()
- Error caught by batch processor
- Item marked as 'failed' with error message containing schema validation details

**Recovery:**
- Automatic retry (may be transient TMDB issue)
- If persistent, becomes permanent failure after 3 retries
- Admin can inspect error message and manually fix or skip

## Testing Strategy

### Unit Testing Approach

**SlugEngine Tests:**
- Test Arabic normalization for each Unicode replacement rule
- Test transliteration with various Arabic inputs
- Test slugify edge cases (empty, special chars, multiple spaces)
- Test year appending logic (with year, without year, invalid year)
- Test attempt counter appending (attempt 1, 2, 10)
- Test fallback strategy (empty slug → original_title → random)

**ContentValidator Tests:**
- Test each validation rule independently
- Test combinations of validation failures
- Test edge cases (null vs empty string, future dates, boundary values)
- Test adult content filtering with env flag variations

**StateManager Tests:**
- Test each state transition (pending→processing, processing→success, etc.)
- Test retry backoff calculation (retry_count 1, 2, 3)
- Test permanent failure condition (retry_count >= 3)
- Test timestamp updates for each transition



### Property-Based Testing Approach

**Property Test Library:** fast-check (for Node.js/JavaScript)

**Property 1: Slug Generation Idempotency**
```javascript
// For any valid input, generating slug twice with same attempt yields same result
fc.assert(
  fc.property(
    fc.string(), // title
    fc.string(), // originalTitle
    fc.option(fc.integer({ min: 1900, max: 2100 })), // year
    fc.integer({ min: 1, max: 10 }), // attempt
    (title, originalTitle, year, attempt) => {
      const slug1 = slugEngine.generate(title, originalTitle, year, attempt);
      const slug2 = slugEngine.generate(title, originalTitle, year, attempt);
      return slug1 === slug2;
    }
  )
);
```

**Property 2: Slug Format Validity**
```javascript
// All generated slugs match the required pattern
fc.assert(
  fc.property(
    fc.string(),
    fc.string(),
    fc.option(fc.integer({ min: 1900, max: 2100 })),
    fc.integer({ min: 1, max: 10 }),
    (title, originalTitle, year, attempt) => {
      const slug = slugEngine.generate(title, originalTitle, year, attempt);
      return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2;
    }
  )
);
```

**Property 3: Attempt Counter Monotonicity**
```javascript
// Higher attempt numbers always produce different slugs
fc.assert(
  fc.property(
    fc.string(),
    fc.string(),
    fc.option(fc.integer({ min: 1900, max: 2100 })),
    (title, originalTitle, year) => {
      const slug1 = slugEngine.generate(title, originalTitle, year, 1);
      const slug2 = slugEngine.generate(title, originalTitle, year, 2);
      return slug1 !== slug2;
    }
  )
);
```

**Property 4: Validation Consistency**
```javascript
// Validation result is deterministic for same input
fc.assert(
  fc.property(
    fc.record({
      title: fc.string(),
      poster_url: fc.option(fc.webUrl()),
      overview: fc.option(fc.string()),
      vote_average: fc.float({ min: 0, max: 10 }),
      release_date: fc.option(fc.date())
    }),
    (content) => {
      const result1 = validator.validate(content);
      const result2 = validator.validate(content);
      return result1.valid === result2.valid && result1.reason === result2.reason;
    }
  )
);
```

**Property 5: State Transition Validity**
```javascript
// State transitions always result in valid states
fc.assert(
  fc.property(
    fc.constantFrom('pending', 'processing', 'success', 'failed', 'skipped'),
    fc.constantFrom('processing', 'success', 'failed', 'skipped'),
    (fromState, toState) => {
      // Valid transitions only
      const validTransitions = {
        'pending': ['processing'],
        'processing': ['success', 'failed', 'skipped'],
        'failed': ['pending', 'failed']
      };
      
      if (!validTransitions[fromState]?.includes(toState)) {
        return true; // Skip invalid transitions
      }
      
      // Test transition
      const result = stateManager.canTransition(fromState, toState);
      return result === true;
    }
  )
);
```

### Integration Testing Approach

**Test 1: End-to-End Ingestion Flow**
- Mock TMDB API responses
- Queue 10 movie IDs
- Run batch processor
- Verify database state: 10 rows in movies table, 10 success entries in ingestion_log
- Verify all slugs are unique and valid format

**Test 2: Slug Conflict Resolution**
- Insert movie with slug "test-movie-2020"
- Queue another movie that would generate same slug
- Run batch processor
- Verify second movie gets slug "test-movie-2020-2"
- Verify both movies exist in database

**Test 3: Validation Rejection Flow**
- Mock TMDB response with missing poster
- Queue movie ID
- Run batch processor
- Verify movie NOT in movies table
- Verify ingestion_log has status='skipped' with reason='missing_poster'

**Test 4: Retry Logic**
- Mock TMDB API to fail twice, then succeed
- Queue movie ID
- Run batch processor
- Verify movie eventually inserted after retries
- Verify ingestion_log shows retry_count increments

**Test 5: Concurrent Worker Safety**
- Start 3 worker processes simultaneously
- Queue 150 items (50 per worker)
- Verify no duplicate processing (FOR UPDATE SKIP LOCKED works)
- Verify all 150 items processed exactly once



## Performance Considerations

### Database Performance

**Batch Size Optimization:**
- BATCH_SIZE = 50 items per transaction
- Rationale: CockroachDB transaction limit ~64MB; average content record ~8KB; 50 × 8KB = 400KB (well within limit)
- Provides good throughput without overwhelming connection pool

**Index Strategy:**
- B-tree indexes on frequently queried columns (popularity, vote_average, release_date)
- GIN inverted indexes on JSONB columns (genres, cast_data, keywords)
- Full-text search using tsvector + GIN index
- Trigram indexes (pg_trgm) for fuzzy title search
- Composite indexes for common query patterns (original_language, popularity)

**Connection Pool Configuration:**
```javascript
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000  // Fail fast if no connection available
});
```

**Query Optimization:**
- Use parameterized queries to enable query plan caching
- Batch INSERT with ON CONFLICT for upserts (single round-trip)
- Use RETURNING clause to get inserted IDs without separate SELECT
- Avoid N+1 queries; fetch related data in single query when possible

### API Rate Limiting

**TMDB Rate Limits:**
- Limit: 40 requests per second
- Implementation: 25ms delay between requests (40 req/sec = 25ms interval)
- Concurrency: MAX_CONCURRENT_FETCHES = 10 (using p-limit)
- Retry strategy: Exponential backoff with p-retry (max 3 attempts)

**Wait Times:**
- Between API requests: 25ms (TMDB rate limit compliance)
- Between batch chunks: 200ms (prevent DB connection exhaustion)
- Retry backoff: 1000ms × 2^retry_count (exponential)

### Memory Management

**Streaming for Large Datasets:**
- Process in chunks of BATCH_SIZE (50) to avoid loading entire dataset into memory
- Release database client after each transaction
- Clear processed items from memory before next batch

**JSONB Field Size Limits:**
- Cast: Top 20 only (prevents bloat from movies with 100+ cast members)
- Crew: Filtered to 4 roles only (Director, Writer, Producer, Executive Producer)
- Videos: Max 10 (YouTube only)
- Keywords: Max 20
- Images: Reasonable limit based on TMDB response (typically <50)

### Throughput Estimates

**Single Worker:**
- Fetch time per item: ~200ms (TMDB API latency)
- Concurrent fetches: 10 items in parallel
- Batch of 50 items: ~1 second fetch time
- Database write: ~500ms for 50 items
- Total per batch: ~1.5 seconds
- Throughput: ~33 items/second = ~2,000 items/minute

**Multiple Workers:**
- 5 workers: ~10,000 items/minute
- 10 workers: ~20,000 items/minute
- Full rebuild (318K items): ~16-32 minutes with 10 workers



## Security Considerations

### API Key Protection

**Environment Variables:**
- All API keys stored in `.env` file (never committed to git)
- `.env` listed in `.gitignore`
- Use `.env.example` as template with placeholder values
- Koyeb deployment uses environment variable injection

**Key Rotation:**
- TMDB API keys can be rotated without code changes
- Update environment variable and restart service
- No hardcoded keys in source code

### Database Security

**Connection Security:**
- CockroachDB connection uses SSL/TLS (`sslmode=verify-full`)
- Connection string includes authentication credentials
- Connection pool limits prevent connection exhaustion attacks

**SQL Injection Prevention:**
- All queries use parameterized statements (pg library)
- Never concatenate user input into SQL strings
- Zod validation on all external data before database write

**Access Control:**
- CockroachDB user has minimal required permissions
- No DROP or ALTER permissions in production
- Separate admin user for schema migrations

### Input Validation

**External Data Sanitization:**
- Zod schemas validate TMDB/RAWG responses before processing
- ContentValidator enforces business rules
- SlugEngine strips all non-alphanumeric characters (except hyphens)
- No user-provided data directly inserted without validation

**JSONB Injection Prevention:**
- All JSONB fields validated before serialization
- Use JSON.stringify() for safe serialization
- Zod schemas enforce array/object structure

### Rate Limiting

**TMDB API Protection:**
- Respect TMDB rate limits (40 req/sec)
- Implement exponential backoff on errors
- Use API key rotation if rate limits exceeded

**Admin API Protection:**
- Supabase authentication required for admin endpoints
- Rate limiting on admin API endpoints (prevent abuse)
- CORS restricted to cinma.online domains only

## Backend Server Architecture (Koyeb-Ready)

### Server Configuration

```javascript
// server/index.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// CRITICAL: Bind to 0.0.0.0 for Koyeb (not localhost)
const HOST = '0.0.0.0';

// CORS configuration
app.use(cors({
  origin: [
    'https://cinma.online',
    'https://www.cinma.online',
    'http://localhost:5173',  // Dev only
    'http://localhost:4173'   // Preview only
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint (required by Koyeb)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Content API routes (public, slug-based)
app.use('/api/content', require('./routes/content'));

// Admin API routes (authenticated)
app.use('/api/admin', require('./routes/admin'));

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
```



### Content API Endpoints (Public)

**All routes use slugs, never IDs:**

```javascript
// GET /api/content/movie/:slug
// Returns single movie by slug
router.get('/movie/:slug', async (req, res) => {
  const { slug } = req.params;
  const movie = await pool.query(
    'SELECT * FROM movies WHERE slug = $1',
    [slug]
  );
  if (movie.rows.length === 0) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.json(movie.rows[0]);
});

// GET /api/content/tv/:slug
// Returns single TV series by slug
router.get('/tv/:slug', async (req, res) => {
  const { slug } = req.params;
  const series = await pool.query(
    'SELECT * FROM tv_series WHERE slug = $1',
    [slug]
  );
  if (series.rows.length === 0) {
    return res.status(404).json({ error: 'Series not found' });
  }
  res.json(series.rows[0]);
});

// GET /api/content/tv/:slug/seasons
// Returns all seasons for a TV series
router.get('/tv/:slug/seasons', async (req, res) => {
  const { slug } = req.params;
  
  // First get series ID from slug
  const series = await pool.query(
    'SELECT id FROM tv_series WHERE slug = $1',
    [slug]
  );
  
  if (series.rows.length === 0) {
    return res.status(404).json({ error: 'Series not found' });
  }
  
  const seasons = await pool.query(
    'SELECT * FROM seasons WHERE series_id = $1 ORDER BY season_number ASC',
    [series.rows[0].id]
  );
  
  res.json(seasons.rows);
});

// GET /api/content/tv/:slug/season/:number/episodes
// Returns all episodes for a season
router.get('/tv/:slug/season/:number/episodes', async (req, res) => {
  const { slug, number } = req.params;
  
  // Get series ID from slug
  const series = await pool.query(
    'SELECT id FROM tv_series WHERE slug = $1',
    [slug]
  );
  
  if (series.rows.length === 0) {
    return res.status(404).json({ error: 'Series not found' });
  }
  
  // Get season ID from series ID and season number
  const season = await pool.query(
    'SELECT id FROM seasons WHERE series_id = $1 AND season_number = $2',
    [series.rows[0].id, parseInt(number)]
  );
  
  if (season.rows.length === 0) {
    return res.status(404).json({ error: 'Season not found' });
  }
  
  // Get episodes
  const episodes = await pool.query(
    'SELECT * FROM episodes WHERE season_id = $1 ORDER BY episode_number ASC',
    [season.rows[0].id]
  );
  
  res.json(episodes.rows);
});

// GET /api/content/movies
// List movies with pagination and filters
router.get('/movies', async (req, res) => {
  const { page = 1, limit = 20, sort = 'popularity', language } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM movies WHERE 1=1';
  const params = [];
  
  if (language) {
    params.push(language);
    query += ` AND original_language = $${params.length}`;
  }
  
  query += ` ORDER BY ${sort} DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const movies = await pool.query(query, params);
  res.json(movies.rows);
});

// GET /api/content/search
// Search across all content types
router.get('/search', async (req, res) => {
  const { q, type = 'all' } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }
  
  const searchTerm = q.trim();
  const results = { movies: [], tv_series: [], games: [], software: [], actors: [] };
  
  if (type === 'all' || type === 'movie') {
    const movies = await pool.query(
      `SELECT * FROM movies 
       WHERE title ILIKE $1 OR to_tsvector('simple', title) @@ plainto_tsquery('simple', $2)
       ORDER BY popularity DESC LIMIT 10`,
      [`%${searchTerm}%`, searchTerm]
    );
    results.movies = movies.rows;
  }
  
  // Similar for other content types...
  
  res.json(results);
});
```



### Admin API Endpoints (Authenticated)

**All routes require Supabase authentication:**

```javascript
// Middleware: Verify Supabase JWT
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}

// GET /api/admin/ingestion/stats
// Returns ingestion statistics
router.get('/ingestion/stats', requireAuth, async (req, res) => {
  const stats = await pool.query(`
    SELECT 
      status,
      COUNT(*) as count,
      content_type
    FROM ingestion_log
    GROUP BY status, content_type
    ORDER BY content_type, status
  `);
  
  res.json(stats.rows);
});

// GET /api/admin/ingestion/log
// Returns paginated ingestion log with filters
router.get('/ingestion/log', requireAuth, async (req, res) => {
  const { page = 1, limit = 50, status, content_type } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM ingestion_log WHERE 1=1';
  const params = [];
  
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  
  if (content_type) {
    params.push(content_type);
    query += ` AND content_type = $${params.length}`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const logs = await pool.query(query, params);
  res.json(logs.rows);
});

// POST /api/admin/ingestion/queue
// Queue new items for ingestion
router.post('/ingestion/queue', requireAuth, async (req, res) => {
  const { external_source, external_ids, content_type } = req.body;
  
  if (!external_source || !external_ids || !content_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const external_id of external_ids) {
      await client.query(`
        INSERT INTO ingestion_log (external_source, external_id, content_type, status, requested_by)
        VALUES ($1, $2, $3, 'pending', $4)
        ON CONFLICT (external_source, external_id, content_type) 
        DO UPDATE SET status = 'pending', updated_at = NOW()
      `, [external_source, external_id, content_type, req.user.email]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, queued: external_ids.length });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/admin/ingestion/requeue-failed
// Re-queue failed items
router.post('/ingestion/requeue-failed', requireAuth, async (req, res) => {
  const { content_type } = req.body;
  
  let query = `
    UPDATE ingestion_log
    SET status = 'pending', retry_count = 0, next_retry_at = NULL, updated_at = NOW()
    WHERE status = 'failed'
  `;
  
  const params = [];
  if (content_type) {
    params.push(content_type);
    query += ` AND content_type = $1`;
  }
  
  query += ' RETURNING id';
  
  const result = await pool.query(query, params);
  res.json({ success: true, requeued: result.rowCount });
});
```



## Admin Dashboard

### Dashboard Features

**Statistics Screen:**
- Total content count by type (movies, TV series, games, software, actors)
- Ingestion status breakdown (pending, processing, success, failed, skipped)
- Success rate percentage
- Average processing time
- Recent activity timeline

**Ingestion Log Monitor:**
- Real-time table view of ingestion_log entries
- Filters: status, content_type, date range
- Pagination (50 items per page)
- Auto-refresh every 10 seconds
- Color-coded status badges (green=success, red=failed, yellow=pending, gray=skipped)

**Failed Items Management:**
- View failed items with error messages
- Retry individual items
- Bulk re-queue all failed items
- Filter by error type (slug_exhausted, api_timeout, validation_failed)

**Manual Queue Interface:**
- Input form for external_source, external_id, content_type
- Bulk queue via CSV upload
- Queue validation (check if already exists)
- Immediate feedback on queue success

### Dashboard Implementation

```typescript
// Admin Dashboard Component (React + TypeScript)
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface IngestionStats {
  status: string;
  count: number;
  content_type: string;
}

interface IngestionLogEntry {
  id: string;
  external_source: string;
  external_id: string;
  content_type: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<IngestionStats[]>([]);
  const [logs, setLogs] = useState<IngestionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/admin/ingestion/stats`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );
    
    const data = await response.json();
    setStats(data);
  }

  async function fetchLogs() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/admin/ingestion/log?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );
    
    const data = await response.json();
    setLogs(data);
    setLoading(false);
  }

  async function requeueFailed() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/admin/ingestion/requeue-failed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    alert(`Re-queued ${result.requeued} failed items`);
    fetchStats();
    fetchLogs();
  }

  return (
    <div className="admin-dashboard">
      <h1>Ingestion Dashboard</h1>
      
      {/* Statistics Cards */}
      <div className="stats-grid">
        {stats.map(stat => (
          <div key={`${stat.content_type}-${stat.status}`} className="stat-card">
            <h3>{stat.content_type}</h3>
            <p className={`status-${stat.status}`}>{stat.status}: {stat.count}</p>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="actions">
        <button onClick={requeueFailed}>Re-queue All Failed</button>
      </div>
      
      {/* Ingestion Log Table */}
      <table className="ingestion-log">
        <thead>
          <tr>
            <th>Source</th>
            <th>External ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>Retries</th>
            <th>Error</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.external_source}</td>
              <td>{log.external_id}</td>
              <td>{log.content_type}</td>
              <td>
                <span className={`badge badge-${log.status}`}>
                  {log.status}
                </span>
              </td>
              <td>{log.retry_count}</td>
              <td className="error-cell" title={log.last_error || ''}>
                {log.last_error ? log.last_error.substring(0, 50) + '...' : '-'}
              </td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Key Features:**
- Uses Supabase for authentication (NOT for content data)
- Fetches content data from CockroachDB via Express API
- Auto-refreshes every 10 seconds
- Color-coded status badges
- Bulk re-queue functionality



## Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `pg` | ^8.12.0 | CockroachDB driver (PostgreSQL-compatible) |
| `transliteration` | ^2.3.5 | Arabic → Latin character conversion |
| `axios` | ^1.7.2 | HTTP client for TMDB/RAWG API calls |
| `dotenv` | ^16.4.5 | Environment variable loading |
| `p-limit` | ^5.0.0 | Concurrency control for parallel fetches |
| `p-retry` | ^6.2.0 | Retry logic with exponential backoff |
| `zod` | ^3.23.8 | Runtime schema validation |
| `express` | ^4.18.2 | Backend server framework |
| `cors` | ^2.8.5 | CORS middleware for Express |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client (auth only) |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^1.6.0 | Unit and integration testing |
| `@vitest/ui` | ^1.6.0 | Test UI dashboard |
| `fast-check` | ^3.15.0 | Property-based testing |
| `eslint` | ^8.56.0 | Code linting |
| `prettier` | ^3.2.4 | Code formatting |
| `typescript` | ^5.3.3 | Type checking |
| `@types/node` | ^20.11.0 | Node.js type definitions |

### External Services

| Service | Purpose | Rate Limits |
|---------|---------|-------------|
| TMDB API | Movie and TV series data | 40 requests/second |
| RAWG API | Game data (future) | 20,000 requests/month |
| IGDB API | Game data alternative (future) | 4 requests/second |
| CockroachDB | Primary content database | No hard limit (connection pool: 20) |
| Supabase | Authentication and user data | 500 requests/second (free tier) |
| Koyeb | Backend server hosting | No rate limit (resource-based) |

### Environment Variables

```env
# CockroachDB (Primary Content Database)
COCKROACHDB_URL=postgresql://user:password@host:26257/defaultdb?sslmode=verify-full

# TMDB API
TMDB_API_KEY=your_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original
TMDB_RATE_LIMIT_PER_SECOND=40

# RAWG API (future)
RAWG_API_KEY=your_rawg_key_here

# Supabase (Authentication ONLY)
SUPABASE_URL=https://lhpuwupbhpcqkwqugkhh.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Ingestion Configuration
BATCH_SIZE=50
MAX_CONCURRENT_FETCHES=10
MAX_SLUG_RETRY_ATTEMPTS=10
MAX_INGESTION_RETRY_COUNT=3
RETRY_BACKOFF_BASE_MS=1000
ALLOW_ADULT_CONTENT=false

# Server Configuration (Koyeb)
PORT=8080
NODE_ENV=production
```

### Project Structure

```
cinema-online-complete-rebuild/
├── src/
│   ├── db/
│   │   ├── pool.js              # CockroachDB connection pool
│   │   └── queries.js           # Reusable parameterized queries
│   ├── slug/
│   │   └── SlugEngine.js        # Centralized slug generation
│   ├── adapters/
│   │   ├── BaseAdapter.js       # Abstract adapter interface
│   │   ├── TMDBAdapter.js       # TMDB-specific implementation
│   │   └── RAWGAdapter.js       # RAWG-specific (future)
│   ├── ingestion/
│   │   ├── CoreIngestor.js      # Source-agnostic write logic
│   │   ├── BatchProcessor.js    # Batch orchestration
│   │   └── StateManager.js      # ingestion_log state machine
│   ├── validation/
│   │   └── ContentValidator.js  # Pre-insert validation rules
│   └── __tests__/
│       ├── SlugEngine.test.js
│       ├── ContentValidator.test.js
│       ├── StateManager.test.js
│       └── integration/
│           └── ingestion.test.js
├── server/
│   ├── index.js                 # Express server entry point
│   ├── routes/
│   │   ├── content.js           # Public content API
│   │   └── admin.js             # Admin API (authenticated)
│   └── middleware/
│       └── auth.js              # Supabase JWT verification
├── scripts/
│   ├── schema.sql               # Complete DDL for CockroachDB
│   ├── migrate.js               # Schema migration runner
│   └── seed.js                  # Initial data seeding
├── .env
├── .env.example
├── package.json
├── vitest.config.js
└── README.md
```



## Implementation Phases

### Phase 1: Database Schema Reconstruction

**Deliverables:**
- Complete DDL script with all 7 tables (movies, tv_series, seasons, episodes, games, software, actors, ingestion_log)
- Modified slug columns: VARCHAR(255) instead of TEXT
- Added pg_trgm extension and trigram indexes
- Migration script to drop existing tables and recreate
- Verification queries to confirm schema correctness

**Acceptance Criteria:**
- All tables created successfully in CockroachDB
- All indexes created (B-tree, GIN inverted, trigram)
- UNIQUE constraints on slug and (external_source, external_id)
- CHECK constraints on vote_average, vote_count, popularity
- Foreign key relationships for seasons → tv_series, episodes → seasons

### Phase 2: Slug Engine (Node.js)

**Deliverables:**
- SlugEngine.js with complete implementation
- normalizeArabic() with 6-step Unicode normalization
- transliterate() integration with `transliteration` library
- slugify() with regex-based cleaning
- generate() with year appending and attempt counter
- Fallback strategy for empty slugs
- Unit tests with 100% coverage

**Acceptance Criteria:**
- All Arabic transformation examples pass
- Slug format validation passes (lowercase, alphanumeric + hyphens only)
- Attempt counter correctly appends -2, -3, etc.
- Fallback generates valid random slugs when needed
- No TMDB IDs or UUIDs in generated slugs

### Phase 3: Unified Ingestion Service

**Deliverables:**
- BaseAdapter.js abstract interface
- TMDBAdapter.js with dual-language fetching
- ContentValidator.js with all 7 validation rules
- CoreIngestor.js with optimistic concurrency retry
- StateManager.js with state machine transitions
- BatchProcessor.js with concurrency control
- Integration tests for end-to-end flow

**Acceptance Criteria:**
- TMDBAdapter fetches Arabic and English, merges correctly
- ContentValidator rejects invalid content with correct reasons
- CoreIngestor retries slug conflicts up to 10 times
- StateManager transitions follow state machine diagram
- BatchProcessor processes 50 items per batch with 10 concurrent fetches
- Failed items retry with exponential backoff

### Phase 4: Backend Server (Koyeb-Ready)

**Deliverables:**
- Express.js server with 0.0.0.0 binding
- Health check endpoint at /health
- Content API routes (slug-based, no IDs)
- Admin API routes (Supabase auth required)
- CORS configuration for cinma.online domains
- Error handling middleware
- Logging middleware

**Acceptance Criteria:**
- Server starts on PORT from env (default 8080)
- Health check returns 200 OK
- Content API returns movies/series by slug
- Admin API requires valid Supabase JWT
- CORS allows cinma.online, blocks others
- Deploys successfully to Koyeb

### Phase 5: Admin Dashboard Update

**Deliverables:**
- Statistics screen with real-time counts
- Ingestion log monitor with auto-refresh
- Failed items management interface
- Manual queue form
- Bulk re-queue functionality
- Responsive design for mobile/desktop

**Acceptance Criteria:**
- Dashboard authenticates via Supabase
- Statistics update every 10 seconds
- Ingestion log shows latest 50 entries
- Re-queue button successfully resets failed items
- Manual queue form validates input
- All data fetched from CockroachDB API (not Supabase)

## Known Trade-offs & Architectural Decisions

| Decision | What We Chose | What We Gave Up | Mitigation |
|---|---|---|---|
| **JSONB for genres/cast/crew** | Max read speed for content pages (no JOINs) | "All movies for actor X" requires full table scan | Add GIN index on cast_data; acceptable at current scale |
| **UUID primary keys** | No hotspotting in distributed CockroachDB nodes | Slightly larger index size vs INT8 | Negligible at this scale |
| **No slugs for seasons/episodes** | Simpler schema, numeric routing is clean | Cannot have "named" season URLs | Accepted. URL formula is `/season/1/episode/1` and is permanent |
| **Slug is immutable after creation** | Stable URLs, no 301 redirect hell | Content renames don't update the URL | Correct behavior — SEO requires stable URLs |
| **Single ingestion_log per (source, external_id, content_type)** | Prevents duplicate queue entries | Cannot queue the same item twice simultaneously | Use ON CONFLICT on upsert to update status back to pending if re-queue is needed |
| **skipped is not retried** | Prevents endless retry loops for invalid content | If TMDB adds a poster later, item stays skipped | Schedule a weekly "re-evaluate skipped" worker |
| **No junction tables** | Simpler schema, faster reads for the primary use case | Cross-referencing queries are expensive | Documented as known limitation; mitigated by GIN indexes |
| **VARCHAR(255) for slug** | Better index performance, enforces reasonable length | Theoretical limit on slug length | Slugs rarely exceed 100 chars; 255 is safe upper bound |
| **Supabase for auth only** | Clear separation of concerns, CockroachDB optimized for content | Two databases to manage | Supabase handles auth complexity; CockroachDB handles scale |

---

## Summary

This design document specifies a complete clean slate rebuild of Cinema.online's data ingestion pipeline and database architecture. The system uses:

- **CockroachDB** as the primary database for all content (movies, TV series, games, software, actors)
- **Supabase** exclusively for authentication and user data
- **Adapter pattern** for source-agnostic ingestion (TMDB, RAWG, IGDB)
- **Centralized SlugEngine** with Arabic-aware normalization and transliteration
- **State machine-based ingestion log** with automatic retry and exponential backoff
- **Slug-based routing** with no TMDB IDs or UUIDs in public URLs
- **Koyeb-ready Express.js backend** with health checks and CORS
- **Admin dashboard** with real-time monitoring and manual queue management

All 318,000 existing records will be dropped and rebuilt from scratch using this new architecture.

