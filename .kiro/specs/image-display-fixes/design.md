# Bugfix Design Document

## Technical Context

### Current Architecture

The Cinema Online application uses a dual-database architecture:
- **Supabase**: Authentication and user data only
- **CockroachDB**: Primary content database (movies, tv_series, games, software, anime, actors)

### Current Image Flow (Defective)

```
MovieCard → TmdbImage → TMDB API (https://image.tmdb.org/t/p/{size}{path})
                     ↓
              OptimizedImage → External CDN
```

**Problems:**
1. Direct TMDB API dependency violates architecture
2. No use of CockroachDB thumbnail field
3. External failures cascade without fallbacks
4. No caching or optimization

### Target Architecture (Fixed)

```
MovieCard → CockroachDB thumbnail field (primary)
         ↓
         → Fallback chain: thumbnail → poster_path → backdrop_path → placeholder
         ↓
         → OptimizedImage (with retry, WebP, lazy loading)
         ↓
         → Unified SVG placeholder (on all failures)
```

### Files Affected

1. `src/components/features/media/MovieCard.tsx` - Main card component
2. `src/components/common/TmdbImage.tsx` - Image wrapper (needs refactoring)
3. `src/components/common/OptimizedImage.tsx` - Low-level image component
4. `src/components/common/UnifiedPlaceholder.tsx` - New unified placeholder component

### Database Schema Reference

**CockroachDB Content Tables:**
```sql
-- movies table
CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  thumbnail TEXT,  -- Primary image source
  ...
);

-- tv_series table
CREATE TABLE tv_series (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  thumbnail TEXT,  -- Primary image source
  ...
);
```

## Bug Condition Analysis

### Bug Condition Function

The bug condition identifies inputs that trigger image display failures:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ImageInput {
    thumbnail: string | null,
    poster_path: string | null,
    backdrop_path: string | null,
    source: 'tmdb_api' | 'cockroachdb'
  }
  OUTPUT: boolean
  
  // Returns true when bug conditions are met
  RETURN (
    // Architecture violation
    X.source = 'tmdb_api' OR
    
    // Missing/invalid data
    X.thumbnail = null OR
    X.thumbnail = '' OR
    NOT isValidURL(X.thumbnail) OR
    
    // Fallback failures
    (X.thumbnail fails AND X.poster_path = null) OR
    (X.thumbnail fails AND X.poster_path fails AND X.backdrop_path = null) OR
    
    // External dependency failures
    isTMDBBlocked() OR
    isCORSError(X.thumbnail)
  )
END FUNCTION
```

### Property Specifications

#### Property 1: Fix Checking - Database Architecture Compliance

```pascal
// Property: All images must load from CockroachDB
FOR ALL X WHERE isBugCondition(X) AND X.source = 'tmdb_api' DO
  result ← loadImage'(X)
  ASSERT result.source = 'cockroachdb'
  ASSERT result.usedTMDBAPI = false
END FOR
```

#### Property 2: Fix Checking - Fallback Chain

```pascal
// Property: Graceful fallback chain must work
FOR ALL X WHERE isBugCondition(X) AND (X.thumbnail = null OR X.thumbnail fails) DO
  result ← loadImage'(X)
  ASSERT (
    result.displayedImage = X.poster_path OR
    result.displayedImage = X.backdrop_path OR
    result.displayedImage = UNIFIED_PLACEHOLDER
  )
  ASSERT result.displayedImage ≠ null
  ASSERT result.displayedImage ≠ WHITE_BOX
END FOR
```

#### Property 3: Fix Checking - Retry Logic

```pascal
// Property: Failed loads must retry with exponential backoff
FOR ALL X WHERE isBugCondition(X) AND imageLoadFails(X.thumbnail) DO
  result ← loadImage'(X)
  ASSERT result.retryAttempts ≤ 3
  ASSERT result.retryDelays = [1000ms, 2000ms, 4000ms]
  ASSERT result.finalState ∈ {SUCCESS, FALLBACK, PLACEHOLDER}
