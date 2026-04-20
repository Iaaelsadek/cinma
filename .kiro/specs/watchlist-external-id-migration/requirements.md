# Requirements Document: Watchlist External ID Migration

## Introduction

This feature migrates the watchlist, continue_watching, and history tables in Supabase from using internal content_id (integer) to external_id (TMDB ID string). This migration is necessary because content data has moved to CockroachDB with UUIDs and external_id references, making the current integer content_id references invalid.

The solution maintains the architectural principle: **Supabase = Auth & User Data ONLY**, **CockroachDB = ALL Content**. User data (watchlist, continue_watching, history) remains in Supabase but will reference content using TMDB IDs instead of internal IDs.

## Glossary

- **Supabase**: PostgreSQL database used exclusively for authentication and user-related data
- **CockroachDB**: Primary database containing all content (movies, tv_series, seasons, episodes, etc.)
- **Watchlist**: User's list of saved content they want to watch later
- **Continue_Watching**: User's progress tracking for partially watched content
- **History**: User's complete viewing history
- **External_ID**: The TMDB (The Movie Database) ID used to identify content across systems
- **TMDB**: The Movie Database - external content metadata provider
- **Content_Type**: Type of content - 'movie' or 'tv'
- **External_Source**: Source of the external ID - 'tmdb', 'imdb', etc.
- **Migration_Script**: SQL script that transforms existing data to new schema
- **Backend_API**: Express.js server that queries CockroachDB
- **Frontend_Component**: React component that displays user data

## Requirements

### Requirement 1: Migrate Watchlist Schema

**User Story:** As a developer, I want to migrate the watchlist table schema from content_id to external_id, so that watchlist entries reference TMDB IDs instead of invalid internal IDs.

#### Acceptance Criteria

1. THE Watchlist_Table SHALL store external_id (TEXT) instead of content_id (INTEGER)
2. THE Watchlist_Table SHALL include external_source (TEXT) column with default value 'tmdb'
3. WHEN a user adds content to watchlist, THE System SHALL store the TMDB ID in external_id
4. THE Migration_Script SHALL preserve existing watchlist data by mapping content_id to external_id
5. THE Watchlist_Table SHALL maintain unique constraint on (user_id, external_id, content_type)

### Requirement 2: Migrate Continue Watching Schema

**User Story:** As a developer, I want to migrate the continue_watching table schema from content_id to external_id, so that progress tracking references TMDB IDs.

#### Acceptance Criteria

1. THE Continue_Watching_Table SHALL store external_id (TEXT) instead of content_id (INTEGER)
2. THE Continue_Watching_Table SHALL include external_source (TEXT) column with default value 'tmdb'
3. WHEN a user's progress is saved, THE System SHALL store the TMDB ID in external_id
4. THE Migration_Script SHALL preserve existing progress data by mapping content_id to external_id
5. THE Continue_Watching_Table SHALL maintain unique constraint on (user_id, external_id, content_type)

### Requirement 3: Migrate History Schema

**User Story:** As a developer, I want to migrate the history table schema from content_id to external_id, so that viewing history references TMDB IDs.

#### Acceptance Criteria

1. THE History_Table SHALL store external_id (TEXT) instead of content_id (INTEGER)
2. THE History_Table SHALL include external_source (TEXT) column with default value 'tmdb'
3. WHEN a user's viewing history is recorded, THE System SHALL store the TMDB ID in external_id
4. THE Migration_Script SHALL preserve existing history data by mapping content_id to external_id
5. THE History_Table SHALL allow duplicate entries for same (user_id, external_id, content_type) with different timestamps

### Requirement 4: Create Data Migration Script

**User Story:** As a database administrator, I want a migration script that safely transforms existing data, so that no user data is lost during the schema change.

#### Acceptance Criteria

1. THE Migration_Script SHALL create backup tables before modifying schema
2. THE Migration_Script SHALL map existing content_id values to external_id by querying CockroachDB
3. WHEN content_id cannot be mapped, THE Migration_Script SHALL 
log the unmapped entry and skip it
4. THE Migration_Script SHALL add new columns (external_id, external_source) before dropping old columns
5. THE Migration_Script SHALL verify data integrity after migration completes

### Requirement 5: Update Watchlist Functions

**User Story:** As a developer, I want to update all watchlist-related functions to use external_id, so that the application works with the new schema.

#### Acceptance Criteria

