# Design Document: Complete TMDB Removal

## Overview

هذا المستند يحدد التصميم الكامل لإزالة جميع استدعاءات TMDB API المتبقية في المشروع واستبدالها بـ CockroachDB API. المشروع قد أكمل معظم عملية الترحيل من TMDB إلى CockroachDB، لكن لا تزال هناك استدعاءات TMDB متبقية في بعض الملفات تسبب أخطاء 403 Forbidden في console المتصفح.

### Goals

1. إزالة جميع استدعاءات TMDB API المتبقية من الكود
2. استبدال جميع الاستدعاءات بـ CockroachDB API endpoints
3. التأكد من عدم وجود أخطاء 403 Forbidden في console
4. الحفاظ على نفس الوظائف مع تحسين الأداء
5. توثيق جميع التغييرات للرجوع إليها مستقبلاً

### Non-Goals

- إعادة كتابة البنية الأساسية للمشروع
- تغيير واجهة المستخدم أو التجربة البصرية
- إضافة ميزات جديدة غير مطلوبة
- تعديل قاعدة بيانات CockroachDB

## Architecture

### Current State

المشروع حالياً يستخدم نظام هجين:
- معظم البيانات تأتي من CockroachDB عبر `/api/*` endpoints
- بعض الملفات لا تزال تستخدم دوال TMDB القديمة من `src/lib/tmdb.ts`
- هذه الدوال تسبب أخطاء 403 لأن TMDB API key غير صالح أو محدود

### Target State

بعد التنفيذ:
- جميع البيانات ستأتي من CockroachDB فقط
- دوال TMDB ستكون deprecated لكن محفوظة للاستخدام المستقبلي المحتمل
- لا توجد أخطاء 403 في console
- جميع الصفحات تعمل بشكل صحيح مع البيانات من CockroachDB

### Data Flow

```
Frontend Component
    ↓
CockroachDB API Endpoint (/api/*)
    ↓
CockroachDB Pool (src/db/pool.js)
    ↓
CockroachDB Database
```

**لا يوجد TMDB في هذا التدفق**

## Components and Interfaces

### 1. API Endpoints (Backend)

#### Existing Endpoints to Use

```typescript
// Trending Content
GET /api/trending?type=movie|tv&timeWindow=day|week&limit=20

// Genres
GET /api/genres?type=movie|tv

// Movies
GET /api/movies?page=1&limit=20&genre=Action&language=ar&yearFrom=2020&yearTo=2024&ratingFrom=7&ratingTo=10&sortBy=popularity&search=query

// TV Series
GET /api/tv?page=1&limit=20&genre=Drama&language=ko&yearFrom=2020&yearTo=2024&ratingFrom=8&ratingTo=10&sortBy=popularity&search=query

// Movie Details
GET /api/movies/:slug

// TV Series Details
GET /api/tv/:slug
```

### 2. Frontend Components to Update

#### Files Requiring Changes

1. **src/lib/api.ts**
   - حذف `tmdbAPI.search`
   - حذف `tmdbAPI.getDetails`

2. **src/pages/Home.tsx**
   - استبدال `fetchTrending('movie')` بـ `/api/trending?type=movie`

3. **src/pages/discovery/TopWatched.tsx**
   - استبدال `fetchTrending('movie')` بـ `/api/trending?type=movie`
   - استبدال `fetchTrending('tv')` بـ `/api/trending?type=tv`

4. **src/pages/discovery/Search.tsx**
   - استبدال `fetchGenres` بـ `/api/genres`
   - استبدال `advancedSearch` بـ `/api/movies` و `/api/tv`

5. **src/pages/CategoryHub.tsx**
   - استبدال `fetchGenres` بـ `/api/genres`

6. **src/pages/discovery/Anime.tsx**
   - استبدال `fetchGenres('tv')` بـ `/api/genres?type=tv`

7. **src/pages/media/MovieDetails.tsx**
   - استخراج certification من بيانات CockroachDB بدلاً من `getUsMovieCertification`

