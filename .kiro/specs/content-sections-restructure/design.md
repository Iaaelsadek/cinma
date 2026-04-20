# تصميم إعادة هيكلة أقسام المحتوى
# Content Sections Restructure - Design Document

## نظرة عامة | Overview

### الهدف | Purpose

إعادة هيكلة شاملة لجميع أقسام المحتوى في الموقع لضمان أن جميع البيانات تُسحب من CockroachDB فقط، مع إزالة أي استعلامات مباشرة من Supabase أو TMDB API للمحتوى. الهدف هو توحيد مصدر البيانات وتصحيح التصنيفات والفلاتر لكل قسم.

This feature provides a comprehensive restructuring of all content sections to ensure all data is fetched exclusively from CockroachDB, removing any direct queries from Supabase or TMDB API for content display. The goal is to unify the data source and correct classifications and filters for each section.

### النطاق | Scope

**في النطاق | In Scope:**
- توحيد جميع استعلامات المحتوى لاستخدام CockroachDB API فقط
- إصلاح أقسام الملخصات والمسرحيات والكلاسيكيات
- تصنيف المحتوى حسب اللغة (عربي، أجنبي، هندي، كوري، صيني، تركي)
- إضافة حقول primary_genre و category للتصنيف الدقيق
- إنشاء سكريبت لملء قاعدة البيانات بالمحتوى المناسب
- تحديث جميع مكونات الواجهة الأمامية

**خارج النطاق | Out of Scope:**
- تغيير بنية قاعدة بيانات Supabase للمصادقة
- تعديل منطق المصادقة والتفويض
- تغيير تصميم واجهة المستخدم
- إضافة ميزات جديدة غير متعلقة بإعادة الهيكلة

### المبادئ الأساسية | Core Principles

1. **مصدر بيانات واحد | Single Source of Truth**: CockroachDB هو المصدر الوحيد لجميع بيانات المحتوى
2. **فصل المسؤوليات | Separation of Concerns**: Supabase للمصادقة وبيانات المستخدم فقط
3. **واجهة برمجة موحدة | Unified API**: جميع الاستعلامات تمر عبر Content API
4. **تصنيف دقيق | Accurate Classification**: استخدام primary_genre و original_language للتصنيف
5. **قابلية التوسع | Scalability**: البنية تدعم إضافة أقسام جديدة بسهولة


## البنية المعمارية | Architecture

### نظرة عامة على البنية | Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Movies Pages │  │ Series Pages │  │ Special Pages│      │
│  │ /movies      │  │ /series      │  │ /plays       │      │
│  │ /arabic-     │  │ /k-drama     │  │ /summaries   │      │
│  │  movies      │  │ /turkish     │  │ /classics    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │ contentQueries  │                        │
│                   │   (Service)     │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Content API   │
                    │  /api/movies    │
                    │  /api/tv        │
                    │  /api/games     │
                    │  /api/software  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  CockroachDB    │
                    │   (Primary DB)  │
                    │                 │
                    │  - movies       │
                    │  - tv_series    │
                    │  - games        │
                    │  - software     │
                    │  - actors       │
                    │  - videos       │
                    └─────────────────┘

┌─────────────────────────────────────┐
│         Supabase (Auth Only)        │
│  - profiles                         │
│  - watchlist                        │
│  - continue_watching                │
│  - history                          │
└─────────────────────────────────────┘
```

### تدفق البيانات | Data Flow

#### 1. تدفق طلب المحتوى | Content Request Flow

```
User Request → React Component → contentQueries Service → Content API → CockroachDB → Response
```

**مثال: جلب الأفلام العربية | Example: Fetching Arabic Movies**

```typescript
// 1. User visits /arabic-movies
// 2. Component calls service
const { data } = await contentQueries.getMovies({
  language: 'ar'
}, { field: 'popularity', order: 'desc' }, { page: 1, limit: 20 })

// 3. Service calls API
fetch('/api/movies?language=ar&sortBy=popularity&page=1&limit=20')

// 4. API queries CockroachDB
SELECT * FROM movies 
WHERE original_language = 'ar' 
  AND is_published = TRUE
ORDER BY popularity DESC
LIMIT 20 OFFSET 0

// 5. Response flows back to component
```


#### 2. تدفق البيانات للأقسام الخاصة | Special Sections Data Flow

**المسرحيات | Plays:**
```
/plays → getMovies({ genres: ['play'], language: 'ar' }) → CockroachDB movies table
```

**الملخصات | Summaries:**
```
/summaries → getMovies({ genres: ['summary'] }) → CockroachDB movies table
```

**الكلاسيكيات | Classics:**
```
/classics → getMovies({ maxYear: 1999, minVoteCount: 50 }) → CockroachDB movies table
```

### طبقات النظام | System Layers

#### Layer 1: Presentation Layer (React Components)
- **المسؤولية | Responsibility**: عرض البيانات وإدارة حالة واجهة المستخدم
- **الملفات | Files**: 
  - `src/pages/discovery/Movies.tsx`
  - `src/pages/discovery/Series.tsx`
  - `src/pages/discovery/Plays.tsx`
  - `src/pages/discovery/Summaries.tsx`
  - `src/pages/discovery/Classics.tsx`

#### Layer 2: Service Layer (contentQueries)
- **المسؤولية | Responsibility**: توحيد استعلامات المحتوى وإدارة الكاش
- **الملفات | Files**: 
  - `src/services/contentQueries.ts`
  - `src/hooks/useFetchContent.ts` (للإزالة)

#### Layer 3: API Layer (Express Routes)
- **المسؤولية | Responsibility**: معالجة الطلبات والاستعلامات من قاعدة البيانات
- **الملفات | Files**: 
  - `server/routes/content.js`
  - `server/routes/db.js`

#### Layer 4: Data Layer (CockroachDB)
- **المسؤولية | Responsibility**: تخزين واسترجاع البيانات
- **الجداول | Tables**: 
  - `movies`
  - `tv_series`
  - `seasons`
  - `episodes`
  - `games`
  - `software`
  - `actors`
  - `videos`


## المكونات والواجهات | Components and Interfaces

### 1. Content API Endpoints

#### GET /api/movies
**الوصف | Description**: جلب قائمة الأفلام مع الفلاتر

**المعاملات | Parameters**:
```typescript
interface MoviesQueryParams {
  page?: number              // رقم الصفحة (افتراضي: 1)
  limit?: number             // عدد النتائج (افتراضي: 20، أقصى: 100)
  genre?: string             // primary_genre filter
  language?: string          // original_language filter
  yearFrom?: number          // سنة البداية
  yearTo?: number            // سنة النهاية
  ratingFrom?: number        // تقييم أدنى
  ratingTo?: number          // تقييم أعلى
  sortBy?: 'popularity' | 'vote_average' | 'release_date' | 'trending'
}
```

**الاستجابة | Response**:
```typescript
interface MoviesResponse {
  data: Movie[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  _cache?: {
    hit: boolean
    responseTime: number
  }
}
```

#### GET /api/tv
**الوصف | Description**: جلب قائمة المسلسلات مع الفلاتر

**المعاملات | Parameters**: نفس MoviesQueryParams مع استبدال release_date بـ first_air_date

**الاستجابة | Response**: نفس MoviesResponse مع نوع TVSeries

#### GET /api/games
**الوصف | Description**: جلب قائمة الألعاب

**المعاملات | Parameters**:
```typescript
interface GamesQueryParams {
  page?: number
  limit?: number
  genre?: string             // primary_genre filter
  platform?: string          // primary_platform filter
  sortBy?: 'popularity' | 'rating' | 'release_date' | 'trending'
}
```

#### GET /api/software
**الوصف | Description**: جلب قائمة البرامج

**المعاملات | Parameters**:
```typescript
interface SoftwareQueryParams {
  page?: number
  limit?: number
  platform?: string          // primary_platform filter
  sortBy?: 'popularity' | 'rating' | 'release_date' | 'trending'
}
```


### 2. Service Layer Interfaces

#### contentQueries Service

```typescript
// src/services/contentQueries.ts

export interface ContentFilters {
  genres?: string[]          // قائمة الأصناف
  minRating?: number         // تقييم أدنى
  minYear?: number           // سنة أدنى
  maxYear?: number           // سنة أقصى
  language?: string          // اللغة الأصلية
  minVoteCount?: number      // عدد أصوات أدنى
}

export interface ContentSort {
  field: 'popularity' | 'rating' | 'release_date' | 'trending_score'
  order: 'asc' | 'desc'
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

// دالة جلب الأفلام
export async function getMovies(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<{
  data: Movie[]
  count: number
  page: number
  limit: number
  totalPages: number
}>

// دالة جلب المسلسلات
export async function getTVSeries(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<{
  data: TVSeries[]
  count: number
  page: number
  limit: number
  totalPages: number
}>

// دالة البحث
export async function searchContent(
  query: string,
  contentType: 'movie' | 'tv' | 'all' = 'all',
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<{
  movies?: Movie[]
  tvSeries?: TVSeries[]
  totalCount: number
}>
```


### 3. React Component Structure

#### Page Components

**MoviesPage Component**:
```typescript
// src/pages/discovery/Movies.tsx
export const MoviesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['movies', filters],
    queryFn: () => contentQueries.getMovies(filters, sort, pagination)
  })
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.slice(0, 5)} />
      <QuantumTrain items={data} title="All Movies" />
    </ContentSectionLayout>
  )
}
```

**PlaysPage Component**:
```typescript
// src/pages/discovery/Plays.tsx
export const PlaysPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['plays'],
    queryFn: () => contentQueries.getMovies(
      { genres: ['play'], language: 'ar' },
      { field: 'popularity', order: 'desc' },
      { page: 1, limit: 50 }
    )
  })
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.slice(0, 5)} />
      <QuantumTrain items={adelImamPlays} title="مسرحيات عادل إمام" />
      <QuantumTrain items={classicPlays} title="مسرحيات كلاسيكية" />
      <QuantumTrain items={gulfPlays} title="مسرحيات خليجية" />
    </ContentSectionLayout>
  )
}
```

**SummariesPage Component**:
```typescript
// src/pages/discovery/Summaries.tsx
export const SummariesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => contentQueries.getMovies(
      { genres: ['summary'] },
      { field: 'release_date', order: 'desc' },
      { page: 1, limit: 50 }
    )
  })
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.slice(0, 5)} />
      <QuantumTrain items={data} title="أحدث الملخصات" type="video" />
    </ContentSectionLayout>
  )
}
```

**ClassicsPage Component**:
```typescript
// src/pages/discovery/Classics.tsx
export const ClassicsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['classics'],
    queryFn: () => contentQueries.getMovies(
      { maxYear: 1999, minVoteCount: 50 },
      { field: 'vote_average', order: 'desc' },
      { page: 1, limit: 50 }
    )
  })
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.slice(0, 5)} />
      <QuantumTrain items={data} title="الأفلام الكلاسيكية" />
    </ContentSectionLayout>
  )
}
```


## نماذج البيانات | Data Models

### تحديثات قاعدة البيانات | Database Schema Updates

#### 1. جدول Movies

**الحقول الحالية | Existing Fields**:
```sql
CREATE TABLE movies (
  id BIGINT PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  slug VARCHAR(500) UNIQUE,
  title VARCHAR(500),
  title_ar VARCHAR(500),
  title_en VARCHAR(500),
  original_title VARCHAR(500),
  original_language VARCHAR(10),
  overview TEXT,
  release_date DATE,
  runtime INTEGER,
  vote_average DECIMAL(3,1),
  vote_count INTEGER,
  popularity DECIMAL(10,3),
  poster_path VARCHAR(500),
  poster_url TEXT,
  backdrop_path VARCHAR(500),
  backdrop_url TEXT,
  genres JSONB,
  production_countries JSONB,
  spoken_languages JSONB,
  is_published BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**الحقول الجديدة المطلوبة | New Required Fields**:
```sql
ALTER TABLE movies ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_movies_primary_genre ON movies(primary_genre);
CREATE INDEX IF NOT EXISTS idx_movies_category ON movies(category);
CREATE INDEX IF NOT EXISTS idx_movies_language ON movies(original_language);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(EXTRACT(YEAR FROM release_date));
```

**قيم primary_genre المتوقعة | Expected primary_genre Values**:
- `action`, `comedy`, `drama`, `horror`, `thriller`, `romance`, `sci-fi`, `fantasy`
- `animation`, `documentary`, `crime`, `mystery`, `adventure`, `family`
- `play` (للمسرحيات)
- `summary` (للملخصات)
- `anime` (للأنمي)
- `disney`, `spacetoon` (لمحتوى الأطفال)

**قيم category المتوقعة | Expected category Values**:
- `movie` (افتراضي)
- `play` (مسرحية)
- `summary` (ملخص)
- `classic` (كلاسيكي)


#### 2. جدول TV_Series

**الحقول الجديدة المطلوبة | New Required Fields**:
```sql
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20);
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_tv_series_primary_genre ON tv_series(primary_genre);
CREATE INDEX IF NOT EXISTS idx_tv_series_category ON tv_series(category);
CREATE INDEX IF NOT EXISTS idx_tv_series_language ON tv_series(original_language);
CREATE INDEX IF NOT EXISTS idx_tv_series_year ON tv_series(EXTRACT(YEAR FROM first_air_date));
```

**قيم primary_genre المتوقعة | Expected primary_genre Values**:
- نفس قيم الأفلام بالإضافة إلى:
- `ramadan` (مسلسلات رمضان)
- `k-drama` (دراما كورية)
- `turkish-drama` (دراما تركية)
- `chinese-drama` (دراما صينية)

#### 3. جدول Games

**الحقول الجديدة المطلوبة | New Required Fields**:
```sql
ALTER TABLE games ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50);
ALTER TABLE games ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_games_primary_genre ON games(primary_genre);
CREATE INDEX IF NOT EXISTS idx_games_primary_platform ON games(primary_platform);
```

**قيم primary_platform المتوقعة | Expected primary_platform Values**:
- `pc`, `playstation`, `xbox`, `nintendo`, `mobile`, `vr`

#### 4. جدول Software

**الحقول الجديدة المطلوبة | New Required Fields**:
```sql
ALTER TABLE software ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50);
ALTER TABLE software ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_software_primary_platform ON software(primary_platform);
CREATE INDEX IF NOT EXISTS idx_software_category ON software(category);
```

**قيم primary_platform المتوقعة | Expected primary_platform Values**:
- `windows`, `macos`, `linux`, `android`, `ios`, `web`, `cross-platform`

**قيم category المتوقعة | Expected category Values**:
- `productivity`, `development`, `design`, `security`, `utility`, `media`, `gaming`


#### 5. جدول Videos (للملخصات والمحتوى الخاص)

**البنية الحالية | Current Structure**:
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500),
  url TEXT,
  thumbnail TEXT,
  description TEXT,
  views INTEGER DEFAULT 0,
  duration INTEGER,
  category VARCHAR(50),
  year INTEGER,
  quality VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**ملاحظة | Note**: هذا الجدول موجود في CockroachDB ويُستخدم لمحتوى YouTube والملخصات. سيتم الاحتفاظ به ولكن مع تحديث منطق الاستعلام.

