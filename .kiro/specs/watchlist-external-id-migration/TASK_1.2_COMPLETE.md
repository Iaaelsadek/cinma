# Task 1.2 Complete: Phase 2 Migration Script

## Summary

Successfully implemented the Phase 2 migration script that migrates data from `content_id` (INTEGER) to `external_id` (TEXT) for all Supabase user data tables.

## Implementation Details

### Core Functionality

**File:** `scripts/migrate-to-external-id.ts`

**Function:** `phase2_migrateData()`

**Key Features:**
1. ✅ Queries all rows from each table
2. ✅ Filters rows needing migration (null/missing external_id)
3. ✅ Direct mapping: `external_id = content_id.toString()`
4. ✅ Sets `external_source = 'tmdb'`
5. ✅ Optionally verifies content exists in CockroachDB
6. ✅ Logs entries where content not found (for manual review)
7. ✅ Migrates entries even if content missing
8. ✅ Tracks comprehensive statistics per table
9. ✅ Handles missing tables gracefully
10. ✅ Handles null content_id gracefully

### Tables Migrated

- watchlist
- continue_watching
- history
- playlist_items (if exists)
- user_list_items (if exists)

### Mapping Logic

```typescript
// Old content_id IS the TMDB ID stored as integer
const externalId = contentId.toString()  // 550 → "550"
const externalSource = 'tmdb'
```

No complex lookups needed - it's a simple type conversion!

### CockroachDB Verification

The script optionally verifies content exists in CockroachDB:

```typescript
const cockroachTable = contentType === 'tv' ? 'tv_series' : 'movies'
const result = await queryCockroach(
  `SELECT id FROM ${cockroachTable} WHERE external_source = $1 AND external_id = $2 LIMIT 1`,
  [externalSource, externalId]
)
```

**Important:** Verification is for logging purposes only. Entries are migrated even if content is not found.

### Statistics Tracking

The script tracks:
- Total rows processed
- Successfully migrated rows
- Skipped rows (errors)
- Content not found in CockroachDB
- Per-table breakdown of all metrics

### Error Handling

- ✅ Handles missing tables (skips with info message)
- ✅ Handles empty tables (skips with info message)
- ✅ Handles null content_id (skips with warning)
- ✅ Handles CockroachDB verification errors (logs warning, continues)
- ✅ Handles update errors (logs error, tracks in stats)

## Testing

### Unit Tests

**File:** `scripts/__tests__/migrate-to-external-id.test.ts`

**Coverage:**
- ✅ Content ID to External ID conversion
- ✅ Large and small TMDB IDs
- ✅ Multiple content types (movie, tv)
- ✅ Edge cases (null, undefined, zero)
- ✅ CockroachDB table mapping

**Results:** 10/10 tests passing

### Integration Tests

**File:** `scripts/__tests__/migration-integration.test.ts`

**Coverage:**
- ✅ Watchlist data migration
- ✅ Continue watching data migration
- ✅ History data migration
- ✅ Multiple rows handling
- ✅ Null content_id handling
- ✅ Field preservation during migration

**Results:** 9/9 tests passing

**Total:** 19/19 tests passing ✅

## Documentation

Created comprehensive documentation:

1. **scripts/MIGRATION_GUIDE.md** - Complete migration guide with:
   - Step-by-step execution instructions
   - Troubleshooting guide
   - Rollback procedures
   - Architecture notes
   - Testing instructions

2. **scripts/MIGRATION_QUICK_START.md** - Quick reference for:
   - TL;DR migration steps
   - Prerequisites
   - Expected warnings
   - Rollback commands

## Usage

### Run Phase 2 Migration

```bash
npx tsx scripts/migrate-to-external-id.ts phase2
```

### Run All Tests

```bash
npm test -- scripts/__tests__/migrate-to-external-id.test.ts --run
npm test -- scripts/__tests__/migration-integration.test.ts --run
```

### View Help

```bash
npx tsx scripts/migrate-to-external-id.ts
```

## Requirements Validated

✅ **Requirement 1.4** - Preserves watchlist data by mapping content_id to external_id
✅ **Requirement 2.4** - Preserves continue_watching data
✅ **Requirement 3.4** - Preserves history data
✅ **Requirement 4.2** - Maps content_id to external_id via direct conversion
✅ **Requirement 4.3** - Logs unmapped entries (content not found in CockroachDB)
✅ **Requirement 14.4** - Migrates playlist_items table
✅ **Requirement 15.5** - Migrates user_list_items table

## Architecture Compliance

✅ **Supabase:** Used ONLY for user data tables (watchlist, continue_watching, history)
✅ **CockroachDB:** Used ONLY for content verification (movies, tv_series)
✅ **No cross-database foreign keys:** Application layer handles consistency
✅ **Graceful degradation:** Missing content logged but migration continues

## Next Steps

1. Execute Phase 1 SQL in Supabase SQL Editor (if not already done)
2. Run Phase 2 migration: `npx tsx scripts/migrate-to-external-id.ts phase2`
3. Review migration statistics and warnings
4. Run verification: `npx tsx scripts/migrate-to-external-id.ts verify`
5. Proceed to Task 1.3 (property tests) or Task 1.4 (Phase 3 schema updates)

## Notes

- The script handles empty tables gracefully (current state)
- When user data exists, the script will migrate it automatically
- Missing content in CockroachDB is logged but doesn't block migration
- All tests pass, confirming correct implementation
- Documentation is comprehensive and ready for use

---

**Status:** ✅ COMPLETE

**Date:** 2024-01-XX

**Validated By:** Automated tests (19/19 passing)
