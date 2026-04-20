# Implementation Plan: Content Sections Restructure

## Overview

This implementation plan breaks down the comprehensive restructuring of all content sections into actionable coding tasks. The goal is to ensure all data is fetched exclusively from CockroachDB, fix wrong content in /movies/summaries, /series/ramadan, /plays sections, and restructure all sections with proper language-based filtering.

The implementation follows 8 migration phases over approximately 3 weeks, with incremental validation and testing at each step.

## Tasks

- [x] 1. Phase 1: Database Schema Updates
  - [x] 1.1 Add new columns to movies table
    - Execute SQL to add primary_genre, category, target_audience, keywords columns
    - Use ALTER TABLE with IF NOT EXISTS to avoid conflicts
    - _Requirements: 1.1, 2.2, 3.2, 10.1, 10.2, 10.3_
  
  - [x] 1.2 Add new columns to tv_series table
    - Execute SQL to add primary_genre, category, target_audience, keywords columns
    - Use ALTER TABLE with IF NOT EXISTS to avoid conflicts
    - _Requirements: 1.2, 5.1, 5.2, 5.3, 6.1, 10.4, 10.5_
  
  - [x] 1.3 Add new columns to games and software tables
    - Add primary_genre and primary_platform to games table
    - Add primary_platform and category to software table
    - _Requirements: 1.3, 1.4_
  
  - [x] 1.4 Create database indexes for performance
    - Create indexes on primary_genre, category, original_language for movies
    - Create indexes on primary_genre, original_language for tv_series
    - Create indexes on primary_genre, primary_platform for games
    - Create indexes on primary_platform, category for software
    - Use CREATE INDEX CONCURRENTLY to avoid blocking
    - _Requirements: 9.5, 9.6_
  
  - [x] 1.5 Verify database schema updates
    - Create and run scripts/check-db-schema.js to verify all columns exist
    - Verify all indexes are created successfully
    - Log results to console
    - _Requirements: 1.1, 1.2, 1.3, 1.4_


- [x] 2. Phase 2: Data Population
  - [x] 2.1 Create content population script structure
    - Create scripts/populate-content-sections.js with TMDB API integration
    - Implement rate limiting (250ms delay between requests)
    - Add dry-run mode support with --dry-run flag
    - Implement error handling and logging
    - _Requirements: 14.1, 14.7, 14.8, 14.9_
  
  - [x] 2.2 Implement Arabic movies population function
    - Fetch Arabic movies from TMDB discover API (original_language='ar')
    - Fetch 5 pages (~100 movies) sorted by popularity
    - Insert into movies table with proper primary_genre mapping
    - Use ON CONFLICT to update existing records
    - _Requirements: 10.3, 14.1_
  
  - [x] 2.3 Implement Arabic plays population function
    - Search TMDB for play keywords (مسرحية, عادل إمام, مسرح مصر)
    - Filter results for original_language='ar'
    - Insert with primary_genre='play' and category='play'
    - Target at least 50 plays
    - _Requirements: 3.1, 3.2, 10.1, 14.2_
  
  - [x] 2.4 Implement Korean dramas population function
    - Fetch Korean TV series from TMDB (original_language='ko')
    - Fetch 3 pages (~60 series) sorted by popularity
    - Insert with primary_genre='k-drama'
    - _Requirements: 5.3, 10.5, 14.3_
  
  - [x] 2.5 Implement Turkish series population function
    - Fetch Turkish TV series from TMDB (original_language='tr')
    - Fetch 2 pages (~40 series) sorted by popularity
    - Insert with primary_genre='turkish-drama'
    - _Requirements: 5.5, 10.6, 14.4_
  
  - [x] 2.6 Implement classic movies population function
    - Fetch movies from each decade (1950s-1990s)
    - Filter by vote_count >= 50 and release_date < 2000
    - Fetch top 10 per decade sorted by vote_average
    - Set category='classic'
    - _Requirements: 8.1, 8.5, 10.7, 14.5_
  
  - [x] 2.7 Implement anime content population function
    - Search TMDB for anime keywords
    - Set primary_genre='anime'
    - Target at least 30 titles
    - _Requirements: 7.1, 10.8, 14.6_
  
  - [x] 2.8 Run population script and verify data
    - Run script in dry-run mode first
    - Review output and adjust if needed
    - Run actual population
    - Execute SQL queries to verify counts for each section
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [x] 2.9 Update existing data with primary_genre
    - Write SQL to update primary_genre based on genres JSONB field
    - Map TMDB genre IDs to primary_genre values
    - Update category='classic' for pre-2000 movies with vote_count >= 50
    - _Requirements: 2.2, 3.2, 8.1_


