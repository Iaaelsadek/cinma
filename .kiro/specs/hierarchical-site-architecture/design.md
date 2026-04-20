# Design Document: Hierarchical Site Architecture

## Overview

This design document outlines the technical architecture for implementing a comprehensive hierarchical site structure that organizes content across multiple levels (content type → category/platform → year → item). The system will support 2,585 hierarchical pages across movies, series, anime, gaming, software, and Quran content.

### Goals

1. Build complete infrastructure to receive content from TMDB later and automatically categorize it
2. Add new database columns (primary_genre, primary_platform, nationality) with proper indexing
3. Create intelligent HierarchicalPage component that fetches and displays content
4. Implement 2,585 hierarchical routes with SEO optimization
5. Maintain backward compatibility with existing routes and slugs

### Non-Goals

- Filling database with new content (will be done later by user)
- Migrating content from external sources
- Modifying existing content or slugs


### Context

The current system has:
- ~20 movies + 1 TV series in CockroachDB
- Basic genre information stored in JSONB format
- Existing routes for content detail pages
- No hierarchical organization of content

After implementation:
- Database will have new columns for hierarchical filtering
- 2,585 new routes will be available
- Content will be automatically categorized when added
- All existing routes and slugs will remain functional

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ /movies/   │  │ /movies/   │  │ /movies/   │            │
│  │  action    │  │   2024     │  │action/2024 │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
└────────┼────────────────┼────────────────┼───────────────────┘
         │                │                │
         └────────────────┴────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │   React Router (DiscoveryRoutes) │
         │   - 2,585 hierarchical routes    │
         │   - Dynamic route matching       │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │   HierarchicalPage Component    │
         │   - Props: contentType, genre,  │
         │     year, platform, preset      │
         │   - Builds API query params     │
         │   - Renders grid + SEO          │
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │      CockroachDB API Layer      │
         │   - /api/movies?primary_genre=  │
         │   - /api/tv?yearFrom=&yearTo=   │
         │   - /api/games?primary_platform=│
         └────────────────┬────────────────┘
                          │
         ┌────────────────▼────────────────┐
         │         CockroachDB             │
         │   Tables:                       │
         │   - movies (primary_genre)      │
         │   - tv_series (primary_genre)   │
         │   - games (primary_genre,       │
         │            primary_platform)    │
         │   - software (primary_platform) │
         │   - actors (nationality)        │
         │                                 │
         │   Indexes:                      │
         │   - idx_movies_primary_genre    │
         │   - idx_movies_lang_genre_year  │
         │   - idx_games_primary_platform  │
         └─────────────────────────────────┘
```

### Data Flow

#### Request Flow (User → Database)
```
1. User navigates to /movies/action/2024
   ↓
2. React Router matches route pattern
   ↓
3. DiscoveryRoutes renders HierarchicalPage with props:
   { contentType: 'movies', genre: 'action', year: 2024 }
   ↓
4. HierarchicalPage builds query params:
   { primary_genre: 'action', yearFrom: 2024, yearTo: 2024 }
   ↓
5. API endpoint /api/movies receives request
   ↓
6. API builds SQL query:
   SELECT * FROM movies 
   WHERE primary_genre = 'action' 
   AND EXTRACT(YEAR FROM release_date) = 2024
   ORDER BY popularity DESC
   LIMIT 20
   ↓
7. CockroachDB executes query using indexes
   ↓
8. Results returned to API
```

#### Response Flow (Database → User)
```
1. API receives results from CockroachDB
   ↓
2. API formats response:
   { results: [...], page: 1, total_pages: 5 }
   ↓
3. HierarchicalPage receives data via React Query
   ↓
4. Component renders:
   - SEO meta tags (title, description)
   - Breadcrumbs (الرئيسية > الأفلام > أكشن > 2024)
   - Grid of MovieCard components
   - Infinite scroll loader
   ↓
5. User sees content
```

### Hierarchical Structure

```
Level 1: Content Type
├── /movies/
├── /series/
├── /anime/
├── /gaming/
├── /software/
└── /quran/

Level 2: Category/Platform
├── /movies/action/
├── /movies/comedy/
├── /gaming/pc/
├── /gaming/playstation/
└── /software/windows/

Level 3: Year (Optional)
├── /movies/action/2024/
├── /movies/action/2025/
└── /series/drama/2023/

Level 4: Item (Existing)
└── /movies/action/2024/avatar-2009
```

### Route Patterns

**Static Routes (Explicit):**
```typescript
// Genre routes
<Route path="/movies/action" element={<HierarchicalPage contentType="movies" genre="action" />} />
<Route path="/movies/comedy" element={<HierarchicalPage contentType="movies" genre="comedy" />} />

// Year routes
<Route path="/movies/2024" element={<HierarchicalPage contentType="movies" year={2024} />} />
<Route path="/movies/2025" element={<HierarchicalPage contentType="movies" year={2025} />} />

// Special routes
<Route path="/movies/trending" element={<HierarchicalPage contentType="movies" preset="trending" />} />
```

**Dynamic Routes (Pattern Matching):**
```typescript
// Combined genre + year
<Route path="/movies/:genre/:year" element={<DynamicMoviePage />} />

// DynamicMoviePage extracts params and passes to HierarchicalPage
const DynamicMoviePage = () => {
  const { genre, year } = useParams()
  return <HierarchicalPage 
    contentType="movies" 
    genre={genre} 
    year={year ? Number(year) : undefined} 
  />
}
```

## Components and Interfaces

### HierarchicalPage Component

**File:** `src/pages/discovery/HierarchicalPage.tsx`

**Props Interface:**
```typescript
interface HierarchicalPageProps {
  contentType: 'movies' | 'series' | 'anime' | 'gaming' | 'software'
  genre?: string           // e.g., 'action', 'comedy'
  year?: number            // e.g., 2024, 2025
  platform?: string        // e.g., 'pc', 'playstation' (for gaming/software)
  preset?: 'trending' | 'popular' | 'top-rated' | 'latest' | 'upcoming'
}
```

**State Management:**
```typescript
const [page, setPage] = useState(1)
const [items, setItems] = useState<ContentItem[]>([])
```

**API Query Construction:**
```typescript
// Build query parameters based on props
const params = new URLSearchParams({
  page: page.toString(),
  limit: '20'
})

