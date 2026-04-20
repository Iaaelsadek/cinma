# Implementation Plan: Watchlist External ID Migration

## Overview

This implementation migrates Supabase user data tables (watchlist, continue_watching, history, playlist_items, user_list_items) from using integer `content_id` to text `external_id` (TMDB IDs). The migration follows a three-phase approach ensuring zero-downtime deployment with rollback capability at each phase.

**Key Implementation Points:**
- Backend: TypeScript/JavaScript (Node.js + Express.js)
- Frontend: TypeScript/React
- Database: Supabase (PostgreSQL) for user data, CockroachDB for content
- Migration Strategy: Phased approach with dual-write transition period

## Tasks

- [x] 1. Create database migration scripts
  - [x] 1.1 Create Phase 1 migration script (add columns)
    - Create `scripts/migrate-to-external-id.ts` with phase1_addColumns function
    - Add external_id (TEXT) and external_source (TEXT DEFAULT 'tmdb') columns to all 5 tables
    - Tables: watchlist, continue_watching, history, playlist_items, user_list_items
    - Include verification that columns were added successfully
    - Note: Use direct PostgreSQL connection or Supabase migrations (not supabase.rpc('exec_sql'))
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 14.2, 14.3, 15.3, 15.4_
  
  - [x] 1.2 Create Phase 2 migration script (migrate data)
    - Implement phase2_migrateData function in migration script
    - Query all rows with null external_id from each table
    - **Map content_id to external_id: The old content_id IS the TMDB ID stored as integer**
    - Convert directly: `external_id = content_id.toString()`, `external_source = 'tmdb'`
    - Optionally verify content exists in CockroachDB for logging purposes (not required for mapping)
    - Log entries where content not found in CockroachDB (for manual review) but still migrate them
    - Track migrated vs skipped counts per table
    - Note: Use direct PostgreSQL connection or Supabase migrations (not supabase.rpc('exec_sql'))
    - _Requirements: 1.4, 2.4, 3.4, 4.2, 4.3, 14.4, 15.5_
  
  - [ ]* 1.3 Write property test for migration data preservation
    - **Property 2: Migration Data Preservation**
    - **Validates: Requirements 1.4, 2.4, 3.4, 14.4, 15.5**
    - Generate random user data sets and verify all entries are preserved after migration
    - Verify content_id correctly maps to external_id
    - Test with 100+ iterations using fast-check
  
  - [x] 1.4 Create Phase 3 migration script (update schema)
    - Implement phase3_updateSchema function
    - Make external_id NOT NULL on all tables
    - Drop old unique constraints on content_id
    - Add new unique constraints on external_id
    - Create indexes on (external_id, content_type) for all tables
    - _Requirements: 1.5, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 1.5 Create Phase 4 migration script (drop old columns)
    - Implement phase4_dropOldColumns function
    - Drop content_id column from all 5 tables
    - Verify columns are removed successfully
    - _Requirements: 4.4_
  
  - [x] 1.6 Create migration verification script
    - Implement verify function in migration script
    - Check for null external_id values in all tables
    - Verify row counts match expected values
    - Validate external_id format (non-empty strings)
    - Check that all required indexes exist
    - Generate comprehensive report of any issues
    - _Requirements: 4.5, 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ]* 1.7 Write property test for migration data integrity
    - **Property 5: Migration Data Integrity Verification**
    - **Validates: Requirements 4.5**
    - Verify row counts match between old and new schemas
    - Verify all external_ids are non-null and non-empty
    - Verify all required indexes exist

- [x] 2. Create rollback script
  - [x] 2.1 Implement rollback script
    - Create `scripts/rollback-external-id.ts`
    - Restore content_id column to all tables
    - Populate content_id from external_id (convert back to integer)
    - Drop external_id and external_source columns
    - Restore old unique constraints on content_id
    - Verify rollback completed successfully
    - Note: Use direct PostgreSQL connection or Supabase migrations (not supabase.rpc('exec_sql'))
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ]* 2.2 Write property test for rollback data restoration
    - **Property 20: Rollback Data Restoration**
    - **Validates: Requirements 16.1, 16.4**
    - Verify database state matches pre-migration state after rollback