- [x] 3. Phase 3: API Endpoints Updates
  - [x] 3.1 Verify and enhance GET /api/movies endpoint
    - Verify support for genre, language, yearFrom, yearTo, ratingFrom, ratingTo parameters
    - Add category parameter support
    - Implement proper parameter validation (year: 1900-2100, rating: 0-10)
    - Ensure parameterized queries to prevent SQL injection
    - Add response caching with NodeCache (5 minute TTL)
    - _Requirements: 9.1, 9.5, 9.6, 9.7_
  
  - [x] 3.2 Verify and enhance GET /api/tv endpoint
    - Verify support for same filter parameters as movies
    - Use first_air_date instead of release_date for year filtering
    - Implement parameter validation
    - Add response caching
    - _Requirements: 9.2, 9.5, 9.6, 9.7_
  
  - [x] 3.3 Verify GET /api/games and /api/software endpoints
    - Verify games endpoint supports genre and platform filters
    - Verify software endpoint supports platform and category filters
    - Add caching for both endpoints
    - _Requirements: 9.3, 9.4_
  
  - [x] 3.4 Test all API endpoints with various filter combinations
    - Test movies with language=ar
    - Test movies with genre=play&language=ar
    - Test movies with genre=summary
    - Test movies with yearTo=1999&ratingFrom=7
    - Test TV with language=ko, tr, zh
    - Test combined filters (language + genre + year + rating)
    - Verify pagination metadata accuracy
    - _Requirements: 2.1, 2.2, 3.1, 4.1, 4.2, 5.3, 5.5, 8.1, 9.6_
  
  - [x] 3.5 Add performance monitoring to API endpoints
    - Log response time for each request
    - Include _performance metadata in responses
    - Monitor cache hit rates
    - _Requirements: 13.4_

- [x] 4. Checkpoint - Verify API layer is working correctly
  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Phase 4: Service Layer Updates
  - [x] 5.1 Update contentQueries.ts getMovies function
    - Ensure ContentFilters interface includes genres, minRating, minYear, maxYear, language, minVoteCount
    - Build query parameters from filters object
    - Make fetch request to /api/movies with proper query string
    - Return data with pagination metadata
    - Add error handling with console logging
    - _Requirements: 1.5, 9.1, 13.4_
  
  - [x] 5.2 Update contentQueries.ts getTVSeries function
    - Implement same filter logic as getMovies
    - Use /api/tv endpoint
    - Handle first_air_date vs release_date differences
    - _Requirements: 1.5, 9.2_
  
  - [x] 5.3 Add helper function getPlays to contentQueries.ts
    - Accept optional subCategory parameter (adel-imam, classics, gulf, masrah-masr)
    - Set filters: genres=['play'], language='ar'
    - Add maxYear=1999 for classics subcategory
    - Return movies sorted by popularity
    - _Requirements: 3.1, 3.2, 3.3, 11.2_
  
  - [x] 5.4 Add helper function getSummaries to contentQueries.ts
    - Set filters: genres=['summary']
    - Sort by release_date DESC
    - Return paginated results
    - _Requirements: 2.1, 2.2, 11.1_
  
  - [x] 5.5 Add helper function getClassics to contentQueries.ts
    - Set filters: maxYear=1999, minVoteCount=50
    - Sort by vote_average DESC
    - Return paginated results
    - _Requirements: 8.1, 8.4, 8.5, 11.3_
  
  - [x] 5.6 Add helper function getKDramas to contentQueries.ts
    - Set filters: language='ko'
    - Use getTVSeries internally
    - Sort by popularity DESC
    - _Requirements: 5.3, 11.5_
  
  - [x] 5.7 Add helper functions for Turkish and Chinese series
    - Create getTurkishSeries with language='tr'
    - Create getChineseSeries with language='zh'
    - Both use getTVSeries internally
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 5.8 Write unit tests for contentQueries service
    - Test getMovies with various filter combinations
    - Test getTVSeries with language filters
    - Test helper functions (getPlays, getSummaries, getClassics)
    - Test error handling for API failures
    - Mock fetch calls to avoid actual API requests


