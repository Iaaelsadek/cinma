# Requirements: Remove TMDB API Direct Usage

## Problem Statement

Currently, many pages in the application are making direct calls to TMDB API through `/api/tmdb` proxy endpoints (e.g., `/api/tmdb/discover/movie`, `/api/tmdb/trending/movie`). This causes critical issues:

1. **Missing Slugs**: TMDB API returns movies without slugs, causing "Missing slug for content" errors
2. **Database Inconsistency**: Content displayed on pages doesn't exist in CockroachDB
3. **Architecture Violation**: Bypasses the established architecture where ALL content must come from CockroachDB

## Root Cause

The `tmdb` axios instance in `src/lib/tmdb.ts` uses `/api/tmdb` as baseURL, which proxies requests to TMDB API. Multiple pages use functions like:
- `tmdb.get('/discover/movie')`
- `tmdb.get('/trending/movie/week')`
- `advancedSearch()` which internally calls TMDB discover endpoints

These return content directly from TMDB without slugs or CockroachDB validation.

## Requirements

### R1: Identify All TMDB API Usage
**Priority**: Critical  
**Description**: Identify all pages and components that make direct TMDB API calls

**Acceptance Criteria**:
- [ ] Complete list of all files using `tmdb.get()`, `tmdb.post()`, or TMDB functions
- [ ] Categorize by usage type (discover, trending, search, details)
- [ ] Document which pages are affected

### R2: Create CockroachDB Equivalent Endpoints
**Priority**: Critical  
**Description**: For each TMDB API usage, create equivalent CockroachDB API endpoint

**Acceptance Criteria**:
- [ ] `/api/movies` endpoint supports all filters (genre, year, rating, language, sort)
- [ ] `/api/tv` endpoint supports all filters
- [ ] `/api/trending` endpoint for trending content from CockroachDB
- [ ] All endpoints return content with valid slugs
- [ ] All endpoints filter by `is_published = TRUE`

### R3: Replace TMDB Calls in Discovery Pages
**Priority**: Critical  
**Description**: Replace TMDB API calls in all discovery pages with CockroachDB API

**Affected Pages**:
- `src/pages/discovery/Movies.tsx`
- `src/pages/discovery/Series.tsx`
- `src/pages/discovery/TopWatched.tsx`
- `src/pages/discovery/AsianDrama.tsx`
- `src/pages/discovery/Anime.tsx`
- `src/pages/discovery/Classics.tsx`
- `src/pages/discovery/Category.tsx`
- `src/pages/discovery/DynamicContent.tsx`
- `src/pages/discovery/Plays.tsx`

**Acceptance Criteria**:
- [ ] All pages fetch from CockroachDB API only
- [ ] No direct TMDB API calls remain
- [ ] All content has valid slugs
- [ ] Filtering and sorting work correctly

### R4: Replace TMDB Calls in Home Page Sections
**Priority**: Critical  
**Description**: Ensure Home page and below-fold sections use CockroachDB only

**Affected Files**:
- `src/pages/Home.tsx` (already fixed)
- `src/components/features/home/HomeBelowFoldSections.tsx` (needs verification)

**Acceptance Criteria**:
- [ ] No TMDB discover/trending calls in home sections
- [ ] All content comes from `/api/home` or CockroachDB endpoints
- [ ] Hero carousel shows only CockroachDB content

### R5: Replace TMDB Calls in Category Pages
**Priority**: High  
**Description**: Replace TMDB usage in category and hub pages

**Affected Files**:
- `src/pages/CategoryHub.tsx`

**Acceptance Criteria**:
- [ ] Category pages fetch from CockroachDB
- [ ] Genre filtering works with CockroachDB data
- [ ] No TMDB discover calls

### R6: Update Search Functionality
**Priority**: High  
**Description**: Ensure search uses CockroachDB, not TMDB

**Affected Files**:
- `src/pages/discovery/Search.tsx`
- `src/lib/tmdb.ts` (`advancedSearch` function)

