# 🚀 Ingestion Service - Quick Start Guide

This directory contains the unified ingestion service for Cinema.online.

---

## 📁 File Structure

```
src/ingestion/
├── StateManager.js      # State machine for ingestion_log
├── CoreIngestor.js      # Source-agnostic write logic
└── BatchProcessor.js    # Batch orchestration

src/adapters/
├── BaseAdapter.js       # Abstract adapter interface
└── TMDBAdapter.js       # TMDB-specific implementation

src/validation/
└── ContentValidator.js  # Pre-insert validation rules

src/db/
└── pool.js             # CockroachDB connection pool

src/slug/
└── SlugEngine.js       # Slug generation engine
```

---

## 🎯 Quick Start

### 1. Setup Environment Variables

Create `.env.local` with:

```env
# CockroachDB Connection
COCKROACHDB_URL=postgresql://user:password@host:26257/defaultdb

# TMDB API Key
TMDB_API_KEY=your_tmdb_api_key_here
```

### 2. Basic Usage Example

```javascript
import TMDBAdapter from './adapters/TMDBAdapter.js';
import BatchProcessor from './ingestion/BatchProcessor.js';

// Create adapter
const adapter = new TMDBAdapter({
  apiKey: process.env.TMDB_API_KEY
});

// Create processor
const processor = new BatchProcessor(adapter, {
  allowAdultContent: false
});

// Queue items for ingestion
await processor.queueItems([
  { externalSource: 'TMDB', externalId: '550', contentType: 'movie' },
  { externalSource: 'TMDB', externalId: '1396', contentType: 'tv_series' }
]);

// Process all queued items
const stats = await processor.processAll();
console.log('Ingestion complete:', stats);
```

### 3. Process Single Batch

```javascript
// Process one batch (50 items)
const result = await processor.processBatch();
console.log(`Processed: ${result.processed}, Succeeded: ${result.succeeded}`);
```

### 4. Get Statistics

```javascript
const stats = await processor.getStats();
console.log('Pending:', stats.pending);
console.log('Success:', stats.success);
console.log('Failed:', stats.failed);
console.log('Skipped:', stats.skipped);
```

### 5. Re-queue Failed Items

```javascript
const count = await processor.requeueFailed();
console.log(`Re-queued ${count} failed items`);
```

---

## 🔧 Configuration

### BatchProcessor Options

```javascript
const processor = new BatchProcessor(adapter, {
  allowAdultContent: false  // Reject adult content (default: false)
});
```

### TMDBAdapter Options

```javascript
const adapter = new TMDBAdapter({
  apiKey: 'your_api_key',
  requestsPerSecond: 40  // Rate limit (default: 40)
});
```

---

## 📊 Ingestion Flow

```
1. Queue Items
   ↓
2. StateManager.claimPendingItems() [FOR UPDATE SKIP LOCKED]
   ↓
3. TMDBAdapter.fetchOne() [Dual-language: ar-SA, en-US]
   ↓
4. ContentValidator.validate() [7 validation rules]
   ↓
5. CoreIngestor.upsertContent() [Slug retry loop]
   ↓
6. StateManager.setSuccess/Failed/Skipped()
```

---

## 🎨 Architecture Principles

### 1. Source-Agnostic Design
- CoreIngestor receives `NormalizedContent` objects only
- No TMDB-specific code in CoreIngestor
- Easy to add new adapters (RAWG, IGDB, etc.)

### 2. Slug Retry Loop
- Up to 10 attempts to generate unique slug
- Retry loop is INSIDE CoreIngestor (not SlugEngine)
- Uses database UNIQUE constraint errors for detection

### 3. Individual Failure Handling
- One failed item doesn't abort the entire batch
- Each item has its own ingestion_log entry
- Failed items are retried with exponential backoff

### 4. Concurrency Control
- Max 10 concurrent fetches (respects TMDB rate limit)
- 200ms wait between batches
- FOR UPDATE SKIP LOCKED prevents race conditions

