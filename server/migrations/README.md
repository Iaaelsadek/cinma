# Database Migrations

This directory contains SQL migration files for the CockroachDB database.

## Running Migrations

### Option 1: Using CockroachDB SQL Client

```bash
# Connect to CockroachDB
cockroach sql --url="<your-cockroachdb-connection-string>"

# Run the migration
\i server/migrations/add-genre-indexes.sql
```

### Option 2: Using psql (PostgreSQL client)

```bash
# CockroachDB is PostgreSQL-compatible
psql "<your-cockroachdb-connection-string>" -f server/migrations/add-genre-indexes.sql
```

### Option 3: Using Node.js Script

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL
});

async function runMigration() {
  const sql = fs.readFileSync('server/migrations/add-genre-indexes.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration completed successfully');
  await pool.end();
}

runMigration().catch(console.error);
```

## Migration: add-genre-indexes.sql

**Purpose**: Add database indexes for genre filtering and sorting performance optimization.

**Indexes Created**:
- Partial indexes on `primary_genre` for all content tables (movies, tv_series, games, software, anime)
- Composite indexes for genre + rating + date sorting (movies, tv_series)
- Category indexes for Islamic content filtering (tv_series, anime)

**Features**:
- Uses `CREATE INDEX CONCURRENTLY` to avoid blocking production tables
- Partial indexes with WHERE clauses to reduce index size
- Composite indexes support filtering + sorting in single index scan

**Verification**:
After running the migration, verify indexes were created:

```sql
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%genre%' OR indexname LIKE 'idx_%category%'
ORDER BY tablename, indexname;
```

**Rollback**:
If you need to remove these indexes, run the DROP INDEX statements at the bottom of the migration file.

## Best Practices

1. **Always use CONCURRENTLY**: This prevents table locks during index creation
2. **Test in staging first**: Run migrations in a staging environment before production
3. **Monitor performance**: Check index usage after deployment using `pg_stat_user_indexes`
4. **Backup before migration**: Always have a backup before running migrations
5. **Document changes**: Update this README when adding new migrations

## Migration History

| Date | File | Description |
|------|------|-------------|
| 2024 | add-genre-indexes.sql | Add genre and category indexes for performance |
