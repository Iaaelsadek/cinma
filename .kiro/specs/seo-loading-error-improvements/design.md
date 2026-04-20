# مستند التصميم: تحسينات SEO وحالات التحميل وحدود الأخطاء

## Overview

يهدف هذا التصميم إلى تحسين ثلاثة جوانب حرجة في منصة Cinema Online تؤثر بشكل مباشر على تجربة المستخدم وظهور الموقع في محركات البحث:

### 1. نظام SEO الشامل
تطبيق meta tags شاملة على جميع صفحات الاكتشاف باستخدام مكون `SeoHead` الموجود، والذي يوفر:
- Open Graph tags للمشاركة على وسائل التواصل الاجتماعي
- Twitter Cards للمشاركة على Twitter
- Schema.org structured data (JSON-LD) لمحركات البحث
- Canonical URLs لتجنب المحتوى المكرر
- Meta descriptions ديناميكية تعكس حالة الفلاتر

### 2. نظام Loading States المتقدم
استبدال `PageLoader` البسيط (spinner) بـ skeleton loaders مفصلة تحاكي المحتوى الفعلي:
- `SkeletonHero` لمنطقة البطل
- `SkeletonGrid` لشبكات المحتوى
- `SkeletonVideoCard` للمسرحيات والملخصات (16:9)
- `SkeletonPosterCard` للأفلام الكلاسيكية (2:3)
- Shimmer animations للإشارة إلى التحميل النشط

### 3. نظام Error Handling الاحترافي
تطبيق `ErrorBoundary` و `ErrorMessage` على جميع الصفحات لمعالجة:
- أخطاء React غير المتوقعة (Error Boundaries)
- أخطاء API (network, server, timeout)
- أخطاء Audio Stream (QuranRadio)
- أخطاء APIs الخارجية (Prayer Times, Weather)

### الصفحات المستهدفة
- **Plays** (`/plays`, `/plays/:category`)
- **Classics** (`/classics`)
- **Summaries** (`/summaries`)
- **PlaysWithFilters** (`/plays/*`)
- **ClassicsWithFilters** (`/classics/*`)
- **SummariesWithFilters** (`/summaries/*`)
- **Quran** (`/quran`)
- **QuranRadio** (`/quran-radio`)

### المكونات المتاحة للاستخدام
جميع المكونات المطلوبة موجودة بالفعل ولا تحتاج إلى إنشاء:
- `SeoHead` - مكون SEO شامل
- `ErrorBoundary` - React Error Boundary مع Logger
- `ErrorMessage` - رسائل أخطاء مع أنواع متعددة
- `Skeletons` - مجموعة skeleton loaders

---

## Architecture

### نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                     Discovery Pages                          │
│  (Plays, Classics, Summaries, Quran, QuranRadio)           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ ErrorBoundary│          │   SeoHead    │
│   (Wrapper)  │          │  (Meta Tags) │
└──────┬───────┘          └──────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│      Page Component Logic            │
│  - useQuery for data fetching        │
│  - Loading state management          │
│  - Error state management            │
└──────┬───────────────────────────────┘
       │
       ├─── isLoading? ──► Skeleton Loaders
       │                   (SkeletonHero, SkeletonGrid)
       │
       ├─── error? ──────► ErrorMessage Component
       │                   (with retry, home, back buttons)
       │
       └─── success ─────► Actual Content
                           (QuantumHero, QuantumTrain, etc.)
```

### تدفق البيانات

```
User Request
    │
    ▼
React Router
    │
    ▼
Page Component (wrapped with ErrorBoundary)
    │
    ├─► SeoHead renders meta tags
    │
    ├─► useQuery starts data fetch
    │   │
    │   ├─► Loading State
    │   │   └─► Show Skeleton Loaders
    │   │
    │   ├─► Error State
    │   │   └─► Show ErrorMessage
    │   │
    │   └─► Success State
    │       └─► Render Content
    │
    └─► If React Error occurs
        └─► ErrorBoundary catches
            └─► Show Fallback UI
```

### طبقات النظام

#### 1. SEO Layer (Meta Tags)
```typescript
<SeoHead
  title="المسرحيات - سينما أونلاين"
  description="استمتع بمشاهدة أفضل المسرحيات العربية..."
  type="website"
  image="/og-plays.jpg"
  schema={customSchema}
/>
```

#### 2. Error Boundary Layer (React Errors)
```typescript
<ErrorBoundary
  fallback={<ErrorMessage type="generic" />}
  onError={(error, errorInfo) => logger.error(...)}
  onReset={() => window.location.reload()}
>
  <PageComponent />
</ErrorBoundary>
```

#### 3. Loading State Layer (Skeleton Loaders)
```typescript
if (isLoading) {
  return (
    <>
      <SkeletonHero />
      <SkeletonGrid count={12} variant="video" />
    </>
  )
}
```

#### 4. Error State Layer (API Errors)
```typescript
if (error) {
  return (
    <ErrorMessage
      type="network"
      title="خطأ في الاتصال"
      message="تعذر تحميل المسرحيات"
      onRetry={() => refetch()}
      showHomeButton
      showBackButton
    />
  )
}
```

### تكامل الأنظمة

#### SEO System Integration
- يتم تحديث meta tags عند تغيير الصفحة أو الفلاتر
- Schema.org structured data يتم إنشاؤه ديناميكياً بناءً على المحتوى
- Canonical URLs تتغير حسب المسار الحالي

#### Loading System Integration
- Skeleton loaders تظهر فوراً عند بدء التحميل
- تختفي بـ fade transition عند اكتمال التحميل
- تتطابق مع تصميم المكونات الفعلية

#### Error System Integration
- ErrorBoundary يلتقط أخطاء React غير المتوقعة
- ErrorMessage يعرض أخطاء API بشكل واضح
- Logger يسجل جميع الأخطاء للمطورين

---

## Components and Interfaces

### 1. SeoHead Component (موجود)

**الموقع:** `src/components/common/SeoHead.tsx`

**الواجهة:**
```typescript
interface SeoHeadProps {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'video.movie' | 'video.tv_show'
  rating?: number
  ratingCount?: number
  duration?: string
  releaseDate?: string
  genres?: string[]
  schema?: Record<string, any>
  noIndex?: boolean
}
```

**الاستخدام في الصفحات:**

```typescript
// Plays Page
<SeoHead
  title="المسرحيات - سينما أونلاين"
  description="استمتع بمشاهدة أفضل المسرحيات العربية والخليجية بجودة عالية. مسرح مصر، عادل إمام، والمزيد."
  type="website"
  image="https://cinma.online/og-plays.jpg"
/>

// Plays with Category
<SeoHead
  title={`${categoryTitle} - المسرحيات | سينما أونلاين`}
  description={`شاهد أفضل ${categoryTitle} بجودة عالية وبدون إعلانات مزعجة.`}
  type="website"