### تصنيف المحتوى حسب اللغة | Content Classification by Language

#### خريطة اللغات | Language Mapping

```typescript
const LANGUAGE_CODES = {
  ar: 'Arabic',      // عربي
  en: 'English',     // إنجليزي
  hi: 'Hindi',       // هندي
  ko: 'Korean',      // كوري
  zh: 'Chinese',     // صيني
  tr: 'Turkish',     // تركي
  ja: 'Japanese',    // ياباني
  es: 'Spanish',     // إسباني
  fr: 'French',      // فرنسي
  de: 'German',      // ألماني
  it: 'Italian',     // إيطالي
  ru: 'Russian'      // روسي
}

const CONTENT_SECTIONS_BY_LANGUAGE = {
  'arabic-movies': { language: 'ar', type: 'movie' },
  'foreign-movies': { language: '!ar,!hi', type: 'movie' },
  'indian': { language: 'hi', type: 'movie' },
  'arabic-series': { language: 'ar', type: 'tv' },
  'foreign-series': { language: '!ar,!hi,!ko,!zh,!tr', type: 'tv' },
  'k-drama': { language: 'ko', type: 'tv' },
  'chinese': { language: 'zh', type: 'tv' },
  'turkish': { language: 'tr', type: 'tv' },
  'bollywood': { language: 'hi', type: 'tv' }
}
```


## خصائص الصحة | Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated to avoid redundancy:

1. **Data Source Properties**: Multiple criteria check that different content types come from CockroachDB. These can be combined into a single comprehensive property.

2. **Language Filtering Properties**: Multiple criteria test language filtering for different sections. These share the same underlying logic and can be consolidated.

3. **API Endpoint Properties**: Multiple criteria verify different API endpoints exist. These can be combined into a single property about API completeness.

4. **Pagination Properties**: Multiple criteria test pagination across different content types. These can be unified.

The following properties represent the unique, non-redundant validation requirements:

### Property 1: CockroachDB-Only Data Source

*For any* content request (movies, TV series, games, software), the system SHALL fetch data exclusively from CockroachDB through the Content API, and SHALL NOT query Supabase content tables or make direct TMDB API calls for display.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

### Property 2: Language-Based Content Filtering

*For any* language filter value and content type, when a user requests content filtered by language (e.g., original_language='ar'), all returned results SHALL have the specified original_language value, and the count SHALL match the database count for that language.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 3: Genre-Based Content Filtering

*For any* primary_genre value, when content is filtered by genre, all returned results SHALL have the specified primary_genre value, and no results with different genres SHALL be included.

**Validates: Requirements 2.2, 2.3, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4**

### Property 4: Year Range Filtering

*For any* valid year range (yearFrom, yearTo), when content is filtered by year, all returned results SHALL have release_date (or first_air_date) within the specified range, including edge cases where yearFrom equals yearTo.

**Validates: Requirements 2.4, 3.5, 6.2, 8.1, 8.2**


### Property 5: Rating Range Filtering

*For any* valid rating range (ratingFrom, ratingTo), when content is filtered by rating, all returned results SHALL have vote_average within the specified range, and results outside this range SHALL be excluded.

**Validates: Requirements 2.5, 6.5, 8.5**

### Property 6: Sorting Consistency

*For any* sort parameter (popularity, vote_average, release_date, trending), when content is sorted by that field, the returned results SHALL be ordered correctly according to the specified direction (ascending or descending), and the order SHALL be consistent across pagination.

**Validates: Requirements 4.5, 6.3, 8.4, 9.5**

### Property 7: Pagination Integrity

*For any* valid page number and limit, the pagination metadata (page, limit, total, totalPages) SHALL accurately reflect the query results, and requesting different pages with the same filters SHALL return non-overlapping result sets that together contain all matching records.

**Validates: Requirements 4.4, 9.6**

### Property 8: Combined Filter Composition

*For any* combination of filters (language, genre, year, rating), when multiple filters are applied simultaneously, all returned results SHALL satisfy ALL filter conditions, demonstrating proper AND logic between filters.

**Validates: Requirements 5.7, 6.1, 6.4, 7.4, 8.3**

### Property 9: SQL Injection Prevention

