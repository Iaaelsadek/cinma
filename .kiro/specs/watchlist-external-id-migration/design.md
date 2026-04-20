# Design Document: Watchlist External ID Migration

## Overview

This design document specifies the technical approach for migrating Supabase user data tables (watchlist, continue_watching, history, playlist_items, user_list_items) from using internal `content_id` (INTEGER) references to external `external_id` (TEXT) references that align with CockroachDB's content identification system.

### Problem Statement

Currently, user data tables in Supabase reference content using integer `content_id` values that were originally internal database IDs. However, CockroachDB (the primary content database) now uses:
- UUID primary keys for internal identification
- `external_id` (VARCHAR 100) + `external_source` (VARCHAR 50) for external content identification (TMDB IDs)

This mismatch makes it impossible to reliably join user data with content data, breaking features like watchlist display, continue watching, and viewing history.

### Solution Approach

Migrate all user data tables to use `external_id` (TEXT) + `external_source` (TEXT, default 'tmdb') instead of `content_id` (INTEGER). This creates a stable bridge between Supabase user data and CockroachDB content data using TMDB IDs as the common identifier.

### Architectural Principles

**Database Separation:**
- **Supabase**: Authentication & User Data ONLY (watchlist, continue_watching, history, profiles, follows, etc.)
- **CockroachDB**: ALL Content Data (movies, tv_series, seasons, episodes, games, software, actors)
- **Bridge**: external_id (TMDB ID) serves as the foreign key equivalent across databases

**No Cross-Database Foreign Keys:**
- Cannot enforce referential integrity across Supabase and CockroachDB
- Application layer responsible for maintaining data consistency
- Graceful degradation when content is missing (show placeholders)

### Migration Strategy

**Three-Phase Approach:**

1. **Phase 1: Schema Addition** - Add new columns without removing old ones
2. **Phase 2: Dual-Write Transition** - Write to both old and new columns, read from new with fallback
3. **Phase 3: Schema Cleanup** - Remove old columns and constraints

This approach ensures zero-downtime migration with rollback capability at each phase.

## Architecture

### System Components


```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  (React Components: Profile, MovieDetails, SeriesDetails, etc.) │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Uses external_id (TMDB ID)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Supabase Client Layer                        │
│              (src/lib/supabase.ts functions)                    │
│                                                                  │
│  • addToWatchlist(userId, external_id, content_type)           │
│  • getWatchlist(userId) → [{external_id, content_type, ...}]   │
│  • upsertProgress(userId, external_id, ...)                    │
│  • addHistory(userId, external_id, ...)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Stores external_id
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Supabase Database                          │
│                    (User Data Tables)                           │
│                                                                  │
│  • watchlist (user_id, external_id, external_source, ...)      │
│  • continue_watching (user_id, external_id, ...)               │
│  • history (user_id, external_id, ...)                         │
│  • playlist_items (playlist_id, external_id, ...)              │
│  • user_list_items (list_id, external_id, ...)                 │
└─────────────────────────────────────────────────────────────────┘

                         ║
                         ║ Bridge via external_id (TMDB ID)
                         ║
┌────────────────────────▼────────────────────────────────────────┐
│                   Backend API Layer                             │
│              (Express.js server routes)                         │
│                                                                  │
│  • POST /api/content/batch                                      │
│    Input: [{external_id, content_type}, ...]                   │
│    Output: [ContentDetails, ...]                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Queries by external_id
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   CockroachDB Database                          │
│                   (Content Tables)                              │
│                                                                  │
│  • movies (id UUID, external_source, external_id, ...)         │
│  • tv_series (id UUID, external_source, external_id, ...)      │
│  • games (id UUID, external_source, external_id, ...)          │
│  • software (id UUID, external_source, external_id, ...)       │
│  • actors (id UUID, external_source, external_id, ...)         │
│                                                                  │
│  Constraint: UNIQUE (external_source, external_id)             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Adding to Watchlist:**
```
1. User clicks "Add to Watchlist" on Movie Details page
2. Frontend extracts TMDB ID from movie data (e.g., "550")
3. Frontend calls: addToWatchlist(userId, "550", "movie")
4. Supabase inserts: {user_id, external_id: "550", external_source: "tmdb", content_type: "movie"}
5. Success response returned to frontend
```

**Displaying Watchlist:**
```
1. User navigates to Profile page
2. Frontend calls: getWatchlist(userId)
3. Supabase returns: [{external_id: "550", content_type: "movie", created_at: "..."}, ...]
4. Frontend calls: POST /api/content/batch with [{external_id: "550", content_type: "movie"}, ...]
5. Backend queries CockroachDB: SELECT * FROM movies WHERE external_source='tmdb' AND external_id='550'
6. Backend returns full content details: [{id, title, poster_path, slug, ...}, ...]
7. Frontend renders watchlist cards with full content information
```

**Handling Missing Content:**
```
1. If CockroachDB query returns null for an external_id
2. Backend includes null in response array at that position
3. Frontend detects null and displays placeholder card:
   - Title: "Content Unavailable"
   - Poster: Default placeholder image
   - Action: "Remove from Watchlist" button still functional
```

## Components and Interfaces

### Supabase Schema Changes

#### Watchlist Table (New Schema)

```sql
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_watchlist_user_content UNIQUE (user_id, external_id, content_type)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id, created_at DESC);
CREATE INDEX idx_watchlist_external ON watchlist(external_id, content_type);
```

**Changes from Old Schema:**
- `content_id INTEGER` → `external_id TEXT`
- Added `external_source TEXT DEFAULT 'tmdb'`
- Updated unique constraint to use external_id

#### Continue Watching Table (New Schema)

```sql
CREATE TABLE continue_watching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  season_number INTEGER,
  episode_number INTEGER,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_continue_watching_user_content UNIQUE (user_id, external_id, content_type)
);

