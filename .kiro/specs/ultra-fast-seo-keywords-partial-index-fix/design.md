# bulkInsertSEOKeywords Partial Index Fallback Bugfix Design

## Overview

This design document formalizes the fix for the `bulkInsertSEOKeywords` function across 5 ULTRA_FAST ingestion scripts. The bug occurs when the partial unique index `keywords_name_seo_idx` doesn't exist in the database, causing INSERT queries with `ON CONFLICT (name) WHERE tmdb_id IS NULL` to fail silently. The fix implements a try-catch fallback mechanism that attempts the partial index approach first, then falls back to a simple `ON CONFLICT (name)` strategy if the partial index is missing.

The fix ensures SEO keywords are always inserted successfully regardless of database index configuration, while maintaining optimal performance when the partial index exists.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the partial index `keywords_name_seo_idx` does not exist in the database
- **Property (P)**: The desired behavior - SEO keywords should be inserted successfully using a fallback strategy
- **Preservation**: Existing behavior when the partial index exists, caching mechanism, and linking logic must remain unchanged
- **bulkInsertSEOKeywords**: The function in all ULTRA_FAST scripts that inserts SEO keywords in bulk for performance optimization
- **Partial Index**: A unique index on `keywords(name)` with condition `WHERE tmdb_id IS NULL` that allows duplicate names for TMDB keywords
- **keywordCache**: An in-memory Map that caches keyword name-to-ID mappings to avoid repeated database lookups
- **SEO Keywords**: User-generated keywords without TMDB IDs, used for search engine optimization

## Bug Details

### Bug Condition

The bug manifests when the partial unique index `keywords_name_seo_idx` does not exist in the database. The `bulkInsertSEOKeywords` function attempts to execute an INSERT query with `ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING`, which requires a partial index to work. Without this index, PostgreSQL/CockroachDB throws an error: "there is no unique or exclusion constraint matching the ON CONFLICT specification", causing the function to fail silently and SEO keywords to not be inserted.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type DatabaseState
  OUTPUT: boolean
  
  RETURN NOT indexExists('keywords_name_seo_idx')
         AND queryContains('ON CONFLICT (name) WHERE tmdb_id IS NULL')
         AND NOT keywordsInserted()