/>

// Classics Page
<SeoHead
  title="كلاسيكيات السينما - أفلام خالدة | سينما أونلاين"
  description="اكتشف أفضل الأفلام الكلاسيكية من العصر الذهبي للسينما. أفلام الثمانينات والتسعينات وما قبل 1970."
  type="website"
  schema={movieSeriesSchema}
/>

// Summaries Page
<SeoHead
  title="ملخصات الأفلام - مراجعات سريعة | سينما أونلاين"
  description="شاهد ملخصات سريعة ومراجعات شاملة لأحدث الأفلام والمسلسلات."
  type="website"
/>

// Quran Page
<SeoHead
  title="القرآن الكريم - استماع وتلاوة | سينما أونلاين"
  description="استمع إلى القرآن الكريم بأصوات نخبة من القراء. تلاوات خاشعة بجودة عالية."
  type="website"
/>

// QuranRadio Page
<SeoHead
  title="راديو القرآن الكريم - بث مباشر | سينما أونلاين"
  description="استمع إلى بث مباشر للقرآن الكريم على مدار الساعة. إذاعة القرآن الكريم من القاهرة وقراء مميزون."
  type="website"
  schema={radioStationSchema}
/>
```

**Schema.org Examples:**

```typescript
// Movie Series Schema (Classics)
const movieSeriesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "كلاسيكيات السينما",
  "description": "مجموعة من أفضل الأفلام الكلاسيكية",
  "itemListElement": classics.slice(0, 10).map((movie, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "Movie",
      "name": movie.title,
      "url": `https://cinma.online/movie/${movie.id}`,
      "image": movie.poster_path
    }
  }))
}

// Radio Station Schema (QuranRadio)
const radioStationSchema = {
  "@context": "https://schema.org",
  "@type": "RadioStation",
  "name": "راديو القرآن الكريم",
  "url": "https://cinma.online/quran-radio",
  "description": "بث مباشر للقرآن الكريم على مدار الساعة",
  "broadcastFrequency": "Online Streaming"
}
```

### 2. ErrorBoundary Component (موجود)

**الموقع:** `src/components/common/ErrorBoundary.tsx`

**الواجهة:**
```typescript
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}
```

**الاستخدام:**

```typescript
// في App.tsx أو Route wrapper
<ErrorBoundary
  onError={(error, errorInfo) => {
    logger.error('Page Error', { error, errorInfo })
  }}
  onReset={() => {
    // إعادة تحميل البيانات أو إعادة تعيين الحالة
    queryClient.invalidateQueries()
  }}
>
  <PlaysPage />
</ErrorBoundary>
```

### 3. ErrorMessage Component (موجود)

**الموقع:** `src/components/common/ErrorMessage.tsx`

**الواجهة:**
```typescript
type ErrorType = 'network' | 'notFound' | 'server' | 'validation' | 'generic'

interface ErrorMessageProps {
  type?: ErrorType
  title?: string
  message?: string
  error?: Error | unknown
  onRetry?: () => void
  showHomeButton?: boolean
  showBackButton?: boolean
  className?: string
}
```

**الاستخدام في معالجة أخطاء API:**

```typescript
// في Page Component
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['plays'],
  queryFn: getPlays
})

if (error) {
  return (
    <ErrorMessage
      type="network"
      title="خطأ في تحميل المسرحيات"
      message="تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى."
      error={error}
      onRetry={() => refetch()}
      showHomeButton
      showBackButton
    />
  )
}
```

### 4. Skeleton Loaders (موجود)

**الموقع:** `src/components/common/Skeletons.tsx`

**المكونات المتاحة:**
```typescript
// Hero Skeleton
<SkeletonHero />

// Grid Skeleton
<SkeletonGrid count={12} variant="video" />
<SkeletonGrid count={18} variant="poster" />

// Individual Cards
<SkeletonVideoCard />  // 16:9 aspect ratio
<SkeletonPosterCard /> // 2:3 aspect ratio

// Details Page
<SkeletonDetails />

// Profile Page
<SkeletonProfile />
```

**الاستخدام في الصفحات:**

```typescript
// Plays Page Loading State
if (isLoading) {
  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead title="المسرحيات - سينما أونلاين" />
      <SkeletonHero />
      <div className="space-y-2 pt-4">
        <SkeletonGrid count={12} variant="video" />
      </div>
    </div>
  )
}

// Classics Page Loading State
if (isLoading) {
  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead title="كلاسيكيات السينما | سينما أونلاين" />
      <SkeletonHero />
      <div className="space-y-2 pt-4">
        <SkeletonGrid count={18} variant="poster" />
      </div>
    </div>
  )
}
```

### 5. Page Component Structure (التعديلات المطلوبة)

**قبل التعديل:**
```typescript
export const PlaysPage = () => {
  const { data, isLoading, error } = useQuery(...)
  
  if (isLoading) return <PageLoader />  // ❌ Spinner بسيط
  
  if (error) {
    return <div>Error message</div>  // ❌ رسالة بسيطة
  }
  
  return (
    <div>
      <Helmet><title>...</title></Helmet>  // ❌ Helmet بسيط
      <QuantumHero items={plays} />
      <QuantumTrain items={plays} />
    </div>
  )
}
```

**بعد التعديل:**
```typescript
export const PlaysPage = () => {
  const { data, isLoading, error, refetch } = useQuery(...)
  
  // ✅ SEO شامل
  const seoTitle = category 
    ? `${getCategoryTitle(category)} - المسرحيات | سينما أونلاين`
    : "المسرحيات - سينما أونلاين"
  
  const seoDescription = category
    ? `شاهد أفضل ${getCategoryTitle(category)} بجودة عالية`
    : "استمتع بمشاهدة أفضل المسرحيات العربية والخليجية"
  
  // ✅ Skeleton loaders مفصلة
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <SeoHead title={seoTitle} description={seoDescription} />
        <SkeletonHero />
        <div className="space-y-2 pt-4">
          <SkeletonGrid count={12} variant="video" />
        </div>
      </div>
    )
  }
  
  // ✅ Error handling احترافي
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SeoHead title={seoTitle} description={seoDescription} noIndex />
        <ErrorMessage
          type="network"
          title="خطأ في تحميل المسرحيات"
          message="تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى."
          error={error}
          onRetry={() => refetch()}
          showHomeButton
          showBackButton
        />
      </div>
    )
  }
  
  const plays = data?.data || []
  
  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead 
        title={seoTitle}
        description={seoDescription}
        type="website"
        image="https://cinma.online/og-plays.jpg"
      />
      <QuantumHero items={plays.slice(0, 10)} />
      <div className="space-y-2 pt-4">
        <QuantumTrain items={plays} title="أحدث المسرحيات" />
      </div>
    </div>
  )
}
```

### 6. Route-Level Error Boundary Wrapper

**إنشاء wrapper component جديد:**

**الموقع:** `src/components/common/PageErrorBoundary.tsx`

```typescript
import { ErrorBoundary } from './ErrorBoundary'
import { ErrorMessage } from './ErrorMessage'
import { logger } from '../../lib/logger'
import { useQueryClient } from '@tanstack/react-query'

