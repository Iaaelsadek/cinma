# Design: Remove TMDB API Direct Usage

## Architecture Overview

### Current Architecture (BROKEN)
```
Frontend Pages
    ↓
tmdb.get('/discover/movie')  ← PROBLEM: Returns content without slugs
    ↓
/api/tmdb proxy
    ↓
TMDB API (external)
    ↓
Returns movies WITHOUT slugs
    ↓
Frontend displays content
    ↓
User clicks → ERROR: "Missing slug for content"
```

### Target Architecture (CORRECT)
```
Frontend Pages
    ↓
fetch('/api/movies')  ← SOLUTION: Use CockroachDB API
    ↓
Backend API Routes
    ↓
CockroachDB (our database)
    ↓
Returns movies WITH slugs
    ↓
Frontend displays content
    ↓
User clicks → SUCCESS: Navigate to /watch/movie/slug
```

## Design Decisions

### D1: Block TMDB Discovery Endpoints at Proxy Level
**Decision**: Add endpoint blocking in `server/api/tmdb-proxy.js`

**Rationale**:
- Prevents accidental TMDB usage
- Forces developers to use CockroachDB
- Clear error messages guide to correct API

**Implementation**:
```javascript
// Block patterns
const forbiddenPatterns = [
  /^discover\//,   // /discover/movie, /discover/tv
  /^trending\//,   // /trending/movie/week
  /^search\//,     // /search/movie, /search/tv
]

if (isForbidden) {
  return res.status(403).json({
    error: 'Forbidden: Use CockroachDB API instead',
    allowedUsage: 'TMDB only for details by ID'
  })
}
```

**Status**: ✅ IMPLEMENTED

### D2: Defensive Filtering in Display Components
**Decision**: Add slug validation in all components that display content

**Rationale**:
- Last line of defense against invalid content
- Prevents runtime errors
- Graceful degradation

**Implementation**:
```typescript
// In QuantumHero.tsx, QuantumTrain.tsx, etc.
const validItems = items.filter(item => 
  item.slug && 
  item.slug.trim() !== '' && 
  item.slug !== 'content'
)
```

**Status**: ✅ IMPLEMENTED (QuantumHero), 🔄 IN PROGRESS (other components)

### D3: Replace TMDB Calls with CockroachDB API
**Decision**: Systematically replace all TMDB discover/trending/search calls

**Affected Files** (Priority Order):
1. **Home Page** (CRITICAL - most visible)
   - `src/pages/Home.tsx` ✅ DONE
   - `src/components/features/home/HomeBelowFoldSections.tsx` ✅ DONE

2. **Discovery Pages** (HIGH - main navigation)
   - `src/pages/discovery/Movies.tsx`
   - `src/pages/discovery/Series.tsx`
   - `src/pages/discovery/TopWatched.tsx`
   - `src/pages/discovery/AsianDrama.tsx`
   - `src/pages/discovery/Anime.tsx`
   - `src/pages/discovery/Classics.tsx`

3. **Category Pages** (MEDIUM)
   - `src/pages/CategoryHub.tsx`
   - `src/pages/discovery/Category.tsx`
   - `src/pages/discovery/DynamicContent.tsx`

4. **Special Pages** (LOW)
   - `src/pages/discovery/Plays.tsx`
   - `src/pages/discovery/Search.tsx`

**Replacement Strategy**:
```typescript
// BEFORE (WRONG)
const { data } = await tmdb.get('/discover/movie', {
  params: { with_genres: '28', sort_by: 'popularity.desc' }
})

// AFTER (CORRECT)
const response = await fetch('/api/movies?genre=28&sortBy=popularity')
const data = await response.json()
```

### D4: Enhance Backend API Endpoints
**Decision**: Ensure backend endpoints support all required filters

**Required Endpoints**:

#### `/api/movies` (GET)
**Query Parameters**:
- `genre` - Filter by genre ID
- `language` - Filter by original language (ko, zh, tr, hi, ja, ar, en)
- `yearFrom` - Minimum release year
- `yearTo` - Maximum release year
- `ratingFrom` - Minimum vote average
- `ratingTo` - Maximum vote average
- `sortBy` - Sort field (popularity, vote_average, release_date)
- `limit` - Number of results (default: 20)
- `page` - Page number for pagination

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "movie-slug",
      "title": "Movie Title",
      "poster_url": "https://...",
      "backdrop_url": "https://...",
      "vote_average": 8.5,
      "release_date": "2024-01-01",
      "overview": "...",
      "original_language": "en"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### `/api/tv` (GET)
