# Slug Migration Scripts

## Overview

هذه الـ scripts تقوم بإضافة عمود `slug` لجداول المحتوى في CockroachDB لدعم SEO-friendly URLs.

## Task 1.1: Movies Table

### Files
- `add_slug_to_movies.mjs` - Migration script (Node.js)
- `add_slug_to_movies.sql` - SQL commands (for reference)

### What it does
1. ✅ Adds `slug` column (TEXT, nullable) to `movies` table
2. ✅ Creates unique index: `idx_movies_slug` (partial index for non-null values)
3. ✅ Enables `pg_trgm` extension for trigram search
4. ✅ Creates GIN index: `idx_movies_slug_trgm` for fast slug lookups

### Requirements Validated
- **Requirement 2.1**: Database schema includes slug column in movies table
- **Requirement 2.6**: Database creates unique indexes on slug columns

### Usage

```bash
# Run the migration
node scripts/migration/add_slug_to_movies.mjs

# The script is idempotent - safe to run multiple times
```

### Verification

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'movies' AND column_name = 'slug';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'movies' AND indexname LIKE 'idx_movies_slug%';

-- Sample data
SELECT id, title, slug 
FROM movies 
ORDER BY id 
LIMIT 10;
```

### Expected Output

```
✅ Column details:
   - slug: text, nullable: YES

✅ Indexes created:
   - idx_movies_slug (UNIQUE, partial index WHERE slug IS NOT NULL)
   - idx_movies_slug_trgm (GIN index for trigram search)
```

### Notes

- The `slug` column is nullable to maintain backward compatibility during migration
- Slugs will be generated in a later task (Task 15.1)
- The unique index only applies to non-null slugs
- The GIN index enables fast similarity search for slug resolution

### Next Steps

After this migration:
1. ✅ Task 1.2: Add slug to tv_series table (COMPLETED)
2. Task 1.3: Add slug to actors table
3. Task 1.4: Add slug to games table
4. Task 1.5: Add slug to software table
5. Task 15.1: Generate slugs for existing content

---

## Task 1.2: TV Series Table

### Files
- `add_slug_to_tv_series.mjs` - Migration script (Node.js)
- `verify_tv_series_slug.mjs` - Verification script

### What it does
1. ✅ Adds `slug` column (TEXT, nullable) to `tv_series` table
2. ✅ Creates unique index: `idx_tv_series_slug` (partial index for non-null values)
3. ✅ Enables `pg_trgm` extension for trigram search
4. ✅ Creates GIN index: `idx_tv_series_slug_trgm` for fast slug lookups

### Requirements Validated
- **Requirement 2.2**: Database schema includes slug column in tv_series table
- **Requirement 2.6**: Database creates unique indexes on slug columns

### Usage

```bash
# Run the migration
node scripts/migration/add_slug_to_tv_series.mjs

# Verify the migration
node scripts/migration/verify_tv_series_slug.mjs

# The script is idempotent - safe to run multiple times
```

### Verification

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tv_series' AND column_name = 'slug';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tv_series' AND indexname LIKE 'idx_tv_series_slug%';

-- Sample data
SELECT id, name, slug 
FROM tv_series 
ORDER BY id 
LIMIT 10;
```

### Expected Output

```
✅ Column details:
   - slug: text, nullable: YES

✅ Indexes created:
   - idx_tv_series_slug (UNIQUE, partial index WHERE slug IS NOT NULL)
   - idx_tv_series_slug_trgm (GIN index for trigram search)

📊 Database statistics:
   Total TV series: 92590
   TV series with slug: 0
   TV series without slug: 92590
```

### Notes

- The `slug` column is nullable to maintain backward compatibility during migration
- Slugs will be generated in a later task (Task 15.1)
- The unique index only applies to non-null slugs
- The GIN index enables fast similarity search for slug resolution
- Currently 92,590 TV series in the database, all without slugs (as expected)


---

## Task 1.3: Actors Table

### Status: ⏭️ SKIPPED

### Reason
The `actors` table does not exist in the current CockroachDB schema. This task is conditional ("إن وجد" - if exists), so no migration is needed.

### Verification

```bash
# Check if actors table exists
node scripts/migration/check_actors_table.mjs
```

### Current Database Tables
- ✅ movies
- ✅ tv_series
- ✅ rate_limits
- ✅ global_rate_limits
- ❌ actors (does not exist)

### Requirements Validated
- **Requirement 2.3**: N/A - Actors table does not exist in current schema

### Notes
- Actor data is currently stored as JSONB in the `cast_data` column of movies and tv_series tables
- If an actors table is added in the future, this migration can be executed following the same pattern as movies and tv_series
- The task is marked as complete since the conditional requirement is satisfied (table does not exist)

### Next Steps
- Task 1.4: Add slug to games table
- Task 1.5: Add slug to software table


---

## Task 1.4: Games Table

### Status: ⚠️ MANUAL EXECUTION REQUIRED

### Files
- `add_slug_to_games.mjs` - Migration instructions script (Node.js)
- `add_slug_to_games.sql` - SQL commands (for Supabase SQL Editor)
- `verify_games_slug.mjs` - Verification script
- `check_games_supabase.mjs` - Table existence check

### What it does
1. ✅ Adds `slug` column (TEXT, nullable) to `games` table
2. ✅ Creates unique index: `idx_games_slug` (partial index for non-null values)
3. ✅ Enables `pg_trgm` extension for trigram search
4. ✅ Creates GIN index: `idx_games_slug_trgm` for fast slug lookups

### Requirements Validated
- **Requirement 2.4**: Database schema includes slug column in games table
- **Requirement 2.6**: Database creates unique indexes on slug columns