- [x] 3. Checkpoint - Verify migration scripts
  - Create backup of Supabase user data tables before running Phase 2
  - Ensure migration scripts are tested on staging database, ask the user if questions arise.

- [x] 4. Create backend batch content lookup API
  - [x] 4.1 Implement POST /api/content/batch endpoint
    - Create endpoint in `server/routes/content.js` (verified - file exists and is correct location)
    - Accept array of {external_id, content_type, external_source?} objects
    - Validate batch size (max 100 items)
    - Query CockroachDB for each item sequentially
    - Return array of content objects (or null for missing content)
    - Handle errors gracefully with appropriate status codes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 4.2 Write property test for batch API content retrieval
    - **Property 10: Batch API Content Retrieval**
    - **Validates: Requirements 8.2, 8.3, 8.4**
    - Generate random arrays of {external_id, content_type} objects
    - Verify response array matches input array order
    - Verify null returned for missing content
  
  - [ ]* 4.3 Write unit tests for batch API endpoint
    - Test successful batch lookup with valid external_ids
    - Test null returned for non-existent external_id
    - Test batch size limit (reject > 100 items)
    - Test invalid content_type handling
    - Test empty array handling
    - _Requirements: 8.5, 11.2_
  
  - [x] 4.4 Add performance monitoring and logging
    - Log batch request size, query time, success/failure counts
    - Track performance metrics (p50, p95, p99 response times)
    - Add alerts for slow responses (> 1 second)
    - _Requirements: 20.5_

- [x] 5. Update Supabase watchlist functions
  - [x] 5.1 Update addToWatchlist function
    - Modify function signature to accept external_id (string) instead of content_id (number)
    - Update database insert to use external_id and external_source
    - Add input validation (reject null/empty external_id)
    - Handle duplicate entry errors gracefully
    - File: `src/lib/supabase.ts`
    - _Requirements: 5.1, 11.2_
  
  - [x] 5.2 Update removeFromWatchlist function
    - Modify function signature to accept external_id (string)
    - Update database delete query to use external_id
    - _Requirements: 5.2_
  
  - [x] 5.3 Update isInWatchlist function
    - Modify function signature to accept external_id (string)
    - Update database query to check by external_id
    - _Requirements: 5.3_
  
  - [x] 5.4 Update getWatchlist function
    - Modify return type to include external_id instead of content_id
    - Update database query to select external_id, external_source
    - Order by created_at DESC
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 5.5 Write property test for watchlist function signatures
    - **Property 6: Watchlist Function Signatures Accept External ID**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
    - Generate random external_ids and content_types
    - Verify all watchlist functions accept external_id parameter
    - Verify correct database operations using external_id
  
  - [ ]* 5.6 Write property test for external ID storage
    - **Property 1: External ID Storage for User Data Operations**
    - **Validates: Requirements 1.3, 2.3, 3.3**
    - Verify external_id is stored exactly as provided without modification
  
  - [ ]* 5.7 Write property test for user data functions return external ID
    - **Property 7: User Data Functions Return External ID**
    - **Validates: Requirements 5.4, 6.3, 7.2, 13.1, 13.2, 13.4**
    - Verify all returned objects contain external_id instead of content_id

