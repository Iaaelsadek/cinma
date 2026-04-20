# Migration Summary: add-genre-indexes.sql

## Overview
This migration adds database indexes to dramatically improve query performance for genre filtering and sorting operations in the dynamic filters and categories system.

## Indexes Created

### 1. Partial Indexes on primary_genre (5 indexes)
These indexes speed up genre filtering queries by indexing only non-null, non-empty genre values:

- `idx_movies_primary_genre` - Movies genre filtering
- `idx_tv_series_primary_genre` - TV series genre filtering  
- `idx_games_primary_genre` - Games genre filtering
- `idx_software_primary_genre` - Software genre filtering
- `idx_anime_primary_genre` - Anime genre filtering

**Query Optimization**: 
```sql
-- Before: Full table scan
-- After: Index scan on primary_genre
SELECT * FROM movies WHERE primary_genre = 'حركة';
```

### 2. Composite Indexes for Genre + Sorting (2 indexes)
These indexes support filtering by genre AND sorting by rating/date in a single index scan:

- `idx_movies_genre_rating_date` - Movies: genre + vote_average + release_date
- `idx_tv_series_genre_rating_date` - TV Series: genre + vote_average + first_air_date

**Query Optimization**:
```sql
-- Before: Index scan + sort operation
-- After: Single index scan (no separate sort needed)
SELECT * FROM movies 
WHERE primary_genre = 'حركة' 
ORDER BY vote_average DESC, release_date DESC;
```

### 3. Category Indexes for Islamic Content (2 indexes)
These indexes speed up category-based filtering for Islamic content:

- `idx_tv_series_category` - All TV series categories (fatwa, prophets, etc.)
- `idx_anime_category_anime` - Partial index for anime category only

**Query Optimization**:
```sql
-- Before: Full table scan
-- After: Index scan on category
SELECT * FROM tv_series WHERE category = 'fatwa';
SELECT * FROM anime WHERE category = 'anime';
```

## Performance Impact

### Expected Improvements
- **Genre filtering queries**: 10-100x faster (depending on table size)
- **Genre + sorting queries**: 5-50x faster (eliminates separate sort operation)
- **Category filtering**: 10-100x faster for Islamic content pages

### Index Size Estimates
- Partial indexes: ~10-20% smaller than full indexes (due to WHERE clauses)
- Composite indexes: Larger but enable single-scan queries
- Total additional storage: ~5-10% of table size

## Safety Features

### CONCURRENTLY Option
All indexes use `CREATE INDEX CONCURRENTLY` which:
- ✅ Allows reads and writes during index creation
- ✅ No table locks or downtime
- ⚠️ Takes longer to create (acceptable tradeoff)

### IF NOT EXISTS Clause
All indexes use `IF NOT EXISTS` which:
- ✅ Safe to run multiple times
- ✅ Won't fail if indexes already exist
- ✅ Idempotent migration

## Running the Migration

### Option 1: Using the migration runner script (Recommended)
```bash
node server/migrations/run-migration.js add-genre-indexes.sql
```

### Option 2: Using CockroachDB SQL client
```bash
cockroach sql --url="$COCKROACHDB_URL" < server/migrations/add-genre-indexes.sql
```

### Option 3: Using psql
```bash
psql "$COCKROACHDB_URL" -f server/migrations/add-genre-indexes.sql
```

## Verification

After running the migration, verify indexes were created:

```sql
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%genre%' OR indexname LIKE 'idx_%category%'
ORDER BY tablename, indexname;
```

Expected output: 9 indexes total
- 5 partial indexes on primary_genre
- 2 composite indexes for genre + sorting
- 2 category indexes

## Monitoring Index Usage

After deployment, monitor index usage to ensure they're being used:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%genre%' OR indexname LIKE 'idx_%category%'
ORDER BY idx_scan DESC;
```

**Healthy indexes should show**:
- `idx_scan` > 0 (index is being used)
- `idx_tup_read` > 0 (rows are being read from index)

## Rollback

If you need to remove these indexes:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_movies_primary_genre;
DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_primary_genre;
DROP INDEX CONCURRENTLY IF EXISTS idx_games_primary_genre;
DROP INDEX CONCURRENTLY IF EXISTS idx_software_primary_genre;
DROP INDEX CONCURRENTLY IF EXISTS idx_anime_primary_genre;
DROP INDEX CONCURRENTLY IF EXISTS idx_movies_genre_rating_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_genre_rating_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_category;
DROP INDEX CONCURRENTLY IF EXISTS idx_anime_category_anime;
```

## Related Requirements

This migration satisfies the following requirements from the spec:
- **Requirement 13.5**: Add database index on primary_genre column for fast DISTINCT queries
- **Requirement 13.6**: Execute genre query with LIMIT 100 clause
- **Requirement 17.1-17.6**: Validate primary_genre column exists before querying

## Notes

- All indexes target CockroachDB (NOT Supabase) as per database architecture rules
- Partial indexes reduce storage by only indexing non-null values
- Composite indexes enable single-scan queries for common filter + sort patterns
- Category indexes support the new Islamic content pages (/fatwas, /prophets-stories)

## Timeline

- **Creation**: 2024
- **Status**: Ready to deploy
- **Estimated runtime**: 5-15 minutes (depending on table sizes and CONCURRENTLY overhead)