*For any* user-provided input in query parameters (genre, language, search terms), the system SHALL use parameterized queries, and malicious SQL injection attempts SHALL fail safely without executing arbitrary SQL or exposing database structure.

**Validates: Requirements 9.7**

### Property 10: API Response Structure Consistency

*For any* Content API endpoint (/api/movies, /api/tv, /api/games, /api/software), the response structure SHALL include data array and pagination metadata, and the structure SHALL be consistent across all endpoints.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.6**

### Property 11: Error Handling Graceful Degradation

*For any* API error condition (network timeout, database unavailable, invalid parameters), the system SHALL display appropriate error messages, log errors to console, and provide fallback images for missing posters without crashing.

**Validates: Requirements 13.2, 13.4, 13.5, 13.6**

### Property 12: No Hardcoded Data Fallbacks

*For any* content section, the system SHALL NOT use hardcoded fallback constants (FALLBACK_SUMMARIES, query strings, cache files) for content display, ensuring all content comes from the database.

**Validates: Requirements 2.7, 3.6, 3.7, 12.1, 12.2, 12.3, 12.4**


## معالجة الأخطاء | Error Handling

### استراتيجية معالجة الأخطاء | Error Handling Strategy

#### 1. أخطاء API | API Errors

**أنواع الأخطاء | Error Types**:
- Network errors (timeout, connection refused)
- Server errors (500, 503)
- Client errors (400, 404)
- Database errors (connection pool exhausted)

**الاستجابة | Response**:
```typescript
interface APIError {
  error: string
  message: string
  statusCode: number
  timestamp: string
}

// مثال على معالجة الخطأ
try {
  const response = await fetch('/api/movies')
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }
  return await response.json()
} catch (error) {
  console.error('[Content API] Error:', error)
  
  // عرض رسالة خطأ للمستخدم
  showErrorMessage('فشل في تحميل المحتوى. يرجى المحاولة مرة أخرى.')
  
  // إعادة المحاولة بعد 3 ثوان
  setTimeout(() => retry(), 3000)
}
```

#### 2. حالات المحتوى الفارغ | Empty Content States

**السيناريوهات | Scenarios**:
- No results for filter combination
- New section with no content yet
- All content unpublished

**الاستجابة | Response**:
```typescript
if (data.length === 0) {
  return (
    <div className="text-center text-zinc-500 py-12">
      <p>{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>
      <button onClick={clearFilters}>
        {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
      </button>
    </div>
  )
}
```

#### 3. حالات التحميل | Loading States

**التنفيذ | Implementation**:
```typescript
if (isLoading) {
  return <PageLoader />
}

if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />
}

return <ContentDisplay data={data} />
```

#### 4. الصور المفقودة | Missing Images

**الصور الاحتياطية | Fallback Images**:
```typescript
const FALLBACK_POSTER = 'https://via.placeholder.com/500x750?text=No+Image'
const FALLBACK_BACKDROP = 'https://via.placeholder.com/1920x1080?text=No+Image'

// في مكون العرض
<img 
  src={movie.poster_url || FALLBACK_POSTER}
  onError={(e) => e.target.src = FALLBACK_POSTER}
  alt={movie.title}
/>
```


#### 5. أخطاء قاعدة البيانات | Database Errors

**السيناريوهات | Scenarios**:
- Connection pool exhausted
- Query timeout
- Constraint violations

**الاستجابة | Response**:
```javascript
// في server/routes/content.js
try {
  const result = await pool.query(query, params)
  res.json(result.rows)
} catch (error) {
  console.error('[Database Error]:', error.message)
  
  if (error.code === '57P01') {
    // Connection pool exhausted
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Database connection pool exhausted. Please try again.'
    })
  } else if (error.code === '57014') {
    // Query timeout
    res.status(504).json({ 
      error: 'Request timeout',
      message: 'Query took too long to execute. Please refine your filters.'
    })
  } else {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred.'
    })
  }
}
```

#### 6. التحقق من المدخلات | Input Validation

**التحقق من المعاملات | Parameter Validation**:
```javascript
// التحقق من معاملات الصفحة
const page = Math.max(1, parseInt(req.query.page) || 1)
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))

// التحقق من نطاق السنة
const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom) : null
const yearTo = req.query.yearTo ? parseInt(req.query.yearTo) : null

if (yearFrom && (yearFrom < 1900 || yearFrom > 2100)) {
  return res.status(400).json({ error: 'Invalid yearFrom parameter' })
}

if (yearTo && (yearTo < 1900 || yearTo > 2100)) {
  return res.status(400).json({ error: 'Invalid yearTo parameter' })
}

// التحقق من نطاق التقييم
const ratingFrom = req.query.ratingFrom ? parseFloat(req.query.ratingFrom) : null
const ratingTo = req.query.ratingTo ? parseFloat(req.query.ratingTo) : null

if (ratingFrom && (ratingFrom < 0 || ratingFrom > 10)) {
  return res.status(400).json({ error: 'Invalid ratingFrom parameter' })
}

if (ratingTo && (ratingTo < 0 || ratingTo > 10)) {
  return res.status(400).json({ error: 'Invalid ratingTo parameter' })
}
```


## استراتيجية الاختبار | Testing Strategy

### نهج الاختبار المزدوج | Dual Testing Approach

يستخدم هذا المشروع نهجاً مزدوجاً للاختبار يجمع بين الاختبارات التقليدية والاختبارات القائمة على الخصائص:

1. **Unit Tests**: للتحقق من أمثلة محددة وحالات الحافة وشروط الخطأ
2. **Property-Based Tests**: للتحقق من الخصائص العامة عبر جميع المدخلات

### 1. اختبارات الوحدة | Unit Tests

#### اختبارات API Endpoints

```javascript
// tests/api/movies.test.js
describe('GET /api/movies', () => {
  test('should return movies with default pagination', async () => {
    const response = await request(app).get('/api/movies')
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
    expect(response.body).toHaveProperty('pagination')
    expect(response.body.pagination.page).toBe(1)
    expect(response.body.pagination.limit).toBe(20)
  })
  
  test('should filter movies by language', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ language: 'ar' })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(movie => {
      expect(movie.original_language).toBe('ar')
    })
  })
  
  test('should filter movies by genre', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ genre: 'play' })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(movie => {
      expect(movie.primary_genre).toBe('play')
    })
  })
  
  test('should handle empty results gracefully', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ genre: 'nonexistent-genre' })
    
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(response.body.pagination.total).toBe(0)
  })
  
  test('should reject invalid parameters', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ yearFrom: 'invalid' })
    
    expect(response.status).toBe(400)
  })
})
```

#### اختبارات Service Layer

```typescript
// tests/services/contentQueries.test.ts
describe('contentQueries.getMovies', () => {
  test('should fetch movies with filters', async () => {
    const result = await contentQueries.getMovies(
      { language: 'ar', minRating: 7 },
      { field: 'popularity', order: 'desc' },
      { page: 1, limit: 10 }
    )
    
    expect(result.data).toBeInstanceOf(Array)
    expect(result.data.length).toBeLessThanOrEqual(10)
    result.data.forEach(movie => {
      expect(movie.original_language).toBe('ar')
      expect(movie.vote_average).toBeGreaterThanOrEqual(7)
    })
  })
  
  test('should handle API errors', async () => {
    // Mock API failure
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))
    
    await expect(
      contentQueries.getMovies()
    ).rejects.toThrow('Network error')
  })
})
```


### 2. اختبارات قائمة على الخصائص | Property-Based Tests

نستخدم مكتبة **fast-check** لـ JavaScript/TypeScript لإجراء اختبارات قائمة على الخصائص.

#### تكوين الاختبارات | Test Configuration