- [x] 6. Update Supabase continue watching functions
  - [x] 6.1 Update upsertProgress function
    - Modify function signature to accept external_id (string)
    - Update database upsert to use external_id and external_source
    - Add input validation for external_id
    - _Requirements: 6.1, 6.4_
  
  - [x] 6.2 Update getProgress function
    - Modify function signature to accept external_id (string)
    - Update database query to use external_id
    - _Requirements: 6.2_
  
  - [x] 6.3 Update getContinueWatching function
    - Modify return type to include external_id instead of content_id
    - Update database query to select external_id, external_source
    - Order by updated_at DESC
    - _Requirements: 6.3, 6.5_
  
  - [ ]* 6.4 Write property test for progress functions
    - **Property 8: Progress Functions Accept External ID**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**
    - Generate random external_ids and progress data
    - Verify functions accept external_id and store/retrieve correctly

- [x] 7. Update Supabase history functions
  - [x] 7.1 Update addHistory function
    - Modify function signature to accept external_id (string)
    - Update database insert to use external_id and external_source
    - Add input validation for external_id
    - Allow duplicate entries (no unique constraint)
    - _Requirements: 7.1, 7.3_
  
  - [x] 7.2 Update getHistory function
    - Modify return type to include external_id instead of content_id
    - Update database query to select external_id, external_source
    - Order by watched_at DESC
    - _Requirements: 7.2, 7.4, 7.5_
  
  - [ ]* 7.3 Write property test for history duplicate entries
    - **Property 3: History Duplicate Entries Allowed**
    - **Validates: Requirements 3.5**
    - Verify multiple history entries allowed for same external_id
  
  - [ ]* 7.4 Write property test for history chronological ordering
    - **Property 9: History Chronological Ordering**
    - **Validates: Requirements 7.5**
    - Verify history entries ordered by watched_at DESC

- [x] 8. Update Supabase playlist and user list functions
  - [x] 8.1 Update addPlaylistItem function
    - Modify function signature to accept external_id (string)
    - Update database insert to use external_id and external_source
    - Add input validation for external_id
    - _Requirements: 14.1, 14.5_
  
  - [x] 8.2 Update addItemToList function
    - Modify function signature to accept external_id (string)
    - Update database insert to use external_id and external_source
    - _Requirements: 15.1_
  
  - [x] 8.3 Update removeItemFromList function
    - Modify function signature to accept external_id (string)
    - Update database delete query to use external_id
    - _Requirements: 15.2_
  
  - [ ]* 8.4 Write property test for playlist functions
    - **Property 18: Playlist Functions Accept External ID**
    - **Validates: Requirements 14.1, 14.5**
  
  - [ ]* 8.5 Write property test for user list functions
    - **Property 19: User List Functions Accept External ID**
    - **Validates: Requirements 15.1, 15.2**

- [x] 9. Update getUserPreferences function
  - [x] 9.1 Update getUserPreferences function
    - Modify return type to include external_id in history and watchlist arrays
    - Update queries to select external_id instead of content_id
    - Filter out entries with null external_id
    - File: `src/lib/supabase.ts`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 9.2 Write property test for user preferences null handling
    - **Property 17: User Preferences Null Handling**
    - **Validates: Requirements 13.5**
    - Verify entries with null external_id are excluded

- [x] 10. Checkpoint - Verify backend functions
  - Ensure all Supabase functions updated and tests pass, ask the user if questions arise.

- [x] 11. Update frontend components - Movie/Series details pages
  - [x] 11.1 Update MovieDetails component
    - Extract TMDB ID from movie data (movie.external_id or movie.id.toString())
    - Update watchlist status check to use TMDB ID
    - Update watchlist toggle handler to use TMDB ID
    - Update progress tracking to use TMDB ID
    - File: `src/pages/media/MovieDetails.tsx` (or similar)
    - _Requirements: 9.2_
  
  - [x] 11.2 Update SeriesDetails component
    - Extract TMDB ID from series data
    - Update watchlist status check to use TMDB ID
    - Update watchlist toggle handler to use TMDB ID
    - Update progress tracking to use TMDB ID
    - File: `src/pages/media/SeriesDetails.tsx` (or similar)
    - _Requirements: 9.3_
  
  - [ ]* 11.3 Write property test for frontend components use TMDB ID
    - **Property 11: Frontend Components Use TMDB ID**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