END FOR
```

#### Property 4: Fix Checking - Performance Optimization

```pascal
// Property: Images must use WebP with JPEG fallback
FOR ALL X WHERE isBugCondition(X) AND browserSupportsWebP() DO
  result ← loadImage'(X)
  ASSERT result.format = 'webp'
  ASSERT result.hasFallback = 'jpeg'
END FOR

// Property: Below-fold images must lazy load
FOR ALL X WHERE isBugCondition(X) AND X.position = 'below-fold' DO
  result ← loadImage'(X)
  ASSERT result.lazyLoaded = true
  ASSERT result.usedIntersectionObserver = true
END FOR
```

#### Property 5: Preservation Checking

```pascal
// Property: Non-buggy inputs must behave identically
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR

// Where:
// F(X) = original image loading behavior
// F'(X) = fixed image loading behavior
```

### Counterexamples

**Example 1: TMDB API Dependency**
```typescript
// Input
const movie = {
  id: 550,
  thumbnail: null,
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  source: 'tmdb_api'
}

// Current Behavior (Bug)
const url = `https://image.tmdb.org/t/p/w500${movie.poster_path}`
// Result: External API call, CORS errors, no caching

// Expected Behavior (Fix)
const url = movie.thumbnail || constructFallbackURL(movie)
// Result: CockroachDB data, no external calls
```

**Example 2: Missing Fallback**
```typescript
// Input
const movie = {
  id: 123,
  thumbnail: 'https://broken-url.com/image.jpg',
  poster_path: null,
  backdrop_path: null
}

// Current Behavior (Bug)
// Result: White box, no placeholder

// Expected Behavior (Fix)
// Result: Unified SVG placeholder with cinema icon
```

**Example 3: No Retry Logic**
```typescript
// Input
const movie = {
  id: 456,
  thumbnail: 'https://slow-server.com/image.jpg', // Times out
  poster_path: '/fallback.jpg'
}

// Current Behavior (Bug)
// Result: Infinite loading, no timeout