8. **src/pages/media/SeriesDetails.tsx**
   - استخراج rating من بيانات CockroachDB بدلاً من `getUsTvRating`

9. **src/lib/tmdb.ts**
   - إضافة `@deprecated` على الدوال غير المستخدمة

### 3. Helper Functions

#### Certification Extraction

```typescript
/**
 * استخراج US certification من بيانات الفيلم
 * @param movie - بيانات الفيلم من CockroachDB
 * @returns US certification أو سلسلة فارغة
 */
function extractUsCertification(movie: any): string {
  const releaseDates = movie?.release_dates?.results as Array<{
    iso_3166_1: string
    release_dates: Array<{ certification?: string }>
  }> | undefined
  
  const us = releaseDates?.find(r => r.iso_3166_1 === 'US')
  const cert = us?.release_dates?.[0]?.certification || ''
  return cert.toUpperCase()
}
```

#### TV Rating Extraction

```typescript
/**
 * استخراج US rating من بيانات المسلسل
 * @param series - بيانات المسلسل من CockroachDB
 * @returns US rating أو سلسلة فارغة
 */
function extractUsTvRating(series: any): string {
  const contentRatings = series?.content_ratings?.results as Array<{
    iso_3166_1: string
    rating?: string
  }> | undefined
  
  const us = contentRatings?.find(r => r.iso_3166_1 === 'US')
  return (us?.rating || '').toUpperCase()
}
```

#### Slug Validation

```typescript
/**
 * التحقق من صحة slug
 * @param slug - الـ slug المراد التحقق منه
 * @returns true إذا كان slug صالح
 */
function isValidSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && slug.trim() !== '' && slug !== 'content')
}

/**
 * تصفية العناصر بدون slug صالح
 * @param items - قائمة العناصر
 * @returns قائمة العناصر الصالحة فقط
 */
function filterValidSlugs<T extends { slug?: string | null }>(items: T[]): T[] {
  return items.filter(item => isValidSlug(item.slug))
}
```

## Data Models

### Movie Data Model (from CockroachDB)

```typescript
interface Movie {
  id: number
  slug: string
  title: string
  title_ar?: string
  title_en?: string
  poster_url: string
  poster_path?: string
  backdrop_url?: string
  backdrop_path?: string
  vote_average: number
  release_date: string
  popularity: number
  views_count: number
  original_language: string
  overview: string
  genres?: Array<{ id: number; name: string }>
  release_dates?: {
    results: Array<{
      iso_3166_1: string
      release_dates: Array<{ certification?: string }>
    }>
  }
  is_published: boolean
}
```

### TV Series Data Model (from CockroachDB)

```typescript
interface TVSeries {
  id: number
  slug: string
  name: string
  name_ar?: string
  name_en?: string
  poster_url: string
  poster_path?: string
  backdrop_url?: string
  backdrop_path?: string
  vote_average: number
  first_air_date: string
  popularity: number
  views_count: number
  original_language: string
  overview: string
  genres?: Array<{ id: number; name: string }>
  content_ratings?: {
    results: Array<{
      iso_3166_1: string
      rating?: string
    }>
  }
  is_published: boolean
}
```

### Genre Data Model

```typescript
interface Genre {
  id: number
  name: string
}
```

### Trending Response Model