if (genre) params.set('primary_genre', genre)
if (year) {
  params.set('yearFrom', year.toString())
  params.set('yearTo', year.toString())
}
if (platform) params.set('primary_platform', platform)
if (preset === 'trending') params.set('sort', 'popularity.desc')
if (preset === 'top-rated') {
  params.set('sort', 'vote_average.desc')
  params.set('ratingFrom', '7')
}
```

**Data Fetching:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['hierarchical', contentType, genre, year, platform, preset, page],
  queryFn: async () => {
    const endpoint = getEndpoint(contentType) // /api/movies, /api/tv, etc.
    const response = await fetch(`${endpoint}?${params}`)
    return response.json()
  }
})
```

**Rendering:**
```typescript
return (
  <div className="max-w-[2400px] mx-auto px-4 md:px-12 py-6">
    <Helmet>
      <title>{generateTitle(contentType, genre, year)}</title>
      <meta name="description" content={generateDescription(contentType, genre, year)} />
    </Helmet>
    
    <Breadcrumbs items={generateBreadcrumbs(contentType, genre, year)} />
    
    <h1>{generateHeading(contentType, genre, year)}</h1>
    
    {isLoading && <SkeletonGrid count={20} variant="poster" />}
    
    {!isLoading && data?.results && (
      <InfiniteScroll
        dataLength={data.results.length}
        next={() => setPage(p => p + 1)}
        hasMore={page < data.total_pages}
        loader={<SkeletonGrid count={10} variant="poster" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {data.results.map(item => (
            <MovieCard key={item.id} movie={item} />
          ))}
        </div>
      </InfiniteScroll>
    )}
    
    {!isLoading && (!data?.results || data.results.length === 0) && (
      <EmptyState />
    )}
  </div>
)
```

### Helper Functions

**SEO Title Generation:**
```typescript
function generateTitle(
  contentType: string, 
  genre?: string, 
  year?: number
): string {
  const typeLabel = {
    movies: 'أفلام',
    series: 'مسلسلات',
    anime: 'أنمي',
    gaming: 'ألعاب',
    software: 'برمجيات'
  }[contentType]
  
  if (genre && year) {
    return `${typeLabel} ${genre} ${year} | سينما أونلاين`
  }
  if (genre) {
    return `${typeLabel} ${genre} | سينما أونلاين`
  }
  if (year) {
    return `${typeLabel} ${year} | سينما أونلاين`
  }
  return `${typeLabel} | سينما أونلاين`
}
```

**Breadcrumbs Generation:**
```typescript
function generateBreadcrumbs(
  contentType: string,
  genre?: string,
  year?: number
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'الرئيسية', path: '/' }
  ]
  
  const typeLabel = {
    movies: 'الأفلام',
    series: 'المسلسلات',
    anime: 'الأنمي',
    gaming: 'الألعاب',
    software: 'البرمجيات'
  }[contentType]
  
  items.push({ label: typeLabel, path: `/${contentType}` })
  
  if (genre) {
    items.push({ label: genre, path: `/${contentType}/${genre}` })
  }
  
  if (year) {
    const path = genre ? `/${contentType}/${genre}/${year}` : `/${contentType}/${year}`
    items.push({ label: year.toString(), path })
  }
  
  return items
}
```

## Data Models

### Database Schema Changes

**Movies Table:**
```sql
-- New column
ALTER TABLE movies ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);

-- Populate from JSONB
UPDATE movies 
SET primary_genre = LOWER(REPLACE(genres->0->>'name', ' ', '-'))
WHERE genres IS NOT NULL 
  AND jsonb_array_length(genres) > 0
  AND primary_genre IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movies_primary_genre 
  ON movies (primary_genre);

CREATE INDEX IF NOT EXISTS idx_movies_lang_genre_year 
  ON movies (original_language, primary_genre, release_date DESC);
```

**TV Series Table:**
```sql
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);

UPDATE tv_series 
SET primary_genre = LOWER(REPLACE(genres->0->>'name', ' ', '-'))
WHERE genres IS NOT NULL 
  AND jsonb_array_length(genres) > 0
  AND primary_genre IS NULL;

CREATE INDEX IF NOT EXISTS idx_tv_primary_genre 
  ON tv_series (primary_genre);

CREATE INDEX IF NOT EXISTS idx_tv_lang_genre_year 
  ON tv_series (original_language, primary_genre, first_air_date DESC);
```

**Games Table:**
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);
ALTER TABLE games ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50);

UPDATE games 
SET primary_genre = LOWER(REPLACE(genres->0->>'name', ' ', '-'))
WHERE genres IS NOT NULL 
  AND jsonb_array_length(genres) > 0
  AND primary_genre IS NULL;

UPDATE games 
SET primary_platform = LOWER(REPLACE(platform->0->>'name', ' ', '-'))
WHERE platform IS NOT NULL 
  AND jsonb_array_length(platform) > 0
  AND primary_platform IS NULL;

CREATE INDEX IF NOT EXISTS idx_games_primary_genre 
  ON games (primary_genre);

CREATE INDEX IF NOT EXISTS idx_games_primary_platform 
  ON games (primary_platform);

CREATE INDEX IF NOT EXISTS idx_games_platform_genre_year 
  ON games (primary_platform, primary_genre, release_date DESC);
```

**Software Table:**
```sql
ALTER TABLE software ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50);

UPDATE software 
SET primary_platform = LOWER(REPLACE(platform->0->>'name', ' ', '-'))
WHERE platform IS NOT NULL 
  AND jsonb_array_length(platform) > 0
  AND primary_platform IS NULL;