- [x] 12. Update frontend components - Card components
  - [x] 12.1 Update VideoCard component
    - Update watchlist toggle to use TMDB ID (content.external_id)
    - Update progress tracking to use TMDB ID
    - File: `src/components/VideoCard.tsx` (or similar)
    - _Requirements: 9.4_
  
  - [x] 12.2 Update MovieCard component
    - Update watchlist toggle to use TMDB ID
    - File: `src/components/MovieCard.tsx` (or similar)
    - _Requirements: 9.5_

- [x] 13. Update frontend components - Profile page
  - [x] 13.1 Update Profile watchlist display
    - Fetch watchlist entries from Supabase (returns external_ids)
    - Call batch API endpoint with external_ids to get full content details
    - Combine entries with content details
    - Handle null content (missing from CockroachDB) with placeholders
    - File: `src/pages/Profile.tsx` (or similar)
    - _Requirements: 9.1, 11.1, 11.4_
  
  - [x] 13.2 Create WatchlistCard component
    - Accept external_id, content_type, content (nullable), onRemove props
    - Display full content details when available
    - Display placeholder when content is null ("Content Unavailable")
    - Include remove button that works even for unavailable content
    - File: `src/components/WatchlistCard.tsx` (or similar)
    - _Requirements: 11.1, 11.4_
  
  - [x] 13.3 Update Profile continue watching display
    - Fetch continue_watching entries from Supabase
    - Call batch API to get full content details
    - Handle null content gracefully
    - _Requirements: 9.1_
  
  - [x] 13.4 Update Profile history display
    - Fetch history entries from Supabase
    - Call batch API to get full content details
    - Handle null content gracefully
    - _Requirements: 9.1_
  
  - [ ]* 13.5 Write property test for graceful content degradation
    - **Property 12: Graceful Content Degradation**
    - **Validates: Requirements 11.1, 11.4**
    - Verify system displays placeholder for missing content
    - Verify removal operations still work

- [x] 14. Update activity feed functions
  - [x] 14.1 Update addActivity function
    - Accept external_id in metadata for content-related activities
    - Store external_id for activity types 'watch' and 'review'
    - File: `src/lib/supabase.ts` or activity-related file
    - _Requirements: 17.1, 17.3, 17.4_
  
  - [x] 14.2 Update activity feed display component
    - Fetch content details using external_id from activity metadata
    - Handle missing content with placeholder in activity feed
    - File: Activity feed component
    - _Requirements: 17.2, 17.5_
  
  - [ ]* 14.3 Write property test for activity feed external ID storage
    - **Property 21: Activity Feed External ID Storage**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4**
  
  - [ ]* 14.4 Write property test for activity feed missing content handling
    - **Property 22: Activity Feed Missing Content Handling**
    - **Validates: Requirements 17.5**

- [x] 15. Add input validation and error handling
  - [x] 15.1 Add external_id validation to all functions
    - Reject null, empty string, or whitespace-only external_id
    - Return descriptive error messages
    - Apply to all watchlist, progress, history, playlist, and list functions
    - _Requirements: 11.2, 11.5_
  
  - [x] 15.2 Add content_type validation
    - Validate content_type is 'movie' or 'tv' (or other valid types)
    - Return descriptive error for invalid types
    - _Requirements: 11.5_
  
  - [x] 15.3 Add error logging for failed operations
    - Log external_id, operation type, user_id, and error message
    - Log to monitoring system (console.error or logging service)
    - _Requirements: 20.3, 20.4_
  
  - [ ]* 15.4 Write property test for external ID validation
    - **Property 13: External ID Validation**
    - **Validates: Requirements 11.2, 11.5**
    - Verify null/empty/whitespace external_ids are rejected

- [x] 16. Checkpoint - Verify frontend integration
  - Ensure all frontend components updated and working correctly, ask the user if questions arise.

