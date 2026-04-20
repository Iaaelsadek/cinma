# Bugfix Requirements Document

## Introduction

This bugfix addresses multiple critical data integrity and display issues in the content system that prevent proper display of Arabic titles, overviews, and similar content. The issues stem from incomplete data ingestion where:

1. Arabic title columns exist but contain NULL values despite Arabic text being available in `original_title`
2. Overview language columns (`overview_ar`, `overview_en`) do not exist in the database schema, causing language mismatch
3. Similar content JSONB column remains empty despite related tables (`similar_movies`, `similar_tv_series`) containing valid data
4. Multiple genres may not be displayed properly on the frontend

These issues affect user experience by showing incorrect language content, missing recommendations, and incomplete metadata.

## Bug Analysis

### Current Behavior (Defect)

#### 1. Arabic Titles Missing

1.1 WHEN a movie has Arabic text in `original_title` THEN the system stores NULL in `title_ar` column instead of the Arabic text

1.2 WHEN ingestion scripts fetch movie data from TMDB THEN the system fails to populate `title_ar` with available Arabic translations

1.3 WHEN the database has `title_ar` column defined THEN the column contains NULL values for Arabic movies like "كلمة الحق"

#### 2. Overview Language Mismatch

2.1 WHEN the database schema is checked THEN `overview_ar` and `overview_en` columns do not exist in movies table

2.2 WHEN a single `overview` column exists THEN it contains English text instead of Arabic for Arabic content

2.3 WHEN the frontend expects Arabic overview THEN it receives English text causing language inconsistency

2.4 WHEN users view content in Arabic mode THEN they see English descriptions instead of Arabic

#### 3. Similar Content Not Populated

3.1 WHEN the `similar_content` JSONB column is queried THEN it returns empty array `[]` for all content

3.2 WHEN `similar_movies` and `similar_tv_series` tables contain valid relationship data THEN the main content tables do not reflect this data

3.3 WHEN the frontend requests similar content THEN no recommendations are displayed to users

3.4 WHEN ingestion scripts run THEN they do not populate the `similar_content` JSONB column from TMDB API

#### 4. Multiple Genres Display

4.1 WHEN content has multiple genres in the `genres` JSONB column THEN the frontend may only display the first genre

4.2 WHEN genre data exists in the database THEN the display logic may not iterate through all genres properly

### Expected Behavior (Correct)

#### 1. Arabic Titles Properly Stored

2.1 WHEN a movie has Arabic text in `original_title` and `original_language` is 'ar' THEN the system SHALL store that text in `title_ar` column

2.2 WHEN ingestion scripts fetch movie data from TMDB with Arabic translations THEN the system SHALL extract and store Arabic title in `title_ar`

2.3 WHEN the database has `title_ar` column THEN it SHALL contain the Arabic title for Arabic movies, not NULL

2.4 WHEN TMDB provides translations THEN the system SHALL map the Arabic translation to `title_ar` field

#### 2. Overview Available in Both Languages

2.5 WHEN the database schema is created or migrated THEN it SHALL include both `overview_ar` and `overview_en` columns

2.6 WHEN ingestion scripts fetch movie data THEN they SHALL fetch overview in both Arabic (ar-SA) and English (en-US) languages

2.7 WHEN storing overview data THEN the system SHALL populate both `overview_ar` and `overview_en` columns appropriately

2.8 WHEN the frontend displays content in Arabic mode THEN it SHALL show `overview_ar` if available, otherwise fallback to `overview_en`

2.9 WHEN the frontend displays content in English mode THEN it SHALL show `overview_en` if available, otherwise fallback to `overview_ar`

#### 3. Similar Content Populated from Related Tables

2.10 WHEN ingestion scripts fetch movie data from TMDB THEN they SHALL fetch similar content using the `/movie/{id}/similar` endpoint

2.11 WHEN similar content is fetched THEN the system SHALL store it in the `similar_content` JSONB column as an array of content references

2.12 WHEN `similar_movies` or `similar_tv_series` tables have data THEN a migration script SHALL populate the `similar_content` JSONB column from these tables

2.13 WHEN the frontend requests similar content THEN it SHALL receive a populated array with at least 5-10 similar items if available

2.14 WHEN displaying similar content THEN the system SHALL show content posters, titles, and basic metadata

#### 4. All Genres Displayed

2.15 WHEN content has multiple genres in the `genres` JSONB column THEN the frontend SHALL display all genres, not just the first one

2.16 WHEN rendering genre badges THEN the system SHALL iterate through the entire genres array

### Unchanged Behavior (Regression Prevention)

#### 1. Existing Title Display Logic

3.1 WHEN `title_en` column has valid data THEN the system SHALL CONTINUE TO display English titles correctly

3.2 WHEN slug generation uses English titles THEN the system SHALL CONTINUE TO generate clean URL-friendly slugs

3.3 WHEN the `useTripleTitles` or `useDualTitles` hooks are used THEN they SHALL CONTINUE TO work with the updated data structure

#### 2. Existing Data Integrity

3.4 WHEN existing movies have valid data in other columns THEN the migration SHALL CONTINUE TO preserve all existing data

3.5 WHEN the database has foreign key relationships THEN the migration SHALL CONTINUE TO maintain referential integrity

3.6 WHEN content has cast, crew, or other metadata THEN the migration SHALL CONTINUE TO preserve all related data

#### 3. API Endpoints Functionality

3.7 WHEN API endpoints like `/api/movies/:slug` are called THEN they SHALL CONTINUE TO return complete movie data

3.8 WHEN the content API returns data THEN it SHALL CONTINUE TO include all existing fields plus the new overview columns

3.9 WHEN caching is enabled THEN the system SHALL CONTINUE TO cache responses appropriately

#### 4. Frontend Display Components

3.10 WHEN MovieCard components render THEN they SHALL CONTINUE TO display posters, titles, and ratings correctly

3.11 WHEN the Watch page loads THEN it SHALL CONTINUE TO display all existing sections (cast, details, player)

3.12 WHEN language switching occurs THEN the system SHALL CONTINUE TO update UI text appropriately

#### 5. Ingestion Script Core Logic

3.13 WHEN ingestion scripts filter content by runtime THEN they SHALL CONTINUE TO apply the >= 40 minutes rule for movies

3.14 WHEN ingestion scripts filter content by date THEN they SHALL CONTINUE TO skip content released less than 1 month ago

3.15 WHEN ingestion scripts check for duplicates THEN they SHALL CONTINUE TO use `external_id` and `external_source` for deduplication

3.16 WHEN ingestion scripts generate slugs THEN they SHALL CONTINUE TO use English titles only as per SLUG_GENERATION_RULES.md
