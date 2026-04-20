# Clean Slug URLs - Implementation Tasks

## Phase 1: Database Preparation

- [ ] 1. Verify current slug state in database
  - [ ] 1.1 Query all movies and check slug format
    - Connect to CockroachDB
    - Run: `SELECT id, slug, title FROM movies LIMIT 100`
    - Identify slugs with IDs (pattern: `.*-\d+$`)
    - Document current state
  - [ ] 1.2 Query all TV series and check slug format
    - Run: `SELECT id, slug, name FROM tv_series LIMIT 100`
    - Identify slugs with IDs
    - Document current state
  - [ ] 1.3 Query all games and check slug format
    - Run: `SELECT id, slug, title FROM games LIMIT 100`
    - Identify slugs with IDs
    - Document current state
  - [ ] 1.4 Generate report of problematic slugs
    - Count total slugs with IDs
    - List examples of each type
    - Estimate migration scope

- [ ] 2. Create slug cleaning script
  - [ ] 2.1 Write slug cleaning function
    - Create `scripts/clean-slugs.ts`
    - Function: `cleanSlug(slug: string): string`
    - Remove ID suffixes (e.g., `spider-man-12345` → `spider-man`)
    - Remove year-like suffixes if they're IDs (e.g., `movie-2024` where 2024 is ID)
    - Keep legitimate years (e.g., `spider-man-2` for sequel)
  - [ ] 2.2 Write duplicate detection function
    - Function: `findDuplicates(slugs: string[]): Map<string, number>`
    - Group slugs by base name
    - Count occurrences
    - Return duplicates with counts
  - [ ] 2.3 Write unique slug generator
    - Function: `generateUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string`
    - If baseSlug is unique, return it
    - If duplicate, append `-2`, `-3`, etc.
    - Ensure uniqueness

- [ ] 3. Run slug cleaning migration
  - [ ] 3.1 Backup current slugs
    - Create backup table: `movies_slugs_backup`
    - Copy all slugs: `INSERT INTO movies_slugs_backup SELECT id, slug FROM movies`
    - Repeat for tv_series, games, software, actors
  - [ ] 3.2 Clean movie slugs
    - For each movie:
      - Clean slug (remove ID)
      - Check for duplicates
      - Generate unique slug if needed
      - Update database
    - Log all changes
  - [ ] 3.3 Clean TV series slugs
    - Same process as movies
    - Update tv_series table
  - [ ] 3.4 Clean game slugs
    - Same process
    - Update games table
  - [ ] 3.5 Clean software slugs
    - Same process
    - Update software table
  - [ ] 3.6 Clean actor slugs
    - Same process
    - Update actors table
  - [ ] 3.7 Verify all slugs are clean
    - Query: `SELECT id, slug FROM movies WHERE slug ~ '.*-\d{5,}$'`
    - Should return 0 rows
    - Repeat for all tables

## Phase 2: Code Updates

- [ ] 4. Update URL generation functions
  - [ ] 4.1 Remove ID appending from generateWatchUrl
    - Open `src/lib/utils.ts`
    - Find `generateWatchUrl` function
    - Remove fallback that appends ID: `slug = ${slugify(title)}-${item.id}`
    - Use slug directly: `if (!slug) throw new Error('Missing slug')`
    - Update function signature to require slug
  - [ ] 4.2 Remove ID appending from generateContentUrl
    - Same file
    - Find `generateContentUrl` function
    - Remove ID appending fallback
    - Use slug directly
  - [ ] 4.3 Remove parseWatchPath function
    - This function extracts ID from slug
    - No longer needed
    - Delete function
    - Remove all usages
  - [ ] 4.4 Update slugify function
    - Keep core logic
    - Ensure no ID appending
    - Add validation

- [ ] 5. Update slug resolution
  - [ ] 5.1 Simplify resolveSlug function
    - Open `src/lib/slug-resolver.ts`
    - Remove ID extraction logic
    - Query database by slug only
    - No fallback to ID-based lookup
  - [ ] 5.2 Update queryDatabaseBySlug
    - Ensure it queries by slug column only
    - No ID extraction
    - Return content ID from database
  - [ ] 5.3 Remove legacy URL detection
    - Delete functions that detect IDs in slugs
    - Remove redirect logic for old URLs
    - Simplify codebase

- [ ] 6. Update API endpoints
  - [ ] 6.1 Verify /api/db/movies/slug/:slug endpoint
    - Open `server/api/db.js`
    - Ensure endpoint queries by slug
    - No ID extraction
    - Return full content object
  - [ ] 6.2 Verify /api/db/tv/slug/:slug endpoint
    - Same verification
    - Query tv_series by slug
  - [ ] 6.3 Verify other slug endpoints
    - Games, software, actors
    - All should query by slug only

- [ ] 7. Update route handlers
  - [ ] 7.1 Update Watch page route
    - Open `src/pages/media/Watch.tsx`
    - Extract slug from URL params
    - Resolve slug to ID
    - Fetch content by ID
    - No ID extraction from slug
  - [ ] 7.2 Update MovieDetails route
    - Same process
    - Use slug resolution
  - [ ] 7.3 Update SeriesDetails route
    - Same process
  - [ ] 7.4 Update other detail pages
    - Games, software, actors
    - All use slug resolution