CREATE INDEX IF NOT EXISTS idx_software_primary_platform 
  ON software (primary_platform);

CREATE INDEX IF NOT EXISTS idx_software_platform_date 
  ON software (primary_platform, release_date DESC);
```

**Actors Table:**
```sql
ALTER TABLE actors ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);

UPDATE actors 
SET nationality = CASE
  WHEN place_of_birth ILIKE '%Egypt%' OR place_of_birth ILIKE '%مصر%' THEN 'egyptian'
  WHEN place_of_birth ILIKE '%Saudi%' OR place_of_birth ILIKE '%السعودية%' THEN 'saudi'
  WHEN place_of_birth ILIKE '%USA%' OR place_of_birth ILIKE '%United States%' THEN 'american'
  WHEN place_of_birth ILIKE '%UK%' OR place_of_birth ILIKE '%England%' THEN 'british'
  WHEN place_of_birth ILIKE '%Korea%' OR place_of_birth ILIKE '%كوريا%' THEN 'korean'
  WHEN place_of_birth ILIKE '%India%' OR place_of_birth ILIKE '%الهند%' THEN 'indian'
  WHEN place_of_birth ILIKE '%Turkey%' OR place_of_birth ILIKE '%تركيا%' THEN 'turkish'
  ELSE 'international'
END
WHERE place_of_birth IS NOT NULL AND nationality IS NULL;

CREATE INDEX IF NOT EXISTS idx_actors_nationality 
  ON actors (nationality);

CREATE INDEX IF NOT EXISTS idx_actors_nationality_pop 
  ON actors (nationality, popularity DESC);
```

### API Response Format

**Standard Response:**
```typescript
interface APIResponse<T> {
  results: T[]
  page: number
  total_pages: number
  total_results?: number
}
```

**Movie Item:**
```typescript
interface Movie {
  id: number
  slug: string
  title: string
  title_ar?: string
  title_en?: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date: string
  genres: Genre[]
  primary_genre: string  // NEW
  original_language: string
  popularity: number
}
```

**TV Series Item:**
```typescript
interface TVSeries {
  id: number
  slug: string
  name: string
  name_ar?: string
  name_en?: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  first_air_date: string
  genres: Genre[]
  primary_genre: string  // NEW
  original_language: string
  popularity: number
}
```

**Game Item:**
```typescript
interface Game {
  id: number
  slug: string
  title: string
  poster_url: string | null
  rating: number
  release_date: string
  genres: Genre[]
  primary_genre: string     // NEW
  platform: Platform[]
  primary_platform: string  // NEW
}
```

### API Endpoints

**Movies API:**
```
GET /api/movies

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- primary_genre: string (e.g., 'action', 'comedy')
- yearFrom: number (e.g., 2024)
- yearTo: number (e.g., 2024)
- ratingFrom: number (e.g., 7.0)
- ratingTo: number (e.g., 10.0)
- language: string (e.g., 'ar', 'en')
- sort: string (e.g., 'popularity.desc', 'vote_average.desc', 'release_date.desc')

Response:
{
  results: Movie[],
  page: number,
  total_pages: number
}
```

**TV Series API:**
```
GET /api/tv

Query Parameters: (same as movies)

Response:
{
  results: TVSeries[],
  page: number,
  total_pages: number
}
```

**Games API:**
```
GET /api/games

Query Parameters:
- page: number
- limit: number
- primary_genre: string
- primary_platform: string (e.g., 'pc', 'playstation')
- yearFrom: number
- yearTo: number
- ratingFrom: number
- sort: string

Response:
{
  results: Game[],
  page: number,
  total_pages: number
}
```

**Software API:**
```
GET /api/software

Query Parameters:
- page: number
- limit: number
- primary_platform: string (e.g., 'windows', 'mac', 'linux')
- category: string (e.g., 'productivity', 'design')
- sort: string