1. THE addToWatchlist_Function SHALL accept external_id (string) instead of content_id (number)
2. THE removeFromWatchlist_Function SHALL accept external_id (string) instead of content_id (number)
3. THE isInWatchlist_Function SHALL accept external_id (string) instead of content_id (number)
4. THE getWatchlist_Function SHALL return external_id instead of content_id
5. WHEN watchlist functions are called, THE System SHALL use external_id for all database operations

### Requirement 6: Update Continue Watching Functions

**User Story:** As a developer, I want to update all continue_watching functions to use external_id, so that progress tracking works with the new schema.

#### Acceptance Criteria

1. THE upsertProgress_Function SHALL accept external_id (string) instead of content_id (number)
2. THE getProgress_Function SHALL accept external_id (string) instead of content_id (number)
3. THE getContinueWatching_Function SHALL return external_id instead of content_id
4. WHEN progress is saved, THE System SHALL store external_id in the database
5. WHEN progress is retrieved, THE System SHALL query by external_id

### Requirement 7: Update History Functions

**User Story:** As a developer, I want to update all history functions to use external_id, so that viewing history works with the new schema.

#### Acceptance Criteria

1. THE addHistory_Function SHALL accept external_id (string) instead of content_id (number)
2. THE getHistory_Function SHALL return external_id instead of content_id
3. WHEN viewing history is recorded, THE System SHALL store external_id in the database
4. WHEN viewing history is retrieved, THE System SHALL query by external_id
5. THE System SHALL maintain chronological order of history entries

### Requirement 8: Create Backend API Endpoint for Batch Content Lookup

**User Story:** As a frontend developer, I want an API endpoint that fetches multiple content items by external_ids, so that I can efficiently display watchlist/history with full content details.

#### Acceptance Criteria

1. THE Backend_API SHALL provide POST /api/content/batch endpoint
2. WHEN the endpoint receives array of {external_id, content_type} objects, THE Backend_API SHALL query CockroachDB for matching content
3. THE Backend_API SHALL return array of content objects with full details (title, poster_url, slug, etc.)
4. WHEN external_id is not found in CockroachDB, THE Backend_API SHALL return null for that entry
5. THE Backend_API SHALL support batch sizes up to 100 items per request

### Requirement 9: Update Frontend Components

**User Story:** As a user, I want my watchlist, continue watching, and history to display correctly after the migration, so that I can access my saved content.

#### Acceptance Criteria

1. WHEN Profile page loads watchlist, THE Frontend_Component SHALL fetch external_ids from Supabase then query CockroachDB for full content
2. WHEN MovieDetails page checks watchlist status, THE Frontend_Component SHALL use TMDB ID instead of internal ID
3. WHEN SeriesDetails page checks watchlist status, THE Frontend_Component SHALL use TMDB ID instead of internal ID
4. WHEN VideoCard component toggles watchlist, THE Frontend_Component SHALL use TMDB ID instead of internal ID
5. WHEN MovieCard component toggles watchlist, THE Frontend_Component SHALL use TMDB ID instead of internal ID

### Requirement 10: Update Database Indexes

**User Story:** As a database administrator, I want optimized indexes on the new external_id columns, so that queries remain performant after migration.

#### Acceptance Criteria

1. THE Watchlist_Table SHALL have index on (user_id, external_id, content_type)
2. THE Continue_Watching_Table SHALL have index on (user_id, external_id, content_type)
3. THE History_Table SHALL have index on (user_id, external_id, content_type)
4. THE Watchlist_Table SHALL have index on (external_id, content_type) for reverse lookups
5. THE Migration_Script SHALL create all indexes after data migration completes

### Requirement 11: Handle Edge Cases

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that the migration doesn't break existing functionality.

#### Acceptance Criteria

1. WHEN content is deleted from CockroachDB, THE System SHALL still display watchlist entries with placeholder data
2. WHEN external_id is null or empty, THE System SHALL reject the operation with descriptive error
3. WHEN duplicate watchlist entries exist after migration, THE Migration_Script SHALL deduplicate by keeping the most recent entry
4. WHEN frontend receives null content from batch API, THE Frontend_Component SHALL display "Content Unavailable" message
5. WHEN user adds content without TMDB ID, THE System SHALL reject the operation with error message

### Requirement 12: Maintain Backward Compatibility During Transition

**User Story:** As a developer, I want a transition period where both old and new schemas work, so that deployment can be done safely without downtime.

#### Acceptance Criteria

1. THE Migration_Script SHALL add new columns without dropping old columns initially
2. THE System SHALL write to both content_id and external_id during transition period
3. THE System SHALL read from external_id if present, otherwise fall back to content_id
4. WHEN transition period ends, THE Migration_Script SHALL drop old content_id columns
5. THE System SHALL log warnings when falling back to content_id during transition