## Phase 3: Testing

- [ ] 8. Write tests for clean slugs
  - [ ] 8.1 Unit tests for slug generation
    - Test `generateCleanSlug` function
    - Input: "Spider-Man: Homecoming"
    - Expected: "spider-man-homecoming"
    - No IDs appended
  - [ ] 8.2 Unit tests for duplicate handling
    - Test `generateUniqueSlug` function
    - Input: "Spider-Man" (already exists)
    - Expected: "spider-man-2"
  - [ ] 8.3 Integration tests for URL generation
    - Test `generateWatchUrl` with clean slugs
    - Input: { slug: "spider-man", media_type: "movie" }
    - Expected: "/watch/movie/spider-man"
    - No IDs in URL
  - [ ] 8.4 Integration tests for slug resolution
    - Test `resolveSlug` function
    - Input: "spider-man", "movie"
    - Expected: content ID from database
    - No ID extraction from slug

- [ ] 9. Run existing tests
  - [ ] 9.1 Run all unit tests
    - Command: `npm test`
    - Fix any failing tests
    - Update tests that expect IDs in slugs
  - [ ] 9.2 Run integration tests
    - Test URL routing
    - Test content fetching
    - Verify no regressions
  - [ ] 9.3 Run property-based tests
    - Test slug uniqueness
    - Test slug validity
    - Test URL generation

## Phase 4: Validation

- [ ] 10. Manual testing
  - [ ] 10.1 Test movie URLs
    - Navigate to `/watch/movie/spider-man`
    - Verify content loads
    - Check URL in browser (no IDs)
    - Test multiple movies
  - [ ] 10.2 Test TV series URLs
    - Navigate to `/watch/tv/breaking-bad/s1/ep1`
    - Verify content loads
    - Check URL (no IDs)
  - [ ] 10.3 Test game URLs
    - Navigate to `/game/the-witcher-3`
    - Verify content loads
  - [ ] 10.4 Test actor URLs
    - Navigate to `/actor/tom-hanks`
    - Verify content loads
  - [ ] 10.5 Test search and navigation
    - Search for content
    - Click results
    - Verify URLs are clean
    - No IDs in any URLs

- [ ] 11. Performance testing
  - [ ] 11.1 Test slug lookup performance
    - Measure query time for slug resolution
    - Should be < 50ms
    - Verify database index is used
  - [ ] 11.2 Test cache performance
    - Verify slug cache is working
    - Measure cache hit rate
    - Should be > 80%
  - [ ] 11.3 Load testing
    - Test with 1000 concurrent requests
    - Verify no performance degradation
    - Monitor database load

## Phase 5: Deployment

- [ ] 12. Prepare for deployment
  - [ ] 12.1 Create deployment checklist
    - List all changes
    - List all files modified
    - List all database changes
  - [ ] 12.2 Create rollback plan
    - Document how to restore old slugs
    - Document how to revert code changes
    - Test rollback procedure
  - [ ] 12.3 Update documentation
    - Update API documentation
    - Update developer guide
    - Update URL structure docs

- [ ] 13. Deploy to staging
  - [ ] 13.1 Run migration on staging database
    - Clean all slugs
    - Verify no errors
    - Check slug uniqueness
  - [ ] 13.2 Deploy code to staging
    - Deploy updated code
    - Restart services
    - Monitor logs
  - [ ] 13.3 Test on staging
    - Run full test suite
    - Manual testing
    - Performance testing
  - [ ] 13.4 Fix any issues
    - Debug problems
    - Apply fixes
    - Re-test

- [ ] 14. Deploy to production
  - [ ] 14.1 Schedule maintenance window
    - Notify users
    - Plan downtime (if needed)
  - [ ] 14.2 Run migration on production
    - Backup database
    - Run slug cleaning script
    - Verify success
  - [ ] 14.3 Deploy code to production
    - Deploy updated code
    - Restart services
    - Monitor logs closely
  - [ ] 14.4 Monitor and verify
    - Check error rates
    - Check performance metrics
    - Verify URLs are clean
    - Monitor user feedback

## Phase 6: Cleanup

- [ ] 15. Post-deployment cleanup
  - [ ] 15.1 Remove backup tables
    - After 1 week of stable operation
    - Drop movies_slugs_backup
    - Drop other backup tables
  - [ ] 15.2 Remove legacy code
    - Delete unused functions
    - Remove commented code
    - Clean up imports
  - [ ] 15.3 Update tests
    - Remove tests for legacy behavior
    - Update test expectations
    - Add new tests for clean slugs
  - [ ] 15.4 Final documentation update
    - Document new URL structure
    - Update examples
    - Archive old documentation

## Success Criteria

- [ ] All slugs in database are clean (no IDs)
- [ ] All URLs use clean slugs (no IDs)
- [ ] Slug resolution works correctly
- [ ] No performance degradation
- [ ] All tests pass
- [ ] No user-facing errors
- [ ] Documentation is updated