Response:
{
  results: Software[],
  page: number,
  total_pages: number
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JSONB Data Extraction Preserves Structure

*For any* content item (movie, TV series, game, software) with a non-empty genres or platform JSONB array, extracting the first element and storing it as primary_genre or primary_platform should preserve the original data structure, and querying the JSONB should return the same value as the extracted column.

**Validates: Requirements 1.8, 1.9, 1.18**

**Rationale:** This is a round-trip property ensuring data integrity during migration. The extraction process should be reversible and consistent.

### Property 2: Name Normalization Consistency

*For any* genre name or platform name, normalizing it (converting to lowercase and replacing spaces with hyphens) should produce a consistent, URL-safe slug that can be used in routes and database queries.

**Validates: Requirements 6.12, 6.13**

**Rationale:** Ensures consistent naming across the system. "Sci-Fi" → "sci-fi", "Action & Adventure" → "action-&-adventure".

### Property 3: Filter Combination with AND Logic

*For any* combination of filters (genre, year, platform, rating), the API should combine them using AND logic, meaning all conditions must be satisfied for a result to be included.

**Validates: Requirements 2.9, 4.18**

**Rationale:** Ensures predictable filtering behavior. If user requests action movies from 2024, they should get movies that are BOTH action AND from 2024, not action OR 2024.

### Property 4: Genre Filtering Accuracy

*For any* genre value, when provided as a filter parameter, the API should return only content where primary_genre exactly matches the provided value.

**Validates: Requirements 2.6, 4.9**

**Rationale:** Core filtering functionality. If user requests "action", they should only see action content, not comedy or drama.

### Property 5: Year Range Filtering Accuracy

*For any* year range (yearFrom, yearTo), the API should return only content where the release year falls within the specified range (inclusive).

**Validates: Requirements 2.7, 4.10**

**Rationale:** Ensures accurate temporal filtering. Movies from 2024 should appear when filtering for 2024, but not when filtering for 2023.

### Property 6: Platform Filtering Accuracy

*For any* platform value, when provided as a filter parameter, the API should return only content where primary_platform exactly matches the provided value.

**Validates: Requirements 2.8, 4.15**

**Rationale:** Platform-specific filtering for games and software. PC games should not appear in PlayStation results.

### Property 7: Rating Filtering Accuracy

*For any* rating threshold (ratingFrom), the API should return only content where vote_average is greater than or equal to the threshold.

**Validates: Requirements 4.11**

**Rationale:** Quality filtering. If user requests movies rated 7+, they should only see movies with vote_average >= 7.0.

### Property 8: Query Idempotence

*For any* valid filter combination, executing the same query multiple times should return identical results (same items in same order).

**Validates: Requirements 2.18, 4.24**

**Rationale:** Ensures query determinism and caching reliability. Users should see consistent results when refreshing or navigating back.

### Property 9: SEO Metadata Generation Consistency

*For any* combination of contentType, genre, and year, the system should generate consistent SEO metadata (title, description, breadcrumbs) following the defined format patterns.

**Validates: Requirements 2.14, 2.15, 5.4, 5.5, 5.9**

**Rationale:** Ensures consistent SEO across all hierarchical pages. Format: "{genre} {year} | سينما أونلاين".

### Property 10: Route Stability

*For any* hierarchical route, navigating to it and then refreshing the page should display the same content without errors.

**Validates: Requirements 3.29**

**Rationale:** Ensures routes are stable and bookmarkable. Users should be able to share URLs and return to the same content.

### Property 11: Backward Compatibility Preservation

*For any* existing route or slug, adding new hierarchical routes should not break or modify the existing route's behavior.

**Validates: Requirements 3.27, 3.28, 7.20**

**Rationale:** Critical for maintaining existing functionality. Old URLs must continue to work after adding new routes.

### Property 12: Input Validation Consistency

*For any* query parameter (genre, year, rating, platform), the system should validate it against allowed values/ranges before executing database queries, rejecting invalid inputs with appropriate error messages.

**Validates: Requirements 9.5, 9.6, 9.12, 9.13, 9.14**

**Rationale:** Security and data integrity. Prevents SQL injection and invalid data from reaching the database.

### Property 13: Error Recovery Without Data Loss

*For any* error scenario (database connection failure, API timeout, invalid input), the system should recover gracefully without losing or corrupting existing data.

**Validates: Requirements 9.18**

**Rationale:** System resilience. Errors should not cause data loss or leave the system in an inconsistent state.

### Property 14: Data Preservation During Migration

*For any* existing content item, running the migration script should preserve all original data while adding new fields, and querying the item after migration should return all original fields plus the new ones.

**Validates: Requirements 6.15**

**Rationale:** Migration safety. The 20 existing movies and 1 TV series must not be modified or lost during schema changes.

### Property 15: Index Performance Improvement

*For any* query that uses primary_genre, primary_platform, or composite indexes, the query execution time with indexes should be significantly faster than without indexes (measurable via EXPLAIN ANALYZE).

**Validates: Requirements 8.17**

**Rationale:** Performance optimization. Indexes should provide measurable performance benefits for hierarchical queries.

### Property 16: Navigation State Consistency

*For any* user interaction (clicking content card, navigating back, changing filters), the system should preserve appropriate state (scroll position, previous filters) to maintain a consistent user experience.

**Validates: Requirements 5.18**

**Rationale:** User experience. Navigation should feel natural and predictable, with state preserved where appropriate.

### Property 17: API Response Format Consistency

*For any* API endpoint, the response should follow the standard format: `{results: [], page: number, total_pages: number}`, regardless of the number of results or filter combination.

**Validates: Requirements 4.19**

**Rationale:** API contract consistency. Clients should be able to rely on a consistent response structure.

### Property 18: Breadcrumb Hierarchy Accuracy

*For any* hierarchical page, the breadcrumbs should accurately reflect the navigation path from home to the current page, with each level linking to the appropriate parent page.

**Validates: Requirements 2.16, 5.5**

**Rationale:** Navigation clarity. Users should always know where they are in the site hierarchy and be able to navigate up levels.

### Property 19: Content Card Navigation Consistency

*For any* content card displayed in the grid, clicking it should navigate to the correct detail page using the item's slug in the URL format: `/{contentType}/{genre}/{year}/{slug}`.

**Validates: Requirements 5.15**

**Rationale:** Ensures consistent navigation behavior across all content types and hierarchical levels.

### Property 20: Empty State Handling

*For any* filter combination that returns zero results, the system should display an appropriate empty state message rather than showing an error or blank page.

**Validates: Requirements 4.20, 9.16**

**Rationale:** User experience for edge cases. Users should understand when no content matches their filters, not think the system is broken.

## Error Handling

### Database Connection Errors

**Strategy:** Retry with exponential backoff

```typescript
async function fetchWithRetry(
  endpoint: string, 
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(endpoint)
      if (response.ok) return response
      
      // If server error, retry
      if (response.status >= 500) {
        await sleep(Math.pow(2, i) * 1000) // 1s, 2s, 4s
        continue
      }
      
      // If client error, don't retry
      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(Math.pow(2, i) * 1000)
    }
  }
  throw new Error('Max retries exceeded')
}
```

**Validates: Requirements 9.1**

### API Request Failures

**Strategy:** Display user-friendly error message with retry option

```typescript
if (error) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <h3 className="text-lg font-bold mb-2">حدث خطأ في تحميل المحتوى</h3>
      <p className="text-sm text-zinc-400 mb-4">
        {error.message || 'حاول مرة أخرى'}
      </p>
      <Button onClick={() => refetch()}>إعادة المحاولة</Button>
    </div>
  )
}
```

**Validates: Requirements 9.2**

### Invalid Route Parameters

**Strategy:** Redirect to 404 page

```typescript
// In HierarchicalPage component
useEffect(() => {
  const validGenres = ['action', 'comedy', 'drama', /* ... */]
  const validYears = Array.from({ length: 147 }, (_, i) => 2026 - i) // 2026-1880
  
  if (genre && !validGenres.includes(genre)) {
    navigate('/404', { replace: true })
  }
  
  if (year && !validYears.includes(year)) {
    navigate('/404', { replace: true })
  }
}, [genre, year, navigate])
```

**Validates: Requirements 9.3, 9.4**

### Input Validation

**Strategy:** Validate all query parameters before database queries

```typescript
function validateQueryParams(params: QueryParams): ValidationResult {
  const errors: string[] = []
  
  // Validate genre
  if (params.primary_genre) {
    const validGenres = ['action', 'comedy', 'drama', /* ... */]
    if (!validGenres.includes(params.primary_genre)) {
      errors.push('Invalid genre')
    }
  }
  
  // Validate year
  if (params.yearFrom || params.yearTo) {
    const year = params.yearFrom || params.yearTo
    if (year < 1900 || year > 2100) {
      errors.push('Year must be between 1900 and 2100')
    }
  }
  
  // Validate rating
  if (params.ratingFrom || params.ratingTo) {
    const rating = params.ratingFrom || params.ratingTo
    if (rating < 0 || rating > 10) {
      errors.push('Rating must be between 0 and 10')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

**Validates: Requirements 9.5, 9.12, 9.13, 9.14**

### SQL Injection Prevention

**Strategy:** Use parameterized queries exclusively

```typescript
// CORRECT - Parameterized query
const query = `
  SELECT * FROM movies 
  WHERE primary_genre = $1 
  AND EXTRACT(YEAR FROM release_date) = $2
  LIMIT $3 OFFSET $4
`
const values = [genre, year, limit, offset]
const result = await db.query(query, values)

// WRONG - String concatenation (NEVER DO THIS)
// const query = `SELECT * FROM movies WHERE primary_genre = '${genre}'`
```

**Validates: Requirements 4.22, 9.6**

### Migration Rollback

**Strategy:** Use transactions with rollback on failure

```sql
BEGIN;

-- All migration operations here
ALTER TABLE movies ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);
-- ... more operations