```javascript
// tests/properties/content.properties.test.js
import fc from 'fast-check'

// تكوين عدد التكرارات
const NUM_RUNS = 100

describe('Content API Properties', () => {
  // Property 1: CockroachDB-Only Data Source
  test('Feature: content-sections-restructure, Property 1: All content requests fetch from CockroachDB only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('movies', 'tv', 'games', 'software'),
        async (contentType) => {
          // Mock database connection monitor
          const dbCalls = { cockroach: 0, supabase: 0, tmdb: 0 }
          
          // Make API request
          const response = await fetch(`/api/${contentType}`)
          const data = await response.json()
          
          // Verify only CockroachDB was called
          expect(dbCalls.supabase).toBe(0)
          expect(dbCalls.tmdb).toBe(0)
          expect(dbCalls.cockroach).toBeGreaterThan(0)
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 2: Language-Based Content Filtering
  test('Feature: content-sections-restructure, Property 2: Language filtering returns only matching content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ar', 'en', 'hi', 'ko', 'zh', 'tr'),
        fc.constantFrom('movie', 'tv'),
        async (language, contentType) => {
          const endpoint = contentType === 'movie' ? '/api/movies' : '/api/tv'
          const response = await fetch(`${endpoint}?language=${language}`)
          const data = await response.json()
          
          // All results must have the specified language
          data.data.forEach(item => {
            expect(item.original_language).toBe(language)
          })
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 3: Genre-Based Content Filtering
  test('Feature: content-sections-restructure, Property 3: Genre filtering returns only matching content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('action', 'comedy', 'drama', 'play', 'summary', 'anime'),
        async (genre) => {
          const response = await fetch(`/api/movies?genre=${genre}`)
          const data = await response.json()
          
          // All results must have the specified genre
          data.data.forEach(movie => {
            expect(movie.primary_genre).toBe(genre)
          })
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 4: Year Range Filtering
  test('Feature: content-sections-restructure, Property 4: Year range filtering includes only content within range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1950, max: 2024 }),
        fc.integer({ min: 1950, max: 2024 }),
        async (year1, year2) => {
          const yearFrom = Math.min(year1, year2)
          const yearTo = Math.max(year1, year2)
          
          const response = await fetch(`/api/movies?yearFrom=${yearFrom}&yearTo=${yearTo}`)
          const data = await response.json()
          
          // All results must be within the year range
          data.data.forEach(movie => {
            const releaseYear = new Date(movie.release_date).getFullYear()
            expect(releaseYear).toBeGreaterThanOrEqual(yearFrom)
            expect(releaseYear).toBeLessThanOrEqual(yearTo)
          })
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
})
```


  // Property 5: Rating Range Filtering
  test('Feature: content-sections-restructure, Property 5: Rating filtering returns only content within range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 10 }),
        fc.float({ min: 0, max: 10 }),
        async (rating1, rating2) => {
          const ratingFrom = Math.min(rating1, rating2)
          const ratingTo = Math.max(rating1, rating2)
          
          const response = await fetch(`/api/movies?ratingFrom=${ratingFrom}&ratingTo=${ratingTo}`)
          const data = await response.json()
          
          // All results must be within the rating range
          data.data.forEach(movie => {
            expect(movie.vote_average).toBeGreaterThanOrEqual(ratingFrom)
            expect(movie.vote_average).toBeLessThanOrEqual(ratingTo)
          })
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 6: Sorting Consistency
  test('Feature: content-sections-restructure, Property 6: Sorting produces consistent ordered results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('popularity', 'vote_average', 'release_date'),
        async (sortField) => {
          const response = await fetch(`/api/movies?sortBy=${sortField}`)
          const data = await response.json()
          
          // Verify results are sorted correctly (descending by default)
          for (let i = 0; i < data.data.length - 1; i++) {
            const current = data.data[i][sortField === 'release_date' ? 'release_date' : sortField]
            const next = data.data[i + 1][sortField === 'release_date' ? 'release_date' : sortField]
            
            if (sortField === 'release_date') {
              expect(new Date(current) >= new Date(next)).toBe(true)
            } else {
              expect(current >= next).toBe(true)
            }
          }
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 7: Pagination Integrity
  test('Feature: content-sections-restructure, Property 7: Pagination metadata is accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 5, max: 50 }),
        async (page, limit) => {
          const response = await fetch(`/api/movies?page=${page}&limit=${limit}`)
          const data = await response.json()
          
          // Verify pagination metadata
          expect(data.pagination.page).toBe(page)
          expect(data.pagination.limit).toBe(limit)
          expect(data.pagination.total).toBeGreaterThanOrEqual(0)
          expect(data.pagination.totalPages).toBe(Math.ceil(data.pagination.total / limit))
          
          // Verify data length doesn't exceed limit
          expect(data.data.length).toBeLessThanOrEqual(limit)
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
  
  // Property 9: SQL Injection Prevention
  test('Feature: content-sections-restructure, Property 9: SQL injection attempts fail safely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "'; DROP TABLE movies; --",
          "1' OR '1'='1",
          "admin'--",
          "' UNION SELECT * FROM users--"
        ),
        async (maliciousInput) => {
          const response = await fetch(`/api/movies?genre=${encodeURIComponent(maliciousInput)}`)
          
          // Should either return empty results or 400 error, but never execute SQL
          expect([200, 400]).toContain(response.status)
          
          if (response.status === 200) {
            const data = await response.json()
            expect(data.data).toEqual([])
          }
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })
})
```


### 3. اختبارات التكامل | Integration Tests

```javascript
// tests/integration/content-sections.test.js
describe('Content Sections Integration', () => {
  test('Plays section displays Arabic plays only', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ genre: 'play', language: 'ar' })
    
    expect(response.status).toBe(200)
    expect(response.body.data.length).toBeGreaterThan(0)
    
    response.body.data.forEach(movie => {
      expect(movie.primary_genre).toBe('play')
      expect(movie.original_language).toBe('ar')
    })
  })
  
  test('Summaries section displays summary content', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ genre: 'summary' })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(movie => {
      expect(movie.primary_genre).toBe('summary')
    })
  })
  
  test('Classics section displays pre-2000 movies', async () => {
    const response = await request(app)
      .get('/api/movies')
      .query({ yearTo: 1999, ratingFrom: 7 })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(movie => {
      const year = new Date(movie.release_date).getFullYear()
      expect(year).toBeLessThan(2000)
      expect(movie.vote_average).toBeGreaterThanOrEqual(7)
    })
  })
  
  test('K-Drama section displays Korean series', async () => {
    const response = await request(app)
      .get('/api/tv')
      .query({ language: 'ko' })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(series => {
      expect(series.original_language).toBe('ko')
    })
  })
  
  test('Ramadan section displays Arabic Ramadan series', async () => {
    const response = await request(app)
      .get('/api/tv')
      .query({ language: 'ar', genre: 'ramadan' })
    
    expect(response.status).toBe(200)
    response.body.data.forEach(series => {
      expect(series.original_language).toBe('ar')
      expect(series.primary_genre).toBe('ramadan')
    })
  })
})
```

### 4. اختبارات الأداء | Performance Tests

```javascript
// tests/performance/api-performance.test.js
describe('API Performance', () => {
  test('Movies endpoint responds within 500ms', async () => {
    const start = Date.now()
    const response = await request(app).get('/api/movies')
    const duration = Date.now() - start
    
    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(500)
  })
  
  test('Cache improves response time', async () => {
    // First request (no cache)
    const start1 = Date.now()
    await request(app).get('/api/movies?genre=action')
    const duration1 = Date.now() - start1
    
    // Second request (cached)
    const start2 = Date.now()
    const response = await request(app).get('/api/movies?genre=action')
    const duration2 = Date.now() - start2
    
    expect(response.body._cache.hit).toBe(true)
    expect(duration2).toBeLessThan(duration1)
  })
})
```


## استراتيجية ملء البيانات | Data Population Strategy

### نظرة عامة | Overview

لضمان أن كل قسم محتوى يحتوي على بيانات كافية ومناسبة، نحتاج إلى سكريبت آلي لملء قاعدة البيانات من TMDB API.

### سكريبت ملء المحتوى | Content Population Script

```javascript
// scripts/populate-content-sections.js
import 'dotenv/config'
import pool from '../src/db/pool.js'
import axios from 'axios'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const DRY_RUN = process.argv.includes('--dry-run')

// Rate limiting: 40 requests per 10 seconds
const RATE_LIMIT_DELAY = 250 // ms between requests

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchFromTMDB(endpoint, params = {}) {
  await sleep(RATE_LIMIT_DELAY)
  
  try {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: { ...params, api_key: TMDB_API_KEY }
    })
    return response.data
  } catch (error) {
    console.error(`TMDB API Error: ${error.message}`)
    return null
  }
}

async function populateArabicMovies() {
  console.log('\n📽️  Populating Arabic Movies...')
  
  const pages = 5 // Fetch 5 pages = ~100 movies
  let inserted = 0
  
  for (let page = 1; page <= pages; page++) {
    const data = await fetchFromTMDB('/discover/movie', {
      with_original_language: 'ar',
      sort_by: 'popularity.desc',
      page
    })
    
    if (!data || !data.results) continue
    
    for (const movie of data.results) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert: ${movie.title} (${movie.original_language})`)
        inserted++
        continue
      }
      
      try {
        await pool.query(`
          INSERT INTO movies (
            tmdb_id, title, original_title, original_language,
            overview, release_date, vote_average, vote_count,
            popularity, poster_path, backdrop_path, genres,
            primary_genre, is_published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            vote_average = EXCLUDED.vote_average,
            vote_count = EXCLUDED.vote_count,
            popularity = EXCLUDED.popularity,
            updated_at = NOW()
        `, [
          movie.id,
          movie.title,
          movie.original_title,
          movie.original_language,
          movie.overview,
          movie.release_date,
          movie.vote_average,
          movie.vote_count,
          movie.popularity,
          movie.poster_path,
          movie.backdrop_path,
          JSON.stringify(movie.genre_ids),
          determineGenre(movie.genre_ids),
          true
        ])
        
        inserted++
        console.log(`✓ Inserted: ${movie.title}`)
      } catch (error) {
        console.error(`✗ Failed to insert ${movie.title}: ${error.message}`)
      }
    }
  }
  
  console.log(`✅ Inserted ${inserted} Arabic movies`)
}

async function populateArabicPlays() {
  console.log('\n🎭 Populating Arabic Plays...')
  
  // Search for known play keywords
  const playKeywords = [
    'مسرحية',
    'عادل إمام',
    'مسرح مصر',
    'المسرح الكوميدي'
  ]
  
  let inserted = 0
  
  for (const keyword of playKeywords) {
    const data = await fetchFromTMDB('/search/movie', {
      query: keyword,
      language: 'ar'
    })
    
    if (!data || !data.results) continue
    
    for (const movie of data.results) {
      if (movie.original_language !== 'ar') continue
      
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert play: ${movie.title}`)
        inserted++
        continue
      }
      
      try {
        await pool.query(`
          INSERT INTO movies (
            tmdb_id, title, original_title, original_language,
            overview, release_date, vote_average, vote_count,
            popularity, poster_path, backdrop_path,
            primary_genre, category, is_published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            primary_genre = 'play',
            category = 'play',
            updated_at = NOW()
        `, [
          movie.id,
          movie.title,
          movie.original_title,
          movie.original_language,
          movie.overview,
          movie.release_date,
          movie.vote_average,
          movie.vote_count,
          movie.popularity,
          movie.poster_path,
          movie.backdrop_path,
          'play',
          'play',
          true
        ])
        
        inserted++
        console.log(`✓ Inserted play: ${movie.title}`)
      } catch (error) {
        console.error(`✗ Failed to insert play: ${error.message}`)
      }
    }
  }
  
  console.log(`✅ Inserted ${inserted} Arabic plays`)
}
```


async function populateKoreanDramas() {
  console.log('\n🇰🇷 Populating Korean Dramas...')
  
  const pages = 3 // ~60 series
  let inserted = 0
  
  for (let page = 1; page <= pages; page++) {
    const data = await fetchFromTMDB('/discover/tv', {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
      page
    })
    
    if (!data || !data.results) continue
    
    for (const series of data.results) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert K-Drama: ${series.name}`)
        inserted++
        continue
      }
      
      try {
        await pool.query(`
          INSERT INTO tv_series (
            tmdb_id, name, original_name, original_language,
            overview, first_air_date, vote_average, vote_count,
            popularity, poster_path, backdrop_path,
            primary_genre, is_published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            vote_average = EXCLUDED.vote_average,
            vote_count = EXCLUDED.vote_count,
            popularity = EXCLUDED.popularity,
            updated_at = NOW()
        `, [
          series.id,
          series.name,
          series.original_name,
          series.original_language,
          series.overview,
          series.first_air_date,
          series.vote_average,
          series.vote_count,
          series.popularity,
          series.poster_path,
          series.backdrop_path,
          'k-drama',
          true
        ])
        
        inserted++
        console.log(`✓ Inserted K-Drama: ${series.name}`)
      } catch (error) {
        console.error(`✗ Failed to insert K-Drama: ${error.message}`)
      }
    }
  }
  
  console.log(`✅ Inserted ${inserted} Korean dramas`)
}

