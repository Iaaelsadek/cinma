# Tasks 1.4, 1.5, 1.6, and 2.1 - Implementation Complete

## Summary

Successfully implemented the remaining migration script phases and rollback functionality for the watchlist external ID migration.

## Completed Tasks

### ✅ Task 1.4: Phase 3 Migration Script (Update Schema)

**File:** `scripts/migrate-to-external-id.ts` - `phase3_updateSchema()` function

**Implementation:**
- Makes `external_id` NOT NULL on all 5 tables
- Drops old unique constraints on `content_id`
- Adds new unique constraints on `external_id`
- Creates indexes on `(external_id, content_type)` for all tables
- Creates indexes on `user_id` for performance
- Handles non-existent tables gracefully (playlist_items, user_list_items)

**Key Features:**
- Uses direct PostgreSQL connection via `executeSupabaseSQL()`
- Comprehensive error handling for missing tables/constraints
- Step-by-step logging for each operation
- Validates: Requirements 1.5, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5

### ✅ Task 1.5: Phase 4 Migration Script (Drop Old Columns)

**File:** `scripts/migrate-to-external-id.ts` - `phase4_dropOldColumns()` function

**Implementation:**
- Drops `content_id` column from all 5 tables
- Handles non-existent tables gracefully
- Verifies columns are removed successfully

**Key Features:**
- Clean, minimal implementation
- Proper error handling
- Validates: Requirements 4.4

### ✅ Task 1.6: Migration Verification Script

**File:** `scripts/migrate-to-external-id.ts` - `verify()` function (enhanced)

**Implementation:**
- Checks for null `external_id` values in all tables
- Verifies row counts and reports statistics
- Validates `external_id` format (non-empty strings, no whitespace-only)
- Checks that all required indexes exist using `pg_indexes` system table
- Generates comprehensive report with errors and warnings

**Key Features:**
- Detailed statistics by table (total rows, null values, empty values, whitespace values)
- Index verification for all 8 required indexes
- Categorized issues (errors vs warnings)
- Sample row details for debugging
- Validates: Requirements 4.5, 18.1, 18.2, 18.3, 18.4, 18.5

**Verification Checks:**
1. Null external_id detection
2. Empty string external_id detection
3. Whitespace-only external_id detection
4. Row count reporting
5. Index existence verification
6. Comprehensive issue reporting with severity levels

### ✅ Task 2.1: Rollback Script

**File:** `scripts/rollback-external-id.ts` (new file)

**Implementation:**
- **Step 1:** Adds `content_id` column back to all tables
- **Step 2:** Populates `content_id` from `external_id` (converts string to integer)
- **Step 3:** Drops `external_id` and `external_source` columns
- **Step 4:** Restores old unique constraints on `content_id`
- **Step 5:** Verifies rollback completed successfully

**Key Features:**
- Complete 5-step rollback process
- Handles non-numeric external_ids gracefully (skips with warning)
- Comprehensive statistics tracking (total, converted, skipped)
- Verification step confirms rollback success
- Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5

**Rollback Statistics:**
- Tracks conversion success/failure per table
- Reports skipped rows (null or non-numeric external_ids)
- Generates detailed summary report

## Usage

### Migration Script

```bash
# Phase 3: Update schema with constraints and indexes
npx tsx scripts/migrate-to-external-id.ts phase3

# Phase 4: Drop old columns
npx tsx scripts/migrate-to-external-id.ts phase4

# Verify migration integrity
npx tsx scripts/migrate-to-external-id.ts verify

# Run all phases
npx tsx scripts/migrate-to-external-id.ts all
```

### Rollback Script

```bash
# Full rollback (all steps)
npx tsx scripts/rollback-external-id.ts rollback

# Individual steps
npx tsx scripts/rollback-external-id.ts step1  # Add content_id column
npx tsx scripts/rollback-external-id.ts step2  # Populate content_id
npx tsx scripts/rollback-external-id.ts step3  # Drop external columns
npx tsx scripts/rollback-external-id.ts step4  # Restore constraints
npx tsx scripts/rollback-external-id.ts step5  # Verify rollback
```

## Important Notes

### Environment Variable Required

Both scripts require `SUPABASE_DB_URL` environment variable for direct SQL execution:

```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres
```

**How to get it:**
1. Go to Supabase Dashboard
2. Project Settings → Database
3. Copy "Connection String" (URI format)
4. Add to `.env.local` file

### Tables Affected

All 5 user data tables in Supabase:
- `watchlist`
- `continue_watching`
- `history`
- `playlist_items`
- `user_list_items`

### Migration Flow

```
Phase 1 (✅ Complete) → Phase 2 (✅ Complete) → Phase 3 (✅ Ready) → Phase 4 (✅ Ready) → Verify (✅ Ready)
                                                                                              ↓
                                                                                         Rollback (✅ Ready)
```

## Technical Details

### Phase 3 Operations

1. **NOT NULL Constraints:** Sets `external_id` to NOT NULL on all tables
2. **Drop Old Constraints:** Removes content_id-based unique constraints
3. **Add New Constraints:** Creates external_id-based unique constraints
4. **External Indexes:** Creates indexes on `(external_id, content_type)`
5. **User Indexes:** Creates indexes on `user_id` with timestamp ordering

### Phase 4 Operations

- Drops `content_id` column from all 5 tables
- Uses `DROP COLUMN IF EXISTS` for safety

### Verification Operations

- **Null Check:** Detects rows with null external_id
- **Empty Check:** Detects rows with empty string external_id
- **Whitespace Check:** Detects rows with whitespace-only external_id
- **Index Check:** Verifies all 8 required indexes exist
- **Report Generation:** Categorizes issues by severity (errors vs warnings)

### Rollback Operations

1. **Add Column:** Restores `content_id INTEGER` column
2. **Populate Data:** Converts `external_id` (string) → `content_id` (integer)
3. **Drop Columns:** Removes `external_id` and `external_source`
4. **Restore Constraints:** Re-adds old unique constraints on `content_id`
5. **Verify:** Confirms rollback success

## Error Handling

### Migration Script
- Gracefully handles non-existent tables
- Skips operations on missing tables with info messages
- Throws errors on critical failures
- Continues processing other tables on non-critical errors

### Rollback Script
- Skips rows with null external_id
- Skips rows with non-numeric external_id (cannot convert to integer)
- Tracks and reports all skipped rows
- Verifies rollback success before completing

## Next Steps

1. **Set Environment Variable:** Add `SUPABASE_DB_URL` to `.env.local`
2. **Test on Staging:** Run Phase 3 on staging database first
3. **Verify:** Run verification script after Phase 3
4. **Phase 4:** Drop old columns after verification passes
5. **Final Verify:** Run verification again after Phase 4

## Requirements Validated

- ✅ Requirements 1.5, 2.5 (NOT NULL constraints)
- ✅ Requirements 10.1, 10.2, 10.3, 10.4, 10.5 (Indexes)
- ✅ Requirements 4.4 (Drop old columns)
- ✅ Requirements 4.5, 18.1, 18.2, 18.3, 18.4, 18.5 (Verification)
- ✅ Requirements 16.1, 16.2, 16.3, 16.4, 16.5 (Rollback)