---

## 🧪 Testing

### Run Unit Tests

```bash
npm test src/slug/__tests__/SlugEngine.test.js
```

### Test Imports

```bash
node scripts/test-phase3-imports.js
```

---

## 🚨 Critical Rules

### Database Architecture
```
Supabase = Authentication & User Data ONLY
CockroachDB = Primary Database for ALL Content
```

### Slug Immutability
- slug is set ONCE on INSERT
- slug is NEVER updated in ON CONFLICT DO UPDATE
- Changing slug would break all existing URLs

### Content Filtering
- Cast: Top 20 members
- Crew: 4 key roles (Director, Writer, Producer, Composer)
- Videos: YouTube only, max 10
- Keywords: Max 20
- Seasons: season_number >= 0

---

## 📝 Validation Rules

1. **Missing Poster**: Content must have a poster image
2. **Missing Overview**: Content must have a description
3. **Future Release**: Release date must be in the past
4. **Unreleased Movie**: Movie status must be "Released"
5. **Invalid Vote Average**: Must be between 0 and 10
6. **Missing Title**: Content must have a title
7. **Adult Content**: Rejected if `allowAdultContent: false`

---

## 🔄 State Machine

```
pending → processing → success
                    ↓
                  failed (retry_count < 3) → pending
                    ↓
                  failed (retry_count >= 3) → permanent failure

pending → processing → skipped (validation failed, no retry)
```

---

## 📚 API Reference

### StateManager

```javascript
// Claim pending items (worker query)
const items = await StateManager.claimPendingItems(client, limit);

// Update status
await StateManager.setProcessing(logId, client);
await StateManager.setSuccess(logId, resultId, resultSlug, client);
await StateManager.setFailed(logId, errorMessage, client);
await StateManager.setSkipped(logId, reason, client);

// Create new entry
const logId = await StateManager.createEntry(source, id, type, client);

// Get statistics
const stats = await StateManager.getStats(client);
```

### CoreIngestor

```javascript
// Write batch
const result = await CoreIngestor.writeBatch(items, logIds);
// Returns: { successCount, failedCount, skippedCount, errors }

// Upsert single item
const result = await CoreIngestor.upsertContent(content, logId);
// Returns: { success, skipped, error, resultId, resultSlug }
```

### BatchProcessor

```javascript
// Process single batch
const stats = await processor.processBatch();
// Returns: { processed, succeeded, failed, skipped }

// Process all batches
const stats = await processor.processAll(maxBatches);
// Returns: { totalProcessed, totalSucceeded, totalFailed, totalSkipped, batchesProcessed }

// Queue items
const count = await processor.queueItems(items);

// Re-queue failed
const count = await processor.requeueFailed();

// Get statistics
const stats = await processor.getStats();
```

---

## 🐛 Troubleshooting

### "COCKROACHDB_URL environment variable is not set"
- Create `.env.local` with your CockroachDB connection string
- Make sure to load dotenv before importing pool.js

### "TMDB API error: 401"
- Check that TMDB_API_KEY is set correctly
- Verify your API key is valid at https://www.themoviedb.org/settings/api

### "Slug conflict after 10 attempts"
- This is rare but can happen with very similar titles
- Check the ingestion_log table for the error details
- Consider manually adjusting the title or year

### "Rate limit exceeded"
- Reduce `requestsPerSecond` in TMDBAdapter config
- Increase `WAIT_BETWEEN_BATCHES_MS` in BatchProcessor

---

## 📞 Support

For issues or questions:
1. Check `.kiro/specs/cinema-online-complete-rebuild/PHASE_3_COMPLETE.md`
2. Review `FINAL_ARCHITECTURE_BLUEPRINT.md`
3. Check `.kiro/DATABASE_ARCHITECTURE.md`

---

**Last Updated**: 2026-04-02