async function populateTurkishSeries() {
  console.log('\n🇹🇷 Populating Turkish Series...')
  
  const pages = 2 // ~40 series
  let inserted = 0
  
  for (let page = 1; page <= pages; page++) {
    const data = await fetchFromTMDB('/discover/tv', {
      with_original_language: 'tr',
      sort_by: 'popularity.desc',
      page
    })
    
    if (!data || !data.results) continue
    
    for (const series of data.results) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert Turkish series: ${series.name}`)
        inserted++
        continue
      }
      
      try {
        await pool.query(`
          INSERT INTO tv_series (
            tmdb_id, name, original_name, original_language,
            overview, first_air_date, vote_average, vote_count,
            popularity, poster_path, backdrop_path,
            primary_genre, is_published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            vote_average = EXCLUDED.vote_average,
            updated_at = NOW()
        `, [
          series.id,
          series.name,
          series.original_name,
          series.original_language,
          series.overview,
          series.first_air_date,
          series.vote_average,
          series.vote_count,
          series.popularity,
          series.poster_path,
          series.backdrop_path,
          'turkish-drama',
          true
        ])
        
        inserted++
        console.log(`✓ Inserted Turkish series: ${series.name}`)
      } catch (error) {
        console.error(`✗ Failed: ${error.message}`)
      }
    }
  }
  
  console.log(`✅ Inserted ${inserted} Turkish series`)
}

async function populateClassicMovies() {
  console.log('\n🎬 Populating Classic Movies (pre-2000)...')
  
  const decades = [1950, 1960, 1970, 1980, 1990]
  let inserted = 0
  
  for (const decade of decades) {
    const data = await fetchFromTMDB('/discover/movie', {
      'primary_release_date.gte': `${decade}-01-01`,
      'primary_release_date.lte': `${decade + 9}-12-31`,
      'vote_count.gte': 50,
      sort_by: 'vote_average.desc',
      page: 1
    })
    
    if (!data || !data.results) continue
    
    for (const movie of data.results.slice(0, 10)) { // Top 10 per decade
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would insert classic: ${movie.title} (${decade}s)`)
        inserted++
        continue
      }
      
      try {
        await pool.query(`
          INSERT INTO movies (
            tmdb_id, title, original_title, original_language,
            overview, release_date, vote_average, vote_count,
            popularity, poster_path, backdrop_path,
            primary_genre, category, is_published
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            category = 'classic',
            updated_at = NOW()
        `, [
          movie.id,
          movie.title,
          movie.original_title,
          movie.original_language,
          movie.overview,
          movie.release_date,
          movie.vote_average,
          movie.vote_count,
          movie.popularity,
          movie.poster_path,
          movie.backdrop_path,
          determineGenre(movie.genre_ids),
          'classic',
          true
        ])
        
        inserted++
        console.log(`✓ Inserted classic: ${movie.title}`)
      } catch (error) {
        console.error(`✗ Failed: ${error.message}`)
      }
    }
  }
  
  console.log(`✅ Inserted ${inserted} classic movies`)
}

function determineGenre(genreIds) {
  // TMDB genre ID mapping
  const genreMap = {
    28: 'action',
    12: 'adventure',
    16: 'animation',
    35: 'comedy',
    80: 'crime',
    18: 'drama',
    10751: 'family',
    14: 'fantasy',
    27: 'horror',
    10749: 'romance',
    878: 'sci-fi',
    53: 'thriller'
  }
  
  if (!genreIds || genreIds.length === 0) return 'drama'
  return genreMap[genreIds[0]] || 'drama'
}

// Main execution
async function main() {
  console.log('🚀 Starting Content Population Script')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  
  try {
    await populateArabicMovies()
    await populateArabicPlays()
    await populateKoreanDramas()
    await populateTurkishSeries()
    await populateClassicMovies()
    
    console.log('\n✅ Content population completed successfully!')
  } catch (error) {
    console.error('\n❌ Error during population:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
```

### تشغيل السكريبت | Running the Script

```bash
# Dry run (لا يُدخل بيانات فعلية)
node scripts/populate-content-sections.js --dry-run

# Live run (يُدخل البيانات)
node scripts/populate-content-sections.js
```


## خطة الترحيل | Migration Plan

### نظرة عامة على الترحيل | Migration Overview

الترحيل من الحالة الحالية (استعلامات مختلطة من Supabase/TMDB/CockroachDB) إلى الحالة المستهدفة (CockroachDB فقط) يتطلب نهجاً تدريجياً لتجنب تعطيل الخدمة.

### المراحل | Phases

#### المرحلة 1: تحديث قاعدة البيانات (Database Schema Updates)

**المدة المقدرة | Estimated Duration**: 1-2 أيام

**الخطوات | Steps**:

1. **إضافة الحقول الجديدة | Add New Fields**:
```sql
-- Add primary_genre and category to movies
ALTER TABLE movies 
  ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20),
  ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add primary_genre and category to tv_series
ALTER TABLE tv_series 
  ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20),
  ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add primary_genre and primary_platform to games
ALTER TABLE games 
  ADD COLUMN IF NOT EXISTS primary_genre VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50);

-- Add primary_platform and category to software
ALTER TABLE software 
  ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);
```

2. **إنشاء الفهارس | Create Indexes**:
```sql
-- Movies indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_primary_genre 
  ON movies(primary_genre) 
  WHERE primary_genre IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_category 
  ON movies(category) 
  WHERE category IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_language 
  ON movies(original_language);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_year 
  ON movies(EXTRACT(YEAR FROM release_date));

-- TV Series indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_primary_genre 
  ON tv_series(primary_genre) 
  WHERE primary_genre IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_language 
  ON tv_series(original_language);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_year 
  ON tv_series(EXTRACT(YEAR FROM first_air_date));

-- Games indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_primary_genre 
  ON games(primary_genre);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_primary_platform 
  ON games(primary_platform);

-- Software indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_software_primary_platform 
  ON software(primary_platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_software_category 
  ON software(category);
```

3. **التحقق من التحديثات | Verify Updates**:
```bash
node scripts/check-db-schema.js
```


#### المرحلة 2: ملء البيانات (Data Population)

**المدة المقدرة | Estimated Duration**: 2-3 أيام

**الخطوات | Steps**:

1. **تشغيل سكريبت الملء في وضع التجربة | Run Population Script in Dry-Run Mode**:
```bash
node scripts/populate-content-sections.js --dry-run
```

2. **مراجعة النتائج | Review Results**:
   - التحقق من عدد العناصر المتوقعة لكل قسم
   - التأكد من صحة التصنيفات
   - التحقق من عدم وجود تكرارات

3. **تشغيل السكريبت الفعلي | Run Actual Population**:
```bash
node scripts/populate-content-sections.js
```

4. **التحقق من البيانات | Verify Data**:
```sql
-- Check Arabic movies count
SELECT COUNT(*) FROM movies WHERE original_language = 'ar';

-- Check plays count
SELECT COUNT(*) FROM movies WHERE primary_genre = 'play';

-- Check summaries count
SELECT COUNT(*) FROM movies WHERE primary_genre = 'summary';

-- Check Korean dramas count
SELECT COUNT(*) FROM tv_series WHERE original_language = 'ko';

-- Check Turkish series count
SELECT COUNT(*) FROM tv_series WHERE original_language = 'tr';

-- Check classics count
SELECT COUNT(*) FROM movies 
WHERE EXTRACT(YEAR FROM release_date) < 2000 
  AND vote_count >= 50;
```

5. **تحديث البيانات الموجودة | Update Existing Data**:
```sql
-- Update primary_genre based on genres JSONB
UPDATE movies 
SET primary_genre = CASE
  WHEN genres::text ILIKE '%action%' THEN 'action'
  WHEN genres::text ILIKE '%comedy%' THEN 'comedy'
  WHEN genres::text ILIKE '%drama%' THEN 'drama'
  WHEN genres::text ILIKE '%horror%' THEN 'horror'
  WHEN genres::text ILIKE '%animation%' THEN 'animation'
  ELSE 'drama'
END
WHERE primary_genre IS NULL AND genres IS NOT NULL;

-- Mark classics
UPDATE movies 
SET category = 'classic'
WHERE EXTRACT(YEAR FROM release_date) < 2000 
  AND vote_count >= 50
  AND category IS NULL;
```


#### المرحلة 3: تحديث API Endpoints (API Updates)

**المدة المقدرة | Estimated Duration**: 1 يوم

**الخطوات | Steps**:

1. **التحقق من API الحالي | Verify Current API**:
   - مراجعة `server/routes/content.js`
   - التأكد من دعم جميع المعاملات المطلوبة (genre, language, yearFrom, yearTo, ratingFrom, ratingTo)

2. **إضافة معاملات جديدة إذا لزم الأمر | Add New Parameters if Needed**:
```javascript
// في server/routes/content.js
router.get('/movies', async (req, res) => {
  const genre = req.query.genre
  const language = req.query.language
  const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom) : null
  const yearTo = req.query.yearTo ? parseInt(req.query.yearTo) : null
  const ratingFrom = req.query.ratingFrom ? parseFloat(req.query.ratingFrom) : null
  const ratingTo = req.query.ratingTo ? parseFloat(req.query.ratingTo) : null
  const category = req.query.category
  const sortBy = req.query.sortBy || 'popularity'
  
  // Build query with all filters...
})
```

3. **اختبار API Endpoints | Test API Endpoints**:
```bash
# Test movies endpoint
curl "http://localhost:5000/api/movies?language=ar&limit=5"