CREATE INDEX idx_continue_watching_user ON continue_watching(user_id, updated_at DESC);
CREATE INDEX idx_continue_watching_external ON continue_watching(external_id, content_type);
```

#### History Table (New Schema)

```sql
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  season_number INTEGER,
  episode_number INTEGER,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: NO unique constraint - allows duplicate entries with different timestamps
CREATE INDEX idx_history_user ON history(user_id, watched_at DESC);
CREATE INDEX idx_history_external ON history(external_id, content_type);
```

#### Playlist Items Table (New Schema)

```sql
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_playlist_items UNIQUE (playlist_id, external_id, content_type)
);

CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id, added_at);
```

#### User List Items Table (New Schema)

```sql
CREATE TABLE user_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_user_list_items UNIQUE (list_id, external_id, content_type)
);

CREATE INDEX idx_user_list_items_list ON user_list_items(list_id, added_at);
```

### TypeScript Interfaces

#### Updated Function Signatures (src/lib/supabase.ts)

```typescript
// Watchlist Functions
export async function isInWatchlist(
  userId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<boolean>

export async function addToWatchlist(
  userId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<void>

export async function removeFromWatchlist(
  userId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<void>

export async function getWatchlist(userId: string): Promise<Array<{
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv'
  created_at: string
}>>

// Continue Watching Functions
export async function getProgress(
  userId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<{
  id: string
  progress_seconds: number
  duration_seconds: number
  season_number: number | null
  episode_number: number | null
} | null>

export async function upsertProgress(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  progressSeconds: number
  durationSeconds?: number
}): Promise<void>

export async function getContinueWatching(userId: string): Promise<Array<{
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv'
  season_number: number | null
  episode_number: number | null
  progress_seconds: number
  duration_seconds: number
  updated_at: string
}>>

// History Functions
export async function addHistory(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv'
  season?: number | null
  episode?: number | null
  watchedAt?: string
}): Promise<void>

export async function getHistory(userId: string): Promise<Array<{
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv'
  season_number: number | null
  episode_number: number | null
  watched_at: string
}>>

// Playlist Functions
export async function addPlaylistItem(
  playlistId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<void>

// User List Functions
export async function addItemToList(
  listId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<void>

export async function removeItemFromList(
  listId: string, 
  externalId: string, 
  contentType: 'movie' | 'tv'
): Promise<void>

// User Preferences (for recommendations)
export type UserPreferenceData = {
  history: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
  watchlist: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
}

export async function getUserPreferences(userId: string): Promise<UserPreferenceData>
```

### Backend API Endpoint

#### POST /api/content/batch

**Purpose:** Fetch multiple content items by external_ids in a single request

**Request Body:**
```typescript
{
  items: Array<{
    external_id: string      // e.g., "550"
    content_type: 'movie' | 'tv' | 'game' | 'software'
    external_source?: string // default: 'tmdb'
  }>
}
```

**Response:**
```typescript
{
  results: Array<ContentDetails | null>
}

type ContentDetails = {
  id: string              // UUID from CockroachDB
  external_id: string
  external_source: string
  slug: string
  title: string           // or 'name' for TV series
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  vote_average: number
  release_date: string | null  // or 'first_air_date' for TV
  content_type: 'movie' | 'tv' | 'game' | 'software'
  // ... other fields as needed
}
```

**Implementation (server/routes/content.js):**
```javascript
router.post('/content/batch', async (req, res) => {
  try {
    const { items } = req.body
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' })
    }
    
    if (items.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 items per request' })
    }
    
    const results = []
    
    for (const item of items) {
      const { external_id, content_type, external_source = 'tmdb' } = item
      
      let table
      if (content_type === 'movie') table = 'movies'
      else if (content_type === 'tv') table = 'tv_series'
      else if (content_type === 'game') table = 'games'
      else if (content_type === 'software') table = 'software'
      else {
        results.push(null)
        continue
      }
      
      const result = await query(
        `SELECT * FROM ${table} 
         WHERE external_source = $1 AND external_id = $2 
         LIMIT 1`,
        [external_source, external_id]
      )
      
      if (result.rows.length > 0) {
        results.push({
          ...result.rows[0],
          content_type
        })
      } else {
        results.push(null)
      }
    }
    
    res.json({ results })
  } catch (error) {
    console.error('Batch content lookup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

**Performance Considerations:**
- Sequential queries acceptable for initial implementation (100 items = ~100ms)
- Future optimization: Use UNION ALL for parallel queries
- Consider caching frequently accessed content

## Data Models

### Content ID Mapping

**Old System (Invalid):**
```
Supabase watchlist.content_id (INTEGER) → ??? → CockroachDB movies.id (UUID)
                                          ↑
                                    No valid mapping
```

**New System (Valid):**
```
Supabase watchlist.external_id (TEXT "550") 
    ↓
    Bridge via TMDB ID
    ↓
CockroachDB movies WHERE external_source='tmdb' AND external_id='550'
```

### Migration Data Mapping

**Mapping Logic:**

For each row in old schema:
1. Extract `content_id` (INTEGER) and `content_type` ('movie' | 'tv')
2. Query CockroachDB to find matching content:
   ```sql
   -- For movies
   SELECT external_id, external_source 
   FROM movies 
   WHERE id = content_id  -- This won't work! IDs are now UUIDs
   
   -- PROBLEM: Old content_id was INTEGER, new id is UUID
   -- SOLUTION: Use legacy mapping table or TMDB API lookup
   ```

**Migration Challenge:**

The old `content_id` values were TMDB IDs stored as integers. CockroachDB now stores these as `external_id` (TEXT). The migration needs to:

1. Treat old `content_id` as TMDB ID
2. Convert to string: `content_id.toString()`
3. Set `external_id = content_id.toString()`
4. Set `external_source = 'tmdb'`

**Migration Mapping Function:**
```typescript
function mapOldToNew(oldRow: {
  content_id: number
  content_type: 'movie' | 'tv'
}): {
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv'
} {
  return {
    external_id: oldRow.content_id.toString(),
    external_source: 'tmdb',
    content_type: oldRow.content_type
  }
}
```

**Verification:**

After mapping, verify the content exists in CockroachDB:
```sql
SELECT COUNT(*) 
FROM movies 
WHERE external_source = 'tmdb' AND external_id = '550'
```

If count = 0, the content doesn't exist (deleted or never ingested). Log this for manual review.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: External ID Storage for User Data Operations

*For any* user data operation (watchlist add, progress save, history record), when content is added with a valid external_id, the system should store that exact external_id in the database without modification.

**Validates: Requirements 1.3, 2.3, 3.3**

### Property 2: Migration Data Preservation

*For any* set of existing user data entries (watchlist, continue_watching, history, playlist_items, user_list_items), the migration script should preserve all entries and correctly map content_id to external_id such that no data is lost and all mappings are valid.

**Validates: Requirements 1.4, 2.4, 3.4, 14.4, 15.5**

### Property 3: History Duplicate Entries Allowed

*For any* user and content combination (external_id, content_type), the system should allow multiple history entries with different timestamps, enabling users to watch the same content multiple times.

**Validates: Requirements 3.5**

### Property 4: Migration Content ID Mapping

*For any* content_id in the old schema, the migration script should query CockroachDB to retrieve the corresponding external_id, and if the content_id cannot be mapped (content doesn't exist), the script should log the unmapped entry and skip it without failing.

**Validates: Requirements 4.2, 4.3**

### Property 5: Migration Data Integrity Verification

*For any* completed migration, the verification process should confirm that row counts match between old and new schemas (accounting for skipped unmappable entries), all external_ids are non-null and non-empty, and all required indexes exist.

**Validates: Requirements 4.5**

### Property 6: Watchlist Function Signatures Accept External ID

*For any* valid external_id string and content_type, all watchlist functions (add, remove, check) should accept the external_id parameter and perform the correct database operation using that external_id.

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 7: User Data Functions Return External ID

*For any* user data retrieval function (getWatchlist, getContinueWatching, getHistory, getUserPreferences), all returned objects should contain external_id instead of content_id, maintaining the same structure otherwise.

**Validates: Requirements 5.4, 6.3, 7.2, 13.1, 13.2, 13.4**

### Property 8: Progress Functions Accept External ID

*For any* valid external_id and progress data, the progress functions (upsertProgress, getProgress) should accept external_id as a parameter and correctly store/retrieve progress using that external_id.

**Validates: Requirements 6.1, 6.2, 6.4, 6.5**

### Property 9: History Chronological Ordering

*For any* user's history entries, when retrieved via getHistory, the entries should be ordered by watched_at timestamp in descending order (most recent first).

**Validates: Requirements 7.5**

### Property 10: Batch API Content Retrieval

*For any* array of {external_id, content_type} objects sent to the batch API endpoint, the endpoint should query CockroachDB for each item and return an array of content objects (or null for missing content) in the same order as the input array.

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 11: Frontend Components Use TMDB ID

*For any* frontend component that interacts with watchlist/progress/history (MovieDetails, SeriesDetails, VideoCard, MovieCard, Profile), the component should use TMDB ID (external_id) for all operations instead of internal database IDs.

**Validates: Requirements 9.2, 9.3, 9.4, 9.5**

### Property 12: Graceful Content Degradation

*For any* content that is deleted from CockroachDB or cannot be found, the system should display the user data entry (watchlist/history item) with placeholder content (title: "Content Unavailable", default poster) while still allowing removal operations.

**Validates: Requirements 11.1, 11.4**

### Property 13: External ID Validation

*For any* operation that accepts external_id as input, if the external_id is null, empty string, or whitespace-only, the system should reject the operation with a descriptive error message without attempting database operations.

**Validates: Requirements 11.2, 11.5**

### Property 14: Migration Deduplication

*For any* set of duplicate entries in the old schema (same user_id, content_id, content_type), the migration script should deduplicate by keeping only the entry with the most recent timestamp (created_at or updated_at).

**Validates: Requirements 11.3**

### Property 15: Dual-Write During Transition

*For any* user data operation during the transition period, the system should write to both content_id and external_id columns, ensuring backward compatibility while the migration is in progress.

**Validates: Requirements 12.2**

### Property 16: Read Preference with Fallback

*For any* user data read operation during transition, the system should prefer reading from external_id if present and non-null, otherwise fall back to content_id, and log a warning when fallback occurs.

**Validates: Requirements 12.3, 12.5**

### Property 17: User Preferences Null Handling

*For any* user preferences data (history, watchlist) retrieved for recommendations, if any entry has null external_id, the system should exclude that entry from the returned preferences data.

**Validates: Requirements 13.5**

### Property 18: Playlist Functions Accept External ID

*For any* valid external_id and content_type, the playlist functions (addPlaylistItem) should accept external_id as a parameter and store it correctly in the playlist_items table.

**Validates: Requirements 14.1, 14.5**

### Property 19: User List Functions Accept External ID

*For any* valid external_id and content_type, the user list functions (addItemToList, removeItemFromList) should accept external_id as a parameter and perform correct database operations.

**Validates: Requirements 15.1, 15.2**

### Property 20: Rollback Data Restoration

*For any* migration that has been rolled back, the rollback script should restore all data from backup tables such that the database state matches the pre-migration state exactly.

**Validates: Requirements 16.1, 16.4**

### Property 21: Activity Feed External ID Storage

*For any* activity that references content (type 'watch' or 'review'), the activity metadata should include external_id, and when displayed, the system should fetch content details using that external_id.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

### Property 22: Activity Feed Missing Content Handling

*For any* activity that references content that no longer exists in CockroachDB, the activity feed should display the activity with placeholder content information instead of failing or hiding the activity.

**Validates: Requirements 17.5**

### Property 23: Verification Script External ID Validation

*For any* set of external_ids in the migrated tables, the verification script should validate that all external_ids match the expected format (non-empty string, typically numeric for TMDB IDs) and report any invalid values.

**Validates: Requirements 18.2, 18.3**

### Property 24: Verification Script Inconsistency Reporting

*For any* data inconsistencies found during verification (null external_ids, missing indexes, row count mismatches), the verification script should generate a comprehensive report listing all issues with specific row identifiers.

**Validates: Requirements 18.5**

### Property 25: Migration Error Logging

*For any* content_id that cannot be mapped during migration, the migration script should log the specific content_id, content_type, user_id, and table name to enable manual review and recovery.

**Validates: Requirements 20.3**

### Property 26: External ID Operation Error Logging

*For any* failed operation involving external_id (database error, validation error, not found error), the system should log the error with context including the external_id, operation type, user_id, and error message.

**Validates: Requirements 20.4**

### Property 27: Batch API Performance Tracking

*For any* batch content lookup request, the system should track and log performance metrics including request size, query time, and number of successful/failed lookups to enable performance monitoring.

**Validates: Requirements 20.5**

## Error Handling

### Input Validation Errors

**Invalid External ID:**
```typescript
if (!externalId || externalId.trim() === '') {
  throw new Error('external_id is required and cannot be empty')
}
```

**Invalid Content Type:**
```typescript
if (!['movie', 'tv'].includes(contentType)) {
  throw new Error(`Invalid content_type: ${contentType}. Must be 'movie' or 'tv'`)
}
```

**Batch Size Exceeded:**
```typescript
if (items.length > 100) {
  return res.status(400).json({ 
    error: 'Batch size limit exceeded',
    message: 'Maximum 100 items per request',
    received: items.length
  })
}
```

### Database Errors

**Duplicate Entry (Watchlist):**
```typescript
try {
  await supabase.from('watchlist').insert({ user_id, external_id, content_type })
} catch (error) {
  if (error.code === '23505') { // Unique constraint violation
    // Silently ignore - item already in watchlist
    return
  }
  throw error
}
```

**Content Not Found:**
```typescript
// Don't throw error - return null and let frontend handle gracefully
const result = await query(
  'SELECT * FROM movies WHERE external_source = $1 AND external_id = $2',
  ['tmdb', externalId]
)

if (result.rows.length === 0) {
  return null // Frontend will show placeholder
}

return result.rows[0]
```

**Migration Mapping Failure:**
```typescript
try {
  const result = await query(
    'SELECT external_id FROM movies WHERE id = $1',
    [oldContentId]
  )
  
  if (result.rows.length === 0) {
    logger.warn('Migration: Unmappable content_id', {
      content_id: oldContentId,
      content_type: contentType,
      user_id: userId,
      table: 'watchlist'
    })
    return null // Skip this entry
  }
  
  return result.rows[0].external_id
} catch (error) {
  logger.error('Migration: Database error during mapping', {
    content_id: oldContentId,
    error: error.message
  })
  throw error // Fail migration on database errors
}
```

### Network Errors

**Timeout Handling:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5000)

try {
  const response = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({ items }),
    signal: controller.signal
  })
  clearTimeout(timeout)
  return await response.json()
} catch (error) {
  clearTimeout(timeout)
  if (error.name === 'AbortError') {
    throw new Error('Request timeout: Content lookup took too long')
  }
  throw error
}
```

### Rollback Scenarios

**When to Rollback:**

1. **Migration Failure:** If migration script encounters unrecoverable error
2. **Data Integrity Issues:** If verification finds critical inconsistencies
3. **Production Issues:** If users report widespread problems after deployment
4. **Performance Degradation:** If new schema causes unacceptable slowdowns

**Rollback Process:**

```sql
-- Phase 1: Restore data from backups
INSERT INTO watchlist (id, user_id, content_id, content_type, created_at)
SELECT id, user_id, content_id, content_type, created_at
FROM watchlist_backup;

-- Phase 2: Drop new columns
ALTER TABLE watchlist DROP COLUMN external_id;
ALTER TABLE watchlist DROP COLUMN external_source;

-- Phase 3: Restore old indexes
CREATE INDEX idx_watchlist_user_content ON watchlist(user_id, content_id, content_type);

-- Phase 4: Verify rollback
SELECT COUNT(*) FROM watchlist;
SELECT COUNT(*) FROM watchlist_backup;
-- Counts should match
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:** Focus on specific examples, edge cases, and integration points
- Test specific TMDB IDs (e.g., "550" for Fight Club)
- Test migration with known dataset
- Test batch API with specific content combinations
- Test frontend component rendering with mock data

**Property-Based Tests:** Verify universal properties across all inputs
- Generate random external_ids and verify storage/retrieval
- Generate random user data sets and verify migration correctness
- Generate random batch requests and verify response structure
- Test with 100+ iterations per property to catch edge cases

### Property-Based Testing Configuration

**Library:** fast-check (JavaScript/TypeScript property-based testing)

**Configuration:**
```typescript
import fc from 'fast-check'

// Minimum 100 iterations per property test
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 20 }), // external_id
    fc.constantFrom('movie', 'tv'), // content_type
    (externalId, contentType) => {
      // Property test implementation
    }
  ),
  { numRuns: 100 }
)
```

**Test Tagging:**

Each property test must reference its design document property:

```typescript
describe('Watchlist External ID Migration', () => {
  it('Property 1: External ID Storage for User Data Operations', () => {
    // Feature: watchlist-external-id-migration, Property 1: For any user data operation, external_id should be stored exactly
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.constantFrom('movie', 'tv'),
        async (userId, externalId, contentType) => {
          await addToWatchlist(userId, externalId, contentType)
          const watchlist = await getWatchlist(userId)
          const added = watchlist.find(item => 
            item.external_id === externalId && 
            item.content_type === contentType
          )
          expect(added).toBeDefined()
          expect(added.external_id).toBe(externalId)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Test Examples

**Test: Add to Watchlist with External ID**
```typescript
test('should add movie to watchlist using external_id', async () => {
  const userId = 'test-user-123'
  const externalId = '550' // Fight Club TMDB ID
  const contentType = 'movie'
  
  await addToWatchlist(userId, externalId, contentType)
  
  const isInList = await isInWatchlist(userId, externalId, contentType)
  expect(isInList).toBe(true)
})
```

**Test: Batch API Returns Null for Missing Content**
```typescript
test('should return null for non-existent external_id', async () => {
  const response = await fetch('/api/content/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        { external_id: '999999999', content_type: 'movie' }
      ]
    })
  })
  
  const data = await response.json()
  expect(data.results).toHaveLength(1)
  expect(data.results[0]).toBeNull()
})
```

**Test: Migration Preserves All Data**
```typescript
test('should preserve all watchlist entries during migration', async () => {
  // Setup: Create old schema entries
  const oldEntries = [
    { user_id: 'user1', content_id: 550, content_type: 'movie' },
    { user_id: 'user1', content_id: 1399, content_type: 'tv' }
  ]
  
  await insertOldSchemaData('watchlist', oldEntries)
  
  // Run migration
  await runMigration()
  
  // Verify: All entries migrated
  const newEntries = await query('SELECT * FROM watchlist WHERE user_id = $1', ['user1'])
  expect(newEntries.rows).toHaveLength(2)
  expect(newEntries.rows[0].external_id).toBe('550')
  expect(newEntries.rows[1].external_id).toBe('1399')
})
```

### Integration Tests

**Test: Full Watchlist Flow**
```typescript
test('should display watchlist with full content details', async () => {
  const userId = 'test-user'
  
  // Add items to watchlist
  await addToWatchlist(userId, '550', 'movie')
  await addToWatchlist(userId, '1399', 'tv')
  
  // Get watchlist
  const watchlist = await getWatchlist(userId)
  expect(watchlist).toHaveLength(2)
  
  // Fetch full content details
  const response = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({ items: watchlist })
  })
  
  const { results } = await response.json()
  expect(results).toHaveLength(2)
  expect(results[0].title).toBe('Fight Club')
  expect(results[1].name).toBe('Game of Thrones')
})
```

### Migration Testing

**Test: Migration Script Phases**
```typescript
describe('Migration Script', () => {
  test('Phase 1: Should add new columns without dropping old ones', async () => {
    await runMigrationPhase1()
    
    const columns = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'watchlist'
    `)
    
    const columnNames = columns.rows.map(r => r.column_name)
    expect(columnNames).toContain('content_id') // Old column still exists
    expect(columnNames).toContain('external_id') // New column added
    expect(columnNames).toContain('external_source')
  })
  
  test('Phase 2: Should write to both old and new columns', async () => {
    await runMigrationPhase1()
    await enableDualWrite()
    
    await addToWatchlist('user1', '550', 'movie')
    
    const result = await query('SELECT * FROM watchlist WHERE user_id = $1', ['user1'])
    expect(result.rows[0].content_id).toBe(550) // Old column populated
    expect(result.rows[0].external_id).toBe('550') // New column populated
  })
  
  test('Phase 3: Should drop old columns after migration complete', async () => {
    await runMigrationPhase1()
    await runMigrationPhase2()
    await runMigrationPhase3()
    
    const columns = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'watchlist'
    `)
    
    const columnNames = columns.rows.map(r => r.column_name)
    expect(columnNames).not.toContain('content_id') // Old column dropped
    expect(columnNames).toContain('external_id') // New column remains
  })
})
```

### Performance Tests

**Test: Batch API Performance**
```typescript
test('should handle 100 items in under 1 second', async () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    external_id: String(i + 1),
    content_type: 'movie' as const
  }))
  
  const startTime = Date.now()
  
  const response = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({ items })
  })
  
  const endTime = Date.now()
  const duration = endTime - startTime
  
  expect(response.ok).toBe(true)
  expect(duration).toBeLessThan(1000)
})
```

### Edge Case Tests

**Test: Empty External ID Rejection**
```typescript
test('should reject empty external_id', async () => {
  await expect(
    addToWatchlist('user1', '', 'movie')
  ).rejects.toThrow('external_id is required and cannot be empty')
})