```typescript
interface TrendingResponse {
  data: Array<Movie | TVSeries>
  total: number
  type: 'movie' | 'tv' | 'all'
  timeWindow: 'day' | 'week'
  _cache?: {
    hit: boolean
    responseTime: number
    ttl: number
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

بعد مراجعة جميع الخصائص المحددة في prework، تم تحديد الخصائص التالية التي توفر قيمة فريدة للاختبار:

**Redundancy Analysis:**
- Properties 2.4 و 2.5 و 6.6 و 9.8 كلها تتحدث عن تصفية slugs غير صالحة - يمكن دمجها في خاصية واحدة شاملة
- Properties 4.3 و 4.5 يمكن دمجها في خاصية واحدة عن استخراج certification
- Properties 5.3 و 5.5 يمكن دمجها في خاصية واحدة عن استخراج rating
- Properties 8.1 و 8.2 كلاهما يتحدثان عن عدم وجود أخطاء TMDB - يمكن دمجها

### Property 1: Valid Slug Filtering

*For any* list of content items (movies or TV series) returned from CockroachDB API, all items in the filtered result should have a valid slug (non-null, non-empty, and not equal to 'content').

**Validates: Requirements 2.4, 2.5, 6.6, 9.8**

### Property 2: Certification Extraction and Normalization

*For any* movie data from CockroachDB containing release_dates, extracting US certification should return an uppercase string, and if no US certification exists, should return an empty string.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 3: TV Rating Extraction and Normalization

*For any* TV series data from CockroachDB containing content_ratings, extracting US rating should return an uppercase string, and if no US rating exists, should return an empty string.

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 4: Genre Caching Behavior

*For any* genre request, the second request within 5 minutes should be served from cache and have a faster response time than the first request.

**Validates: Requirements 3.4**

### Property 5: Search Parameter Support

*For any* combination of search parameters (query, genres, yearFrom, yearTo, ratingFrom, ratingTo, language, keywords, sort), the search function should accept all parameters and include them in the API request.

**Validates: Requirements 6.3**

### Property 6: Search Results Merging

*For any* search that includes both movie and TV types, the merged results should contain items from both types and be sorted by popularity in descending order.

**Validates: Requirements 6.4, 6.5**

### Property 7: No TMDB Console Errors

*For any* page load in the application, the browser console should not contain any 403 Forbidden errors from TMDB API or any failed requests to `/api/tmdb` endpoints.

**Validates: Requirements 8.1, 8.2**

### Property 8: Error Logging Behavior

*For any* API error that occurs, the error should be logged to errorLogger and not appear in the browser console.

**Validates: Requirements 8.3**

### Property 9: Fallback Data on API Failure

*For any* API call that fails, the system should return fallback data (empty array or default values) instead of throwing an error or showing undefined.

**Validates: Requirements 8.5**

## Error Handling

### Error Handling Strategy

1. **API Call Failures**
   - استخدام try-catch blocks حول جميع API calls
   - إرجاع بيانات fallback (قوائم فارغة) عند الفشل
   - تسجيل الأخطاء في errorLogger
   - عدم إظهار أخطاء في console للمستخدم النهائي

2. **Missing Data**
   - التحقق من وجود البيانات قبل الوصول إليها
   - استخدام optional chaining (`?.`) و nullish coalescing (`??`)
   - توفير قيم افتراضية معقولة

3. **Invalid Slugs**
   - تصفية العناصر بدون slugs صالحة قبل العرض
   - عدم محاولة التنقل إلى صفحات بدون slugs
   - تسجيل تحذيرات عن العناصر المصفاة

### Error Handling Examples

```typescript
// Example 1: API Call with Fallback
async function fetchTrendingMovies() {
  try {
    const response = await fetch('/api/trending?type=movie&limit=20')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    return filterValidSlugs(data.data || [])
  } catch (error) {
    errorLogger.log('Failed to fetch trending movies', error)
    return [] // Fallback to empty array
  }
}

// Example 2: Safe Data Extraction
function extractCertification(movie: any): string {
  try {
    const releaseDates = movie?.release_dates?.results
    if (!Array.isArray(releaseDates)) return ''
    
    const us = releaseDates.find(r => r.iso_3166_1 === 'US')
    const cert = us?.release_dates?.[0]?.certification
    
    return cert ? cert.toUpperCase() : ''
  } catch (error) {
    errorLogger.log('Failed to extract certification', error)
    return ''
  }
}