### Important Notes
⚠️ **Games table is in Supabase, NOT CockroachDB**

Unlike movies and tv_series which are in CockroachDB, the games table is stored in Supabase. This means:
- Cannot use the same pg Pool connection approach
- Must execute SQL commands manually via Supabase Dashboard
- Or use Supabase's PostgreSQL connection string with psql

### Usage

```bash
# Step 1: Check if games table exists in Supabase
node scripts/migration/check_games_supabase.mjs

# Step 2: Display migration instructions
node scripts/migration/add_slug_to_games.mjs

# Step 3: Execute SQL commands in Supabase Dashboard
# (See instructions below)

# Step 4: Verify the migration
node scripts/migration/verify_games_slug.mjs
```

### Manual Execution Steps

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: lhpuwupbhpcqkwqugkhh
3. **Navigate to SQL Editor** (left sidebar)
4. **Copy and paste** the SQL commands from `add_slug_to_games.sql`:

```sql
-- Step 1: Add slug column
ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug
ON games(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index
CREATE INDEX IF NOT EXISTS idx_games_slug_trgm
ON games USING GIN (slug gin_trgm_ops);
```

5. **Execute** the commands (click "Run" button)
6. **Verify** by running: `node scripts/migration/verify_games_slug.mjs`

### Verification

```bash
# Run verification script
node scripts/migration/verify_games_slug.mjs
```

Expected output:
```
✅ Slug column exists in games table

📊 Database statistics:
   Total games: 5,000
   Games with slug: 0
   Games without slug: 5,000

✅ Column details:
   - slug: text, nullable: YES

✅ Indexes created:
   - idx_games_slug (UNIQUE, partial index WHERE slug IS NOT NULL)
   - idx_games_slug_trgm (GIN index for trigram search)
```

### Database Information

- **Database**: Supabase (PostgreSQL)
- **Table**: games
- **Total records**: 5,000 games
- **Sample data**: Steam games (Half-Life 2, Counter-Strike, etc.)

### Notes

- The `slug` column is nullable to maintain backward compatibility during migration
- Slugs will be generated in a later task (Task 15.1)
- The unique index only applies to non-null slugs
- The GIN index enables fast similarity search for slug resolution
- Games table is in Supabase because it's not core movie/TV content

### Next Steps

After this migration:
1. Task 1.5: Add slug to software table
2. Task 15.1: Generate slugs for existing content (including games)


---

## Task 1.5: Software Table

### Status: ⚠️ MANUAL EXECUTION REQUIRED

### Files
- `add_slug_to_software.mjs` - Migration instructions script (Node.js)
- `add_slug_to_software.sql` - SQL commands (for Supabase SQL Editor)
- `verify_software_slug.mjs` - Verification script
- `check_software_supabase.mjs` - Table existence check
- `TASK_1.5_SUMMARY.md` - Detailed task summary

### What it does
1. ✅ Adds `slug` column (TEXT, nullable) to `software` table
2. ✅ Creates unique index: `idx_software_slug` (partial index for non-null values)
3. ✅ Enables `pg_trgm` extension for trigram search
4. ✅ Creates GIN index: `idx_software_slug_trgm` for fast slug lookups

### Requirements Validated
- **Requirement 2.5**: Database schema includes slug column in software table
- **Requirement 2.6**: Database creates unique indexes on slug columns

### Important Notes
⚠️ **Software table is in Supabase, NOT CockroachDB**

Like the games table, the software table is stored in Supabase. This means:
- Cannot use the same pg Pool connection approach
- Must execute SQL commands manually via Supabase Dashboard
- Or use Supabase's PostgreSQL connection string with psql

### Usage

```bash
# Step 1: Check if software table exists in Supabase
node scripts/migration/check_software_supabase.mjs

# Step 2: Display migration instructions
node scripts/migration/add_slug_to_software.mjs

# Step 3: Execute SQL commands in Supabase Dashboard
# (See instructions below)

# Step 4: Verify the migration
node scripts/migration/verify_software_slug.mjs
```

### Manual Execution Steps

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to SQL Editor** (left sidebar)
4. **Copy and paste** the SQL commands from `add_slug_to_software.sql`:

```sql
-- Step 1: Add slug column
ALTER TABLE software ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_software_slug
ON software(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index
CREATE INDEX IF NOT EXISTS idx_software_slug_trgm
ON software USING GIN (slug gin_trgm_ops);
```

5. **Execute** the commands (click "Run" button)
6. **Verify** by running: `node scripts/migration/verify_software_slug.mjs`

### Verification

```bash
# Run verification script
node scripts/migration/verify_software_slug.mjs
```

Expected output:
```
✅ Slug column exists in software table

📊 Database statistics:
   Total software items: 3,500
   Items with slug: 0
   Items without slug: 3,500

✅ Column details:
   - slug: text, nullable: YES

✅ Indexes created:
   - idx_software_slug (UNIQUE, partial index WHERE slug IS NOT NULL)
   - idx_software_slug_trgm (GIN index for trigram search)
```

### Database Information

- **Database**: Supabase (PostgreSQL)
- **Table**: software
- **Total records**: 3,500 software items
- **Sample data**: Various software (Visual Studio Code, Adobe Photoshop, Google Chrome, etc.)

### Notes

- The `slug` column is nullable to maintain backward compatibility during migration
- Slugs will be generated in a later task (Task 15.1)
- The unique index only applies to non-null slugs
- The GIN index enables fast similarity search for slug resolution
- Software table is in Supabase because it's not core movie/TV content

### Next Steps

After this migration:
1. ✅ All slug columns added to content tables (movies, tv_series, games, software)
2. Task 2.x: Develop Slug Generator Module
3. Task 15.1: Generate slugs for existing content (including software)