test('should reject whitespace-only external_id', async () => {
  await expect(
    addToWatchlist('user1', '   ', 'movie')
  ).rejects.toThrow('external_id is required and cannot be empty')
})
```

**Test: Batch Size Limit**
```typescript
test('should reject batch requests over 100 items', async () => {
  const items = Array.from({ length: 101 }, (_, i) => ({
    external_id: String(i),
    content_type: 'movie' as const
  }))
  
  const response = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({ items })
  })
  
  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toContain('Batch size limit exceeded')
})
```

**Test: History Allows Duplicates**
```typescript
test('should allow multiple history entries for same content', async () => {
  const userId = 'user1'
  const externalId = '550'
  const contentType = 'movie'
  
  // Add same content twice
  await addHistory({ userId, externalId, contentType })
  await new Promise(resolve => setTimeout(resolve, 100)) // Ensure different timestamps
  await addHistory({ userId, externalId, contentType })
  
  const history = await getHistory(userId)
  const matchingEntries = history.filter(h => 
    h.external_id === externalId && h.content_type === contentType
  )
  
  expect(matchingEntries).toHaveLength(2)
})
```


## Implementation Notes

### Migration Script Structure

The migration will be implemented as a Node.js script with three phases:

**File:** `scripts/migrate-to-external-id.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { query } from '../server/api/db.js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function phase1_addColumns() {
  console.log('Phase 1: Adding new columns...')
  
  const tables = ['watchlist', 'continue_watching', 'history', 'playlist_items', 'user_list_items']
  
  for (const table of tables) {
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS external_id TEXT,
        ADD COLUMN IF NOT EXISTS external_source TEXT DEFAULT 'tmdb';
      `
    })
  }
  
  console.log('Phase 1 complete')
}

async function phase2_migrateData() {
  console.log('Phase 2: Migrating data...')
  
  const tables = ['watchlist', 'continue_watching', 'history', 'playlist_items', 'user_list_items']
  
  for (const table of tables) {
    console.log(`Migrating ${table}...`)
    
    // Get all rows with null external_id
    const { data: rows } = await supabase
      .from(table)
      .select('*')
      .is('external_id', null)
    
    if (!rows || rows.length === 0) {
      console.log(`  No rows to migrate in ${table}`)
      continue
    }
    
    console.log(`  Found ${rows.length} rows to migrate`)
    
    let migrated = 0
    let skipped = 0
    
    for (const row of rows) {
      const externalId = row.content_id.toString()
      const externalSource = 'tmdb'
      
      // Verify content exists in CockroachDB
      const contentTable = row.content_type === 'movie' ? 'movies' : 'tv_series'
      const result = await query(
        `SELECT id FROM ${contentTable} 
         WHERE external_source = $1 AND external_id = $2`,
        [externalSource, externalId]
      )
      
      if (result.rows.length === 0) {
        console.warn(`  Skipping unmappable: ${table} id=${row.id}, content_id=${row.content_id}, content_type=${row.content_type}`)
        skipped++
        continue
      }
      
      // Update row with external_id
      await supabase
        .from(table)
        .update({ 
          external_id: externalId, 
          external_source: externalSource 
        })
        .eq('id', row.id)
      
      migrated++
    }
    
    console.log(`  Migrated: ${migrated}, Skipped: ${skipped}`)
  }
  
  console.log('Phase 2 complete')
}

async function phase3_updateSchema() {
  console.log('Phase 3: Updating schema constraints...')
  
  const tables = [
    { name: 'watchlist', unique: '(user_id, external_id, content_type)' },
    { name: 'continue_watching', unique: '(user_id, external_id, content_type)' },
    { name: 'playlist_items', unique: '(playlist_id, external_id, content_type)' },
    { name: 'user_list_items', unique: '(list_id, external_id, content_type)' }
  ]
  
  for (const table of tables) {
    // Make external_id NOT NULL
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table.name} ALTER COLUMN external_id SET NOT NULL;`
    })
    
    // Drop old unique constraint
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table.name} DROP CONSTRAINT IF EXISTS uq_${table.name}_user_content;`
    })
    
    // Add new unique constraint
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table.name} ADD CONSTRAINT uq_${table.name}_external UNIQUE ${table.unique};`
    })
    
    // Create indexes
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_${table.name}_external 
        ON ${table.name}(external_id, content_type);
      `
    })
  }
  
  console.log('Phase 3 complete')
}

async function phase4_dropOldColumns() {
  console.log('Phase 4: Dropping old columns...')
  
  const tables = ['watchlist', 'continue_watching', 'history', 'playlist_items', 'user_list_items']
  
  for (const table of tables) {
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table} DROP COLUMN IF EXISTS content_id;`
    })
  }
  
  console.log('Phase 4 complete')
}