- [x] 6. Phase 5: Frontend Component Updates
  - [x] 6.1 Update PlaysPage component (src/pages/discovery/Plays.tsx)
    - Replace any TMDB search calls with contentQueries.getPlays()
    - Use useQuery hook with queryKey ['plays']
    - Implement client-side filtering for subcategories (Adel Imam, classics, gulf)
    - Filter by keywords or production_countries for subcategories
    - Display with QuantumHero and QuantumTrain components
    - Add PageLoader for loading state
    - _Requirements: 3.1, 3.2, 3.3, 11.2_
  
  - [x] 6.2 Update SummariesPage component (src/pages/discovery/Summaries.tsx)
    - Replace any Supabase videos queries with contentQueries.getSummaries()
    - Use useQuery hook with queryKey ['summaries']
    - Display summaries sorted by release_date DESC
    - Use type="video" for QuantumTrain
    - Remove any references to FALLBACK_SUMMARIES constant
    - _Requirements: 2.1, 2.2, 2.6, 11.1, 12.1_
  
  - [x] 6.3 Update ClassicsPage component (src/pages/discovery/Classics.tsx)
    - Use contentQueries.getClassics()
    - Use useQuery hook with queryKey ['classics']
    - Display movies sorted by vote_average DESC
    - Add decade filtering UI if needed
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 11.3_
  
  - [x] 6.4 Update ArabicMoviesPage component (src/pages/discovery/ArabicMovies.tsx)
    - Use contentQueries.getMovies({ language: 'ar' })
    - Use useQuery hook with queryKey ['arabic-movies']
    - Display with proper Arabic content layout
    - _Requirements: 4.1, 4.6, 11.4_
  
  - [x] 6.5 Update ForeignMoviesPage component
    - Use contentQueries.getMovies with language filter excluding ar and hi
    - Implement NOT IN logic for language filtering
    - _Requirements: 4.2_
  
  - [x] 6.6 Update IndianMoviesPage component
    - Use contentQueries.getMovies({ language: 'hi' })
    - Display Bollywood content
    - _Requirements: 4.3_
  
  - [x] 6.7 Update KDramaPage component (src/pages/discovery/KDrama.tsx)
    - Use contentQueries.getKDramas()
    - Use useQuery hook with queryKey ['k-drama']
    - Display Korean series with proper layout
    - _Requirements: 5.3, 11.5_
  
  - [x] 6.8 Update TurkishSeriesPage component
    - Use contentQueries.getTurkishSeries()
    - Use useQuery hook with queryKey ['turkish-series']
    - _Requirements: 5.5_
  
  - [x] 6.9 Update ChineseSeriesPage component
    - Use contentQueries.getChineseSeries()
    - Use useQuery hook with queryKey ['chinese-series']
    - _Requirements: 5.4_
  
  - [x] 6.10 Update RamadanPage component (src/pages/discovery/Ramadan.tsx)
    - Use contentQueries.getTVSeries({ language: 'ar', genres: ['ramadan'] })
    - Sort by first_air_date DESC
    - Add year filtering for specific Ramadan seasons
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 6.11 Add error handling to all page components
    - Display error messages when API fails
    - Provide retry button
    - Show empty state when no results found
    - Add fallback images for missing posters
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_