interface PageErrorBoundaryProps {
  children: React.ReactNode
  pageName: string
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ 
  children, 
  pageName 
}) => {
  const queryClient = useQueryClient()
  
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <ErrorMessage
            type="generic"
            title="حدث خطأ غير متوقع"
            message={`عذراً، حدث خطأ أثناء عرض صفحة ${pageName}. يرجى المحاولة مرة أخرى.`}
            onRetry={() => window.location.reload()}
            showHomeButton
            showBackButton
          />
        </div>
      }
      onError={(error, errorInfo) => {
        logger.error(`${pageName} Error Boundary`, {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }}
      onReset={() => {
        // إعادة تعيين cache عند إعادة المحاولة
        queryClient.invalidateQueries()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

**الاستخدام في Routes:**

```typescript
// في App.tsx أو Router configuration
<Route 
  path="/plays" 
  element={
    <PageErrorBoundary pageName="المسرحيات">
      <PlaysPage />
    </PageErrorBoundary>
  } 
/>

<Route 
  path="/classics" 
  element={
    <PageErrorBoundary pageName="الكلاسيكيات">
      <ClassicsPage />
    </PageErrorBoundary>
  } 
/>
```

---

## Data Models

### SEO Data Model

```typescript
interface SeoData {
  // Basic Meta Tags
  title: string
  description: string
  keywords?: string[]
  
  // Open Graph
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogUrl: string
  ogType: 'website' | 'article' | 'video.movie' | 'video.tv_show'
  ogLocale: string
  ogSiteName: string
  
  // Twitter Card
  twitterCard: 'summary' | 'summary_large_image'
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  
  // Schema.org
  schema: SchemaOrgObject[]
  
  // Additional
  canonical: string
  noIndex?: boolean
}

interface SchemaOrgObject {
  '@context': 'https://schema.org'
  '@type': string
  [key: string]: any
}
```

### Loading State Model

```typescript
interface LoadingState {
  isLoading: boolean
  loadingType: 'initial' | 'refetch' | 'filter'
  skeletonVariant: 'video' | 'poster'
  skeletonCount: number
}
```

### Error State Model

```typescript
interface ErrorState {
  hasError: boolean
  errorType: 'network' | 'server' | 'notFound' | 'validation' | 'generic'
  errorTitle: string
  errorMessage: string
  errorDetails?: Error
  canRetry: boolean
  retryFn?: () => void
}
```

### Page State Model

```typescript
interface PageState {
  // SEO
  seo: SeoData
  
  // Loading
  loading: LoadingState
  
  // Error
  error: ErrorState
  
  // Data
  data: any[]
  
  // Filters (for filter pages)
  filters?: {
    genre?: string
    year?: string
    rating?: number
    language?: string
  }
}
```

### API Response Model

```typescript
interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface ApiError {
  message: string
  code: string
  status: number
  details?: any
}
```

### Content Models (من CockroachDB)

```typescript
interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  vote_count: number
  genres: Genre[]
  production_countries: Country[]
  keywords: Keyword[]
  // ... other fields
}

interface Genre {
  id: number
  name: string
}

interface Country {
  iso_3166_1: string
  name: string
}

interface Keyword {
  id: number
  name: string
}
```

### Quran-Specific Models

```typescript
interface Reciter {
  id: number
  name: string
  name_en: string
  server: string
  surah_list: string // comma-separated surah IDs
  featured?: boolean
}

interface Surah {
  id: number
  name: string
  englishName: string
  type: 'Meccan' | 'Medinan'
  ayahs: number
}

interface PrayerTimings {
  ymd: string
  timings: {
    Fajr: string
    Dhuhr: string
    Asr: string
    Maghrib: string
    Isha: string
  }
  meta?: {
    lat: number
    lon: number
  }
}

interface Weather {
  tempC: number
  code: number
}
```

### Audio Stream Model (QuranRadio)

```typescript
interface RadioStation {
  id: string
  name: string
  name_en: string
  url: string
  externalUrl: string
}

interface AudioState {
  isPlaying: boolean
  isAutoplayBlocked: boolean
  currentStation: RadioStation
  error?: AudioError
}

interface AudioError {
  type: 'autoplay' | 'network' | 'stream'
  message: string
  stationId: string
}
```

### Dynamic SEO Model (للصفحات المفلترة)

```typescript
interface DynamicSeoData extends SeoData {
  // Filter-specific
  activeFilters: {
    genre?: string
    year?: string
    rating?: number
    language?: string
    category?: string
  }
  
  // Dynamic title generation
  generateTitle: (filters: Record<string, any>) => string
  
  // Dynamic description generation
  generateDescription: (filters: Record<string, any>) => string
}

// مثال على الاستخدام
const playsSeoData: DynamicSeoData = {
  ...baseSeoData,
  activeFilters: { category: 'adel-imam' },
  generateTitle: (filters) => {
    if (filters.category === 'adel-imam') {
      return 'مسرحيات عادل إمام - سينما أونلاين'
    }
    if (filters.category === 'classics') {
      return 'مسرحيات كلاسيكية - سينما أونلاين'
    }
    return 'المسرحيات - سينما أونلاين'
  },
  generateDescription: (filters) => {
    if (filters.category === 'adel-imam') {
      return 'شاهد أفضل مسرحيات الزعيم عادل إمام بجودة عالية'
    }
    return 'استمتع بمشاهدة أفضل المسرحيات العربية'
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SEO Meta Tags Presence

*For any* discovery page (Plays, Classics, Summaries, Quran, QuranRadio), when the page is rendered, the HTML head SHALL contain all required SEO meta tags including title, description, Open Graph tags (og:title, og:description, og:image, og:url, og:type), Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image), and canonical URL.

**Validates: Requirements 1.7, 1.8, 1.10, 2.4, 2.6, 2.8, 2.10, 3.4, 3.5, 3.7, 4.3, 4.4, 4.6, 4.8, 5.3, 5.6, 5.9**

### Property 2: Meta Description Length Constraint

*For any* page with SEO meta tags, the meta description length SHALL be between 150 and 160 characters, and if the generated description exceeds 160 characters, it SHALL be truncated correctly without breaking words.

**Validates: Requirements 1.2, 2.2, 3.2, 20.6**

### Property 3: Dynamic SEO Updates for Filters

*For any* filtered discovery page (PlaysWithFilters, ClassicsWithFilters, SummariesWithFilters), when filters are applied or changed, the meta title and meta description SHALL update dynamically to reflect the active filters without requiring a page reload.

**Validates: Requirements 1.11, 2.3, 2.7, 3.6, 19.8**

### Property 4: Schema.org Structured Data Validity

*For any* page with Schema.org structured data, the JSON-LD markup SHALL contain valid @context and @type properties, and SHALL pass Schema.org validation rules.

**Validates: Requirements 1.9, 2.5, 2.6, 17.5, 20.8**

### Property 5: Schema.org Round-Trip Property

*For any* valid Schema.org object, parsing the JSON-LD from HTML, then pretty-printing it, then parsing again SHALL produce an equivalent object with the same structure and values.

**Validates: Requirements 17.8**

### Property 6: Canonical URL Correctness

*For all* discovery pages, the canonical URL SHALL match the current page path and SHALL be unique (no duplicate canonical tags in HTML head).

**Validates: Requirements 1.10, 3.7, 4.8, 5.6, 20.4, 20.5**

### Property 7: Skeleton Loaders Display During Loading

*For any* discovery page in loading state (isLoading === true), the page SHALL display appropriate skeleton loaders (SkeletonHero and SkeletonGrid) instead of actual content or a blank page.

**Validates: Requirements 6.1, 6.2, 6.6, 6.10, 7.1, 7.2, 8.1, 8.2, 9.1, 9.3**

### Property 8: Skeleton Loader Variant Matching

*For any* content type, the skeleton loader variant SHALL match the content aspect ratio: SkeletonVideoCard (16:9) for plays and summaries, SkeletonPosterCard (2:3) for classics.

**Validates: Requirements 6.4, 7.3**

### Property 9: Skeleton Loaders Hide on Load Complete

*For any* page that transitions from loading to loaded state, skeleton loaders SHALL be hidden with a smooth transition and actual content SHALL be displayed.

**Validates: Requirements 6.7, 7.8, 8.8, 9.8**

### Property 10: Skeleton Loaders for Refetch

*For any* page with active filters, when data is refetched due to filter changes, skeleton loaders SHALL be displayed during the refetch operation.

**Validates: Requirements 6.9, 7.9, 8.9**

### Property 11: Error Message Display on API Failure

*For any* API call that fails (network error, server error, timeout), the page SHALL display an ErrorMessage component with appropriate error type instead of a blank page or generic error.

**Validates: Requirements 10.1, 10.2, 10.3, 10.10, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3**

### Property 12: Error Message Retry Functionality

*For any* ErrorMessage component displayed due to API failure, clicking the "إعادة المحاولة" button SHALL trigger a refetch of the failed API call.

**Validates: Requirements 10.4, 11.4, 12.4**

### Property 13: Graceful Degradation for External APIs

*For any* external API failure (Prayer Times, Weather) on Quran page, the system SHALL hide the affected UI section gracefully without displaying an error message or breaking the page.

**Validates: Requirements 13.2, 13.3, 14.9**

### Property 14: Audio Stream Auto-Fallback

*For any* audio stream failure on QuranRadio page, the system SHALL automatically switch to the next station exactly once to avoid infinite loops.

**Validates: Requirements 14.1, 14.9**

### Property 15: Error Boundary Catches React Errors

*For any* React error thrown within a page component, the ErrorBoundary SHALL catch the error, prevent application crash, and display a Fallback UI with ErrorMessage.

**Validates: Requirements 15.6, 15.7, 16.4**

### Property 16: Error Boundary Logging

*For any* error caught by ErrorBoundary, the error details including message, stack trace, and component stack SHALL be logged using the Logger system.

**Validates: Requirements 15.8, 10.9**

### Property 17: Error Boundary Reset Functionality

*For any* ErrorBoundary in error state, triggering the onReset callback SHALL clear the error state, invalidate query cache, and allow the component to re-render.

**Validates: Requirements 15.9, 15.10**

### Property 18: SEO Parser Handles Missing Tags

*For any* HTML document with missing or incomplete meta tags, the SEO Parser SHALL handle the missing tags gracefully without throwing exceptions.

**Validates: Requirements 17.9**

### Property 19: Pretty Printer Escapes Special Characters

*For any* Schema.org object containing special characters in string values, the Pretty Printer SHALL correctly escape these characters when generating JSON-LD.

**Validates: Requirements 17.10**

### Property 20: Accessibility Attributes Presence

*For all* ErrorMessage components, the rendered HTML SHALL include role="alert" and aria-live="assertive" attributes for screen reader compatibility.

**Validates: Requirements 18.1, 18.2**

### Property 21: Skeleton Loader Accessibility

*For all* skeleton loaders displayed during loading state, the component SHALL include aria-busy="true" attribute, and when loading completes, aria-busy SHALL be updated to "false".

**Validates: Requirements 18.4, 18.5**

### Property 22: Interactive Elements Keyboard Navigation

*For all* interactive elements (buttons) in ErrorMessage component, keyboard navigation SHALL be fully functional and each button SHALL have a clear aria-label.

**Validates: Requirements 18.6, 18.10**

### Property 23: No Aria-Hidden on Skeleton Loaders

*For all* skeleton loaders, the aria-hidden attribute SHALL NOT be present, ensuring screen readers can announce the loading state.

**Validates: Requirements 18.9**

### Property 24: Skeleton Loaders Immediate Display

*For any* page entering loading state, skeleton loaders SHALL be displayed immediately without any delay.

**Validates: Requirements 19.2**

### Property 25: SEO Component Memoization

*For any* SeoHead component, when props do not change, the component SHALL not re-render unnecessarily (React.memo optimization).

**Validates: Requirements 19.3**

### Property 26: OG Image Dimensions

*For all* pages with og:image meta tag, the image URL SHALL point to an image with dimensions of at least 1200x630 pixels.

**Validates: Requirements 20.7**

### Property 27: Hreflang Tags for Multilingual Content

*For all* pages with multilingual content support, the HTML head SHALL include appropriate hreflang tags for each supported language.

**Validates: Requirements 20.9**

### Property 28: Pagination Links

*For any* page with pagination, the HTML head SHALL include rel="next" and rel="prev" link tags pointing to the correct next and previous pages.

**Validates: Requirements 20.10**

---

## Error Handling

### Error Categories

#### 1. API Errors (CockroachDB Content API)

**Network Errors:**
- Connection timeout
- DNS resolution failure
- Network unreachable
- CORS errors

**Handling Strategy:**
```typescript
if (error instanceof TypeError && error.message.includes('fetch')) {
  return (
    <ErrorMessage
      type="network"
      title="خطأ في الاتصال"
      message="تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت."
      onRetry={() => refetch()}
      showHomeButton
      showBackButton
    />
  )
}
```

**Server Errors (5xx):**
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

**Handling Strategy:**
```typescript
if (error.response?.status >= 500) {
  return (
    <ErrorMessage
      type="server"
      title="خطأ في الخادم"
      message="حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً."
      onRetry={() => refetch()}
      showHomeButton
      showBackButton
    />
  )
}
```

**Client Errors (4xx):**
- 404 Not Found
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

**Handling Strategy:**
```typescript
if (error.response?.status === 404) {
  return (
    <ErrorMessage
      type="notFound"
      title="المحتوى غير موجود"
      message="عذراً، لم نتمكن من العثور على المحتوى المطلوب."
      showHomeButton
      showBackButton
    />
  )
}
```

#### 2. React Component Errors

**Rendering Errors:**
- Component lifecycle errors
- Hook errors (useEffect, useState)
- Prop validation errors
- Child component errors

**Handling Strategy:**
```typescript
<ErrorBoundary
  fallback={
    <ErrorMessage
      type="generic"
      title="حدث خطأ غير متوقع"
      message="عذراً، حدث خطأ أثناء عرض هذا المحتوى."
      onRetry={() => window.location.reload()}
      showHomeButton
    />
  }
  onError={(error, errorInfo) => {
    logger.error('React Error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }}
>
  <PageComponent />
</ErrorBoundary>
```

#### 3. External API Errors (Quran Page)

**Prayer Times API Errors:**
- API unavailable
- Invalid response format
- Timeout

**Handling Strategy:**
```typescript
// Graceful degradation - hide prayer times section
try {
  const timings = await fetchPrayerTimings()
  setPrayerTimings(timings)
} catch (error) {
  logger.warn('Prayer Times API failed', { error })
  setPrayerTimings(null) // Hide section silently
}
```

**Weather API Errors:**
- API unavailable
- Invalid response format
- Timeout

**Handling Strategy:**
```typescript
// Graceful degradation - hide weather icon
try {
  const weather = await fetchWeather()
  setWeather(weather)
} catch (error) {
  logger.warn('Weather API failed', { error })
  setWeather(null) // Hide icon silently
}
```

**Quran Reciters API Errors:**
- API unavailable
- Invalid response format
- Empty reciter list

**Handling Strategy:**
```typescript
const { data: reciters, isLoading, error } = useReciters()

if (error) {
  return (
    <div className="flex items-center justify-center h-full">
      <ErrorMessage
        type="network"
        title="خطأ في تحميل القراء"
        message="تعذر تحميل قائمة القراء. يرجى المحاولة مرة أخرى."
        onRetry={() => refetch()}
      />
    </div>
  )
}
```

#### 4. Audio Stream Errors (QuranRadio)

**Autoplay Blocked:**
- Browser autoplay policy
- User interaction required

**Handling Strategy:**
```typescript
try {
  await audio.play()
  setIsAutoplayBlocked(false)
} catch (err) {
  if (err.name === 'NotAllowedError') {
    setIsAutoplayBlocked(true)
    // Show "اضغط Play للبدء" message
  }
}
```

**Stream Loading Errors:**
- Stream URL unavailable
- Network error during streaming
- Codec not supported

**Handling Strategy:**
```typescript
const handleAudioError = useCallback(() => {
  setIsPlaying(false)
  
  // Auto-fallback to next station (once only)
  if (autoFallbackForStationIdRef.current === currentStation.id) {
    // Already tried fallback for this station
    return
  }
  
  autoFallbackForStationIdRef.current = currentStation.id
  setTimeout(() => {
    setStationIndex((prev) => (prev + 1) % STATIONS.length)
  }, 500)
}, [currentStation.id])
```

### Error Logging Strategy

#### Development Mode
```typescript
if (import.meta.env.DEV) {
  console.error('Error Details:', {
    message: error.message,
    stack: error.stack,
    context: additionalContext
  })
}
```

#### Production Mode
```typescript
logger.error('Error occurred', {
  message: error.message,
  stack: error.stack,
  url: window.location.href,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
})
```

### Error Recovery Mechanisms

#### 1. Retry with Exponential Backoff
```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

#### 2. Query Cache Invalidation
```typescript
const handleReset = () => {
  queryClient.invalidateQueries(['plays'])
  queryClient.invalidateQueries(['classics'])
  queryClient.invalidateQueries(['summaries'])
}
```

#### 3. Fallback Content
```typescript
// Show cached data if available
const { data, error } = useQuery({
  queryKey: ['plays'],
  queryFn: getPlays,
  staleTime: 1000 * 60 * 5,
  cacheTime: 1000 * 60 * 30,
  useErrorBoundary: false,
  retry: 2
})

if (error && data) {
  // Show stale data with warning
  return (
    <>
      <div className="bg-yellow-500/10 p-4 rounded-lg mb-4">
        <p className="text-yellow-500">تعذر تحميل أحدث البيانات. يتم عرض البيانات المحفوظة.</p>
      </div>
      <ContentDisplay data={data} />
    </>
  )
}
```

### Error Prevention

#### 1. Input Validation
```typescript
// Validate filter parameters before API call
const validateFilters = (filters: FilterParams) => {
  if (filters.year && (filters.year < 1900 || filters.year > 2100)) {
    throw new Error('Invalid year range')
  }
  if (filters.rating && (filters.rating < 0 || filters.rating > 10)) {
    throw new Error('Invalid rating range')
  }
}
```

#### 2. Type Safety
```typescript
// Use TypeScript strict mode
interface ApiResponse<T> {
  data: T[]
  total: number
  page: number
}

// Runtime validation
const validateApiResponse = (response: unknown): response is ApiResponse<Movie> => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray(response.data)
  )
}
```

#### 3. Defensive Programming
```typescript
// Safe array access
const firstItem = data?.data?.[0] ?? null

// Safe property access
const title = movie?.title ?? 'عنوان غير متوفر'

// Safe function calls
const handleClick = () => {
  onRetry?.()
}
```

---

## Testing Strategy

### Dual Testing Approach

This feature requires both **unit tests** and **property-based tests** for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary

### Unit Testing

Unit tests focus on specific scenarios and edge cases:

#### SEO Component Tests
```typescript
describe('SeoHead Component', () => {
  it('should render basic meta tags for Plays page', () => {
    render(
      <SeoHead
        title="المسرحيات - سينما أونلاين"
        description="استمتع بمشاهدة أفضل المسرحيات"
        type="website"
      />
    )
    
    expect(document.title).toBe('المسرحيات - سينما أونلاين')
    expect(document.querySelector('meta[name="description"]')?.content)
      .toBe('استمتع بمشاهدة أفضل المسرحيات')
  })
  
  it('should render Open Graph tags', () => {
    render(<SeoHead title="Test" />)
    
    expect(document.querySelector('meta[property="og:title"]')).toBeTruthy()
    expect(document.querySelector('meta[property="og:description"]')).toBeTruthy()
    expect(document.querySelector('meta[property="og:image"]')).toBeTruthy()
  })
  
  it('should render Schema.org structured data', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Test List'
    }
    
    render(<SeoHead title="Test" schema={schema} />)
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]')
    expect(scriptTag).toBeTruthy()
    expect(JSON.parse(scriptTag!.textContent!)).toEqual(schema)
  })
})
```

#### Skeleton Loader Tests
```typescript
describe('Skeleton Loaders', () => {
  it('should display SkeletonHero during loading', () => {
    const { container } = render(<SkeletonHero />)
    expect(container.querySelector('.skeleton-hero')).toBeTruthy()
  })
  
  it('should display correct number of skeleton cards', () => {
    const { container } = render(<SkeletonGrid count={12} variant="video" />)
    const cards = container.querySelectorAll('.skeleton-card')
    expect(cards.length).toBe(12)
  })
  
  it('should use correct aspect ratio for video cards', () => {
    const { container } = render(<SkeletonVideoCard />)
    const aspectRatio = container.querySelector('.aspect-video')
    expect(aspectRatio).toBeTruthy()
  })
})
```

#### Error Message Tests
```typescript
describe('ErrorMessage Component', () => {
  it('should display network error message', () => {
    const { getByText } = render(
      <ErrorMessage
        type="network"
        title="خطأ في الاتصال"
        message="تعذر الاتصال بالخادم"
      />
    )
    
    expect(getByText('خطأ في الاتصال')).toBeTruthy()
    expect(getByText('تعذر الاتصال بالخادم')).toBeTruthy()
  })
  
  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <ErrorMessage type="network" onRetry={onRetry} />
    )
    
    fireEvent.click(getByText('إعادة المحاولة'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
  
  it('should include accessibility attributes', () => {
    const { container } = render(<ErrorMessage type="network" />)
    const alert = container.querySelector('[role="alert"]')
    
    expect(alert).toBeTruthy()
    expect(alert?.getAttribute('aria-live')).toBe('assertive')
  })
})
```

#### Error Boundary Tests
```typescript
describe('ErrorBoundary', () => {
  it('should catch React errors and display fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(getByText('حدث خطأ غير متوقع')).toBeTruthy()
  })
  
  it('should call onError callback', () => {
    const onError = jest.fn()
    const ThrowError = () => {
      throw new Error('Test error')
    }
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalled()
  })
  
  it('should reset error state on retry', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ComponentThatMayError />
      </ErrorBoundary>
    )
    
    // Trigger error
    fireEvent.click(getByText('Trigger Error'))
    expect(getByText('حدث خطأ غير متوقع')).toBeTruthy()
    
    // Reset
    fireEvent.click(getByText('إعادة المحاولة'))
    expect(queryByText('حدث خطأ غير متوقع')).toBeNull()
  })
})
```

### Property-Based Testing

Property tests verify universal behaviors across many generated inputs. Each test should run **minimum 100 iterations**.

#### Property Test Configuration

Using **fast-check** library for TypeScript:

```typescript
import * as fc from 'fast-check'

// Configure test runs
const testConfig = {
  numRuns: 100, // Minimum iterations
  verbose: true
}
```

#### SEO Properties

```typescript
describe('SEO Properties', () => {
  /**
   * Feature: seo-loading-error-improvements
   * Property 1: SEO Meta Tags Presence
   * For any discovery page, all required SEO meta tags must be present
   */
  it('should include all required meta tags for any page', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 10, maxLength: 60 }),
          description: fc.string({ minLength: 150, maxLength: 160 }),
          type: fc.constantFrom('website', 'video.movie', 'video.tv_show'),
          image: fc.webUrl()
        }),
        (seoData) => {
          const { container } = render(<SeoHead {...seoData} />)
          
          // Check all required tags exist
          expect(document.title).toBeTruthy()
          expect(document.querySelector('meta[name="description"]')).toBeTruthy()
          expect(document.querySelector('meta[property="og:title"]')).toBeTruthy()
          expect(document.querySelector('meta[property="og:description"]')).toBeTruthy()
          expect(document.querySelector('meta[property="og:image"]')).toBeTruthy()
          expect(document.querySelector('meta[property="og:url"]')).toBeTruthy()
          expect(document.querySelector('meta[name="twitter:card"]')).toBeTruthy()
          expect(document.querySelector('link[rel="canonical"]')).toBeTruthy()
        }
      ),
      testConfig
    )
  })
  
  /**
   * Feature: seo-loading-error-improvements
   * Property 2: Meta Description Length Constraint
   * For any description, length must be between 150-160 characters
   */
  it('should enforce description length constraints', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 100, maxLength: 200 }),
        (description) => {
          const truncated = truncateDescription(description, 160)
          
          expect(truncated.length).toBeGreaterThanOrEqual(0)
          expect(truncated.length).toBeLessThanOrEqual(160)
          
          // Should not break words
          if (truncated.length === 160 && description.length > 160) {
            expect(truncated).not.toMatch(/\s\S+$/) // No partial word at end
          }
        }
      ),
      testConfig
    )
  })
  
  /**
   * Feature: seo-loading-error-improvements
   * Property 5: Schema.org Round-Trip Property
   * For any valid Schema.org object, parse → print → parse should be equivalent
   */
  it('should preserve Schema.org structure through round-trip', () => {
    fc.assert(
      fc.property(
        fc.record({
          '@context': fc.constant('https://schema.org'),
          '@type': fc.constantFrom('Movie', 'TVSeries', 'ItemList', 'RadioStation'),
          name: fc.string(),
          description: fc.string(),
          url: fc.webUrl()
        }),
        (schema) => {
          // Parse from HTML
          const html = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
          const parsed = parseSchemaFromHTML(html)
          
          // Pretty print
          const printed = prettyPrintSchema(parsed)
          
          // Parse again
          const reparsed = JSON.parse(printed)
          
          // Should be equivalent
          expect(reparsed).toEqual(schema)
        }
      ),
      testConfig
    )
  })
})
```

#### Loading State Properties

```typescript
describe('Loading State Properties', () => {
  /**
   * Feature: seo-loading-error-improvements
   * Property 7: Skeleton Loaders Display During Loading
   * For any page in loading state, skeleton loaders must be displayed
   */
  it('should display skeleton loaders for any loading state', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.constant(true),
          contentType: fc.constantFrom('plays', 'classics', 'summaries')
        }),
        ({ isLoading, contentType }) => {
          const { container } = render(
            <PageComponent isLoading={isLoading} contentType={contentType} />
          )
          
          // Should have skeleton loaders
          expect(container.querySelector('.skeleton-hero')).toBeTruthy()
          expect(container.querySelector('.skeleton-grid')).toBeTruthy()
          
          // Should not have actual content
          expect(container.querySelector('.quantum-hero')).toBeNull()
          expect(container.querySelector('.quantum-train')).toBeNull()
        }
      ),
      testConfig
    )
  })
  
  /**
   * Feature: seo-loading-error-improvements
   * Property 9: Skeleton Loaders Hide on Load Complete
   * For any transition from loading to loaded, skeletons must be hidden
   */
  it('should hide skeleton loaders when loading completes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.integer(),
          title: fc.string()
        }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const { container, rerender } = render(
            <PageComponent isLoading={true} data={[]} />
          )
          
          // Initially loading
          expect(container.querySelector('.skeleton-hero')).toBeTruthy()
          
          // Load complete
          rerender(<PageComponent isLoading={false} data={data} />)
          
          // Skeletons should be gone
          expect(container.querySelector('.skeleton-hero')).toBeNull()
          
          // Content should be visible
          expect(container.querySelector('.quantum-hero')).toBeTruthy()
        }
      ),
      testConfig
    )
  })
})
```

#### Error Handling Properties

```typescript
describe('Error Handling Properties', () => {
  /**
   * Feature: seo-loading-error-improvements
   * Property 11: Error Message Display on API Failure
   * For any API error, ErrorMessage component must be displayed
   */
  it('should display ErrorMessage for any API error', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorType: fc.constantFrom('network', 'server', 'timeout'),
          statusCode: fc.integer({ min: 400, max: 599 }),
          message: fc.string()
        }),
        (errorData) => {
          const error = new Error(errorData.message)
          error.response = { status: errorData.statusCode }
          
          const { container } = render(
            <PageComponent error={error} />
          )
          
          // Should display ErrorMessage
          expect(container.querySelector('[role="alert"]')).toBeTruthy()
          
          // Should not display blank page
          expect(container.textContent).not.toBe('')
        }
      ),
      testConfig
    )
  })
  
  /**
   * Feature: seo-loading-error-improvements
   * Property 15: Error Boundary Catches React Errors
   * For any React error, ErrorBoundary must catch and display fallback
   */
  it('should catch any React error and display fallback', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (errorMessage) => {
          const ThrowError = () => {
            throw new Error(errorMessage)
          }
          
          const { container } = render(
            <ErrorBoundary>
              <ThrowError />
            </ErrorBoundary>
          )
          
          // Should display fallback UI
          expect(container.querySelector('[role="alert"]')).toBeTruthy()
          
          // Should not crash
          expect(container).toBeTruthy()
        }
      ),
      testConfig
    )
  })
})
```

#### Accessibility Properties

```typescript
describe('Accessibility Properties', () => {
  /**
   * Feature: seo-loading-error-improvements
   * Property 20: Accessibility Attributes Presence
   * For all ErrorMessage components, accessibility attributes must be present
   */
  it('should include accessibility attributes for any error type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('network', 'server', 'notFound', 'validation', 'generic'),
        (errorType) => {
          const { container } = render(
            <ErrorMessage type={errorType} />
          )
          
          const alert = container.querySelector('[role="alert"]')
          expect(alert).toBeTruthy()
          expect(alert?.getAttribute('aria-live')).toBe('assertive')
        }
      ),
      testConfig
    )
  })
  
  /**
   * Feature: seo-loading-error-improvements
   * Property 22: Interactive Elements Keyboard Navigation
   * For all buttons in ErrorMessage, keyboard navigation must work
   */
  it('should support keyboard navigation for all interactive elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          showRetry: fc.boolean(),
          showHome: fc.boolean(),
          showBack: fc.boolean()
        }),
        (buttonConfig) => {
          const { container } = render(
            <ErrorMessage
              type="network"
              onRetry={buttonConfig.showRetry ? jest.fn() : undefined}
              showHomeButton={buttonConfig.showHome}
              showBackButton={buttonConfig.showBack}
            />
          )
          
          const buttons = container.querySelectorAll('button')
          buttons.forEach(button => {
            // Each button should have aria-label
            expect(button.getAttribute('aria-label')).toBeTruthy()
            
            // Each button should be keyboard accessible
            expect(button.tabIndex).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      testConfig
    )
  })
})
```

### Integration Tests

Integration tests verify the complete flow from API call to UI rendering:

```typescript
describe('Page Integration Tests', () => {
  it('should handle complete loading → success flow', async () => {
    const mockData = [{ id: 1, title: 'Test Play' }]
    mockAPI.getPlays.mockResolvedValue({ data: mockData })
    
    const { container, findByText } = render(<PlaysPage />)
    
    // Should show skeleton initially
    expect(container.querySelector('.skeleton-hero')).toBeTruthy()
    
    // Wait for data to load
    await findByText('Test Play')
    
    // Should hide skeleton
    expect(container.querySelector('.skeleton-hero')).toBeNull()
    
    // Should show content
    expect(container.querySelector('.quantum-hero')).toBeTruthy()
  })
  
  it('should handle complete loading → error flow', async () => {
    mockAPI.getPlays.mockRejectedValue(new Error('Network error'))
    
    const { container, findByText } = render(<PlaysPage />)
    
    // Should show skeleton initially
    expect(container.querySelector('.skeleton-hero')).toBeTruthy()
    
    // Wait for error
    await findByText('خطأ في الاتصال')
    
    // Should hide skeleton
    expect(container.querySelector('.skeleton-hero')).toBeNull()
    
    // Should show error message
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
  })
})
```

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Property Tests**: 100% of correctness properties
- **Integration Tests**: All critical user flows
- **Accessibility Tests**: WCAG 2.1 AA compliance

### Testing Tools

- **Jest**: Unit test runner
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **axe-core**: Accessibility testing
- **MSW (Mock Service Worker)**: API mocking

---

## Implementation Notes

### Phase 1: Error Boundaries (Priority: Critical)

**Goal:** Prevent application crashes and provide graceful error handling.

**Steps:**
1. Create `PageErrorBoundary` wrapper component
2. Wrap all discovery pages with ErrorBoundary in route configuration
3. Test error catching with intentional errors
4. Verify logger integration

**Files to Modify:**
- Create: `src/components/common/PageErrorBoundary.tsx`
- Modify: `src/App.tsx` or route configuration file

**Estimated Time:** 2-3 hours

### Phase 2: Skeleton Loaders (Priority: High)

**Goal:** Replace simple PageLoader with detailed skeleton loaders.

**Steps:**
1. Update Plays page loading state
2. Update Classics page loading state
3. Update Summaries page loading state
4. Update Quran page loading state (reciters list)
5. Test loading transitions

**Files to Modify:**
- `src/pages/discovery/Plays.tsx`
- `src/pages/discovery/Classics.tsx`
- `src/pages/discovery/Summaries.tsx`
- `src/pages/discovery/Quran.tsx`

**Estimated Time:** 4-5 hours

### Phase 3: SEO Implementation (Priority: High)

**Goal:** Replace Helmet with comprehensive SeoHead component.

**Steps:**
1. Replace Helmet in Plays page with SeoHead
2. Replace Helmet in Classics page with SeoHead
3. Replace Helmet in Summaries page with SeoHead
4. Replace Helmet in Quran page with SeoHead
5. Replace Helmet in QuranRadio page with SeoHead
6. Add dynamic SEO for filtered pages
7. Test meta tags in browser DevTools

**Files to Modify:**
- `src/pages/discovery/Plays.tsx`
- `src/pages/discovery/Classics.tsx`
- `src/pages/discovery/Summaries.tsx`
- `src/pages/discovery/Quran.tsx`
- `src/pages/discovery/QuranRadio.tsx`
- `src/pages/discovery/PlaysWithFilters.tsx`
- `src/pages/discovery/ClassicsWithFilters.tsx`
- `src/pages/discovery/SummariesWithFilters.tsx`

**Estimated Time:** 6-8 hours

### Phase 4: Dynamic SEO for Filters (Priority: Medium)

**Goal:** Update SEO meta tags dynamically when filters change.

**Steps:**
1. Create SEO helper functions for dynamic title/description generation
2. Integrate with PlaysWithFilters
3. Integrate with ClassicsWithFilters
4. Integrate with SummariesWithFilters
5. Test filter changes update meta tags

**Files to Create:**
- `src/lib/seo-helpers.ts`

**Files to Modify:**
- `src/pages/discovery/PlaysWithFilters.tsx`
- `src/pages/discovery/ClassicsWithFilters.tsx`
- `src/pages/discovery/SummariesWithFilters.tsx`

**Estimated Time:** 3-4 hours

### Phase 5: Testing & Validation (Priority: High)

**Goal:** Ensure all implementations work correctly.

**Steps:**
1. Write unit tests for SEO components
2. Write unit tests for error handling
3. Write unit tests for skeleton loaders
4. Write property-based tests
5. Run accessibility tests
6. Validate SEO with external tools

**Files to Create:**
- `src/__tests__/seo-loading-error-improvements/seo-head.test.tsx`
- `src/__tests__/seo-loading-error-improvements/error-boundary.test.tsx`
- `src/__tests__/seo-loading-error-improvements/skeleton-loaders.test.tsx`
- `src/__tests__/seo-loading-error-improvements/properties.test.tsx`

**Estimated Time:** 8-10 hours

### Critical Database Rules

**IMPORTANT:** All content queries MUST use CockroachDB API:

```typescript
// ✅ CORRECT - Use CockroachDB API
import { getPlays, getClassics, getSummaries } from '../../services/contentQueries'

const { data } = useQuery({
  queryKey: ['plays'],
  queryFn: getPlays
})

// ❌ WRONG - Never query Supabase for content
import { supabase } from '../../lib/supabase'
const { data } = await supabase.from('movies').select('*') // FORBIDDEN
```

**Database Architecture:**
- **Supabase** = Authentication & User Data ONLY
- **CockroachDB** = ALL Content (movies, tv_series, plays, classics, summaries, videos)

### SEO Best Practices

1. **Title Length:** 50-60 characters optimal
2. **Description Length:** 150-160 characters optimal
3. **OG Image Size:** Minimum 1200x630 pixels
4. **Canonical URL:** Always include, must match current page
5. **Schema.org:** Use appropriate @type for content
6. **No Duplicate Tags:** Ensure only one of each meta tag

### Performance Considerations

1. **React.memo:** Use on SeoHead to prevent unnecessary re-renders
2. **CSS Transforms:** Use for skeleton animations (GPU-accelerated)
3. **Lazy Loading:** Consider for large OG images
4. **Query Caching:** Use React Query staleTime and cacheTime appropriately
5. **Error Boundaries:** Keep componentDidCatch lightweight

### Accessibility Requirements

1. **ARIA Attributes:** All interactive elements must have aria-labels
2. **Keyboard Navigation:** All buttons must be keyboard accessible
3. **Screen Readers:** Use role="alert" for error messages
4. **Focus Management:** Error boundaries should manage focus
5. **Loading States:** Use aria-busy for skeleton loaders

### Browser Compatibility

- **Modern Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers:** iOS Safari 14+, Chrome Mobile 90+
- **Fallbacks:** Provide graceful degradation for older browsers

### Monitoring & Analytics

1. **Error Tracking:** All errors logged to Logger system
2. **SEO Monitoring:** Track meta tag presence and correctness
3. **Performance Metrics:** Monitor skeleton loader display time
4. **User Experience:** Track error recovery success rate

### Deployment Checklist

- [ ] All unit tests passing
- [ ] All property tests passing
- [ ] Accessibility tests passing
- [ ] SEO validation with Google Rich Results Test
- [ ] SEO validation with Facebook Sharing Debugger
- [ ] SEO validation with Twitter Card Validator
- [ ] Manual testing on all target pages
- [ ] Performance testing (Lighthouse)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

### Rollback Plan

If issues are discovered after deployment:

1. **SEO Issues:** Revert to Helmet temporarily
2. **Error Boundary Issues:** Remove ErrorBoundary wrapper
3. **Skeleton Loader Issues:** Revert to PageLoader
4. **Performance Issues:** Disable React.memo optimizations

### Future Enhancements

1. **Structured Data Testing Tool:** Build internal validator
2. **SEO Dashboard:** Monitor meta tags across all pages
3. **Error Analytics:** Detailed error tracking and reporting
4. **A/B Testing:** Test different skeleton loader designs
5. **Progressive Enhancement:** Add more sophisticated loading states

---

## Conclusion

This design provides a comprehensive solution for improving SEO, loading states, and error handling across all discovery pages in Cinema Online. The implementation leverages existing components (SeoHead, ErrorBoundary, ErrorMessage, Skeletons) and follows best practices for accessibility, performance, and user experience.

Key benefits:
- **Better SEO:** Comprehensive meta tags improve search engine visibility
- **Better UX:** Skeleton loaders provide visual feedback during loading
- **Better Reliability:** Error boundaries prevent crashes and provide recovery options
- **Better Accessibility:** ARIA attributes ensure screen reader compatibility
- **Better Maintainability:** Reusable components and clear error handling patterns

The phased implementation approach ensures that critical improvements (error boundaries) are deployed first, followed by user-facing enhancements (skeleton loaders, SEO), with comprehensive testing throughout.