Same as `/api/movies` but for TV series

#### `/api/trending` (GET)
**Query Parameters**:
- `type` - Content type (movie, tv, all)
- `timeWindow` - Time window (day, week)
- `limit` - Number of results

**Implementation Status**:
- `/api/movies` - ✅ EXISTS, needs enhancement for filters
- `/api/tv` - ✅ EXISTS, needs enhancement for filters
- `/api/trending` - ❌ NEEDS CREATION

### D5: Update `advancedSearch` Function
**Decision**: Rewrite `advancedSearch` in `src/lib/tmdb.ts` to use CockroachDB

**Current Implementation**: Uses TMDB discover/search endpoints
**Target Implementation**: Use CockroachDB search endpoints

**Approach**:
```typescript
// src/lib/tmdb.ts
export async function advancedSearch(params: AdvancedSearchParams) {
  const {
    query,
    types = ['movie'],
    genres,
    yearFrom,
    yearTo,
    ratingFrom,
    ratingTo,
    sort_by,
    page = 1,
    with_original_language
  } = params

  const promises: Promise<any>[] = []

  if (types.includes('movie')) {
    const url = new URL('/api/movies', window.location.origin)
    if (query) url.searchParams.set('search', query)
    if (genres?.length) url.searchParams.set('genre', genres.join(','))
    if (yearFrom) url.searchParams.set('yearFrom', String(yearFrom))
    if (yearTo) url.searchParams.set('yearTo', String(yearTo))
    if (ratingFrom) url.searchParams.set('ratingFrom', String(ratingFrom))
    if (ratingTo) url.searchParams.set('ratingTo', String(ratingTo))
    if (with_original_language) url.searchParams.set('language', with_original_language)
    if (sort_by) url.searchParams.set('sortBy', sort_by)
    url.searchParams.set('page', String(page))
    
    promises.push(fetch(url.toString()).then(r => r.json()))
  }

  if (types.includes('tv')) {
    // Similar for TV
  }

  const results = await Promise.all(promises)
  // Merge and return
}
```

### D6: Preserve TMDB for Details Only
**Decision**: Keep TMDB API for fetching detailed information about specific content

**Allowed TMDB Endpoints**:
- `/movie/{id}` - Movie details
- `/tv/{id}` - TV series details
- `/movie/{id}/credits` - Cast and crew
- `/tv/{id}/credits` - Cast and crew
- `/movie/{id}/videos` - Trailers
- `/tv/{id}/videos` - Trailers
- `/movie/{id}/release_dates` - Release dates and certifications
- `/tv/{id}/content_ratings` - Content ratings
- `/movie/{id}/similar` - Similar movies (optional, can use CockroachDB)
- `/tv/{id}/similar` - Similar TV shows (optional, can use CockroachDB)

**Rationale**:
- These endpoints fetch details for specific content by ID
- Content already exists in CockroachDB (we have the ID)
- TMDB provides richer metadata (cast, crew, videos) than we store
- No risk of displaying content without slugs

## Data Flow Diagrams

### Homepage Content Flow
```
User visits homepage
    ↓
Home.tsx renders
    ↓
useQuery(['diverse-hero-content-v2'])
    ↓
fetch('/api/home')
    ↓
server/routes/home.js
    ↓
Query CockroachDB movies table
    ↓
Filter: is_published = TRUE AND slug IS NOT NULL
    ↓
Return movies with slugs
    ↓
Frontend: sanitizeMediaItems() filters again
    ↓
QuantumHero filters again (defensive)
    ↓
Display content with valid slugs
```

### Discovery Page Content Flow
```
User visits /movies
    ↓
Movies.tsx renders
    ↓
useQuery(['movies', filters])
    ↓
fetch('/api/movies?genre=28&sortBy=popularity')
    ↓
server/routes/movies.js (needs enhancement)
    ↓
Query CockroachDB with filters
    ↓
Return movies with slugs
    ↓
Display content
```

## Component Architecture

### Display Components Hierarchy
```
Pages (Movies.tsx, Home.tsx, etc.)
    ↓
QuantumHero (hero carousel)
    ├─ Filter items without slugs
    └─ Display valid items
    
QuantumTrain (horizontal scroll)
    ├─ Filter items without slugs
    └─ Display valid items
    
MovieCard (individual card)
    ├─ Validate slug before render
    └─ Display or skip
```

