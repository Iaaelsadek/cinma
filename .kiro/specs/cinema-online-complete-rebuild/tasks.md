# Cinema.online Complete Rebuild - Implementation Tasks

## Phase 1: Database Reconstruction ✅ READY TO EXECUTE

### 1.1 Drop Existing Tables
- [ ] Connect to CockroachDB
- [ ] Drop all existing content tables in dependency order (episodes, seasons, ingestion_log, software, games, actors, tv_series, movies)
- [ ] Verify all tables dropped successfully

### 1.2 Create New Schema with Modifications
- [ ] Enable pg_trgm extension
- [ ] Create movies table with VARCHAR(255) slug and trigram indexes
- [ ] Create tv_series table with VARCHAR(255) slug and trigram indexes
- [ ] Create seasons table (no slug, hierarchical routing)
- [ ] Create episodes table (no slug, hierarchical routing)
- [ ] Create games table with VARCHAR(255) slug and trigram indexes
- [ ] Create software table with VARCHAR(255) slug and trigram indexes
- [ ] Create actors table with VARCHAR(255) slug and trigram indexes
- [ ] Create ingestion_log table (state machine)

### 1.3 Verify Schema
- [ ] Verify all tables created successfully
- [ ] Verify all indexes created (B-tree, GIN inverted, trigram)
- [ ] Verify all constraints (UNIQUE, CHECK, FOREIGN KEY)
- [ ] Verify UUID primary keys on all tables
- [ ] Run schema verification queries

---

## Phase 2: Slug Engine Implementation

### 2.1 Create SlugEngine Class
- [ ] Implement normalizeArabic() method (6-step Unicode normalization)
- [ ] Implement slugify() method (lowercase, strip non-alphanumeric, collapse hyphens)
- [ ] Implement generate() method (full pipeline with year and attempt counter)
- [ ] Implement fallback strategy (original_title → random)
- [ ] Add unit tests for each method

### 2.2 Test Arabic Slug Generation
- [ ] Test with Arabic movie titles (مأوى, أبو شنب, النهاية)
- [ ] Test with mixed Arabic/English titles
- [ ] Test with special characters and edge cases
- [ ] Test year appending logic
- [ ] Test attempt counter for duplicates
- [ ] Verify no TMDB IDs or UUIDs in generated slugs

---

## Phase 3: Ingestion Service Implementation

### 3.1 Create BaseAdapter Interface
- [ ] Define fetchOne() abstract method
- [ ] Define searchByTitle() abstract method
- [ ] Define normalize() abstract method
- [ ] Document NormalizedContent interface

### 3.2 Implement TMDBAdapter
- [ ] Implement dual-language fetching (ar-SA, en-US)
- [ ] Implement localizeField() for Arabic preference
- [ ] Implement image URL normalization
- [ ] Implement cast/crew filtering (top 20 cast, 4 crew roles)
- [ ] Implement video filtering (YouTube only, max 10)
- [ ] Implement keywords limiting (max 20)
- [ ] Implement seasons normalization (season_number >= 0)
- [ ] Add error handling and retry logic

### 3.3 Implement ContentValidator
- [ ] Implement validation rules (poster, overview, release date, rating, title, adult)
- [ ] Return validation result with reason
- [ ] Add unit tests for each validation rule

### 3.4 Implement StateManager
- [ ] Implement setProcessing() method
- [ ] Implement setSuccess() method
- [ ] Implement setFailed() method with retry logic
- [ ] Implement setSkipped() method
- [ ] Implement calculateNextRetry() with exponential backoff
- [ ] Add unit tests for state transitions

### 3.5 Implement CoreIngestor
- [ ] Implement writeBatch() method with transaction handling
- [ ] Implement upsertContent() method with ON CONFLICT
- [ ] Implement slug retry loop (up to 10 attempts)
- [ ] Implement isSlugConflict() error detection
- [ ] Handle individual item failures without aborting batch
- [ ] Add integration tests

### 3.6 Implement BatchProcessor
- [ ] Implement processBatch() method with chunking
- [ ] Implement concurrency control (p-limit with MAX_CONCURRENT_FETCHES=10)
- [ ] Implement claimPendingItems() with FOR UPDATE SKIP LOCKED
- [ ] Implement wait between batches (200ms)
- [ ] Add integration tests for batch processing

---

## Phase 4: Backend API Implementation