-- If any operation fails, rollback
COMMIT;

-- Rollback script (separate file)
BEGIN;
ALTER TABLE movies DROP COLUMN IF EXISTS primary_genre;
-- ... reverse all operations
COMMIT;
```

**Validates: Requirements 6.4, 6.5, 9.11**

### Error Boundaries

**Strategy:** Wrap components in error boundaries for graceful degradation

```typescript
class HierarchicalPageErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('HierarchicalPage Error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle size={48} className="text-yellow-500 mb-4" />
          <h3 className="text-lg font-bold mb-2">حدث خطأ غير متوقع</h3>
          <Button onClick={() => window.location.reload()}>
            إعادة تحميل الصفحة
          </Button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

**Validates: Requirements 8.13, 9.9, 9.10**

### Query Timeout Handling

**Strategy:** Set timeout and show error after 5 seconds

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['hierarchical', ...],
  queryFn: async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(endpoint, { 
        signal: controller.signal 
      })
      clearTimeout(timeoutId)
      return response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }
  }
})
```

**Validates: Requirements 8.14, 9.17**

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:** Verify specific examples, edge cases, and integration points
- Test specific genre/year combinations
- Test empty result handling
- Test error scenarios
- Test component rendering with specific props

**Property-Based Tests:** Verify universal properties across all inputs
- Test filter combinations with random inputs
- Test data extraction with random JSONB structures
- Test normalization with random strings
- Test API responses with random parameters

### Property-Based Testing Configuration

**Library:** We will use `fast-check` for TypeScript property-based testing

**Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: hierarchical-site-architecture, Property {number}: {property_text}`

**Example Property Test:**

```typescript
import fc from 'fast-check'

describe('Feature: hierarchical-site-architecture', () => {
  test('Property 1: JSONB Data Extraction Preserves Structure', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.integer(), name: fc.string() }), { minLength: 1 }),
        (genres) => {
          // Simulate extraction
          const jsonb = JSON.stringify(genres)
          const primaryGenre = genres[0].name.toLowerCase().replace(/\s+/g, '-')
          
          // Verify round-trip
          const parsed = JSON.parse(jsonb)
          const extracted = parsed[0].name.toLowerCase().replace(/\s+/g, '-')
          
          expect(extracted).toBe(primaryGenre)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  test('Property 2: Name Normalization Consistency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (name) => {
          // Normalize twice
          const normalized1 = name.toLowerCase().replace(/\s+/g, '-')
          const normalized2 = name.toLowerCase().replace(/\s+/g, '-')
          
          // Should be identical (idempotent)
          expect(normalized1).toBe(normalized2)
          
          // Should be URL-safe (no spaces)
          expect(normalized1).not.toContain(' ')
        }
      ),
      { numRuns: 100 }
    )
  })
  
  test('Property 8: Query Idempotence', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          genre: fc.constantFrom('action', 'comedy', 'drama'),
          year: fc.integer({ min: 2020, max: 2026 })
        }),
        async (filters) => {
          // Execute query twice
          const result1 = await fetchMovies(filters)
          const result2 = await fetchMovies(filters)
          
          // Results should be identical
          expect(result1).toEqual(result2)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Testing Examples

```typescript
describe('HierarchicalPage Component', () => {
  test('should render with genre filter', () => {
    render(<HierarchicalPage contentType="movies" genre="action" />)
    expect(screen.getByText(/أفلام action/i)).toBeInTheDocument()
  })
  
  test('should display empty state when no results', async () => {
    mockAPI.mockResolvedValue({ results: [], page: 1, total_pages: 0 })
    render(<HierarchicalPage contentType="movies" genre="nonexistent" />)
    
    await waitFor(() => {
      expect(screen.getByText(/لا توجد نتائج/i)).toBeInTheDocument()
    })
  })
  
  test('should handle API errors gracefully', async () => {
    mockAPI.mockRejectedValue(new Error('Network error'))
    render(<HierarchicalPage contentType="movies" genre="action" />)
    
    await waitFor(() => {
      expect(screen.getByText(/حدث خطأ/i)).toBeInTheDocument()
    })
  })
})