### API Layer Architecture
```
Frontend
    ↓
src/lib/db.ts (CockroachDB helpers)
    ├─ getTrendingMoviesDB()
    ├─ searchMoviesDB()
    ├─ getTrendingTVDB()
    └─ searchTVDB()
    
src/lib/tmdb.ts (TMDB helpers - RESTRICTED)
    ├─ tmdb.get('/movie/{id}') ✅ ALLOWED
    ├─ tmdb.get('/discover/movie') ❌ BLOCKED
    └─ advancedSearch() 🔄 REWRITE TO USE COCKROACHDB
```

## Migration Strategy

### Phase 1: Block and Identify (DONE)
1. ✅ Block TMDB discover/trending/search at proxy level
2. ✅ Add defensive filtering in QuantumHero
3. ✅ Identify all affected pages (see logs)

### Phase 2: Fix Critical Pages (IN PROGRESS)
1. ✅ Home.tsx - Already uses CockroachDB
2. ✅ HomeBelowFoldSections.tsx - Already uses CockroachDB
3. 🔄 Add defensive filtering to QuantumTrain
4. 🔄 Add defensive filtering to MovieCard

### Phase 3: Fix Discovery Pages (NEXT)
1. Movies.tsx - Replace TMDB with CockroachDB
2. Series.tsx - Replace TMDB with CockroachDB
3. TopWatched.tsx - Replace TMDB with CockroachDB
4. AsianDrama.tsx - Replace TMDB with CockroachDB
5. Anime.tsx - Replace TMDB with CockroachDB
6. Classics.tsx - Replace TMDB with CockroachDB

### Phase 4: Fix Category Pages
1. CategoryHub.tsx
2. Category.tsx
3. DynamicContent.tsx

### Phase 5: Fix Special Pages
1. Plays.tsx
2. Search.tsx - Rewrite advancedSearch()

### Phase 6: Testing and Validation
1. Test all pages
2. Verify no TMDB discover/trending calls
3. Verify no "Missing slug" errors
4. Performance testing

## Error Handling

### TMDB Proxy Blocked Response
```json
{
  "error": "Forbidden: This TMDB endpoint is blocked. Use CockroachDB API instead.",
  "message": "Content discovery must use /api/movies, /api/tv, or /api/db/* endpoints",
  "blockedEndpoint": "discover/movie",
  "allowedUsage": "TMDB API is only allowed for fetching details of specific content by ID"
}
```

### Frontend Handling
```typescript
try {
  const { data } = await tmdb.get('/discover/movie')
} catch (error) {
  if (error.response?.status === 403) {
    console.error('TMDB endpoint blocked. Use CockroachDB API.')
    // Fallback to CockroachDB
    const response = await fetch('/api/movies')
    const data = await response.json()
  }
}
```

## Performance Considerations

### Caching Strategy
- Backend: 5-minute cache for `/api/home`, `/api/movies`, `/api/tv`
- Frontend: React Query with 5-minute staleTime
- TMDB proxy: 1-hour cache for detail endpoints only

### Database Optimization
- Add indexes on frequently queried columns (genre, language, release_date)
- Use pagination to limit result sets
- Consider materialized views for complex queries

## Testing Strategy

### Unit Tests
- Test slug filtering in components
- Test API endpoint filters
- Test TMDB proxy blocking

### Integration Tests
- Test full page load with CockroachDB data
- Test search functionality
- Test filtering and sorting

### Manual Testing Checklist
- [ ] Homepage loads without errors
- [ ] No "Missing slug" errors in console
- [ ] All discovery pages work
- [ ] Search works
- [ ] Filtering works
- [ ] Sorting works
- [ ] No TMDB discover/trending requests in Network tab

## Rollback Plan

If issues arise:
1. Remove TMDB proxy blocking (comment out forbidden patterns)
2. Revert to previous version
3. Investigate and fix issues
4. Re-apply blocking

## Success Metrics

1. **Zero TMDB Discovery Calls**: No `/api/tmdb/discover` or `/api/tmdb/trending` requests
2. **Zero Slug Errors**: No "Missing slug for content" errors in console
3. **100% CockroachDB**: All content comes from CockroachDB
4. **Performance**: Page load time < 2 seconds
5. **User Experience**: No visible changes to end users

## Timeline

- Phase 1: ✅ DONE (1 hour)
- Phase 2: 🔄 IN PROGRESS (2 hours)
- Phase 3: ⏳ PENDING (4 hours)
- Phase 4: ⏳ PENDING (2 hours)
- Phase 5: ⏳ PENDING (2 hours)
- Phase 6: ⏳ PENDING (2 hours)
- **Total**: 13 hours