async function verify() {
  console.log('Verifying migration...')
  
  const tables = ['watchlist', 'continue_watching', 'history', 'playlist_items', 'user_list_items']
  
  for (const table of tables) {
    // Check for null external_ids
    const { count: nullCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('external_id', null)
    
    if (nullCount && nullCount > 0) {
      console.error(`  ❌ ${table}: Found ${nullCount} rows with null external_id`)
    } else {
      console.log(`  ✅ ${table}: All rows have external_id`)
    }
    
    // Check total count
    const { count: totalCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    console.log(`  ${table}: ${totalCount} total rows`)
  }
  
  console.log('Verification complete')
}

async function main() {
  const args = process.argv.slice(2)
  const phase = args[0]
  
  try {
    if (phase === 'phase1' || phase === 'all') {
      await phase1_addColumns()
    }
    
    if (phase === 'phase2' || phase === 'all') {
      await phase2_migrateData()
    }
    
    if (phase === 'phase3' || phase === 'all') {
      await phase3_updateSchema()
    }
    
    if (phase === 'phase4' || phase === 'all') {
      await phase4_dropOldColumns()
    }
    
    if (phase === 'verify') {
      await verify()
    }
    
    if (!phase) {
      console.log('Usage: npm run migrate:external-id [phase1|phase2|phase3|phase4|all|verify]')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

main()
```

### Rollback Script

**File:** `scripts/rollback-external-id.ts`

```typescript
async function rollback() {
  console.log('Rolling back migration...')
  
  // Phase 1: Restore content_id column
  const tables = ['watchlist', 'continue_watching', 'history', 'playlist_items', 'user_list_items']
  
  for (const table of tables) {
    console.log(`Rolling back ${table}...`)
    
    // Add content_id column back
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS content_id INTEGER;`
    })
    
    // Populate content_id from external_id
    await supabase.rpc('exec_sql', {
      sql: `UPDATE ${table} SET content_id = external_id::INTEGER WHERE external_id IS NOT NULL;`
    })
    
    // Drop external_id columns
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ${table} 
        DROP COLUMN IF EXISTS external_id,
        DROP COLUMN IF EXISTS external_source;
      `
    })
    
    // Restore old constraints
    if (table === 'watchlist' || table === 'continue_watching') {
      await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE ${table} 
          ADD CONSTRAINT uq_${table}_user_content 
          UNIQUE (user_id, content_id, content_type);
        `
      })
    }
  }
  
  console.log('Rollback complete')
}
```

### Frontend Component Updates

**Example: MovieDetails.tsx**

```typescript
// OLD CODE
const checkWatchlistStatus = async () => {
  const inList = await isInWatchlist(user.id, movie.id, 'movie')
  setIsInWatchlist(inList)
}

// NEW CODE
const checkWatchlistStatus = async () => {
  const tmdbId = movie.external_id || movie.id.toString()
  const inList = await isInWatchlist(user.id, tmdbId, 'movie')
  setIsInWatchlist(inList)
}

const handleWatchlistToggle = async () => {
  const tmdbId = movie.external_id || movie.id.toString()
  
  if (isInWatchlist) {
    await removeFromWatchlist(user.id, tmdbId, 'movie')
  } else {
    await addToWatchlist(user.id, tmdbId, 'movie')
  }
  
  setIsInWatchlist(!isInWatchlist)
}
```

**Example: Profile.tsx Watchlist Display**

```typescript
const [watchlist, setWatchlist] = useState<any[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function loadWatchlist() {
    if (!user) return
    
    try {
      // Get watchlist entries from Supabase
      const entries = await getWatchlist(user.id)
      
      // Fetch full content details from CockroachDB
      const response = await fetch('/api/content/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: entries })
      })
      
      const { results } = await response.json()
      
      // Combine entries with content details
      const enrichedWatchlist = entries.map((entry, index) => ({
        ...entry,
        content: results[index] // May be null if content not found
      }))
      
      setWatchlist(enrichedWatchlist)
    } catch (error) {
      console.error('Failed to load watchlist:', error)
    } finally {
      setLoading(false)
    }
  }
  
  loadWatchlist()
}, [user])

return (
  <div className="watchlist-grid">
    {watchlist.map(item => (
      <WatchlistCard
        key={`${item.external_id}-${item.content_type}`}
        externalId={item.external_id}
        contentType={item.content_type}
        content={item.content}
        onRemove={() => handleRemove(item.external_id, item.content_type)}
      />
    ))}
  </div>
)
```

**Example: WatchlistCard Component**

```typescript
interface WatchlistCardProps {
  externalId: string
  contentType: 'movie' | 'tv'
  content: ContentDetails | null
  onRemove: () => void
}

function WatchlistCard({ externalId, contentType, content, onRemove }: WatchlistCardProps) {
  if (!content) {
    // Content not found in CockroachDB - show placeholder
    return (
      <div className="watchlist-card unavailable">
        <div className="poster-placeholder">
          <span>Content Unavailable</span>
        </div>
        <div className="card-info">
          <p className="title">Content Unavailable</p>
          <p className="subtitle">ID: {externalId}</p>
          <button onClick={onRemove} className="btn-remove">
            Remove from Watchlist
          </button>
        </div>
      </div>
    )
  }
  
  const title = content.title || content.name
  const posterUrl = content.poster_path || '/placeholder-poster.jpg'
  const slug = content.slug
  
  return (
    <div className="watchlist-card">
      <Link to={`/${contentType}/${slug}`}>
        <img src={posterUrl} alt={title} className="poster" />
      </Link>
      <div className="card-info">
        <Link to={`/${contentType}/${slug}`}>
          <h3 className="title">{title}</h3>
        </Link>
        <p className="subtitle">{content.release_date?.substring(0, 4)}</p>
        <button onClick={onRemove} className="btn-remove">
          Remove
        </button>
      </div>
    </div>
  )
}
```

### Deployment Plan

**Pre-Deployment:**
1. ✅ Test migration script on staging database
2. ✅ Verify rollback script works correctly
3. ✅ Run performance tests on batch API endpoint
4. ✅ Update all frontend components to use external_id
5. ✅ Create database backup

**Deployment Steps:**

1. **Deploy Backend API** (Zero downtime)
   - Deploy new `/api/content/batch` endpoint
   - Verify endpoint works with test requests

2. **Run Migration Phase 1** (Add columns)
   - Execute: `npm run migrate:external-id phase1`
   - Verify: Columns added successfully
   - Rollback available: Yes

3. **Deploy Updated Supabase Functions** (Dual-write mode)
   - Deploy functions that write to both old and new columns
   - Monitor for errors
   - Rollback available: Yes (revert deployment)

4. **Run Migration Phase 2** (Migrate data)
   - Execute: `npm run migrate:external-id phase2`
   - Monitor logs for unmappable entries
   - Verify: Run `npm run migrate:external-id verify`
   - Rollback available: Yes (data still in old columns)

5. **Deploy Frontend Updates**
   - Deploy components that use external_id
   - Monitor user reports
   - Rollback available: Yes (revert deployment, functions still dual-write)

6. **Monitoring Period** (24-48 hours)
   - Monitor error logs
   - Check user feedback
   - Verify watchlist/history functionality
   - Decision point: Proceed or rollback

7. **Run Migration Phase 3** (Update constraints)
   - Execute: `npm run migrate:external-id phase3`
   - Verify: Check constraints and indexes
   - Rollback available: Limited (requires rollback script)

8. **Run Migration Phase 4** (Drop old columns)
   - Execute: `npm run migrate:external-id phase4`
   - Verify: Old columns removed
   - Rollback available: No (requires full rollback script)

**Post-Deployment:**
1. ✅ Monitor performance metrics
2. ✅ Check error logs for issues
3. ✅ Verify user data integrity
4. ✅ Update documentation
5. ✅ Archive migration scripts

### Monitoring and Alerts

**Metrics to Track:**

1. **Migration Metrics:**
   - Rows migrated per table
   - Unmappable entries count
   - Migration duration
   - Error rate

2. **API Performance:**
   - Batch API response time (p50, p95, p99)
   - Batch API error rate
   - Average batch size
   - Cache hit rate (if caching implemented)

3. **User Impact:**
   - Watchlist load time
   - Continue watching load time
   - Error rate on user data operations
   - User reports of missing content

**Alerts:**

```typescript
// Alert if batch API response time > 1 second
if (batchApiResponseTime > 1000) {
  alert('Batch API slow response', { responseTime: batchApiResponseTime })
}

// Alert if error rate > 1%
if (errorRate > 0.01) {
  alert('High error rate on user data operations', { errorRate })
}

// Alert if unmappable entries > 5%
if (unmappableRate > 0.05) {
  alert('High unmappable entry rate during migration', { unmappableRate })
}
```

### Documentation Updates

**Files to Update:**

1. **`.kiro/DATABASE_ARCHITECTURE.md`**
   - Document external_id as the bridge between Supabase and CockroachDB
   - Update examples to use external_id

2. **`docs/API.md`** (create if doesn't exist)
   - Document `/api/content/batch` endpoint
   - Provide request/response examples
   - Document error codes

3. **`src/lib/supabase.ts`** (inline comments)
   - Update function documentation
   - Add examples using external_id

4. **`README.md`**
   - Add migration notes
   - Document the external_id system

5. **`MIGRATION_GUIDE.md`** (new file)
   - Step-by-step migration instructions
   - Rollback procedures
   - Troubleshooting guide

### Troubleshooting Guide

**Issue: Watchlist items not displaying**

Symptoms:
- Watchlist page shows loading spinner indefinitely
- Console errors about batch API

Diagnosis:
```typescript
// Check if watchlist entries exist
const entries = await getWatchlist(userId)
console.log('Watchlist entries:', entries)

// Check if batch API is working
const response = await fetch('/api/content/batch', {
  method: 'POST',
  body: JSON.stringify({ items: entries })
})
console.log('Batch API response:', await response.json())
```

Solutions:
1. Verify batch API endpoint is deployed
2. Check CockroachDB connection
3. Verify external_ids are valid TMDB IDs

**Issue: "Content Unavailable" placeholders**

Symptoms:
- Watchlist shows placeholder cards instead of content

Diagnosis:
```sql
-- Check if content exists in CockroachDB
SELECT * FROM movies 
WHERE external_source = 'tmdb' AND external_id = '550';
```

Solutions:
1. Content may have been deleted from CockroachDB
2. Content may never have been ingested
3. Run content ingestion for missing items

**Issue: Migration script fails**

Symptoms:
- Migration script exits with error
- Some tables migrated, others not

Diagnosis:
```bash
# Check migration logs
npm run migrate:external-id verify

# Check for null external_ids
SELECT COUNT(*) FROM watchlist WHERE external_id IS NULL;
```

Solutions:
1. Run migration phases individually
2. Check database permissions
3. Verify CockroachDB connection
4. If unrecoverable, run rollback script

**Issue: Duplicate entries after migration**

Symptoms:
- Same content appears multiple times in watchlist

Diagnosis:
```sql
-- Find duplicates
SELECT user_id, external_id, content_type, COUNT(*) 
FROM watchlist 
GROUP BY user_id, external_id, content_type 
HAVING COUNT(*) > 1;
```

Solutions:
```sql
-- Deduplicate by keeping most recent
DELETE FROM watchlist 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM watchlist 
  GROUP BY user_id, external_id, content_type
);
```

## Summary

This design document specifies a comprehensive migration strategy for transitioning Supabase user data tables from integer `content_id` references to text `external_id` references that align with CockroachDB's content identification system.

**Key Design Decisions:**

1. **Three-Phase Migration:** Ensures zero-downtime deployment with rollback capability at each phase
2. **Batch API Endpoint:** Enables efficient content lookup for multiple items in a single request
3. **Graceful Degradation:** System continues to function even when content is missing from CockroachDB
4. **Dual-Write Transition:** Maintains backward compatibility during migration period
5. **Comprehensive Testing:** Property-based tests verify correctness across all inputs

**Migration Impact:**

- **Tables Affected:** 5 (watchlist, continue_watching, history, playlist_items, user_list_items)
- **Functions Updated:** 15+ in src/lib/supabase.ts
- **New API Endpoint:** POST /api/content/batch
- **Frontend Components:** 10+ components updated to use external_id
- **Estimated Downtime:** Zero (phased migration approach)

**Success Criteria:**

- ✅ All user data migrated without loss
- ✅ Watchlist, continue watching, and history features fully functional
- ✅ Batch API response time < 1 second for 100 items
- ✅ Error rate < 1% on user data operations
- ✅ Zero user-reported data loss issues

**Next Steps:**

1. Review and approve design document
2. Implement migration scripts
3. Implement batch API endpoint
4. Update Supabase functions
5. Update frontend components
6. Test on staging environment
7. Deploy to production (phased approach)

