# Clean Slug URLs - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  /watch/movie/spider-man  →  URL Router                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Slug Resolution Layer                           │
│  - Extract slug from URL                                    │
│  - Query database by slug                                   │
│  - Get content ID                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           CockroachDB (Content Database)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ movies table                                         │   │
│  │ ┌─────┬──────────────────┬──────────────────────┐   │   │
│  │ │ id  │ slug             │ title                │   │   │
│  │ ├─────┼──────────────────┼──────────────────────┤   │   │
│  │ │ 550 │ spider-man       │ Spider-Man           │   │   │
│  │ │ 551 │ spider-man-2     │ Spider-Man 2         │   │   │
│  │ │ 552 │ spider-man-3     │ Spider-Man 3         │   │   │
│  │ │ 553 │ spider-man-home  │ Spider-Man: Homecom. │   │   │
│  │ └─────┴──────────────────┴──────────────────────┘   │   │
│  │ INDEX: slug (UNIQUE per content type)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Slug Generation Module (`src/lib/slug-generator.ts`)

```typescript
interface SlugGenerationOptions {
  title: string
  contentType: 'movie' | 'tv' | 'game' | 'software' | 'actor'
  existingSlugs?: string[]  // For duplicate detection
}

interface GeneratedSlug {
  slug: string
  isDuplicate: boolean
  sequenceNumber?: number
}

// Core function
function generateCleanSlug(title: string): string
  - Lowercase
  - Remove accents/diacritics
  - Replace spaces with hyphens
  - Remove special characters
  - Collapse multiple hyphens
  - Trim hyphens

// Duplicate handling
function generateUniqueSlug(
  title: string,
  contentType: string,
  existingSlugs: string[]
): GeneratedSlug
  - Generate base slug
  - Check for duplicates
  - If duplicate, append sequence number
  - Return unique slug
```

### 2. Slug Resolution Module (`src/lib/slug-resolver.ts`)

```typescript
interface SlugResolutionOptions {
  slug: string
  contentType: 'movie' | 'tv' | 'game' | 'software' | 'actor'
}

interface SlugResolutionResult {
  contentId: number
  slug: string
  title: string
}

// Core function
async function resolveSlug(
  slug: string,
  contentType: string
): Promise<SlugResolutionResult>
  - Query database by slug
  - Return content ID
  - Cache result for performance
```

### 3. URL Generation Module (`src/lib/utils.ts`)

```typescript
// Updated functions
function generateWatchUrl(item: ContentItem): string
  - Use item.slug directly
  - No ID appending
  - No fallback mechanisms

function generateContentUrl(item: ContentItem): string
  - Use item.slug directly
  - No ID appending

// Remove these functions:
// - parseWatchPath (extracts ID from slug)
// - generateSlugWithId (appends ID)
```

### 4. Database Schema

```sql
-- movies table
ALTER TABLE movies ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX idx_movies_slug ON movies(slug);

-- tv_series table
ALTER TABLE tv_series ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX idx_tv_series_slug ON tv_series(slug);

-- games table
ALTER TABLE games ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX idx_games_slug ON games(slug);

-- software table
ALTER TABLE software ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX idx_software_slug ON software(slug);

-- actors table
ALTER TABLE actors ADD COLUMN slug VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX idx_actors_slug ON actors(slug);
```

### 5. API Endpoints

```
GET /api/db/movies/slug/{slug}
  - Query movie by slug
  - Return: { id, slug, title, ... }

GET /api/db/tv/slug/{slug}
  - Query TV series by slug
  - Return: { id, slug, name, ... }

GET /api/db/games/slug/{slug}
  - Query game by slug
  - Return: { id, slug, title, ... }

GET /api/db/software/slug/{slug}
  - Query software by slug
  - Return: { id, slug, title, ... }

GET /api/db/actors/slug/{slug}
  - Query actor by slug
  - Return: { id, slug, name, ... }
```

### 6. Route Handlers

```typescript
// Watch page route
app.get('/watch/movie/:slug', async (req, res) => {
  const { slug } = req.params
  const result = await resolveSlug(slug, 'movie')
  // Fetch and render content
})

app.get('/watch/tv/:slug/s:season/ep:episode', async (req, res) => {
  const { slug, season, episode } = req.params
  const result = await resolveSlug(slug, 'tv')
  // Fetch and render content
})

// Details page routes
app.get('/movie/:slug', async (req, res) => {
  const { slug } = req.params
  const result = await resolveSlug(slug, 'movie')
  // Fetch and render details
})
```

## Data Flow

### URL to Content Resolution

```
User clicks: /watch/movie/spider-man
    ↓
URL Router extracts slug: "spider-man"
    ↓
Slug Resolver queries database:
  SELECT id, title FROM movies WHERE slug = 'spider-man'
    ↓
Database returns: { id: 550, title: 'Spider-Man' }
    ↓
Fetch content by ID from database
    ↓
Render content
```

### Content Creation

```
Admin adds new movie: "Spider-Man: Homecoming"
    ↓
Slug Generator creates slug: "spider-man-homecoming"
    ↓
Check for duplicates in database
    ↓
If unique, save to database
If duplicate, append sequence: "spider-man-homecoming-2"
    ↓
Store in database with slug
    ↓
Generate URL: /watch/movie/spider-man-homecoming
```

## Migration Strategy

### Phase 1: Preparation
- Create new slug column in all tables
- Generate clean slugs for all existing content
- Handle duplicates with sequence numbers

### Phase 2: Validation
- Verify all slugs are unique
- Verify all slugs match pattern `^[a-z0-9-]+$`
- Verify no NULL slugs

### Phase 3: Deployment
- Update URL generation functions
- Update route handlers
- Deploy to production

### Phase 4: Cleanup
- Remove old ID-based URL generation code
- Remove legacy redirect logic (if not needed)
- Update documentation

## Slug Uniqueness Algorithm

```
function generateUniqueSlug(title, existingSlugs):
  baseSlug = generateCleanSlug(title)
  
  if baseSlug not in existingSlugs:
    return baseSlug
  
  sequence = 2
  while true:
    candidateSlug = baseSlug + "-" + sequence
    if candidateSlug not in existingSlugs:
      return candidateSlug
    sequence++
```

## Performance Considerations

1. **Slug Lookup**: O(1) with database index
2. **Slug Generation**: O(n) where n = length of title
3. **Duplicate Detection**: O(1) with database query
4. **Caching**: LRU cache for frequently accessed slugs

## Error Handling

```
Slug not found:
  - Return 404 Not Found
  - Log error
  - Suggest search

Invalid slug format:
  - Return 400 Bad Request
  - Log error

Database error:
  - Return 500 Internal Server Error
  - Log error
  - Retry with exponential backoff
```

## Testing Strategy

1. **Unit Tests**: Slug generation and resolution
2. **Integration Tests**: URL routing and content fetching
3. **Property-Based Tests**: Slug uniqueness and validity
4. **Migration Tests**: Data integrity after migration
5. **Performance Tests**: Slug lookup performance

## Rollback Plan

If issues occur:
1. Keep old slug column as backup
2. Revert URL generation to use old slugs
3. Investigate and fix issues
4. Re-migrate when ready