describe('API Endpoints', () => {
  test('GET /api/movies?primary_genre=action should return only action movies', async () => {
    const response = await fetch('/api/movies?primary_genre=action')
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.results.every(m => m.primary_genre === 'action')).toBe(true)
  })
  
  test('GET /api/movies with invalid genre should return 400', async () => {
    const response = await fetch('/api/movies?primary_genre=invalid')
    expect(response.status).toBe(400)
  })
})

describe('Migration Script', () => {
  test('should add primary_genre column to movies table', async () => {
    await runMigration()
    
    const columns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movies'
    `)
    
    expect(columns.rows.some(c => c.column_name === 'primary_genre')).toBe(true)
  })
  
  test('should populate primary_genre for existing movies', async () => {
    await runMigration()
    
    const movies = await db.query(`
      SELECT id, primary_genre 
      FROM movies 
      WHERE genres IS NOT NULL
    `)
    
    expect(movies.rows.every(m => m.primary_genre !== null)).toBe(true)
  })
})
```

### Integration Testing

```typescript
describe('End-to-End Hierarchical Navigation', () => {
  test('should navigate from home to genre to year to movie', async () => {
    // Start at home
    render(<App />)
    
    // Click on "أفلام"
    fireEvent.click(screen.getByText('أفلام'))
    expect(window.location.pathname).toBe('/movies')
    
    // Click on "أكشن"
    fireEvent.click(screen.getByText('أكشن'))
    expect(window.location.pathname).toBe('/movies/action')
    
    // Click on "2024"
    fireEvent.click(screen.getByText('2024'))
    expect(window.location.pathname).toBe('/movies/action/2024')
    
    // Click on a movie card
    const movieCard = screen.getAllByRole('link')[0]
    fireEvent.click(movieCard)
    expect(window.location.pathname).toMatch(/^\/movies\/action\/2024\/[\w-]+$/)
  })
  
  test('should preserve state when navigating back', async () => {
    render(<App />)
    
    // Navigate to /movies/action
    fireEvent.click(screen.getByText('أفلام'))
    fireEvent.click(screen.getByText('أكشن'))
    
    // Scroll down
    window.scrollTo(0, 500)
    const scrollPosition = window.scrollY
    
    // Click on a movie
    fireEvent.click(screen.getAllByRole('link')[0])
    
    // Navigate back
    fireEvent.click(screen.getByText('رجوع'))
    
    // Scroll position should be preserved
    expect(window.scrollY).toBe(scrollPosition)
  })
})
```

### Performance Testing

```typescript
describe('Performance', () => {
  test('queries with indexes should be faster than without', async () => {
    // Query without index
    await db.query('DROP INDEX IF EXISTS idx_movies_primary_genre')
    const start1 = Date.now()
    await db.query('SELECT * FROM movies WHERE primary_genre = $1', ['action'])
    const duration1 = Date.now() - start1
    
    // Query with index
    await db.query('CREATE INDEX idx_movies_primary_genre ON movies(primary_genre)')
    const start2 = Date.now()
    await db.query('SELECT * FROM movies WHERE primary_genre = $1', ['action'])
    const duration2 = Date.now() - start2
    
    // Should be at least 50% faster
    expect(duration2).toBeLessThan(duration1 * 0.5)
  })
  
  test('should use indexes for hierarchical queries', async () => {
    const explain = await db.query(`
      EXPLAIN ANALYZE
      SELECT * FROM movies 
      WHERE primary_genre = 'action' 
      AND EXTRACT(YEAR FROM release_date) = 2024
    `)
    
    const plan = explain.rows[0]['QUERY PLAN']
    expect(plan).toContain('Index Scan')
    expect(plan).not.toContain('Seq Scan')
  })
})
```



## Implementation Summary

### Phase 1: Database Schema Enhancement (Estimated: 30 minutes)

**Tasks:**
1. Review and update migration script (`scripts/migration/add-hierarchical-structure.sql`)
2. Execute migration on CockroachDB
3. Verify columns added successfully
4. Verify indexes created successfully
5. Verify data populated for existing content (20 movies + 1 TV series)
6. Run verification queries to check data integrity

**Deliverables:**
- Updated migration script
- Migration execution log
- Verification query results

### Phase 2: HierarchicalPage Component (Estimated: 1 hour)

**Tasks:**
1. Create `src/pages/discovery/HierarchicalPage.tsx`
2. Implement props interface
3. Implement API query construction logic
4. Implement data fetching with React Query
5. Implement SEO metadata generation
6. Implement breadcrumbs generation
7. Implement grid rendering with infinite scroll
8. Implement loading and empty states
9. Add error handling and error boundaries

**Deliverables:**
- HierarchicalPage component
- Helper functions for SEO and breadcrumbs
- Unit tests for component

### Phase 3: Route Configuration (Estimated: 1 hour)

**Tasks:**
1. Update `src/routes/DiscoveryRoutes.tsx`
2. Add static routes for genres (20 for movies, 15 for series, etc.)
3. Add static routes for years (47 for movies/series, 27 for anime, etc.)
4. Add dynamic routes for combined filters
5. Add special routes (trending, popular, top-rated, etc.)
6. Verify no conflicts with existing routes
7. Test route matching and parameter extraction

**Deliverables:**
- Updated DiscoveryRoutes.tsx with 2,585 routes
- Route testing results

### Phase 4: API Enhancement (Estimated: 30 minutes)

**Tasks:**
1. Update existing API endpoints to support new filters
2. Add `primary_genre` filter to `/api/movies` and `/api/tv`
3. Add `primary_platform` filter to `/api/games` and `/api/software`
4. Implement input validation for all query parameters
5. Implement SQL injection prevention with parameterized queries
6. Add error handling and logging
7. Test API endpoints with various filter combinations

**Deliverables:**
- Updated API endpoints
- API documentation
- API test results

### Phase 5: Testing and Verification (Estimated: 30 minutes)

**Tasks:**
1. Run unit tests for all components
2. Run property-based tests for correctness properties
3. Test hierarchical navigation end-to-end
4. Verify SEO metadata on sample pages
5. Verify breadcrumbs on sample pages
6. Test with existing 20 movies
7. Verify no console errors
8. Verify no TypeScript compilation errors
9. Run EXPLAIN ANALYZE on queries to verify index usage
10. Test backward compatibility with existing routes

**Deliverables:**
- Test results report
- Performance metrics
- Compatibility verification

### Total Estimated Time: 3.5 hours

## Diagrams

### Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         MOVIES TABLE                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ slug (UNIQUE)                                                │
│ title, title_ar, title_en                                    │
│ poster_path, backdrop_path                                   │
│ vote_average, popularity                                     │
│ release_date                                                 │
│ original_language                                            │
│ genres (JSONB)                                               │
│ primary_genre (VARCHAR(50)) ← NEW                            │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│ - idx_movies_primary_genre (primary_genre)                   │
│ - idx_movies_lang_genre_year (original_language,             │
│                               primary_genre,                 │
│                               release_date DESC)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TV_SERIES TABLE                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ slug (UNIQUE)                                                │
│ name, name_ar, name_en                                       │
│ poster_path, backdrop_path                                   │
│ vote_average, popularity                                     │
│ first_air_date                                               │
│ original_language                                            │
│ genres (JSONB)                                               │
│ primary_genre (VARCHAR(50)) ← NEW                            │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│ - idx_tv_primary_genre (primary_genre)                       │
│ - idx_tv_lang_genre_year (original_language,                 │
│                           primary_genre,                     │
│                           first_air_date DESC)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         GAMES TABLE                          │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ slug (UNIQUE)                                                │
│ title                                                        │
│ poster_url                                                   │
│ rating                                                       │
│ release_date                                                 │
│ genres (JSONB)                                               │
│ primary_genre (VARCHAR(50)) ← NEW                            │
│ platform (JSONB)                                             │
│ primary_platform (VARCHAR(50)) ← NEW                         │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│ - idx_games_primary_genre (primary_genre)                    │
│ - idx_games_primary_platform (primary_platform)              │
│ - idx_games_platform_genre_year (primary_platform,           │
│                                  primary_genre,              │
│                                  release_date DESC)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       SOFTWARE TABLE                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ slug (UNIQUE)                                                │
│ title                                                        │
│ poster_url                                                   │
│ rating                                                       │
│ release_date                                                 │
│ platform (JSONB)                                             │
│ primary_platform (VARCHAR(50)) ← NEW                         │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│ - idx_software_primary_platform (primary_platform)           │
│ - idx_software_platform_date (primary_platform,              │
│                               release_date DESC)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        ACTORS TABLE                          │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ name                                                         │
│ profile_path                                                 │
│ place_of_birth                                               │
│ nationality (VARCHAR(50)) ← NEW                              │
│ popularity                                                   │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│ - idx_actors_nationality (nationality)                       │
│ - idx_actors_nationality_pop (nationality,                   │
│                               popularity DESC)               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                            App                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      React Router                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DiscoveryRoutes                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Route: /movies/action                                  │ │
│  │ Route: /movies/2024                                    │ │
│  │ Route: /movies/action/2024                             │ │
│  │ Route: /series/drama                                   │ │
│  │ ... (2,585 routes total)                               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              HierarchicalPage Component                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Props: contentType, genre, year, platform, preset     │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ Helmet (SEO)                                   │   │ │
│  │ │ - title                                        │   │ │
│  │ │ - meta description                             │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ Breadcrumbs                                    │   │ │
│  │ │ الرئيسية > الأفلام > أكشن > 2024              │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ Heading                                        │   │ │
│  │ │ <h1>أفلام أكشن 2024</h1>                      │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ InfiniteScroll                                 │   │ │
│  │ │   ┌──────────────────────────────────────┐     │   │ │
│  │ │   │ Grid (2/4/6 cols)                    │     │   │ │
│  │ │   │   ┌────────┐ ┌────────┐ ┌────────┐  │     │   │ │
│  │ │   │   │MovieCard│ │MovieCard│ │MovieCard│  │     │   │ │
│  │ │   │   └────────┘ └────────┘ └────────┘  │     │   │ │
│  │ │   │   ┌────────┐ ┌────────┐ ┌────────┐  │     │   │ │
│  │ │   │   │MovieCard│ │MovieCard│ │MovieCard│  │     │   │ │
│  │ │   │   └────────┘ └────────┘ └────────┘  │     │   │ │
│  │ │   └──────────────────────────────────────┘     │   │ │
│  │ │   ┌──────────────────────────────────────┐     │   │ │
│  │ │   │ SkeletonGrid (loading)               │     │   │ │
│  │ │   └──────────────────────────────────────┘     │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ EmptyState (if no results)                     │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Route Hierarchy Diagram

```
                        Root (/)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    /movies/           /series/           /gaming/
        │                  │                  │
   ┌────┴────┐        ┌────┴────┐       ┌────┴────┐
   │         │        │         │       │         │
/action/  /2024/   /drama/  /2023/    /pc/   /action/
   │                  │                  │
   │                  │                  │
/2024/             /2023/             /action/
   │                  │                  │
   │                  │                  │
/avatar-2009    /breaking-bad      /cyberpunk-2077
(detail page)    (detail page)      (detail page)

Example Paths:
1. /movies → All movies
2. /movies/action → Action movies
3. /movies/2024 → Movies from 2024
4. /movies/action/2024 → Action movies from 2024
5. /movies/action/2024/avatar-2009 → Specific movie detail
```

### API Request Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ GET /movies/action/2024
       ▼
┌─────────────────────────────────────────┐
│         React Router                    │
│  Matches: /movies/:genre/:year          │
│  Params: { genre: 'action', year: 2024 }│
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      HierarchicalPage Component         │
│  Props: {                               │
│    contentType: 'movies',               │
│    genre: 'action',                     │
│    year: 2024                           │
│  }                                      │
└──────┬──────────────────────────────────┘
       │
       │ Build query params
       ▼
┌─────────────────────────────────────────┐
│         React Query (useQuery)          │
│  queryKey: ['hierarchical', 'movies',   │
│             'action', 2024, 1]          │
└──────┬──────────────────────────────────┘
       │
       │ fetch()
       ▼
┌─────────────────────────────────────────┐
│      API Endpoint: /api/movies          │
│  Query: ?primary_genre=action           │
│         &yearFrom=2024                  │
│         &yearTo=2024                    │
│         &page=1                         │
│         &limit=20                       │
└──────┬──────────────────────────────────┘
       │
       │ Build SQL query
       ▼
┌─────────────────────────────────────────┐
│         CockroachDB Query               │
│  SELECT * FROM movies                   │
│  WHERE primary_genre = $1               │
│    AND EXTRACT(YEAR FROM                │
│        release_date) = $2               │
│  ORDER BY popularity DESC               │
│  LIMIT $3 OFFSET $4                     │
│                                         │
│  Using indexes:                         │
│  - idx_movies_primary_genre             │
│  - idx_movies_lang_genre_year           │
└──────┬──────────────────────────────────┘
       │
       │ Return results
       ▼
┌─────────────────────────────────────────┐
│         API Response                    │
│  {                                      │
│    results: [                           │
│      { id: 1, title: "...", ... },      │
│      { id: 2, title: "...", ... }       │
│    ],                                   │
│    page: 1,                             │
│    total_pages: 5                       │
│  }                                      │
└──────┬──────────────────────────────────┘
       │
       │ Cache in React Query
       ▼
┌─────────────────────────────────────────┐
│      HierarchicalPage Component         │
│  Renders:                               │
│  - SEO meta tags                        │
│  - Breadcrumbs                          │
│  - Grid of MovieCard components         │
│  - Infinite scroll loader               │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Browser   │
│  (displays  │
│   content)  │
└─────────────┘
```

## References

### Related Files

- `.kiro/specs/hierarchical-site-architecture/requirements.md` - Requirements document
- `.kiro/FINAL_ARCHITECTURE_MAP.md` - Complete site architecture map
- `.kiro/FINAL_IMPLEMENTATION_PLAN_DETAILED.md` - Detailed implementation plan
- `scripts/migration/add-hierarchical-structure.sql` - Database migration script
- `src/routes/DiscoveryRoutes.tsx` - Existing route configuration
- `src/pages/discovery/Search.tsx` - Existing search page (reference for patterns)
- `src/lib/db.ts` - CockroachDB API functions
- `.kiro/DATABASE_ARCHITECTURE.md` - Database architecture rules
- `.kiro/DEVELOPER_RULES.md` - Developer guidelines

### External Resources

- [CockroachDB Documentation](https://www.cockroachlabs.com/docs/)
- [React Router v6 Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [fast-check Documentation](https://github.com/dubzzz/fast-check) - Property-based testing library
- [EARS Notation](https://alistairmavin.com/ears/) - Requirements specification format

### Key Decisions

1. **Database Choice:** CockroachDB for all content, Supabase only for auth/user data
   - Rationale: Established architecture, better performance for content queries
   
2. **Single Component Approach:** One HierarchicalPage component for all content types
   - Rationale: Reduces code duplication, easier to maintain, consistent behavior
   
3. **Static + Dynamic Routes:** Mix of explicit static routes and dynamic pattern matching
   - Rationale: Better SEO for common routes, flexibility for less common combinations
   
4. **Primary Genre/Platform Extraction:** Store first element from JSONB array
   - Rationale: Simplifies queries, improves performance, most content has clear primary category
   
5. **Index Strategy:** Single-column + composite indexes
   - Rationale: Optimizes both simple and complex hierarchical queries
   
6. **Property-Based Testing:** Use fast-check with 100+ iterations
   - Rationale: Ensures correctness across wide range of inputs, catches edge cases

### Assumptions

1. Content will be added later by user via TMDB import
2. Existing 20 movies + 1 TV series must be preserved
3. All content has at least one genre in JSONB array
4. Genre/platform names are consistent and normalized
5. Users expect Arabic-first UI with RTL support
6. SEO is critical for discoverability
7. Performance is important (target: <100ms query time)
8. Mobile-first responsive design is required

### Constraints

1. Must use CockroachDB API exclusively for content (NO Supabase)
2. Must maintain backward compatibility with existing routes
3. Must not break existing slugs or URLs
4. Must not modify existing content data
5. Must support Arabic and English languages
6. Must work with existing component library (MovieCard, SkeletonGrid, etc.)
7. Must follow existing code style and conventions
8. Must pass TypeScript type checking
9. Must pass ESLint rules

### Future Enhancements

1. **Actor Nationality Pages:** `/actors/egyptian`, `/actors/american`
2. **Language-Specific Pages:** `/movies/arabic`, `/movies/english`
3. **Decade Pages:** `/movies/2020s`, `/movies/2010s`
4. **Rating Ranges:** `/movies/highly-rated`, `/movies/7-8-stars`
5. **Multi-Genre Filtering:** `/movies/action+comedy`
6. **Advanced Sorting:** Sort by release date, rating, popularity
7. **Personalized Recommendations:** Based on user watch history
8. **Content Collections:** Curated lists like "Best of 2024", "Hidden Gems"
9. **Search Integration:** Combine hierarchical filtering with search
10. **Analytics:** Track popular genres, years, and navigation patterns

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-06  
**Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 - Database Schema Enhancement