- [x] 17. Add migration monitoring and logging
  - [x] 17.1 Add migration progress logging
    - Log start and end timestamps for each phase
    - Log row counts processed per table
    - Log migrated vs skipped counts
    - _Requirements: 20.1, 20.2_
  
  - [x] 17.2 Add unmappable content logging
    - Log content_id, content_type, user_id, table name for unmappable entries
    - Write to separate log file for manual review
    - _Requirements: 20.3_
  
  - [ ]* 17.3 Write property test for migration error logging
    - **Property 25: Migration Error Logging**
    - **Validates: Requirements 20.3**
  
  - [ ]* 17.4 Write property test for external ID operation error logging
    - **Property 26: External ID Operation Error Logging**
    - **Validates: Requirements 20.4**
  
  - [ ]* 17.5 Write property test for batch API performance tracking
    - **Property 27: Batch API Performance Tracking**
    - **Validates: Requirements 20.5**

- [x] 18. Create documentation
  - [x] 18.1 Update DATABASE_ARCHITECTURE.md
    - Document external_id as bridge between Supabase and CockroachDB
    - Update examples to use external_id
    - Explain the architectural principle
    - File: `.kiro/DATABASE_ARCHITECTURE.md`
    - _Requirements: 19.1_
  
  - [x] 18.2 Create API documentation
    - Document POST /api/content/batch endpoint
    - Provide request/response examples
    - Document error codes and handling
    - File: `docs/API.md` (create if doesn't exist)
    - _Requirements: 19.3_
  
  - [x] 18.3 Update function documentation
    - Add JSDoc comments to all updated functions in supabase.ts
    - Include examples using external_id
    - _Requirements: 19.2_
  
  - [x] 18.4 Create migration guide
    - Document step-by-step migration instructions
    - Document rollback procedures
    - Include troubleshooting guide
    - File: `docs/MIGRATION_GUIDE.md`
    - _Requirements: 19.4, 19.5_
  
  - [x] 18.5 Update README.md
    - Add migration notes
    - Document the external_id system
    - _Requirements: 19.1_

- [x] 19. Final checkpoint - Pre-deployment verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration follows three-phase approach: add columns → migrate data → update schema → drop old columns
- Frontend components must handle null content gracefully (missing from CockroachDB)
- All functions must validate external_id input (reject null/empty)
- Comprehensive logging required for migration and error tracking

## Database Connection Method

**For Supabase migrations:**
- Use direct PostgreSQL connection with Supabase connection string
- OR use Supabase SQL Editor for manual execution
- OR create Supabase migration files in `supabase/migrations/`
- DO NOT use `supabase.rpc('exec_sql', ...)` - this RPC function may not exist

**For CockroachDB queries:**
- Use existing `server/api/db.js` query function
- Import: `import { query } from '../server/api/db.js'`
- This connects to CockroachDB for content lookups

**Key Mapping Logic:**
- Old `content_id` (INTEGER) was already a TMDB ID stored as integer
- Direct conversion: `external_id = content_id.toString()`
- No complex lookup needed - it's a simple type conversion
- Optional: Verify content exists in CockroachDB for logging purposes only

## Implementation Language

- **Backend**: TypeScript/JavaScript (Node.js + Express.js)
- **Frontend**: TypeScript/React
- **Migration Scripts**: TypeScript
- **Testing**: Jest + fast-check (property-based testing)

## Arabic Comments (تعليقات بالعربية)

```typescript
// إضافة محتوى إلى قائمة المشاهدة باستخدام external_id
await addToWatchlist(userId, externalId, contentType)

// جلب قائمة المشاهدة مع تفاصيل المحتوى الكاملة
const watchlist = await getWatchlist(userId)
const contentDetails = await fetchBatch(watchlist)

// التعامل مع المحتوى المفقود بشكل سلس
if (!content) {
  return <PlaceholderCard title="المحتوى غير متوفر" />
}
```
