# Bugfix Requirements Document

## Introduction

The `bulkInsertSEOKeywords` function in all ULTRA_FAST ingestion scripts uses `ON CONFLICT (name) WHERE tmdb_id IS NULL` which requires a partial unique index on the `keywords` table. When this index doesn't exist in the database, the INSERT query fails with the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification". This causes SEO keywords to not be inserted into the database, resulting in missing keyword data for movies.

The bug affects 5 ingestion scripts:
- `scripts/ingestion/02_seed_movies_arabic_ULTRA_FAST.js`
- `scripts/ingestion/03_seed_movies_foreign_ULTRA_FAST.js`
- `scripts/ingestion/04_seed_tv_series_ULTRA_FAST.js`
- `scripts/ingestion/05_seed_anime_ULTRA_FAST.js`
- `scripts/ingestion/00_SPEED_TEST.js`

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the partial index `keywords_name_seo_idx` does not exist in the database THEN the system fails silently when executing `INSERT INTO keywords ... ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING`

1.2 WHEN the INSERT query fails due to missing partial index THEN the system does not insert SEO keywords into the database

1.3 WHEN the error occurs THEN the system does not log or report the failure, making it difficult to diagnose

### Expected Behavior (Correct)

2.1 WHEN the partial index `keywords_name_seo_idx` does not exist in the database THEN the system SHALL fallback to using `ON CONFLICT (name) DO UPDATE SET updated_at = NOW()` instead

2.2 WHEN the INSERT query is executed with the fallback strategy THEN the system SHALL successfully insert SEO keywords into the database

2.3 WHEN the error message contains "there is no unique or exclusion constraint" THEN the system SHALL catch the error and retry with the fallback strategy

2.4 WHEN any other database error occurs THEN the system SHALL throw the error to be handled by the caller

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the partial index `keywords_name_seo_idx` exists in the database THEN the system SHALL CONTINUE TO use `ON CONFLICT (name) WHERE tmdb_id IS NULL DO NOTHING` as the primary strategy

3.2 WHEN SEO keywords are successfully inserted THEN the system SHALL CONTINUE TO cache them in the `keywordCache` Map

3.3 WHEN SEO keywords are linked to movies THEN the system SHALL CONTINUE TO use `INSERT INTO movie_keywords ... ON CONFLICT DO NOTHING`

3.4 WHEN the function processes an empty keywords array THEN the system SHALL CONTINUE TO return early without executing any queries

3.5 WHEN TMDB keywords (with tmdb_id) are inserted THEN the system SHALL CONTINUE TO use the existing `bulkInsertTMDBKeywords` function without modification