// Expected Behavior (Fix)
// Result: Retry 3 times, then fallback to poster_path
```

## Implementation Design

### 1. Unified Placeholder Component

Create a new reusable placeholder component:

**File:** `src/components/common/UnifiedPlaceholder.tsx`

```typescript
interface UnifiedPlaceholderProps {
  contentType?: 'movie' | 'tv' | 'game' | 'software' | 'anime'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export const UnifiedPlaceholder: React.FC<UnifiedPlaceholderProps> = ({
  contentType = 'movie',
  size = 'md',
  showText = true
}) => {
  // SVG placeholder with cinema theme
  // Gradient background (lumen-surface colors)
  // Icon based on contentType (🎬 for movies, 📺 for TV, etc.)
  // Optional text: "سينما أونلاين" / "Cinema Online"
}
```

### 2. Enhanced OptimizedImage Component

**File:** `src/components/common/OptimizedImage.tsx`

**Changes:**
1. Add retry logic with exponential backoff
2. Add timeout handling (10s)
3. Improve WebP detection and fallback
4. Add blur-up progressive loading
5. Use UnifiedPlaceholder on final failure

```typescript
interface OptimizedImageProps {
  src: string
  alt: string
  fallbackSrc?: string  // NEW: Explicit fallback URL
  maxRetries?: number   // NEW: Default 3
  timeout?: number      // NEW: Default 10000ms
  onFinalError?: () => void  // NEW: Called after all retries fail
  // ... existing props
}

// Retry logic
const [retryCount, setRetryCount] = useState(0)
const [isRetrying, setIsRetrying] = useState(false)

const handleError = () => {
  if (retryCount < maxRetries) {
    setIsRetrying(true)
    const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
    setTimeout(() => {
      setRetryCount(prev => prev + 1)
      setIsRetrying(false)
    }, delay)
  } else {
    setHasError(true)
    onFinalError?.()
  }
}
```

### 3. Refactored TmdbImage Component

**File:** `src/components/common/TmdbImage.tsx`

**Changes:**
1. Remove direct TMDB URL construction
2. Accept pre-resolved URLs from parent
3. Use OptimizedImage internally
4. Use UnifiedPlaceholder for errors

```typescript
interface TmdbImageProps {
  src: string  // CHANGED: Accept resolved URL instead of path
  fallbackSrc?: string  // NEW: Fallback URL
  alt: string
  size?: TmdbImageSize  // Keep for aspect ratio calculation
  // ... other props
}

// Remove getUrl() function - URLs come pre-resolved from CockroachDB
// Use OptimizedImage with retry logic
// Use UnifiedPlaceholder on final failure
```

### 4. Updated MovieCard Component

**File:** `src/components/features/media/MovieCard.tsx`

**Changes:**
1. Prioritize thumbnail field from CockroachDB
2. Implement fallback chain: thumbnail → poster_path → backdrop_path
3. Remove TMDB API dependencies
4. Use UnifiedPlaceholder for all failures
5. Validate and sanitize URLs

```typescript
// Fallback chain implementation
const getImageSource = (): string | null => {
  // 1. Try thumbnail from CockroachDB (primary)
  if (movie.thumbnail && isValidURL(movie.thumbnail)) {
    return movie.thumbnail.trim()
  }
  
  // 2. Try poster_path (secondary)
  if (movie.poster_path && isValidURL(movie.poster_path)) {
    return movie.poster_path.trim()
  }
  
  // 3. Try backdrop_path (tertiary)
  if (movie.backdrop_path && isValidURL(movie.backdrop_path)) {
    return movie.backdrop_path.trim()
  }
  
  // 4. Return null - will show UnifiedPlaceholder
  return null
}

const imageSrc = getImageSource()

// Render logic
{imageSrc ? (
  <OptimizedImage
    src={imageSrc}
    alt={title}
    maxRetries={3}
    timeout={10000}
    onFinalError={() => setShowPlaceholder(true)}
  />
) : (
  <UnifiedPlaceholder contentType={mediaType} />
)}
```

### 5. URL Validation Utility

**File:** `src/lib/image-utils.ts` (new file)

```typescript
export function isValidURL(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false
  
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function sanitizeImageURL(url: string | null | undefined): string | null {
  if (!isValidURL(url)) return null
  return url!.trim()
}

export function constructFallbackChain(content: {
  thumbnail?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
}): string[] {
  const chain: string[] = []
  
  if (isValidURL(content.thumbnail)) chain.push(content.thumbnail!)
  if (isValidURL(content.poster_path)) chain.push(content.poster_path!)
  if (isValidURL(content.backdrop_path)) chain.push(content.backdrop_path!)
  
  return chain
}
```

### 6. Image Caching Strategy

**File:** `src/lib/image-cache.ts` (new file)

```typescript
// Simple in-memory cache for image load status
const imageCache = new Map<string, 'loading' | 'success' | 'error'>()

export function getCacheStatus(url: string): 'loading' | 'success' | 'error' | null {
  return imageCache.get(url) || null
}

export function setCacheStatus(url: string, status: 'loading' | 'success' | 'error'): void {
  imageCache.set(url, status)
}

export function clearCache(): void {
  imageCache.clear()
}
```

## Testing Strategy

### Unit Tests

**File:** `src/__tests__/image-display-fixes/bug-condition-exploration.test.tsx`

```typescript
describe('Bug Condition Exploration', () => {
  test('identifies TMDB API usage as bug condition', () => {
    const input = { source: 'tmdb_api', thumbnail: null }
    expect(isBugCondition(input)).toBe(true)
  })
  
  test('identifies missing thumbnail as bug condition', () => {
    const input = { source: 'cockroachdb', thumbnail: null }
    expect(isBugCondition(input)).toBe(true)
  })
  
  test('identifies invalid URL as bug condition', () => {
    const input = { source: 'cockroachdb', thumbnail: 'not-a-url' }
    expect(isBugCondition(input)).toBe(true)
  })
})
```

### Property-Based Tests

**File:** `src/__tests__/image-display-fixes/fix-checking.test.tsx`

```typescript
import { fc, test } from '@fast-check/vitest'

describe('Fix Checking Properties', () => {
  test.prop([fc.record({
    thumbnail: fc.oneof(fc.constant(null), fc.webUrl()),
    poster_path: fc.oneof(fc.constant(null), fc.string()),
    backdrop_path: fc.oneof(fc.constant(null), fc.string())
  })])('all images load from CockroachDB without TMDB API', (input) => {
    const result = loadImage(input)
    expect(result.usedTMDBAPI).toBe(false)
    expect(result.source).toBe('cockroachdb')
  })
  
  test.prop([fc.record({
    thumbnail: fc.constant(null),
    poster_path: fc.constant(null),
    backdrop_path: fc.constant(null)
  })])('missing images show unified placeholder', (input) => {
    const result = loadImage(input)
    expect(result.displayedImage).toBe('UNIFIED_PLACEHOLDER')
    expect(result.displayedImage).not.toBe('WHITE_BOX')
  })
})
```

### Preservation Tests

**File:** `src/__tests__/image-display-fixes/preservation-tests.test.tsx`

```typescript
describe('Preservation Checking', () => {
  test('valid thumbnail URLs continue to work', () => {
    const input = {
      thumbnail: 'https://valid-cdn.com/image.jpg',
      poster_path: '/fallback.jpg'
    }
    
    const originalBehavior = loadImageOriginal(input)
    const fixedBehavior = loadImageFixed(input)
    
    expect(fixedBehavior.displayedImage).toBe(originalBehavior.displayedImage)
    expect(fixedBehavior.loadTime).toBeLessThanOrEqual(originalBehavior.loadTime * 1.1)
  })
  
  test('hover effects continue to work', () => {
    render(<MovieCard movie={validMovie} />)
    
    const card = screen.getByRole('link')
    fireEvent.mouseEnter(card)
    
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })
})
```

## Validation Criteria

### Fix Validation

1. **No TMDB API Calls**: Verify network tab shows zero requests to `image.tmdb.org`
2. **Fallback Chain Works**: Test with null thumbnail, verify poster_path is used
3. **Retry Logic**: Simulate network failure, verify 3 retry attempts with exponential backoff
4. **Unified Placeholder**: Test with all null values, verify SVG placeholder appears
5. **WebP Support**: Verify modern browsers receive WebP, older browsers receive JPEG
6. **Lazy Loading**: Verify below-fold images don't load until scrolled into view
7. **Performance**: Verify LCP (Largest Contentful Paint) improves by 20%

### Preservation Validation

1. **Valid Images**: Test with valid thumbnail URLs, verify identical rendering
2. **Hover Effects**: Verify trailer overlays still work on hover
3. **Navigation**: Verify clicking cards still navigates correctly
4. **Responsive Layout**: Verify grid layouts maintain spacing
5. **Accessibility**: Verify alt text and ARIA labels unchanged

## Rollout Plan

### Phase 1: Foundation (Tasks 1-3)
- Create UnifiedPlaceholder component
- Create image utility functions
- Create image cache system

### Phase 2: Core Fixes (Tasks 4-6)
- Enhance OptimizedImage with retry logic
- Refactor TmdbImage to remove TMDB dependencies
- Update MovieCard fallback chain

### Phase 3: Testing (Tasks 7-9)
- Write bug condition exploration tests
- Write fix checking property tests
- Write preservation tests

### Phase 4: Validation (Task 10)
- Manual testing across browsers
- Performance benchmarking
- Accessibility audit

## Success Metrics

- **Zero TMDB API calls** for image loading
- **Zero white boxes** or blank cards
- **100% fallback coverage** for missing images
- **< 10s timeout** for slow connections
- **3 retry attempts** with exponential backoff
- **WebP adoption** for 80%+ of modern browsers
- **20% LCP improvement** from lazy loading
- **Zero regressions** in existing functionality