END FUNCTION
```

### Examples

- **Example 1**: Database without partial index + movie with 15 SEO keywords → INSERT fails silently, 0 keywords inserted, movie has no searchable keywords
- **Example 2**: Database without partial index + TV series with 20 SEO keywords → INSERT fails silently, 0 keywords inserted, series not discoverable via SEO
- **Example 3**: Database with partial index + movie with 15 SEO keywords → INSERT succeeds, 15 keywords inserted (expected behavior)
- **Edge Case**: Database without partial index + empty keywords array → Function returns early without error (expected behavior)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When the partial index `keywords_name_seo_idx` exists, the function must continue using `ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING` as the primary strategy
- The `keywordCache` Map must continue to cache keyword name-to-ID mappings after successful insertion
- The linking of keywords to movies/series via `INSERT INTO movie_keywords ... ON CONFLICT DO NOTHING` must remain unchanged
- Early return when keywords array is empty must continue to work
- TMDB keywords (with tmdb_id) must continue using the separate `bulkInsertTMDBKeywords` function

**Scope:**
All database operations that do NOT involve SEO keyword insertion should be completely unaffected by this fix. This includes:
- TMDB keyword insertion (handled by separate function)
- Movie/series metadata insertion
- Actor and genre linking
- All other database operations in the ingestion scripts

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Partial Index**: The database schema may not have the `keywords_name_seo_idx` partial index created
   - Fresh database installations may be missing the index
   - Database migrations may not have run completely
   - Manual schema changes may have dropped the index

2. **PostgreSQL/CockroachDB Constraint Matching**: The `ON CONFLICT` clause with a `WHERE` condition requires an exact matching partial unique index
   - A regular unique index on `name` is not sufficient
   - The WHERE clause must match exactly: `WHERE tmdb_id IS NULL`

3. **Silent Failure**: The original code did not have error handling, causing the function to fail silently
   - No try-catch block to detect the error
   - No logging to indicate the failure
   - Subsequent code assumes keywords were inserted successfully

4. **Cache Inconsistency**: When insertion fails, the cache is not updated, but the function continues
   - The SELECT query returns no rows (keywords weren't inserted)
   - The cache remains empty for those keywords
   - Linking step fails silently because keywordIds array is empty

## Correctness Properties

Property 1: Bug Condition - Fallback Strategy Success

_For any_ database state where the partial index `keywords_name_seo_idx` does not exist, the fixed bulkInsertSEOKeywords function SHALL catch the "there is no unique or exclusion constraint" error and successfully retry the INSERT using `ON CONFLICT (name) DO UPDATE SET updated_at = NOW()`, ensuring all SEO keywords are inserted into the database.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Optimal Path When Index Exists

_For any_ database state where the partial index `keywords_name_seo_idx` exists, the fixed function SHALL execute the INSERT with `ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING` without entering the catch block, preserving the optimal performance path and exact behavior of the original function.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Files**: All 5 ULTRA_FAST ingestion scripts
- `scripts/ingestion/02_seed_movies_arabic_ULTRA_FAST.js`
- `scripts/ingestion/03_seed_movies_foreign_ULTRA_FAST.js`
- `scripts/ingestion/04_seed_tv_series_ULTRA_FAST.js`
- `scripts/ingestion/05_seed_anime_ULTRA_FAST.js`
- `scripts/ingestion/00_SPEED_TEST.js`

**Function**: `bulkInsertSEOKeywords`

**Specific Changes**:

1. **Wrap INSERT Query in Try-Catch Block**: Add error handling around the partial index INSERT
   - Wrap the `ON CONFLICT (name) WHERE tmdb_id IS NULL` query in a try block
   - Catch any errors thrown by the database

2. **Detect Partial Index Missing Error**: Check error message for specific constraint error
   - Check if `error.message.includes('there is no unique or exclusion constraint')`
   - This is the exact error message when partial index is missing

3. **Implement Fallback Strategy**: Retry with simple ON CONFLICT clause
   - Execute `ON CONFLICT (name) DO UPDATE SET updated_at = NOW()`
   - This works with the regular unique index on `name` column
   - Updates timestamp to indicate the keyword was accessed

4. **Rethrow Other Errors**: Preserve error handling for genuine database errors
   - If error is not the partial index error, throw it to caller
   - This ensures other database issues are not silently ignored

5. **Maintain Cache and Linking Logic**: No changes to subsequent steps
   - SELECT query to fetch inserted keyword IDs remains unchanged
   - Cache update logic remains unchanged
   - Linking to movies/series remains unchanged

### Code Pattern (Applied to All 5 Scripts)

```javascript
async function bulkInsertSEOKeywords(keywords, contentUUID) {
  if (!keywords.length) return;

  const uncachedKeywords = keywords.filter(k => !keywordCache.has(`seo_${k}`));

  if (uncachedKeywords.length > 0) {
    const keywordValues = uncachedKeywords
      .map((_, i) => `(gen_random_uuid(), $${i + 1}, NOW(), NOW())`)
      .join(', ');

    try {
      // Try with partial index first (optimal path)
      await pool.query(
        `INSERT INTO keywords (id, name, created_at, updated_at)
         VALUES ${keywordValues}
         ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING`,
        uncachedKeywords
      );
    } catch (error) {
      // Fallback: Use simple ON CONFLICT without partial index
      if (error.message.includes('there is no unique or exclusion constraint')) {
        await pool.query(
          `INSERT INTO keywords (id, name, created_at, updated_at)
           VALUES ${keywordValues}
           ON CONFLICT (name) DO UPDATE SET updated_at = NOW()`,
          uncachedKeywords
        );
      } else {
        throw error; // Rethrow other errors
      }
    }

    // Rest of function unchanged (SELECT, cache update, linking)
    // ...
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create a test database without the partial index, run the UNFIXED code with SEO keywords, and observe the failure. Verify that the error message matches "there is no unique or exclusion constraint".

**Test Cases**:
1. **Missing Index Test**: Drop partial index, run unfixed code with 10 SEO keywords (will fail on unfixed code)
2. **Error Message Verification**: Capture the exact error message thrown by the database (will show constraint error on unfixed code)
3. **Silent Failure Test**: Verify that keywords are not inserted and cache is empty after failure (will fail on unfixed code)
4. **Linking Failure Test**: Verify that movie_keywords linking fails because keyword IDs are not found (will fail on unfixed code)

**Expected Counterexamples**:
- INSERT query throws error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
- Zero keywords inserted into database despite non-empty keywords array
- keywordCache remains empty for the attempted keywords
- movie_keywords table has no entries for the content

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (partial index missing), the fixed function produces the expected behavior (successful insertion via fallback).

**Pseudocode:**
```
FOR ALL databaseState WHERE NOT indexExists('keywords_name_seo_idx') DO
  keywords := generateSEOKeywords(10)
  result := bulkInsertSEOKeywords_fixed(keywords, contentUUID)
  ASSERT keywordsInsertedSuccessfully(keywords)
  ASSERT keywordsCachedCorrectly(keywords)
  ASSERT keywordsLinkedToContent(keywords, contentUUID)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (partial index exists), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL databaseState WHERE indexExists('keywords_name_seo_idx') DO
  keywords := generateSEOKeywords(10)
  ASSERT bulkInsertSEOKeywords_original(keywords, contentUUID) = 
         bulkInsertSEOKeywords_fixed(keywords, contentUUID)
  ASSERT noCatchBlockExecuted()
  ASSERT optimalPathUsed()
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all scenarios with partial index

**Test Plan**: Observe behavior on UNFIXED code first with partial index present, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Optimal Path Preservation**: Verify that when partial index exists, the try block succeeds and catch block is never entered
2. **Cache Behavior Preservation**: Verify that cache is updated identically to original function
3. **Linking Behavior Preservation**: Verify that movie_keywords entries are identical to original function
4. **Empty Array Preservation**: Verify that empty keywords array still returns early without any queries

### Unit Tests

- Test with partial index present: verify try block succeeds, catch block not entered
- Test with partial index missing: verify catch block executes fallback query
- Test with empty keywords array: verify early return without queries
- Test with all cached keywords: verify no INSERT query executed
- Test with mixed cached/uncached keywords: verify only uncached keywords inserted
- Test error message detection: verify correct identification of partial index error
- Test other database errors: verify they are rethrown correctly

### Property-Based Tests

- Generate random keyword arrays (0-50 keywords) and verify successful insertion regardless of index presence
- Generate random database states (with/without partial index) and verify correct behavior
- Generate random cache states and verify cache is updated correctly after insertion
- Test that all keywords are eventually linked to content across many scenarios

### Integration Tests

- Test full movie ingestion flow with SEO keywords in database without partial index
- Test full TV series ingestion flow with SEO keywords in database without partial index
- Test switching between databases with and without partial index (verify no errors)
- Test that ingestion scripts complete successfully on fresh database installations
- Test that performance is identical when partial index exists (no regression)