# Test plays filter
curl "http://localhost:5000/api/movies?genre=play&language=ar"

# Test summaries filter
curl "http://localhost:5000/api/movies?genre=summary"

# Test classics filter
curl "http://localhost:5000/api/movies?yearTo=1999&ratingFrom=7"

# Test TV series
curl "http://localhost:5000/api/tv?language=ko"
```

4. **إضافة Cache للأداء | Add Caching for Performance**:
   - التحقق من أن NodeCache مُفعّل
   - تعيين TTL مناسب (5 دقائق)
   - إضافة cache keys فريدة لكل مجموعة فلاتر


#### المرحلة 4: تحديث Service Layer (Service Layer Updates)

**المدة المقدرة | Estimated Duration**: 1 يوم

**الخطوات | Steps**:

1. **تحديث contentQueries.ts | Update contentQueries.ts**:
```typescript
// src/services/contentQueries.ts

export async function getMovies(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  const { page = 1, limit = 20 } = pagination
  
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy: sort.field
  })
  
  if (filters.genres && filters.genres.length > 0) {
    params.append('genre', filters.genres[0])
  }
  
  if (filters.language) {
    params.append('language', filters.language)
  }
  
  if (filters.minYear) {
    params.append('yearFrom', filters.minYear.toString())
  }
  
  if (filters.maxYear) {
    params.append('yearTo', filters.maxYear.toString())
  }
  
  if (filters.minRating) {
    params.append('ratingFrom', filters.minRating.toString())
  }
  
  if (filters.minVoteCount) {
    params.append('minVoteCount', filters.minVoteCount.toString())
  }
  
  const response = await fetchAPI(`/api/movies?${params}`)
  
  return {
    data: response.data as Movie[],
    count: response.pagination.total,
    page: response.pagination.page,
    limit: response.pagination.limit,
    totalPages: response.pagination.totalPages
  }
}
```

2. **إضافة دوال مساعدة للأقسام الخاصة | Add Helper Functions for Special Sections**:
```typescript
// دالة لجلب المسرحيات
export async function getPlays(
  subCategory?: 'adel-imam' | 'classics' | 'gulf' | 'masrah-masr',
  pagination: PaginationOptions = { page: 1, limit: 50 }
) {
  const filters: ContentFilters = {
    genres: ['play'],
    language: 'ar'
  }
  
  // Add sub-category specific filters if needed
  if (subCategory === 'classics') {
    filters.maxYear = 1999
  }
  
  return getMovies(filters, { field: 'popularity', order: 'desc' }, pagination)
}

// دالة لجلب الملخصات
export async function getSummaries(
  pagination: PaginationOptions = { page: 1, limit: 50 }
) {
  return getMovies(
    { genres: ['summary'] },
    { field: 'release_date', order: 'desc' },
    pagination
  )
}

// دالة لجلب الكلاسيكيات
export async function getClassics(
  pagination: PaginationOptions = { page: 1, limit: 50 }
) {
  return getMovies(
    { maxYear: 1999, minVoteCount: 50 },
    { field: 'vote_average', order: 'desc' },
    pagination
  )
}

// دالة لجلب الدراما الكورية
export async function getKDramas(
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  return getTVSeries(
    { language: 'ko' },
    { field: 'popularity', order: 'desc' },
    pagination
  )
}
```


#### المرحلة 5: تحديث مكونات الواجهة الأمامية (Frontend Component Updates)

**المدة المقدرة | Estimated Duration**: 2-3 أيام

**الخطوات | Steps**:

1. **تحديث PlaysPage | Update PlaysPage**:
```typescript
// src/pages/discovery/Plays.tsx
import { useQuery } from '@tanstack/react-query'
import * as contentQueries from '../../services/contentQueries'

export const PlaysPage = ({ category }: { category?: string } = {}) => {
  const { lang } = useLang()
  
  // Fetch all plays from CockroachDB
  const { data: allPlays, isLoading } = useQuery({
    queryKey: ['plays'],
    queryFn: () => contentQueries.getPlays()
  })
  
  // Client-side filtering for sub-categories
  const adelImamPlays = allPlays?.data.filter(play => 
    play.title?.includes('عادل إمام') || 
    play.keywords?.includes('adel-imam')
  ) || []
  
  const classicPlays = allPlays?.data.filter(play => 
    new Date(play.release_date).getFullYear() < 2000
  ) || []
  
  const gulfPlays = allPlays?.data.filter(play => 
    play.production_countries?.some(c => ['KW', 'SA', 'QA', 'BH', 'AE', 'OM'].includes(c))
  ) || []
  
  if (isLoading) return <PageLoader />
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={allPlays?.data.slice(0, 5)} />
      <QuantumTrain items={adelImamPlays} title="مسرحيات عادل إمام" link="/plays/adel-imam" />
      <QuantumTrain items={classicPlays} title="مسرحيات كلاسيكية" link="/plays/classics" />
      <QuantumTrain items={gulfPlays} title="مسرحيات خليجية" link="/plays/gulf" />
    </ContentSectionLayout>
  )
}
```

2. **تحديث SummariesPage | Update SummariesPage**:
```typescript
// src/pages/discovery/Summaries.tsx
export const SummariesPage = () => {
  const { lang } = useLang()
  
  const { data, isLoading } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => contentQueries.getSummaries()
  })
  
  if (isLoading) return <PageLoader />
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.data.slice(0, 5)} />
      <QuantumTrain 
        items={data?.data || []} 
        title={lang === 'ar' ? 'أحدث الملخصات' : 'Latest Summaries'} 
        type="video"
      />
    </ContentSectionLayout>
  )
}
```

3. **تحديث ClassicsPage | Update ClassicsPage**:
```typescript
// src/pages/discovery/Classics.tsx
export const ClassicsPage = () => {
  const { lang } = useLang()
  
  const { data, isLoading } = useQuery({
    queryKey: ['classics'],
    queryFn: () => contentQueries.getClassics()
  })
  
  if (isLoading) return <PageLoader />
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.data.slice(0, 5)} />
      <QuantumTrain 
        items={data?.data || []} 
        title={lang === 'ar' ? 'الأفلام الكلاسيكية' : 'Classic Movies'} 
      />
    </ContentSectionLayout>
  )
}
```

4. **تحديث صفحات اللغات | Update Language Pages**:
```typescript
// src/pages/discovery/ArabicMovies.tsx
export const ArabicMoviesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['arabic-movies'],
    queryFn: () => contentQueries.getMovies({ language: 'ar' })
  })
  
  if (isLoading) return <PageLoader />
  
  return (
    <ContentSectionLayout contentType="movies">
      <QuantumHero items={data?.data.slice(0, 5)} />
      <QuantumTrain items={data?.data || []} title="الأفلام العربية" />
    </ContentSectionLayout>
  )
}

// Similar updates for:
// - ForeignMoviesPage
// - IndianMoviesPage
// - KDramaPage
// - ChineseSeriesPage
// - TurkishSeriesPage
// - BollywoodPage
```


#### المرحلة 6: إزالة الكود القديم (Legacy Code Removal)

**المدة المقدرة | Estimated Duration**: 1 يوم

**الخطوات | Steps**:

1. **إزالة الثوابت المؤقتة | Remove Temporary Constants**:
```bash
# البحث عن FALLBACK_SUMMARIES
grep -r "FALLBACK_SUMMARIES" src/

# البحث عن hardcoded queries
grep -r "ADEL_IMAM_QUERY\|CLASSICS_QUERY\|GULF_QUERY" src/

# إزالة هذه الثوابت من الملفات
```

2. **إزالة دوال TMDB المباشرة | Remove Direct TMDB Functions**:
```typescript
// حذف أو تعليق fetchPlays() في Plays.tsx
// const fetchPlays = async (query: string) => { ... } // DELETE THIS

// استبدالها بـ contentQueries
import * as contentQueries from '../../services/contentQueries'
```

3. **تحديث useFetchContent Hook | Update useFetchContent Hook**:
```typescript
// src/hooks/useFetchContent.ts

// إزالة useCategoryVideos للمحتوى
// الاحتفاظ به فقط إذا كان يُستخدم لبيانات غير محتوى (مثل إحصائيات المستخدم)