**Acceptance Criteria**:
- [ ] Search queries CockroachDB `/api/db/movies/search` and `/api/db/tv/search`
- [ ] Advanced filters work with CockroachDB
- [ ] No TMDB search/discover calls

### R7: Preserve TMDB for Details Only
**Priority**: Medium  
**Description**: Keep TMDB API usage ONLY for fetching detailed information about specific content

**Allowed TMDB Usage**:
- `/movie/{id}` - Get movie details (cast, crew, videos)
- `/tv/{id}` - Get TV series details
- `/movie/{id}/credits` - Get cast/crew
- `/movie/{id}/videos` - Get trailers
- `/tv/{id}/content_ratings` - Get ratings

**Forbidden TMDB Usage**:
- `/discover/movie` - Use CockroachDB instead
- `/discover/tv` - Use CockroachDB instead
- `/trending/*` - Use CockroachDB instead
- `/search/*` - Use CockroachDB instead

**Acceptance Criteria**:
- [ ] TMDB API used ONLY for details of specific content by ID
- [ ] No discovery/trending/search calls to TMDB
- [ ] Document allowed vs forbidden TMDB usage

### R8: Add Defensive Filtering
**Priority**: High  
**Description**: Add defensive filtering in all components that display content

**Affected Components**:
- `src/components/features/hero/QuantumHero.tsx` (already fixed)
- `src/components/features/media/QuantumTrain.tsx`
- `src/components/features/media/MovieCard.tsx`
- `src/components/features/media/VideoCard.tsx`

**Acceptance Criteria**:
- [ ] All display components filter out items without valid slugs
- [ ] Filter checks: `slug && slug.trim() !== '' && slug !== 'content'`
- [ ] Components handle empty arrays gracefully

### R9: Update TMDB Proxy Configuration
**Priority**: Medium  
**Description**: Configure TMDB proxy to block forbidden endpoints

**Acceptance Criteria**:
- [ ] TMDB proxy blocks `/discover/*` requests
- [ ] TMDB proxy blocks `/trending/*` requests
- [ ] TMDB proxy blocks `/search/*` requests
- [ ] TMDB proxy allows detail endpoints (`/movie/{id}`, `/tv/{id}`)
- [ ] Clear error messages when blocked endpoints are called

### R10: Testing and Validation
**Priority**: Critical  
**Description**: Comprehensive testing to ensure no TMDB API leaks

**Acceptance Criteria**:
- [ ] No "Missing slug" errors in console
- [ ] All homepage content has valid slugs
- [ ] All discovery pages work correctly
- [ ] Search functionality works
- [ ] No `/api/tmdb/discover` or `/api/tmdb/trending` requests in network tab
- [ ] Performance is acceptable (CockroachDB responses are fast enough)

## Success Criteria

1. **Zero TMDB Discovery Calls**: No pages make discover/trending/search calls to TMDB
2. **All Content Has Slugs**: Every piece of content displayed has a valid slug from CockroachDB
3. **No Console Errors**: No "Missing slug for content" errors
4. **Architecture Compliance**: 100% of content comes from CockroachDB
5. **Functionality Preserved**: All features work as before (search, filter, sort, etc.)

## Out of Scope

- Migrating content from TMDB to CockroachDB (already done)
- Changing the ingestion process
- Modifying the database schema

## Dependencies

- CockroachDB must have sufficient content ingested
- Backend API endpoints must support all required filters
- Frontend must handle empty results gracefully

## Risks

1. **Performance**: CockroachDB queries might be slower than TMDB API
   - Mitigation: Add caching, optimize queries, add indexes
2. **Missing Content**: Some content in TMDB might not be in CockroachDB
   - Mitigation: Accept this limitation, focus on ingested content only
3. **Breaking Changes**: Removing TMDB calls might break some pages
   - Mitigation: Thorough testing, gradual rollout

## Timeline Estimate

- Requirements: 1 hour (DONE)
- Design: 2 hours
- Implementation: 8-12 hours
- Testing: 2-3 hours
- **Total**: 13-18 hours