### Requirement 13: Update User Preferences Function

**User Story:** As a recommendation system, I want getUserPreferences to return external_ids, so that content recommendations work with the new schema.

#### Acceptance Criteria

1. THE getUserPreferences_Function SHALL return external_id instead of content_id in history array
2. THE getUserPreferences_Function SHALL return external_id instead of content_id in watchlist array
3. WHEN recommendation system receives preferences, THE System SHALL use external_ids to query CockroachDB
4. THE getUserPreferences_Function SHALL maintain the same return structure with only ID field changed
5. THE System SHALL handle cases where external_id is null by excluding those entries

### Requirement 14: Update Playlist Functions

**User Story:** As a user, I want my playlists to work with the new external_id system, so that I can continue organizing my content.

#### Acceptance Criteria

1. THE addPlaylistItem_Function SHALL accept external_id (string) instead of content_id (number)
2. THE Playlist_Items_Table SHALL store external_id (TEXT) instead of content_id (INTEGER)
3. THE Playlist_Items_Table SHALL include external_source (TEXT) column with default value 'tmdb'
4. THE Migration_Script SHALL migrate playlist_items table to use external_id
5. WHEN playlist items are displayed, THE System SHALL fetch content details from CockroachDB using external_ids

### Requirement 15: Update User Lists Functions

**User Story:** As a user, I want my custom lists to work with the new external_id system, so that my organized collections remain functional.

#### Acceptance Criteria

1. THE addItemToList_Function SHALL accept external_id (string) instead of content_id (number)
2. THE removeItemFromList_Function SHALL accept external_id (string) instead of content_id (number)
3. THE User_List_Items_Table SHALL store external_id (TEXT) instead of content_id (INTEGER)
4. THE User_List_Items_Table SHALL include external_source (TEXT) column with default value 'tmdb'
5. THE Migration_Script SHALL migrate user_list_items table to use external_id

### Requirement 16: Create Rollback Script

**User Story:** As a database administrator, I want a rollback script that can revert the migration, so that I can recover if issues are discovered.

#### Acceptance Criteria

1. THE Rollback_Script SHALL restore data from backup tables
2. THE Rollback_Script SHALL drop new columns (external_id, external_source)
3. THE Rollback_Script SHALL restore old indexes on content_id
4. THE Rollback_Script SHALL verify data integrity after rollback completes
5. THE Rollback_Script SHALL be tested before production deployment

### Requirement 17: Update Activity Feed Functions

**User Story:** As a user, I want my activity feed to display correctly after migration, so that my social interactions remain visible.

#### Acceptance Criteria

1. WHEN activity references content, THE Activity_Feed SHALL store external_id in metadata
2. WHEN activity is displayed, THE Frontend_Component SHALL fetch content details using external_id
3. THE addActivity_Function SHALL accept external_id in metadata for content-related activities
4. WHEN activity type is 'watch' or 'review', THE System SHALL include external_id in activity metadata
5. THE System SHALL handle missing content gracefully by showing placeholder in activity feed

### Requirement 18: Create Migration Verification Script

**User Story:** As a database administrator, I want a verification script that validates the migration, so that I can confirm data integrity.

#### Acceptance Criteria

1. THE Verification_Script SHALL count rows in old and new schema tables
2. THE Verification_Script SHALL verify all external_ids are valid TMDB IDs
3. THE Verification_Script SHALL check for null or empty external_id values
4. THE Verification_Script SHALL verify all indexes are created correctly
5. THE Verification_Script SHALL generate a report of any data inconsistencies

### Requirement 19: Update Documentation

**User Story:** As a developer, I want updated documentation that explains the new external_id system, so that I can work with the new schema correctly.

#### Acceptance Criteria

1. THE Documentation SHALL explain the difference between content_id and external_id
2. THE Documentation SHALL provide examples of using watchlist functions with external_id
3. THE Documentation SHALL document the batch content lookup API endpoint
4. THE Documentation SHALL explain the migration process and rollback procedure
5. THE Documentation SHALL include troubleshooting guide for common issues

### Requirement 20: Add Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging during migration, so that I can track progress and identify issues.

#### Acceptance Criteria

1. THE Migration_Script SHALL log start and end timestamps
2. THE Migration_Script SHALL log count of rows processed for each table
3. THE Migration_Script SHALL log any content_id values that cannot be mapped
4. THE System SHALL log errors when external_id operations fail
5. THE System SHALL track metrics for batch content lookup API performance