// Example 3: User-Friendly Error Messages
function handleSearchError(error: Error, lang: string) {
  const message = lang === 'ar' 
    ? 'عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.'
    : 'Sorry, an error occurred during search. Please try again.'
  
  toast.error(message)
  errorLogger.log('Search error', error)
}
```

### Error Categories

1. **Network Errors**: فشل الاتصال بالـ API
2. **Data Errors**: بيانات مفقودة أو غير صالحة
3. **Validation Errors**: slugs غير صالحة أو معاملات خاطئة
4. **User Errors**: إدخالات مستخدم غير صحيحة

## Testing Strategy

### Dual Testing Approach

سنستخدم نهجاً مزدوجاً للاختبار:

1. **Unit Tests**: للتحقق من أمثلة محددة وحالات edge cases
2. **Property-Based Tests**: للتحقق من الخصائص العامة عبر مدخلات متعددة

كلا النوعين ضروريان ومكملان لبعضهما البعض.

### Unit Testing

#### Focus Areas for Unit Tests

1. **Specific Examples**
   - اختبار استدعاء `/api/trending?type=movie` في Home.tsx
   - اختبار استدعاء `/api/genres?type=tv` في Anime.tsx
   - اختبار عدم وجود استيراد لـ `tmdbAPI.search` في أي ملف

2. **Edge Cases**
   - اختبار certification extraction عندما لا يوجد US certification
   - اختبار rating extraction عندما لا يوجد US rating
   - اختبار genres request عند فشل API

3. **Integration Tests**
   - اختبار تحميل صفحة Home.tsx وعرض trending movies
   - اختبار تحميل صفحة Search.tsx وعمل البحث
   - اختبار تحميل صفحة MovieDetails.tsx وعرض certification

#### Unit Test Examples

```typescript
// Test 1: No TMDB imports
describe('TMDB Removal', () => {
  it('should not import tmdbAPI.search in any file', async () => {
    const files = await glob('src/**/*.{ts,tsx}')
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      expect(content).not.toContain('tmdbAPI.search')
    }
  })
})

// Test 2: Certification extraction with no US data
describe('extractUsCertification', () => {
  it('should return empty string when no US certification exists', () => {
    const movie = {
      release_dates: {
        results: [
          { iso_3166_1: 'GB', release_dates: [{ certification: 'PG' }] }
        ]
      }
    }
    expect(extractUsCertification(movie)).toBe('')
  })
})

// Test 3: Home page loads trending movies
describe('Home Page', () => {
  it('should load and display trending movies from CockroachDB', async () => {
    render(<Home />)
    await waitFor(() => {
      expect(screen.getByText(/trending/i)).toBeInTheDocument()
    })
    // Verify no TMDB API calls
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('tmdb'))
  })
})
```

### Property-Based Testing

#### Configuration

- **Library**: fast-check (for TypeScript/JavaScript)
- **Iterations**: 100 minimum per test
- **Tag Format**: `Feature: complete-tmdb-removal, Property {number}: {property_text}`

#### Property Test Examples

```typescript
import fc from 'fast-check'