// أو تحديثه ليستخدم CockroachDB API
export function useCategoryVideos(category: string, options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true } = options
  
  return useQuery({
    queryKey: ['videos', category, limit, orderBy, ascending],
    queryFn: async () => {
      // استخدام CockroachDB API بدلاً من Supabase
      const API_BASE = import.meta.env.VITE_API_BASE || ''
      const params = new URLSearchParams({
        category,
        limit: limit.toString(),
        orderBy,
        ascending: ascending.toString()
      })
      
      const response = await fetch(`${API_BASE}/api/videos?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }
      
      const data = await response.json()
      return data as VideoItem[]
    },
    enabled,
    staleTime: 300000
  })
}
```

4. **إزالة مراجع homepage_cache.json | Remove homepage_cache.json References**:
```bash
# البحث عن مراجع الكاش
grep -r "homepage_cache.json" src/

# إزالة أو تحديث الكود الذي يستخدمه
```

5. **التحقق من عدم وجود استعلامات Supabase للمحتوى | Verify No Supabase Content Queries**:
```bash
# البحث عن استعلامات Supabase للمحتوى
grep -r "supabase.from('movies')" src/
grep -r "supabase.from('tv_series')" src/
grep -r "supabase.from('videos')" src/
grep -r "supabase.from('dailymotion_videos')" src/

# يجب ألا تُرجع أي نتائج (أو فقط في ملفات الاختبار)
```


#### المرحلة 7: الاختبار والتحقق (Testing and Verification)

**المدة المقدرة | Estimated Duration**: 2-3 أيام

**الخطوات | Steps**:

1. **اختبارات الوحدة | Unit Tests**:
```bash
# تشغيل اختبارات API
npm test tests/api/

# تشغيل اختبارات Service Layer
npm test tests/services/
```

2. **اختبارات قائمة على الخصائص | Property-Based Tests**:
```bash
# تشغيل اختبارات الخصائص
npm test tests/properties/
```

3. **اختبارات التكامل | Integration Tests**:
```bash
# تشغيل اختبارات التكامل
npm test tests/integration/
```

4. **اختبار يدوي للأقسام | Manual Section Testing**:
   - زيارة `/plays` والتحقق من عرض المسرحيات
   - زيارة `/summaries` والتحقق من عرض الملخصات
   - زيارة `/classics` والتحقق من عرض الكلاسيكيات
   - زيارة `/arabic-movies` والتحقق من الأفلام العربية فقط
   - زيارة `/k-drama` والتحقق من الدراما الكورية فقط
   - زيارة `/turkish` والتحقق من المسلسلات التركية فقط

5. **اختبار الفلاتر | Filter Testing**:
   - اختبار فلتر النوع (genre)
   - اختبار فلتر اللغة (language)
   - اختبار فلتر السنة (year range)
   - اختبار فلتر التقييم (rating range)
   - اختبار الفلاتر المركبة (combined filters)

6. **اختبار الأداء | Performance Testing**:
```bash
# استخدام Apache Bench لاختبار الأداء
ab -n 1000 -c 10 http://localhost:5000/api/movies

# استخدام Lighthouse لاختبار أداء الواجهة
npm run lighthouse
```

7. **مراقبة الأخطاء | Error Monitoring**:
   - مراقبة console للأخطاء
   - التحقق من logs الخادم
   - التحقق من أخطاء قاعدة البيانات


#### المرحلة 8: النشر والمراقبة (Deployment and Monitoring)

**المدة المقدرة | Estimated Duration**: 1 يوم

**الخطوات | Steps**:

1. **النشر التدريجي | Gradual Rollout**:
   - نشر تحديثات قاعدة البيانات أولاً
   - نشر تحديثات API
   - نشر تحديثات الواجهة الأمامية
   - مراقبة كل خطوة قبل الانتقال للتالية

2. **مراقبة الأداء | Performance Monitoring**:
```javascript
// إضافة مراقبة الأداء في API
router.get('/movies', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // ... API logic
    
    const responseTime = Date.now() - startTime
    console.log(`[Performance] /api/movies responded in ${responseTime}ms`)
    
    res.json({
      ...response,
      _performance: { responseTime }
    })
  } catch (error) {
    console.error('[Error]', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

3. **مراقبة الأخطاء | Error Monitoring**:
   - إعداد تنبيهات للأخطاء الحرجة
   - مراقبة معدل الأخطاء
   - تتبع أخطاء قاعدة البيانات

4. **مراقبة الاستخدام | Usage Monitoring**:
```sql
-- مراقبة استخدام الأقسام
SELECT 
  CASE 
    WHEN primary_genre = 'play' THEN 'Plays'
    WHEN primary_genre = 'summary' THEN 'Summaries'
    WHEN EXTRACT(YEAR FROM release_date) < 2000 THEN 'Classics'
    ELSE 'Other'
  END as section,
  COUNT(*) as views
FROM movies
WHERE views_count > 0
GROUP BY section
ORDER BY views DESC;
```

5. **خطة التراجع | Rollback Plan**:
   - الاحتفاظ بنسخة احتياطية من قاعدة البيانات
   - الاحتفاظ بالكود القديم في branch منفصل
   - توثيق خطوات التراجع

```bash
# خطوات التراجع في حالة الفشل
# 1. Revert frontend changes
git revert <commit-hash>

# 2. Revert API changes
git revert <commit-hash>

# 3. Restore database backup if needed
psql $COCKROACHDB_URL < backup.sql
```


### جدول زمني للترحيل | Migration Timeline

```
Week 1:
├── Day 1-2: Phase 1 - Database Schema Updates
│   ├── Add new columns
│   ├── Create indexes
│   └── Verify schema
│
├── Day 3-5: Phase 2 - Data Population
│   ├── Run population script (dry-run)
│   ├── Review and adjust
│   ├── Run actual population
│   └── Verify data integrity

Week 2:
├── Day 1: Phase 3 - API Updates
│   ├── Update endpoints
│   ├── Add new parameters
│   └── Test API
│
├── Day 2: Phase 4 - Service Layer Updates
│   ├── Update contentQueries
│   ├── Add helper functions
│   └── Test service layer
│
├── Day 3-5: Phase 5 - Frontend Updates
│   ├── Update PlaysPage
│   ├── Update SummariesPage
│   ├── Update ClassicsPage
│   ├── Update language pages
│   └── Test all pages

Week 3:
├── Day 1: Phase 6 - Legacy Code Removal
│   ├── Remove temporary constants
│   ├── Remove TMDB functions
│   ├── Update hooks
│   └── Verify no Supabase content queries
│
├── Day 2-4: Phase 7 - Testing
│   ├── Unit tests
│   ├── Property-based tests
│   ├── Integration tests
│   ├── Manual testing
│   └── Performance testing
│
└── Day 5: Phase 8 - Deployment
    ├── Gradual rollout
    ├── Performance monitoring
    ├── Error monitoring
    └── Usage monitoring
```

### معايير النجاح | Success Criteria

✅ **Database**:
- جميع الجداول تحتوي على الحقول الجديدة
- الفهارس منشأة ومُحسّنة
- البيانات مملوءة بشكل صحيح (الحد الأدنى للعدد محقق)

✅ **API**:
- جميع endpoints تعمل بشكل صحيح
- الفلاتر تعمل كما هو متوقع
- الأداء مقبول (< 500ms للاستعلامات البسيطة)
- Cache يعمل بشكل صحيح

✅ **Frontend**:
- جميع الأقسام تعرض المحتوى الصحيح
- لا توجد أخطاء في console
- تجربة المستخدم سلسة
- Loading states تعمل بشكل صحيح

✅ **Code Quality**:
- لا توجد استعلامات Supabase للمحتوى
- لا توجد استعلامات TMDB مباشرة للعرض
- الكود نظيف وموثق
- جميع الاختبارات تمر بنجاح

✅ **Performance**:
- زمن الاستجابة < 500ms
- Cache hit rate > 70%
- لا توجد استعلامات N+1
- استخدام الذاكرة مستقر


## المخاطر والتخفيف | Risks and Mitigation

### المخاطر المحتملة | Potential Risks

#### 1. فقدان البيانات أثناء الترحيل | Data Loss During Migration

**الاحتمالية | Probability**: منخفضة | Low  
**التأثير | Impact**: عالي | High

**استراتيجية التخفيف | Mitigation Strategy**:
- أخذ نسخة احتياطية كاملة قبل البدء
- استخدام transactions للعمليات الحرجة
- اختبار السكريبتات في بيئة التطوير أولاً
- استخدام dry-run mode قبل التنفيذ الفعلي

#### 2. تدهور الأداء | Performance Degradation

**الاحتمالية | Probability**: متوسطة | Medium  
**التأثير | Impact**: متوسط | Medium

**استراتيجية التخفيف | Mitigation Strategy**:
- إنشاء فهارس مناسبة على الحقول المستخدمة في الفلاتر
- استخدام cache بشكل فعال
- تحسين الاستعلامات SQL
- مراقبة الأداء بشكل مستمر

#### 3. عدم توافق البيانات | Data Inconsistency

**الاحتمالية | Probability**: متوسطة | Medium  
**التأثير | Impact**: عالي | High

**استراتيجية التخفيف | Mitigation Strategy**:
- التحقق من البيانات بعد كل مرحلة
- استخدام constraints في قاعدة البيانات
- كتابة اختبارات للتحقق من سلامة البيانات
- مراجعة البيانات يدوياً للعينات

#### 4. تعطل الخدمة أثناء النشر | Service Downtime During Deployment

**الاحتمالية | Probability**: منخفضة | Low  
**التأثير | Impact**: عالي | High

**استراتيجية التخفيف | Mitigation Strategy**:
- النشر التدريجي (gradual rollout)
- استخدام feature flags
- النشر في أوقات قليلة الاستخدام
- خطة تراجع جاهزة

#### 5. أخطاء في منطق الفلاتر | Filter Logic Errors

**الاحتمالية | Probability**: متوسطة | Medium  
**التأثير | Impact**: متوسط | Medium

**استراتيجية التخفيف | Mitigation Strategy**:
- كتابة اختبارات شاملة للفلاتر
- اختبار جميع مجموعات الفلاتر الممكنة
- مراجعة الكود من قبل أكثر من مطور
- اختبار يدوي شامل


## الملحقات | Appendices

### ملحق أ: مرجع سريع لـ API | Appendix A: API Quick Reference

#### Movies Endpoints

```bash
# Get all movies
GET /api/movies?page=1&limit=20

# Get Arabic movies
GET /api/movies?language=ar

# Get plays
GET /api/movies?genre=play&language=ar

# Get summaries
GET /api/movies?genre=summary

# Get classics
GET /api/movies?yearTo=1999&ratingFrom=7

# Get movies by year range
GET /api/movies?yearFrom=2020&yearTo=2024

# Get movies by rating range
GET /api/movies?ratingFrom=8&ratingTo=10

# Combined filters
GET /api/movies?language=ar&genre=action&yearFrom=2020&ratingFrom=7
```

#### TV Series Endpoints

```bash
# Get all TV series
GET /api/tv?page=1&limit=20

# Get Korean dramas
GET /api/tv?language=ko

# Get Turkish series
GET /api/tv?language=tr

# Get Chinese series
GET /api/tv?language=zh

# Get Arabic series
GET /api/tv?language=ar

# Get Ramadan series
GET /api/tv?language=ar&genre=ramadan

# Combined filters
GET /api/tv?language=ko&yearFrom=2020&ratingFrom=8
```

#### Games Endpoints

```bash
# Get all games
GET /api/games?page=1&limit=20

# Get games by platform
GET /api/games?platform=playstation

# Get games by genre
GET /api/games?genre=action

# Combined filters
GET /api/games?platform=pc&genre=rpg
```

#### Software Endpoints

```bash
# Get all software
GET /api/software?page=1&limit=20

# Get software by platform
GET /api/software?platform=windows

# Get software by category
GET /api/software?category=productivity
```


### ملحق ب: أمثلة على الاستعلامات SQL | Appendix B: SQL Query Examples

#### استعلامات التحليل | Analytics Queries

```sql
-- عدد الأفلام حسب اللغة
SELECT 
  original_language,
  COUNT(*) as count,
  ROUND(AVG(vote_average), 2) as avg_rating
FROM movies
WHERE is_published = TRUE
GROUP BY original_language
ORDER BY count DESC;

-- عدد المسرحيات حسب العقد
SELECT 
  FLOOR(EXTRACT(YEAR FROM release_date) / 10) * 10 as decade,
  COUNT(*) as count
FROM movies
WHERE primary_genre = 'play' AND is_published = TRUE
GROUP BY decade
ORDER BY decade DESC;

-- أعلى 10 أفلام كلاسيكية
SELECT 
  title,
  release_date,
  vote_average,
  vote_count
FROM movies
WHERE EXTRACT(YEAR FROM release_date) < 2000
  AND vote_count >= 50
  AND is_published = TRUE
ORDER BY vote_average DESC
LIMIT 10;

-- توزيع المسلسلات حسب اللغة
SELECT 
  original_language,
  COUNT(*) as count,
  ROUND(AVG(vote_average), 2) as avg_rating
FROM tv_series
WHERE is_published = TRUE
GROUP BY original_language
ORDER BY count DESC;

-- المحتوى الأكثر مشاهدة حسب القسم
SELECT 
  CASE 
    WHEN primary_genre = 'play' THEN 'Plays'
    WHEN primary_genre = 'summary' THEN 'Summaries'
    WHEN EXTRACT(YEAR FROM release_date) < 2000 THEN 'Classics'
    WHEN original_language = 'ar' THEN 'Arabic Movies'
    ELSE 'Other'
  END as section,
  SUM(views_count) as total_views,
  COUNT(*) as content_count
FROM movies
WHERE is_published = TRUE
GROUP BY section
ORDER BY total_views DESC;
```

#### استعلامات الصيانة | Maintenance Queries

```sql
-- تحديث primary_genre للأفلام بدون تصنيف
UPDATE movies
SET primary_genre = CASE
  WHEN genres::text ILIKE '%28%' THEN 'action'
  WHEN genres::text ILIKE '%35%' THEN 'comedy'
  WHEN genres::text ILIKE '%18%' THEN 'drama'
  WHEN genres::text ILIKE '%27%' THEN 'horror'
  WHEN genres::text ILIKE '%16%' THEN 'animation'
  ELSE 'drama'
END
WHERE primary_genre IS NULL AND genres IS NOT NULL;

-- تحديث category للكلاسيكيات
UPDATE movies
SET category = 'classic'
WHERE EXTRACT(YEAR FROM release_date) < 2000
  AND vote_count >= 50
  AND category IS NULL;

-- إزالة المحتوى غير المنشور القديم
DELETE FROM movies
WHERE is_published = FALSE
  AND updated_at < NOW() - INTERVAL '6 months';

-- تحديث الصور المفقودة
UPDATE movies
SET poster_url = 'https://via.placeholder.com/500x750?text=No+Image'
WHERE poster_url IS NULL OR poster_url = '';
```


### ملحق ج: قائمة التحقق للنشر | Appendix C: Deployment Checklist

#### قبل النشر | Pre-Deployment

- [ ] جميع الاختبارات تمر بنجاح
- [ ] مراجعة الكود من قبل فريق آخر
- [ ] أخذ نسخة احتياطية من قاعدة البيانات
- [ ] توثيق جميع التغييرات
- [ ] تحديث ملف CHANGELOG.md
- [ ] التحقق من متغيرات البيئة
- [ ] اختبار في بيئة staging
- [ ] إعداد خطة التراجع

#### أثناء النشر | During Deployment

- [ ] تنفيذ تحديثات قاعدة البيانات
- [ ] التحقق من نجاح الترحيل
- [ ] نشر تحديثات API
- [ ] اختبار API endpoints
- [ ] نشر تحديثات الواجهة الأمامية
- [ ] مسح cache إذا لزم الأمر
- [ ] مراقبة logs للأخطاء
- [ ] اختبار الأقسام الرئيسية

#### بعد النشر | Post-Deployment

- [ ] التحقق من جميع الأقسام تعمل
- [ ] مراقبة الأداء
- [ ] مراقبة معدل الأخطاء
- [ ] التحقق من استخدام الذاكرة
- [ ] مراجعة feedback المستخدمين
- [ ] توثيق أي مشاكل
- [ ] تحديث الوثائق إذا لزم الأمر
- [ ] إرسال تقرير النشر

### ملحق د: الأسئلة الشائعة | Appendix D: FAQ

#### س: لماذا نستخدم CockroachDB فقط للمحتوى؟
ج: لتوحيد مصدر البيانات وتجنب التعقيد والأخطاء الناتجة عن استعلامات متعددة من مصادر مختلفة. Supabase مخصص فقط للمصادقة وبيانات المستخدم.

#### س: ماذا عن الأداء؟
ج: استخدام CockroachDB مع الفهارس المناسبة والـ cache يوفر أداءً ممتازاً. الاستعلامات البسيطة تستجيب في أقل من 500ms.

#### س: كيف نتعامل مع المحتوى الجديد؟
ج: يتم إضافة المحتوى الجديد من خلال سكريبتات الـ ingestion التي تجلب البيانات من TMDB وتخزنها في CockroachDB.

#### س: ماذا لو احتجنا إضافة قسم جديد؟
ج: يمكن إضافة قسم جديد بسهولة من خلال:
1. إضافة قيمة جديدة لـ primary_genre أو category
2. إنشاء دالة مساعدة في contentQueries
3. إنشاء صفحة جديدة تستخدم الدالة المساعدة
4. إضافة route في DiscoveryRoutes

#### س: كيف نتعامل مع الترجمات؟
ج: الترجمات تُخزن في حقول منفصلة (title_ar, title_en) ويتم اختيار الحقل المناسب بناءً على لغة المستخدم.

#### س: ماذا عن SEO؟
ج: كل صفحة محتوى تحتوي على SEO meta tags مناسبة يتم توليدها من بيانات المحتوى.


## الخلاصة | Conclusion

هذا التصميم يوفر خطة شاملة لإعادة هيكلة أقسام المحتوى في الموقع لضمان:

1. **توحيد مصدر البيانات**: جميع بيانات المحتوى من CockroachDB فقط
2. **تصنيف دقيق**: استخدام primary_genre و category للتصنيف الصحيح
3. **أداء محسّن**: فهارس مناسبة وcache فعال
4. **قابلية الصيانة**: كود نظيف وموثق وسهل التوسع
5. **جودة عالية**: اختبارات شاملة تضمن الصحة

### الخطوات التالية | Next Steps

1. مراجعة هذا التصميم والموافقة عليه
2. البدء في المرحلة 1: تحديث قاعدة البيانات
3. المتابعة بالمراحل المتبقية حسب الجدول الزمني
4. المراقبة المستمرة والتحسين

### الموارد | Resources

- **Requirements Document**: `.kiro/specs/content-sections-restructure/requirements.md`
- **Design Document**: `.kiro/specs/content-sections-restructure/design.md`
- **Database Architecture**: `.kiro/DATABASE_ARCHITECTURE.md`
- **Developer Rules**: `.kiro/DEVELOPER_RULES.md`

---

**تاريخ الإنشاء | Created**: 2024-01-XX  
**آخر تحديث | Last Updated**: 2024-01-XX  
**الحالة | Status**: Draft - Pending Review  
**المؤلف | Author**: Cinema.online Development Team

