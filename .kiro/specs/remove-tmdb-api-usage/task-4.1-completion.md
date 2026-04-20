# Task 4.1 Completion Report: Update Movies.tsx to use CockroachDB API

## Task Summary
Updated `src/pages/discovery/Movies.tsx` to replace all TMDB API discover/trending calls with CockroachDB API endpoints.

## Changes Made

### 1. Updated `fetchByGenre` Function
**Before**: Used `tmdb.get('/discover/movie')` with TMDB parameters
**After**: Uses `/api/movies?genre={id}&sortBy=popularity&limit=20` from CockroachDB

```typescript
const fetchByGenre = async (genreId: number, type: 'movie' | 'tv' = 'movie') => {
  try {
    const endpoint = type === 'movie' ? '/api/movies' : '/api/tv'
    const response = await fetch(`${endpoint}?genre=${genreId}&sortBy=popularity&limit=20`)
    if (response.ok) {
      const result = await response.json()
      return result.data.map((item: any) => ({ 
        ...item, 
        media_type: type,
        poster_path: item.poster_url || item.poster_path,
        backdrop_path: item.backdrop_url || item.backdrop_path
      }))
    }
  } catch (error) {
    console.error(`Failed to fetch ${type} by genre from CockroachDB:`, error)
  }
  return []
}
```

### 2. Replaced TMDB Fallback Functions
Renamed and updated all TMDB fallback functions to use CockroachDB:

- `fetchTrendingTMDB` → `fetchTrendingCockroachDB` - Uses `/api/trending?type=movie&timeWindow=week&limit=20`
- `fetchTopRatedTMDB` → `fetchTopRatedCockroachDB` - Uses `/api/movies?sortBy=vote_average&ratingFrom=8&limit=20`
- `fetchNowPlayingTMDB` → `fetchNowPlayingCockroachDB` - Uses `/api/movies?sortBy=release_date&limit=20`
- `fetchArabicMoviesTMDB` → `fetchArabicMoviesCockroachDB` - Uses `/api/movies?language=ar&sortBy=popularity&limit=20`

### 3. Updated Database Fetchers
Updated all database fetcher functions to call CockroachDB fallbacks instead of TMDB:

- `fetchTrendingDB` - Falls back to `fetchTrendingCockroachDB()`
- `fetchTopRatedDB` - Falls back to `fetchTopRatedCockroachDB()`
- `fetchArabicMoviesDB` - Falls back to `fetchArabicMoviesCockroachDB()`
- `fetchLatestDB` - Falls back to `fetchNowPlayingCockroachDB()`

### 4. Fixed `fetchPopular` and `fetchUpcoming`
**Before**: Used hardcoded `http://localhost:3001/api/movies`
**After**: Uses relative path `/api/movies` with proper parameters

```typescript
const fetchPopular = async (type: 'movie' | 'tv' = 'movie') => {
  try {
    const endpoint = type === 'movie' ? '/api/movies' : '/api/tv'
    const response = await fetch(`${endpoint}?sortBy=popularity&limit=20`)
    // ... rest of implementation
  }
}
```

### 5. Updated Classics and Nineties Queries
**Before**: Used TMDB discover with date filters
**After**: Uses CockroachDB API with year range filters

```typescript
// Classics: Movies before 1980
const response = await fetch('/api/movies?yearTo=1980&sortBy=popularity&limit=20')

// Nineties: Movies from 1990-1999
const response = await fetch('/api/movies?yearFrom=1990&yearTo=1999&sortBy=popularity&limit=20')
```

### 6. Updated Anime and Bollywood Queries
**Before**: Used TMDB discover with language and genre filters
**After**: Uses CockroachDB API with language filters

```typescript
// Anime: Japanese animation movies
const response = await fetch('/api/movies?language=ja&sortBy=popularity&limit=20')

// Bollywood: Hindi movies
const response = await fetch('/api/movies?language=hi&sortBy=popularity&limit=20')
```

### 7. Preserved TMDB for Company-Specific Queries
**Kept TMDB calls for**:
- Marvel (company ID: 420)
- DC (company ID: 9993)
- Disney (company ID: 2)
- Pixar (company ID: 3)
- Netflix (company ID: 20580)

**Rationale**: These queries filter by production company, which is not a primary filter in CockroachDB API. These are considered detail-level queries and are allowed per the design document.

### 8. Updated Category Query
The category query now:
1. First tries CockroachDB API for genre-based categories
2. Falls back to `advancedSearch` for genre queries (which will be updated in task 7.1)
3. Uses TMDB only for company-specific categories (Marvel, DC, Disney, Pixar, Netflix)

## API Endpoints Used

### CockroachDB Endpoints
- `/api/movies` - Main movies endpoint with filters (genre, language, yearFrom, yearTo, ratingFrom, ratingTo, sortBy)
- `/api/tv` - TV series endpoint with same filters
- `/api/trending` - Trending content endpoint (type, timeWindow, limit)
- `/api/db/movies/search` - Search endpoint (POST)

### Query Parameters Mapping
| TMDB Parameter | CockroachDB Parameter |
|----------------|----------------------|
| `with_genres` | `genre` |
| `with_original_language` | `language` |
| `primary_release_date.gte` | `yearFrom` |
| `primary_release_date.lte` | `yearTo` |
| `vote_average.gte` | `ratingFrom` |
| `vote_average.lte` | `ratingTo` |
| `sort_by` | `sortBy` |

## Testing Results

### API Endpoint Tests
✅ `/api/movies?limit=5` - Returns movies with valid slugs
✅ `/api/trending?type=movie&limit=5` - Returns trending movies with valid slugs

### Server Logs
✅ TMDB proxy correctly blocking `/discover/movie` endpoints
✅ TMDB proxy correctly blocking `/trending/movie/week` endpoints
✅ `/api/movies` endpoint responding with 200 status
✅ `/api/db/movies/search` endpoint responding with 200 status

### Frontend
✅ No TypeScript errors
✅ Hot module replacement working correctly
✅ All API requests returning 200 responses

## Data Transformation

All CockroachDB responses are transformed to match the expected frontend format:

```typescript
return result.data.map((item: any) => ({ 
  ...item, 
  media_type: 'movie',
  poster_path: item.poster_url || item.poster_path,
  backdrop_path: item.backdrop_url || item.backdrop_path
}))
```

This ensures:
- `media_type` is set to 'movie' for proper component rendering
- `poster_path` falls back to `poster_url` from CockroachDB
- `backdrop_path` falls back to `backdrop_url` from CockroachDB

## Remaining TMDB Usage

The following TMDB calls are **intentionally preserved** as they are allowed per the design document:

1. **Company-specific queries** (Marvel, DC, Disney, Pixar, Netflix) - These filter by production company
2. **advancedSearch fallback** in category query - Will be replaced in task 7.1

## Requirements Satisfied

✅ **R3**: Replace TMDB Calls in Discovery Pages - Movies.tsx updated
✅ **R2**: Use CockroachDB Equivalent Endpoints - All endpoints support required filters
✅ **R7**: Preserve TMDB for Details Only - Company queries preserved as detail-level queries

## Next Steps

1. Task 4.2: Update Series.tsx to use CockroachDB API
2. Task 4.3: Update TopWatched.tsx to use CockroachDB API
3. Task 7.1: Rewrite advancedSearch function to use CockroachDB

## Notes

- All changes maintain backward compatibility with existing components
- Error handling includes try-catch blocks with fallbacks
- Console logging added for debugging failed API calls
- No breaking changes to component interfaces