// Property 1: Valid Slug Filtering
describe('Property 1: Valid Slug Filtering', () => {
  it('should filter out items without valid slugs', () => {
    // Feature: complete-tmdb-removal, Property 1: Valid Slug Filtering
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.integer(),
          slug: fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('content'),
            fc.string()
          ),
          title: fc.string()
        })),
        (items) => {
          const filtered = filterValidSlugs(items)
          // All filtered items should have valid slugs
          return filtered.every(item => 
            item.slug !== null &&
            item.slug !== '' &&
            item.slug !== 'content'
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 2: Certification Extraction
describe('Property 2: Certification Extraction', () => {
  it('should extract and normalize US certification correctly', () => {
    // Feature: complete-tmdb-removal, Property 2: Certification Extraction and Normalization
    fc.assert(
      fc.property(
        fc.record({
          release_dates: fc.record({
            results: fc.array(fc.record({
              iso_3166_1: fc.constantFrom('US', 'GB', 'FR', 'DE'),
              release_dates: fc.array(fc.record({
                certification: fc.option(fc.constantFrom('G', 'PG', 'PG-13', 'R', 'NC-17'))
              }))
            }))
          })
        }),
        (movie) => {
          const cert = extractUsCertification(movie)
          // Should be uppercase or empty
          return cert === cert.toUpperCase()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 4: Genre Caching
describe('Property 4: Genre Caching', () => {
  it('should serve second request from cache within 5 minutes', async () => {
    // Feature: complete-tmdb-removal, Property 4: Genre Caching Behavior
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('movie', 'tv'),
        async (type) => {
          const start1 = Date.now()
          await fetchGenres(type)
          const time1 = Date.now() - start1
          
          const start2 = Date.now()
          await fetchGenres(type)
          const time2 = Date.now() - start2
          
          // Second request should be faster (from cache)
          return time2 < time1
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 5: Search Parameter Support
describe('Property 5: Search Parameter Support', () => {
  it('should accept all search parameters', () => {
    // Feature: complete-tmdb-removal, Property 5: Search Parameter Support
    fc.assert(
      fc.property(
        fc.record({
          query: fc.option(fc.string()),
          genres: fc.option(fc.array(fc.integer())),
          yearFrom: fc.option(fc.integer({ min: 1900, max: 2024 })),
          yearTo: fc.option(fc.integer({ min: 1900, max: 2024 })),
          ratingFrom: fc.option(fc.float({ min: 0, max: 10 })),
          ratingTo: fc.option(fc.float({ min: 0, max: 10 })),
          language: fc.option(fc.constantFrom('ar', 'en', 'ko', 'ja')),
          keywords: fc.option(fc.string()),
          sort: fc.option(fc.constantFrom('popularity', 'vote_average', 'release_date'))
        }),
        (params) => {
          // Should not throw error with any combination of parameters
          try {
            buildSearchQuery(params)
            return true
          } catch {
            return false
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Property 7: No TMDB Console Errors
describe('Property 7: No TMDB Console Errors', () => {
  it('should not produce TMDB 403 errors on any page', async () => {
    // Feature: complete-tmdb-removal, Property 7: No TMDB Console Errors
    const pages = ['/home', '/movies', '/tv', '/search', '/anime']
    
    for (const page of pages) {
      const consoleSpy = jest.spyOn(console, 'error')
      render(<App initialRoute={page} />)
      await waitFor(() => screen.getByRole('main'))
      
      const tmdbErrors = consoleSpy.mock.calls.filter(call =>
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('403') || arg.includes('tmdb'))
        )
      )
      
      expect(tmdbErrors).toHaveLength(0)
      consoleSpy.mockRestore()
    }
  })
})

// Property 9: Fallback Data on API Failure
describe('Property 9: Fallback Data on API Failure', () => {
  it('should return fallback data when API fails', () => {
    // Feature: complete-tmdb-removal, Property 9: Fallback Data on API Failure
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom('trending', 'genres', 'movies', 'tv'),
        async (endpoint) => {
          // Mock API failure
          fetchMock.mockRejectOnce(new Error('Network error'))
          
          const result = await fetchFromAPI(endpoint)
          
          // Should return fallback data (not undefined or throw)
          return result !== undefined && result !== null
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage للملفات المعدلة
- **Property Tests**: 100% coverage للخصائص المحددة
- **Integration Tests**: جميع الصفحات المتأثرة (8 صفحات)
- **E2E Tests**: السيناريوهات الرئيسية (تصفح، بحث، عرض تفاصيل)

### Testing Tools

- **Unit Testing**: Jest + React Testing Library
- **Property Testing**: fast-check
- **Integration Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright أو Cypress
- **Code Analysis**: ESLint + grep للبحث عن استيرادات TMDB

### Continuous Testing

- تشغيل الاختبارات تلقائياً عند كل commit
- فحص console errors في CI/CD pipeline
- مراقبة network requests للتأكد من عدم وجود طلبات TMDB
- تقارير coverage تلقائية