- [x] 7. Checkpoint - Verify all frontend pages display correct content
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Phase 6: Legacy Code Removal
  - [x] 8.1 Remove FALLBACK_SUMMARIES constant
    - Search codebase for FALLBACK_SUMMARIES references
    - Remove constant definition and all usages
    - Verify summaries page still works with database data
    - _Requirements: 2.7, 12.1_
  
  - [x] 8.2 Remove hardcoded query constants
    - Search for ADEL_IMAM_QUERY, CLASSICS_QUERY, GULF_QUERY constants
    - Remove these constants from codebase
    - Verify plays page uses database queries instead
    - _Requirements: 3.6, 12.2_
  
  - [x] 8.3 Remove direct TMDB search functions
    - Find and remove fetchPlays() function that uses TMDB search
    - Remove any other direct TMDB API calls for content display
    - Keep TMDB calls only in ingestion scripts
    - _Requirements: 3.7, 12.3_
  
  - [x] 8.4 Remove or update useCategoryVideos hook
    - If used for content, replace with CockroachDB API calls
    - If used for non-content data, update to use /api/videos endpoint
    - Remove Supabase queries from this hook
    - _Requirements: 11.6, 12.5_
  
  - [x] 8.5 Remove homepage_cache.json references
    - Search for homepage_cache.json in codebase
    - Remove file reading logic
    - Ensure homepage uses live API data
    - _Requirements: 12.4_
  
  - [x] 8.6 Verify no Supabase content queries remain
    - Search for supabase.from('movies')
    - Search for supabase.from('tv_series')
    - Search for supabase.from('videos')
    - Search for supabase.from('dailymotion_videos')
    - Remove any found instances
    - Keep only auth and user data queries
    - _Requirements: 1.6, 11.7, 12.6_
  
  - [x] 8.7 Update useFetchContent hook if needed
    - Ensure it uses CockroachDB API endpoints
    - Remove any Supabase content queries
    - Add proper error handling
    - _Requirements: 11.6_