### 4.1 Setup Express Server (Koyeb-Ready)
- [ ] Create server/index.js with Express setup
- [ ] Configure CORS for cinma.online domains
- [ ] Bind to 0.0.0.0:8080 (Koyeb requirement)
- [ ] Add health check endpoint (/health)
- [ ] Configure CockroachDB connection pool

### 4.2 Implement Content API Routes (Public, Slug-Based)
- [ ] GET /api/content/movie/:slug
- [ ] GET /api/content/tv/:slug
- [ ] GET /api/content/tv/:slug/seasons
- [ ] GET /api/content/tv/:slug/season/:number/episodes
- [ ] GET /api/content/movies (with pagination and filters)
- [ ] GET /api/content/tv-series (with pagination and filters)
- [ ] GET /api/content/games (with pagination and filters)
- [ ] GET /api/content/search (cross-content search)
- [ ] Add error handling and validation

### 4.3 Implement Admin API Routes (Authenticated)
- [ ] Add Supabase JWT verification middleware
- [ ] GET /api/admin/ingestion/stats
- [ ] GET /api/admin/ingestion/log (with filters and pagination)
- [ ] POST /api/admin/ingestion/queue
- [ ] POST /api/admin/ingestion/requeue-failed
- [ ] Add rate limiting and security measures

---

## Phase 5: Admin Dashboard Implementation

### 5.1 Create Dashboard UI Components
- [ ] Create AdminDashboard component (React + TypeScript)
- [ ] Create Statistics Cards component
- [ ] Create Ingestion Log Table component
- [ ] Create Failed Items Management component
- [ ] Create Manual Queue Interface component

### 5.2 Implement Dashboard Features
- [ ] Fetch and display ingestion statistics
- [ ] Real-time log monitoring (auto-refresh every 10 seconds)
- [ ] Color-coded status badges (success, failed, pending, skipped)
- [ ] Bulk re-queue failed items functionality
- [ ] Manual queue interface with CSV upload
- [ ] Add Supabase authentication integration

### 5.3 Deploy and Test
- [ ] Deploy backend to Koyeb
- [ ] Configure environment variables
- [ ] Test all API endpoints
- [ ] Test admin dashboard functionality
- [ ] Verify slug-based routing works correctly
- [ ] Performance testing with concurrent workers

---

## Architectural Constants Verification

After implementation, verify all 10 architectural constants:

- [ ] C-1: slug is UNIQUE NOT NULL on all core content tables
- [ ] C-2: Zero TMDB IDs or internal UUIDs in public URLs
- [ ] C-3: URL formula for TV: /tv/[slug]/season/[number]/episode/[number]
- [ ] C-4: UUID DEFAULT gen_random_uuid() for ALL primary keys
- [ ] C-5: JSONB for genres, cast, crew, networks, keywords
- [ ] C-6: No junction tables
- [ ] C-7: ON CONFLICT upsert is the ONLY way to write content
- [ ] C-8: Slug uniqueness is per content-type (per table)
- [ ] C-9: No TMDB API calls from the frontend
- [ ] C-10: If an item has no valid slug, it is NOT rendered in the UI

---

## Testing Checklist

- [ ] Unit tests for SlugEngine (Arabic normalization, transliteration, slugify)
- [ ] Unit tests for ContentValidator (all validation rules)
- [ ] Unit tests for StateManager (state transitions, retry backoff)
- [ ] Property-based tests for slug generation (idempotency, format validity, attempt counter)
- [ ] Integration tests for CoreIngestor (upsert, slug retry, batch write)
- [ ] Integration tests for BatchProcessor (concurrency, claiming, error handling)
- [ ] End-to-end tests for ingestion flow (TMDB → validation → slug → database)
- [ ] API endpoint tests (all routes, error cases, authentication)
- [ ] Performance tests (throughput, concurrent workers, rate limiting)

---

## Deployment Checklist

- [ ] Environment variables configured in Koyeb
- [ ] CockroachDB connection string verified
- [ ] TMDB API key configured
- [ ] Supabase authentication configured
- [ ] CORS origins configured
- [ ] Health check endpoint responding
- [ ] All indexes created and optimized
- [ ] Connection pool configured (max: 20)
- [ ] Rate limiting configured (TMDB: 40 req/sec)
- [ ] Monitoring and logging configured

---

**Status:** Phase 1 ready to execute
**Next Action:** Connect to CockroachDB and execute schema reconstruction