- [x] 9. Phase 7: Testing and Verification
  - [x] 9.1 Write unit tests for API endpoints
    - Test GET /api/movies with default pagination
    - Test language filtering (ar, en, hi, ko, zh, tr)
    - Test genre filtering (play, summary, action, comedy)
    - Test year range filtering
    - Test rating range filtering
    - Test combined filters
    - Test empty results handling
    - Test invalid parameter rejection
    - _Requirements: 2.1, 2.2, 3.1, 4.1, 4.2, 5.3, 8.1, 9.1, 9.7_
  
  - [ ]* 9.2 Write property-based test for Property 1: CockroachDB-Only Data Source
    - **Property 1: CockroachDB-Only Data Source**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
    - Use fast-check to generate random content types (movies, tv, games, software)
    - Mock database connection monitor
    - Verify only CockroachDB is called, never Supabase or TMDB for display
    - Run 100 iterations
  
  - [ ]* 9.3 Write property-based test for Property 2: Language-Based Content Filtering
    - **Property 2: Language-Based Content Filtering**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
    - Use fast-check to generate random language codes (ar, en, hi, ko, zh, tr)
    - Test both movie and tv content types
    - Verify all returned results have specified original_language
    - Run 100 iterations
  
  - [ ]* 9.4 Write property-based test for Property 3: Genre-Based Content Filtering
    - **Property 3: Genre-Based Content Filtering**
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4**
    - Use fast-check to generate random genres (action, comedy, drama, play, summary, anime)
    - Verify all returned results have specified primary_genre
    - Verify no results with different genres are included
    - Run 100 iterations
  
  - [ ]* 9.5 Write property-based test for Property 4: Year Range Filtering
    - **Property 4: Year Range Filtering**
    - **Validates: Requirements 2.4, 3.5, 6.2, 8.1, 8.2**
    - Use fast-check to generate random year ranges (1950-2024)
    - Test with yearFrom, yearTo, and yearFrom=yearTo edge cases
    - Verify all results have release_date within specified range
    - Run 100 iterations
  
  - [ ]* 9.6 Write property-based test for Property 5: Rating Range Filtering
    - **Property 5: Rating Range Filtering**
    - **Validates: Requirements 2.5, 6.5, 8.5**
    - Use fast-check to generate random rating ranges (0-10)
    - Verify all results have vote_average within specified range
    - Verify results outside range are excluded
    - Run 100 iterations
  
  - [ ]* 9.7 Write property-based test for Property 6: Sorting Consistency
    - **Property 6: Sorting Consistency**
    - **Validates: Requirements 4.5, 6.3, 8.4, 9.5**
    - Use fast-check to generate random sort fields (popularity, vote_average, release_date)
    - Verify results are ordered correctly (descending by default)
    - Verify order is consistent across pagination
    - Run 100 iterations
  
  - [ ]* 9.8 Write property-based test for Property 7: Pagination Integrity
    - **Property 7: Pagination Integrity**
    - **Validates: Requirements 4.4, 9.6**
    - Use fast-check to generate random page numbers and limits
    - Verify pagination metadata (page, limit, total, totalPages) is accurate
    - Verify different pages return non-overlapping results
    - Run 100 iterations
  
  - [ ]* 9.9 Write property-based test for Property 8: Combined Filter Composition
    - **Property 8: Combined Filter Composition**
    - **Validates: Requirements 5.7, 6.1, 6.4, 7.4, 8.3**
    - Use fast-check to generate random combinations of filters
    - Test language + genre + year + rating combinations
    - Verify all results satisfy ALL filter conditions (AND logic)
    - Run 100 iterations
  
  - [ ]* 9.10 Write property-based test for Property 9: SQL Injection Prevention
    - **Property 9: SQL Injection Prevention**
    - **Validates: Requirements 9.7**
    - Use fast-check to generate SQL injection attempts
    - Test with malicious inputs ('; DROP TABLE, 1' OR '1'='1, etc.)
    - Verify requests either return empty results or 400 error
    - Verify no SQL is executed
    - Run 100 iterations
  
  - [ ]* 9.11 Write property-based test for Property 10: API Response Structure Consistency
    - **Property 10: API Response Structure Consistency**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.6**
    - Test all endpoints (/api/movies, /api/tv, /api/games, /api/software)
    - Verify response includes data array and pagination metadata
    - Verify structure is consistent across all endpoints
    - Run 100 iterations
  
  - [ ]* 9.12 Write property-based test for Property 11: Error Handling Graceful Degradation
    - **Property 11: Error Handling Graceful Degradation**
    - **Validates: Requirements 13.2, 13.4, 13.5, 13.6**
    - Simulate various error conditions (network timeout, database unavailable, invalid params)
    - Verify appropriate error messages are displayed
    - Verify errors are logged to console
    - Verify fallback images are provided for missing posters
    - Verify no crashes occur
  
  - [ ]* 9.13 Write property-based test for Property 12: No Hardcoded Data Fallbacks
    - **Property 12: No Hardcoded Data Fallbacks**
    - **Validates: Requirements 2.7, 3.6, 3.7, 12.1, 12.2, 12.3, 12.4**
    - Search codebase for FALLBACK_SUMMARIES, hardcoded queries, cache files
    - Verify no hardcoded fallback constants are used for content display
    - Verify all content comes from database
  
  - [x] 9.14 Write integration tests for content sections
    - Test Plays section displays Arabic plays only
    - Test Summaries section displays summary content
    - Test Classics section displays pre-2000 movies
    - Test K-Drama section displays Korean series
    - Test Ramadan section displays Arabic Ramadan series
    - _Requirements: 2.1, 3.1, 5.3, 6.1, 8.1_
  
  - [x] 9.15 Perform manual testing of all sections
    - Visit /plays and verify plays display correctly
    - Visit /summaries and verify summaries display correctly
    - Visit /classics and verify classics display correctly
    - Visit /arabic-movies and verify only Arabic movies
    - Visit /k-drama and verify only Korean series
    - Visit /turkish and verify only Turkish series
    - Test all filter combinations
    - Test pagination
    - Test error states
    - _Requirements: 2.1, 3.1, 4.1, 5.3, 5.5, 8.1_
  
  - [ ]* 9.16 Run performance tests
    - Use Apache Bench to test API endpoint performance
    - Verify response time < 500ms for simple queries
    - Test cache effectiveness (hit rate > 70%)
    - Monitor memory usage stability
    - _Requirements: 13.4_


- [x] 10. Checkpoint - Verify all tests pass and sections work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Phase 8: Deployment and Monitoring
  - [x] 11.1 Prepare deployment checklist
    - Verify all tests pass
    - Take database backup
    - Document all changes in CHANGELOG.md
    - Verify environment variables are set
    - Test in staging environment
    - Prepare rollback plan
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [x] 11.2 Deploy database schema updates
    - Execute ALTER TABLE statements on production
    - Verify columns are added successfully
    - Create indexes with CONCURRENTLY option
    - Verify indexes are created
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 11.3 Run data population on production
    - Execute populate-content-sections.js script
    - Monitor progress and logs
    - Verify data counts for each section
    - Update existing records with primary_genre
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [x] 11.4 Deploy API updates
    - Deploy updated API endpoints
    - Verify endpoints respond correctly
    - Monitor API logs for errors
    - Check cache is working
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 11.5 Deploy frontend updates
    - Deploy updated React components
    - Clear CDN cache if applicable
    - Verify all pages load correctly
    - Test navigation between sections
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 11.6 Add performance monitoring
    - Add response time logging to API endpoints
    - Monitor cache hit rates
    - Track database query performance
    - Set up alerts for slow queries (> 1s)
    - _Requirements: 13.4_
  
  - [x] 11.7 Add error monitoring
    - Monitor API error rates
    - Set up alerts for critical errors
    - Track database connection errors
    - Monitor frontend console errors
    - _Requirements: 13.2, 13.4_
  
  - [x] 11.8 Monitor usage and analytics
    - Track views per section (plays, summaries, classics)
    - Monitor most popular content
    - Track filter usage patterns
    - Analyze performance metrics
  
  - [x] 11.9 Document rollback procedures
    - Document steps to revert frontend changes
    - Document steps to revert API changes
    - Document database restore procedure
    - Test rollback in staging environment
  
  - [x] 11.10 Post-deployment verification
    - Verify all sections display correct content
    - Check performance metrics are acceptable
    - Monitor error rates for 24 hours
    - Collect user feedback
    - Address any issues immediately


- [x] 12. Final Checkpoint - Deployment complete and system stable
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property-based tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All implementation uses TypeScript/JavaScript as specified in the design document
- Database operations use CockroachDB exclusively for content (NO Supabase for content)
- Supabase is used ONLY for authentication and user data
- All content queries go through CockroachDB API endpoints (/api/movies, /api/tv, etc.)

## Timeline

**Week 1:**
- Days 1-2: Phase 1 (Database Schema Updates)
- Days 3-5: Phase 2 (Data Population)

**Week 2:**
- Day 1: Phase 3 (API Endpoints Updates)
- Day 2: Phase 4 (Service Layer Updates)
- Days 3-5: Phase 5 (Frontend Component Updates)

**Week 3:**
- Day 1: Phase 6 (Legacy Code Removal)
- Days 2-4: Phase 7 (Testing and Verification)
- Day 5: Phase 8 (Deployment and Monitoring)

## Success Criteria

**Database:**
- All tables have new columns (primary_genre, category, target_audience, keywords)
- All indexes created and optimized
- Data populated correctly (minimum counts achieved for each section)

**API:**
- All endpoints work correctly with filters
- Response time < 500ms for simple queries
- Cache working effectively (hit rate > 70%)
- No SQL injection vulnerabilities

**Frontend:**
- All sections display correct content from CockroachDB
- No console errors
- Smooth user experience
- Loading states work correctly
- Error handling displays appropriate messages

**Code Quality:**
- No Supabase queries for content (only auth/user data)
- No direct TMDB API calls for content display
- No hardcoded fallback constants (FALLBACK_SUMMARIES, etc.)
- Clean, documented code
- All tests passing

**Performance:**
- Response time < 500ms
- Cache hit rate > 70%
- No N+1 queries
- Stable memory usage

