# Design Document: Production Perfection Protocol

## Overview

This design implements three critical production improvements for Cinema.online to achieve enterprise-grade performance, data quality, and user experience. The improvements address:

1. **Data Quality**: Neutral rating defaults (5.0) for unrated content to prevent unfair penalization in sorting algorithms
2. **Performance**: API response caching using node-cache to achieve sub-50ms response times for homepage and content listings
3. **User Experience**: Complete review editing and reporting functionality with reusable React components

### Design Goals

- Ensure unrated content receives neutral 5.0 rating instead of 0 across all adapters (IGDB, TMDB) and ingestion pipeline
- Achieve sub-20ms response times for cached API requests and sub-50ms for first requests
- Provide users with full review management capabilities (edit, report) with proper validation and authorization
- Maintain backward compatibility with existing review system
- Follow existing architectural patterns (CockroachDB for content, Supabase for user data)

### Scope

**In Scope:**
- Database schema changes for nullable rating columns (games, software tables)
- Adapter modifications for 5.0 default rating logic (IGDBAdapter, TMDBAdapter)
- CoreIngestor fallback logic for null ratings
- API caching architecture using node-cache for /api/home, /api/movies, /api/tv endpoints
- Edit Review Modal component (React/TypeScript)
- Report Review Dialog component (React/TypeScript)
- Integration with existing review API endpoints
- TODO comment and console.log cleanup in detail pages

**Out of Scope:**
- Changes to existing review API endpoints (already implemented)
- Database migration for movies/tv_series tables (already nullable)
- Frontend routing changes
- Authentication system modifications
- Performance optimization beyond caching


## Architecture

### System Context

Cinema.online uses a dual-database architecture:
- **CockroachDB**: Primary database for all content (movies, tv_series, games, software, actors)
- **Supabase**: Secondary database for user data (profiles, reviews, watchlist, history)

This design maintains this separation while implementing improvements across both systems.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Detail Pages     │  │ Edit Review      │  │ Report Review │ │
│  │ (Movie/TV/Game/  │  │ Modal Component  │  │ Dialog        │ │
│  │  Software)       │  │                  │  │ Component     │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer (Express)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Content Routes   │  │ Review CRUD      │  │ Home Route    │ │
│  │ /api/movies      │  │ /api/reviews     │  │ /api/home     │ │
│  │ /api/tv          │  │ PUT /:id         │  │               │ │
│  │ /api/games       │  │ POST /:id/report │  │               │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           │         ┌───────────┴─────────────┐       │         │
│           │         │   node-cache (5min TTL) │       │         │
│           │         └───────────┬─────────────┘       │         │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Ingestion Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ IGDBAdapter      │  │ TMDBAdapter      │  │ CoreIngestor  │ │
│  │ (5.0 default)    │  │ (5.0 default)    │  │ (5.0 fallback)│ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
│  ┌──────────────────────────────┐  ┌────────────────────────┐   │
│  │      CockroachDB             │  │      Supabase          │   │
│  │  - movies (vote_average)     │  │  - reviews             │   │
│  │  - tv_series (vote_average)  │  │  - review_reports      │   │
│  │  - games (vote_average NULL) │  │  - profiles            │   │
│  │  - software (vote_avg NULL)  │  │                        │   │
│  └──────────────────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Rating Default Flow
1. External API (IGDB/TMDB) returns content with null/missing rating
2. Adapter normalizes data and assigns 5.0 if rating is null (but not if 0)
3. CoreIngestor receives normalized data and applies fallback 5.0 if still null
4. Content is stored in CockroachDB with vote_average = 5.0

#### API Caching Flow
1. First request hits /api/home endpoint
2. Express route handler checks node-cache for cached response
3. Cache miss: Query CockroachDB, generate response, store in cache with 5-minute TTL
4. Return response with cache metadata (cached: false)
5. Subsequent requests within 5 minutes return cached response in <20ms with metadata (cached: true)

#### Review Edit Flow
1. User clicks edit button on their review
2. Edit Review Modal opens with pre-populated form data
3. User modifies review text, rating, title, or spoilers flag
4. Client-side validation (10-5000 chars, rating 1-10)
5. PUT request to /api/reviews/:id with authentication token
6. Server validates ownership and updates review in Supabase
7. Modal closes, reviews list refreshes, success toast displayed

#### Review Report Flow
1. User clicks report button on any review
2. Report Review Dialog opens with reason dropdown
3. User selects reason (Spam, Offensive Language, Spoilers, Harassment, Other)
4. If "Other" selected, custom reason text input appears
5. POST request to /api/reviews/:id/report with authentication token
6. Server creates report record in Supabase review_reports table
7. Dialog shows confirmation and closes after 2 seconds


## Components and Interfaces

### 1. Database Schema Changes

#### Games Table (CockroachDB)
```sql
-- Migration: Make rating columns nullable
ALTER TABLE games 
  ALTER COLUMN vote_average DROP NOT NULL,
  ALTER COLUMN vote_count DROP NOT NULL;

-- Column definitions after migration
vote_average DECIMAL(3,1) NULL,  -- Changed from NOT NULL
vote_count INTEGER NULL           -- Changed from NOT NULL
```

#### Software Table (CockroachDB)
```sql
-- Migration: Make rating columns nullable
ALTER TABLE software 
  ALTER COLUMN vote_average DROP NOT NULL,
  ALTER COLUMN vote_count DROP NOT NULL;

-- Column definitions after migration
vote_average DECIMAL(3,1) NULL,  -- Changed from NOT NULL
vote_count INTEGER NULL           -- Changed from NOT NULL
```

**Rationale**: Nullable columns allow the system to distinguish between "no rating" (NULL) and "rated as zero" (0), enabling proper neutral rating defaults.

### 2. IGDBAdapter Modifications

#### Interface
```typescript
class IGDBAdapter {
  /**
   * Normalize IGDB game data to Cinema.online format
   * Applies 5.0 default rating for null ratings (but not 0)
   */
  normalizeGameData(game: IGDBGame): NormalizedGame
}
```

#### Implementation Changes
```typescript
// Location: src/adapters/IGDBAdapter.js
normalizeGameData(game) {
  // Calculate vote average (IGDB uses 0-100 scale, we use 0-10)
  let voteAverage = null;
  
  if (game.rating !== null && game.rating !== undefined) {
    voteAverage = (game.rating / 10).toFixed(1);
  } else {
    // Apply 5.0 default for missing ratings (neutral position)
    voteAverage = 5.0;
  }
  
  // Do NOT apply default if rating is explicitly 0
  if (game.rating === 0) {
    voteAverage = 0;
  }
  
  return {
    // ... other fields
    vote_average: voteAverage,
    vote_count: game.rating_count || 0,
    // ... other fields
  };
}
```

### 3. TMDBAdapter Modifications

#### Interface
```typescript
class TMDBAdapter extends BaseAdapter {
  /**
   * Normalize movie data with 5.0 default rating
   */
  _normalizeMovie(ar: TMDBMovie, en: TMDBMovie): NormalizedContent
  
  /**
   * Normalize TV series data with 5.0 default rating
   */
  _normalizeTVSeries(ar: TMDBSeries, en: TMDBSeries): NormalizedContent
}
```

#### Implementation Changes
```typescript
// Location: src/adapters/TMDBAdapter.js

_normalizeMovie(ar, en) {
  // Apply 5.0 default for null ratings
  let voteAverage = ar.vote_average ?? en.vote_average ?? 5.0;
  
  // Do NOT apply default if rating is explicitly 0
  if (ar.vote_average === 0 || en.vote_average === 0) {
    voteAverage = 0;
  }
  
  return {
    // ... other fields
    vote_average: voteAverage,
    vote_count: ar.vote_count || 0,
    // ... other fields
  };
}

_normalizeTVSeries(ar, en) {
  // Apply 5.0 default for null ratings
  let voteAverage = ar.vote_average ?? en.vote_average ?? 5.0;
  
  // Do NOT apply default if rating is explicitly 0
  if (ar.vote_average === 0 || en.vote_average === 0) {
    voteAverage = 0;
  }
  
  return {
    // ... other fields
    vote_average: voteAverage,
    vote_count: ar.vote_count || 0,
    // ... other fields
  };
}
```

### 4. CoreIngestor Fallback Logic

#### Interface
```typescript
class CoreIngestor {
  /**
   * Upsert content with rating fallback
   * Applies 5.0 default if vote_average is still null
   */
  async _executeUpsert(content: NormalizedContent, slug: string, client: PoolClient): Promise<{ id: string }>
}
```

#### Implementation Changes
```typescript
// Location: src/ingestion/CoreIngestor.js

async _upsertMovie(c, s, cl) {
  // Apply fallback 5.0 rating if still null
  const voteAverage = c.vote_average ?? 5.0;
  
  const q = `INSERT INTO movies (..., vote_average, ...) 
             VALUES (..., $14, ...) 
             ON CONFLICT (external_source, external_id) 
             DO UPDATE SET vote_average = EXCLUDED.vote_average, ...`;
  
  const v = [..., voteAverage, ...];
  const r = await cl.query(q, v);
  return { id: r.rows[0].id };
}

// Similar changes for _upsertTVSeries, _upsertGame, _upsertSoftware
```


### 5. API Caching Architecture

#### Cache Configuration
```typescript
// Location: server/routes/home.js, server/routes/content.js

import NodeCache from 'node-cache';

// Cache instance with 5-minute TTL (300 seconds)
const cache = new NodeCache({ 
  stdTTL: 300,           // 5 minutes default TTL
  checkperiod: 60,       // Check for expired keys every 60 seconds
  useClones: false       // Return references for better performance
});
```

#### Cache Key Strategy
```typescript
/**
 * Generate cache key from request parameters
 * Ensures different query parameters produce different cache keys
 */
function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${endpoint}:${sortedParams}`;
}

// Examples:
// /api/home -> "home:"
// /api/movies?page=1&genre=action -> "movies:genre:action|page:1"
// /api/tv?page=2&language=ar -> "tv:language:ar|page:2"
```

#### Cache Middleware Pattern
```typescript
// Location: server/routes/home.js

router.get('/home', async (req, res) => {
  const startTime = Date.now();
  const cacheKey = 'home:aggregated';
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    const responseTime = Date.now() - startTime;
    
    // Add cache metadata
    const response = {
      ...cached,
      _cache: {
        hit: true,
        responseTime,
        ttl: cache.getTtl(cacheKey)
      }
    };
    
    // Log performance warning if cached response is slow
    if (responseTime > 20) {
      console.warn(`[${req.id}] Slow cached response: ${responseTime}ms`);
    }
    
    return res.json(response);
  }
  
  // Cache miss: Query database
  try {
    const data = await fetchHomeData(); // Query CockroachDB
    const responseTime = Date.now() - startTime;
    
    // Store in cache
    cache.set(cacheKey, data);
    
    // Add cache metadata
    const response = {
      ...data,
      _cache: {
        hit: false,
        responseTime,
        ttl: cache.getTtl(cacheKey)
      }
    };
    
    // Log performance warning if first request is slow
    if (responseTime > 50) {
      console.warn(`[${req.id}] Slow first request: ${responseTime}ms`);
    }
    
    res.json(response);
  } catch (error) {
    console.error(`[${req.id}] Error fetching home content:`, error);
    res.status(500).json({ error: 'Failed to fetch home content' });
  }
});
```

#### Cache Invalidation Strategy
```typescript
/**
 * Cache invalidation is handled automatically by TTL expiration (5 minutes)
 * Manual invalidation can be triggered for specific scenarios:
 */

// Invalidate specific cache key
cache.del('home:aggregated');

// Invalidate all movie-related caches
cache.keys().forEach(key => {
  if (key.startsWith('movies:')) {
    cache.del(key);
  }
});

// Clear entire cache (use sparingly)
cache.flushAll();
```


### 6. Edit Review Modal Component

#### Component Interface
```typescript
// Location: src/components/features/reviews/EditReviewModal.tsx

interface EditReviewModalProps {
  review: Review;                    // Existing review data
  isOpen: boolean;                   // Modal visibility state
  onClose: () => void;               // Close handler
  onSuccess: () => void;             // Success callback (refresh list)
}

interface Review {
  id: string;
  external_id: string;
  content_type: 'movie' | 'tv' | 'game' | 'software';
  title?: string;
  review_text: string;
  rating?: number;
  contains_spoilers: boolean;
  language: 'ar' | 'en';
}

export const EditReviewModal: React.FC<EditReviewModalProps>
```

#### Component Structure
```typescript
export const EditReviewModal: React.FC<EditReviewModalProps> = ({
  review,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { lang } = useLang();
  const [formData, setFormData] = useState({
    title: review.title || '',
    review_text: review.review_text,
    rating: review.rating || null,
    contains_spoilers: review.contains_spoilers
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation logic
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.review_text.length < 10) {
      newErrors.review_text = lang === 'ar' 
        ? 'يجب أن تكون المراجعة 10 أحرف على الأقل'
        : 'Review must be at least 10 characters';
    }
    
    if (formData.review_text.length > 5000) {
      newErrors.review_text = lang === 'ar'
        ? 'يجب ألا تتجاوز المراجعة 5000 حرف'
        : 'Review must not exceed 5000 characters';
    }
    
    if (formData.title && formData.title.length > 200) {
      newErrors.title = lang === 'ar'
        ? 'يجب ألا يتجاوز العنوان 200 حرف'
        : 'Title must not exceed 200 characters';
    }
    
    if (formData.rating && (formData.rating < 1 || formData.rating > 10)) {
      newErrors.rating = lang === 'ar'
        ? 'يجب أن يكون التقييم بين 1 و 10'
        : 'Rating must be between 1 and 10';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update review');
      }
      
      toast.success(lang === 'ar' ? 'تم تحديث المراجعة' : 'Review updated');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || (lang === 'ar' ? 'فشل في تحديث المراجعة' : 'Failed to update review'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {lang === 'ar' ? 'تعديل المراجعة' : 'Edit Review'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title field (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {lang === 'ar' ? 'العنوان (اختياري)' : 'Title (optional)'}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800"
              maxLength={200}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>
          
          {/* Review text */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {lang === 'ar' ? 'المراجعة' : 'Review'}
            </label>
            <textarea
              value={formData.review_text}
              onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 min-h-[150px]"
              maxLength={5000}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {formData.review_text.length} / 5000
            </p>
            {errors.review_text && <p className="text-red-500 text-sm mt-1">{errors.review_text}</p>}
          </div>
          
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {lang === 'ar' ? 'التقييم' : 'Rating'}
            </label>
            <RatingInput
              value={formData.rating}
              onChange={(rating) => setFormData({ ...formData, rating })}
              size="md"
              showValue
            />
            {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
          </div>
          
          {/* Spoilers checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="spoilers"
              checked={formData.contains_spoilers}
              onChange={(e) => setFormData({ ...formData, contains_spoilers: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="spoilers" className="text-sm">
              {lang === 'ar' ? 'تحتوي على حرق للأحداث' : 'Contains spoilers'}
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
              disabled={isSubmitting}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-lumen-gold text-black font-bold hover:bg-lumen-gold/90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </span>
              ) : (
                lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```


### 7. Report Review Dialog Component

#### Component Interface
```typescript
// Location: src/components/features/reviews/ReportReviewDialog.tsx

interface ReportReviewDialogProps {
  reviewId: string;                  // Review to report
  isOpen: boolean;                   // Dialog visibility state
  onClose: () => void;               // Close handler
  onSuccess: () => void;             // Success callback
}

interface ReportReason {
  value: string;
  label: { ar: string; en: string };
}

export const ReportReviewDialog: React.FC<ReportReviewDialogProps>
```

#### Component Structure
```typescript
export const ReportReviewDialog: React.FC<ReportReviewDialogProps> = ({
  reviewId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { lang } = useLang();
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const reasons: ReportReason[] = [
    { value: 'spam', label: { ar: 'رسائل مزعجة', en: 'Spam' } },
    { value: 'offensive', label: { ar: 'لغة مسيئة', en: 'Offensive Language' } },
    { value: 'spoilers', label: { ar: 'حرق للأحداث', en: 'Spoilers' } },
    { value: 'harassment', label: { ar: 'تحرش', en: 'Harassment' } },
    { value: 'other', label: { ar: 'أخرى', en: 'Other' } }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error(lang === 'ar' ? 'يرجى اختيار سبب الإبلاغ' : 'Please select a reason');
      return;
    }
    
    if (reason === 'other' && !customReason.trim()) {
      toast.error(lang === 'ar' ? 'يرجى كتابة السبب' : 'Please provide a reason');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({
          reason: reason === 'other' ? customReason : reason
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit report');
      }
      
      setShowSuccess(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onSuccess();
        onClose();
        setShowSuccess(false);
        setReason('');
        setCustomReason('');
      }, 2000);
    } catch (error: any) {
      if (error.message.includes('duplicate')) {
        toast.error(lang === 'ar' ? 'لقد أبلغت عن هذه المراجعة مسبقاً' : 'You have already reported this review');
      } else {
        toast.error(error.message || (lang === 'ar' ? 'فشل في إرسال البلاغ' : 'Failed to submit report'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lang === 'ar' ? 'الإبلاغ عن مراجعة' : 'Report Review'}
          </DialogTitle>
        </DialogHeader>
        
        {showSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">
              {lang === 'ar' ? 'تم إرسال البلاغ بنجاح' : 'Report submitted successfully'}
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              {lang === 'ar' ? 'سيتم مراجعته من قبل الفريق' : 'It will be reviewed by our team'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {lang === 'ar' ? 'سبب الإبلاغ' : 'Reason for reporting'}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800"
                required
              >
                <option value="">
                  {lang === 'ar' ? 'اختر السبب' : 'Select reason'}
                </option>
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {lang === 'ar' ? r.label.ar : r.label.en}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Custom reason text input (shown when "Other" is selected) */}
            {reason === 'other' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {lang === 'ar' ? 'اكتب السبب' : 'Describe the reason'}
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 min-h-[100px]"
                  placeholder={lang === 'ar' ? 'اكتب السبب هنا...' : 'Write your reason here...'}
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {customReason.length} / 500
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                disabled={isSubmitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                  </span>
                ) : (
                  lang === 'ar' ? 'إرسال البلاغ' : 'Submit Report'
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
```


### 8. Integration with Detail Pages

#### Updated Review Handlers
```typescript
// Location: src/pages/media/MovieDetails.tsx (and similar for SeriesDetails, GameDetails, SoftwareDetails)

const [showEditModal, setShowEditModal] = useState(false);
const [editingReview, setEditingReview] = useState<Review | null>(null);
const [showReportDialog, setShowReportDialog] = useState(false);
const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

// Edit handler (replaces TODO comment)
const handleEditReview = (review: Review) => {
  setEditingReview(review);
  setShowEditModal(true);
};

// Report handler (replaces TODO comment)
const handleReportReview = (reviewId: string) => {
  setReportingReviewId(reviewId);
  setShowReportDialog(true);
};

// Success handlers
const handleEditSuccess = () => {
  queryClient.invalidateQueries({ queryKey: ['reviews', currentMovieId] });
  setShowEditModal(false);
  setEditingReview(null);
};

const handleReportSuccess = () => {
  setShowReportDialog(false);
  setReportingReviewId(null);
};

// JSX additions
return (
  <>
    {/* Existing content */}
    
    {/* Reviews List with updated handlers */}
    <ReviewList
      externalId={currentMovieId.toString()}
      contentType="movie"
      currentUserId={user?.id}
      onEditReview={handleEditReview}  // Updated from console.log
      onDeleteReview={handleDeleteReview}
      onLikeReview={handleLikeReview}
      onReportReview={handleReportReview}  // Updated from console.log
    />
    
    {/* Edit Review Modal */}
    {editingReview && (
      <EditReviewModal
        review={editingReview}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
      />
    )}
    
    {/* Report Review Dialog */}
    {reportingReviewId && (
      <ReportReviewDialog
        reviewId={reportingReviewId}
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onSuccess={handleReportSuccess}
      />
    )}
  </>
);
```

#### TODO Comment Removal
All TODO comments in the following files will be removed and replaced with actual implementations:
- `src/pages/media/MovieDetails.tsx`
- `src/pages/media/SeriesDetails.tsx`
- `src/pages/media/GameDetails.tsx`
- `src/pages/media/SoftwareDetails.tsx`

#### Console.log Cleanup
All console.log statements related to edit and report functionality will be removed from the above files.


## Data Models

### Content Rating Model (CockroachDB)

```typescript
interface ContentRating {
  // Common fields across all content types
  id: UUID;
  external_source: 'TMDB' | 'IGDB';
  external_id: string;
  vote_average: number | null;  // Nullable, defaults to 5.0 if null
  vote_count: number | null;     // Nullable
  popularity: number;
  
  // Content-specific fields
  title?: string;                // For movies, games, software
  name?: string;                 // For TV series
  release_date?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

### Review Model (Supabase)

```typescript
interface Review {
  id: UUID;
  user_id: UUID;                 // Foreign key to profiles
  external_id: string;           // Content identifier (from CockroachDB)
  external_source: string;       // 'tmdb' | 'igdb'
  content_type: 'movie' | 'tv' | 'game' | 'software';
  
  // Review content
  title?: string;                // Optional, max 200 chars
  review_text: string;           // Required, 10-5000 chars
  rating?: number;               // Optional, 1-10
  language: 'ar' | 'en';
  contains_spoilers: boolean;
  
  // Metadata
  is_verified: boolean;          // User has watched/played content
  is_hidden: boolean;            // Hidden by moderators
  helpful_count: number;         // Cached count of likes
  edit_count: number;            // Number of edits (max 5)
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

### Review Report Model (Supabase)

```typescript
interface ReviewReport {
  id: UUID;
  review_id: UUID;               // Foreign key to reviews
  reporter_id: UUID;             // Foreign key to profiles
  reason: string;                // 'spam' | 'offensive' | 'spoilers' | 'harassment' | custom text
  status: 'pending' | 'reviewed' | 'dismissed';
  
  // Moderation
  reviewed_by?: UUID;            // Admin who reviewed
  reviewed_at?: Date;
  moderator_notes?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  
  // Constraints
  UNIQUE(review_id, reporter_id) // Prevent duplicate reports
}
```

### Cache Entry Model (node-cache)

```typescript
interface CacheEntry {
  key: string;                   // Generated from endpoint + params
  value: any;                    // Cached response data
  ttl: number;                   // Time-to-live in seconds (300 = 5 minutes)
  
  // Metadata (added to response)
  _cache: {
    hit: boolean;                // true if served from cache
    responseTime: number;        // Response time in milliseconds
    ttl: number;                 // Remaining TTL
  }
}
```

### API Response Models

#### Home API Response
```typescript
interface HomeResponse {
  latest: ContentItem[];
  topRated: ContentItem[];
  popular: ContentItem[];
  meta: {
    deduplication: boolean;
    uniqueItems: number;
    cached: boolean;
  };
  _cache?: CacheMetadata;
}

interface ContentItem {
  id: UUID;
  slug: string;
  title: string;
  poster_url: string;
  vote_average: number;          // Will be 5.0 for unrated content
  release_date: Date;
  content_type: 'movie' | 'tv' | 'game' | 'software';
}
```

#### Movies/TV API Response
```typescript
interface ContentListResponse {
  data: ContentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  _cache?: CacheMetadata;
}

interface CacheMetadata {
  hit: boolean;
  responseTime: number;
  ttl: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Adapter Rating Default for Null Values

*For any* game data fetched by IGDBAdapter with null or undefined rating field, the normalized output SHALL have vote_average equal to 5.0

**Validates: Requirements 1.1**

### Property 2: TMDB Movie Rating Default for Null Values

*For any* movie data fetched by TMDBAdapter with null or undefined vote_average field, the normalized output SHALL have vote_average equal to 5.0

**Validates: Requirements 1.2**

### Property 3: TMDB TV Series Rating Default for Null Values

*For any* TV series data fetched by TMDBAdapter with null or undefined vote_average field, the normalized output SHALL have vote_average equal to 5.0

**Validates: Requirements 1.3**

### Property 4: CoreIngestor Rating Fallback

*For any* content object received by CoreIngestor with null vote_average, the stored content in CockroachDB SHALL have vote_average equal to 5.0

**Validates: Requirements 1.4**

### Property 5: Neutral Rating Position in Sorting

*For any* collection of content sorted by vote_average, content with rating 5.0 SHALL appear between content rated above 5.0 and content rated below 5.0

**Validates: Requirements 1.5**

### Property 6: Database Schema Accepts Null Ratings

*For any* new content insertion with NULL vote_average into games or software tables, CockroachDB SHALL accept the insertion without constraint violation errors

**Validates: Requirements 2.6**

### Property 7: Rating Storage Round Trip

*For any* content with assigned vote_average, writing to CockroachDB then reading back SHALL return the same vote_average value

**Validates: Requirements 3.4**

### Property 8: Cached Response Performance

*For any* API request to /api/home, /api/movies, or /api/tv endpoints that hits cache, the response time SHALL be under 20 milliseconds

**Validates: Requirements 4.2, 4.4, 4.6**

### Property 9: Cache Key Uniqueness

*For any* two different sets of query parameters on the same endpoint, the generated cache keys SHALL be different

**Validates: Requirements 4.8**

### Property 10: Cache Metadata Inclusion

*For any* cached API response, the response object SHALL include _cache metadata with hit, responseTime, and ttl fields

**Validates: Requirements 4.10, 5.4**

### Property 11: Edit Modal Form Pre-population

*For any* review passed to EditReviewModal, the form fields SHALL be pre-populated with the review's title, review_text, rating, and contains_spoilers values

**Validates: Requirements 6.2**

### Property 12: Review Text Length Validation

*For any* review text input in EditReviewModal with length less than 10 or greater than 5000 characters, validation SHALL fail with appropriate error message

**Validates: Requirements 6.3, 6.4**

### Property 13: Rating Value Validation

*For any* rating input in EditReviewModal with value less than 1, greater than 10, or non-integer, validation SHALL fail with appropriate error message

**Validates: Requirements 6.5**

### Property 14: Edit Request API Integration

*For any* valid review submission from EditReviewModal, a PUT request SHALL be sent to /api/reviews/:id endpoint with authentication token

**Validates: Requirements 6.6**

### Property 15: Edit Modal Error Handling

*For any* failed PUT request from EditReviewModal, an error message SHALL be displayed to the user

**Validates: Requirements 6.9**

### Property 16: Title Field Length Validation

*For any* title input in EditReviewModal with length greater than 200 characters, validation SHALL fail with appropriate error message

**Validates: Requirements 6.10**

### Property 17: Edit Button Authorization

*For any* review displayed in ReviewList, the edit button SHALL be visible if and only if the review's user_id matches the current user's id

**Validates: Requirements 6.13**

### Property 18: Report Reason Validation

*For any* report submission from ReportReviewDialog without a selected reason, validation SHALL fail with appropriate error message

**Validates: Requirements 7.5**

### Property 19: Report Request API Integration

*For any* valid report submission from ReportReviewDialog, a POST request SHALL be sent to /api/reviews/:id/report endpoint with authentication token

**Validates: Requirements 7.6**

### Property 20: Report Dialog Error Handling

*For any* failed POST request from ReportReviewDialog, an error message SHALL be displayed to the user

**Validates: Requirements 7.9**

### Property 21: Duplicate Report Prevention

*For any* user-review pair, only one report SHALL be allowed (subsequent attempts SHALL be rejected with duplicate error)

**Validates: Requirements 7.10**

### Property 22: Review Update Round Trip

*For any* valid review update via PUT /api/reviews/:id, reading the review back from Supabase SHALL return the updated values

**Validates: Requirements 10.3**

### Property 23: Review Update Authorization

*For any* PUT request to /api/reviews/:id from a user who is not the review owner, the API SHALL return 403 Forbidden status

**Validates: Requirements 10.4**

### Property 24: Report Creation Round Trip

*For any* valid report submission via POST /api/reviews/:id/report, querying review_reports table SHALL return the created report record

**Validates: Requirements 10.5**

### Property 25: API Authentication Validation

*For any* request to PUT /api/reviews/:id or POST /api/reviews/:id/report without valid authentication token, the API SHALL return 401 Unauthorized status

**Validates: Requirements 10.6**

### Property 26: API Error Message Format

*For any* validation failure on review or report endpoints, the API SHALL return a JSON response with an "error" field containing a descriptive message

**Validates: Requirements 10.7**

### Property 27: Cache Performance Threshold

*For any* second request to /api/home, /api/movies, or /api/tv within cache TTL, the response time SHALL be under 20 milliseconds

**Validates: Requirements 13.3**


## Error Handling

### Adapter Error Handling

#### IGDBAdapter
```typescript
normalizeGameData(game) {
  try {
    // Rating normalization with fallback
    let voteAverage = null;
    
    if (game.rating !== null && game.rating !== undefined) {
      voteAverage = (game.rating / 10).toFixed(1);
    } else {
      voteAverage = 5.0; // Neutral default
    }
    
    // Explicit 0 handling
    if (game.rating === 0) {
      voteAverage = 0;
    }
    
    return {
      vote_average: voteAverage,
      vote_count: game.rating_count || 0,
      // ... other fields with safe defaults
    };
  } catch (error) {
    console.error('Error normalizing game data:', error);
    // Return minimal valid object with 5.0 default
    return {
      vote_average: 5.0,
      vote_count: 0,
      // ... minimal required fields
    };
  }
}
```

#### TMDBAdapter
```typescript
_normalizeMovie(ar, en) {
  try {
    // Nullish coalescing with 5.0 default
    let voteAverage = ar.vote_average ?? en.vote_average ?? 5.0;
    
    // Explicit 0 handling
    if (ar.vote_average === 0 || en.vote_average === 0) {
      voteAverage = 0;
    }
    
    return {
      vote_average: voteAverage,
      vote_count: ar.vote_count || 0,
      // ... other fields
    };
  } catch (error) {
    console.error('Error normalizing movie data:', error);
    throw new Error(`Failed to normalize movie: ${error.message}`);
  }
}
```

### API Error Handling

#### Cache Error Handling
```typescript
router.get('/home', async (req, res) => {
  const startTime = Date.now();
  const cacheKey = 'home:aggregated';
  
  try {
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        _cache: { hit: true, responseTime: Date.now() - startTime }
      });
    }
    
    // Cache miss: Query database
    const data = await fetchHomeData();
    
    // Store in cache (with error handling)
    try {
      cache.set(cacheKey, data);
    } catch (cacheError) {
      console.error(`[${req.id}] Cache storage error:`, cacheError);
      // Continue without caching - don't fail the request
    }
    
    res.json({
      ...data,
      _cache: { hit: false, responseTime: Date.now() - startTime }
    });
  } catch (error) {
    console.error(`[${req.id}] Error fetching home content:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch home content',
      message: error.message 
    });
  }
});
```

#### Review API Error Handling
```typescript
// PUT /api/reviews/:id
router.put('/reviews/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Fetch existing review
    const { data: existing, error: fetchError } = await supabase
      .from('reviews')
      .select('user_id, edit_count')
      .eq('id', id)
      .single();
    
    if (fetchError || !existing) {
      return res.status(404).json({ 
        error: 'Review not found',
        code: 'REVIEW_NOT_FOUND'
      });
    }
    
    // Verify ownership
    if (existing.user_id !== userId) {
      return res.status(403).json({ 
        error: 'You can only edit your own reviews',
        code: 'FORBIDDEN'
      });
    }
    
    // Check edit limit
    if (existing.edit_count >= 5) {
      return res.status(400).json({ 
        error: 'Maximum 5 edits allowed per review',
        code: 'EDIT_LIMIT_REACHED'
      });
    }
    
    // Validate input
    const { review_text, title, rating, contains_spoilers } = req.body;
    
    if (review_text && (review_text.length < 10 || review_text.length > 5000)) {
      return res.status(400).json({ 
        error: 'Review text must be between 10 and 5000 characters',
        code: 'INVALID_LENGTH'
      });
    }
    
    if (title && title.length > 200) {
      return res.status(400).json({ 
        error: 'Title must not exceed 200 characters',
        code: 'INVALID_LENGTH'
      });
    }
    
    if (rating && (rating < 1 || rating > 10 || !Number.isInteger(rating))) {
      return res.status(400).json({ 
        error: 'Rating must be an integer between 1 and 10',
        code: 'INVALID_RATING'
      });
    }
    
    // Update review
    const { data, error } = await supabase
      .from('reviews')
      .update({
        review_text,
        title,
        rating,
        contains_spoilers,
        edit_count: existing.edit_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`[${req.id}] Review update error:`, error);
      return res.status(500).json({ 
        error: 'Failed to update review',
        code: 'UPDATE_FAILED'
      });
    }
    
    res.json({ success: true, review: data });
  } catch (error) {
    console.error(`[${req.id}] Unexpected error:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/reviews/:id/report
router.post('/reviews/:id/report', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    
    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Reason is required',
        code: 'MISSING_REASON'
      });
    }
    
    // Check for duplicate report
    const { data: existing } = await supabase
      .from('review_reports')
      .select('id')
      .eq('review_id', id)
      .eq('reporter_id', userId)
      .maybeSingle();
    
    if (existing) {
      return res.status(409).json({ 
        error: 'You have already reported this review',
        code: 'DUPLICATE_REPORT'
      });
    }
    
    // Create report
    const { data, error } = await supabase
      .from('review_reports')
      .insert({
        review_id: id,
        reporter_id: userId,
        reason: reason.trim(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error(`[${req.id}] Report creation error:`, error);
      return res.status(500).json({ 
        error: 'Failed to submit report',
        code: 'REPORT_FAILED'
      });
    }
    
    res.status(201).json({ success: true, report: data });
  } catch (error) {
    console.error(`[${req.id}] Unexpected error:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

### Frontend Error Handling

#### Edit Review Modal
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validate()) return;
  
  setIsSubmitting(true);
  
  try {
    const response = await fetch(`${apiBase}/api/reviews/${review.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.id}`
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error codes
      switch (error.code) {
        case 'REVIEW_NOT_FOUND':
          throw new Error(lang === 'ar' ? 'المراجعة غير موجودة' : 'Review not found');
        case 'FORBIDDEN':
          throw new Error(lang === 'ar' ? 'لا يمكنك تعديل مراجعة شخص آخر' : 'Cannot edit another user\'s review');
        case 'EDIT_LIMIT_REACHED':
          throw new Error(lang === 'ar' ? 'وصلت للحد الأقصى من التعديلات (5)' : 'Maximum edit limit reached (5)');
        case 'INVALID_LENGTH':
          throw new Error(error.error);
        case 'INVALID_RATING':
          throw new Error(error.error);
        default:
          throw new Error(error.error || 'Failed to update review');
      }
    }
    
    toast.success(lang === 'ar' ? 'تم تحديث المراجعة' : 'Review updated');
    onSuccess();
    onClose();
  } catch (error: any) {
    toast.error(error.message || (lang === 'ar' ? 'فشل في تحديث المراجعة' : 'Failed to update review'));
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Report Review Dialog
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!reason) {
    toast.error(lang === 'ar' ? 'يرجى اختيار سبب الإبلاغ' : 'Please select a reason');
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const response = await fetch(`${apiBase}/api/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.id}`
      },
      body: JSON.stringify({
        reason: reason === 'other' ? customReason : reason
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific error codes
      if (error.code === 'DUPLICATE_REPORT') {
        throw new Error(lang === 'ar' ? 'لقد أبلغت عن هذه المراجعة مسبقاً' : 'You have already reported this review');
      }
      
      throw new Error(error.error || 'Failed to submit report');
    }
    
    setShowSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  } catch (error: any) {
    toast.error(error.message || (lang === 'ar' ? 'فشل في إرسال البلاغ' : 'Failed to submit report'));
  } finally {
    setIsSubmitting(false);
  }
};
```

### Database Error Handling

#### Migration Error Handling
```sql
-- Migration script with error handling
DO $$
BEGIN
  -- Make vote_average nullable in games table
  BEGIN
    ALTER TABLE games ALTER COLUMN vote_average DROP NOT NULL;
    RAISE NOTICE 'Successfully made games.vote_average nullable';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to alter games.vote_average: %', SQLERRM;
  END;
  
  -- Make vote_count nullable in games table
  BEGIN
    ALTER TABLE games ALTER COLUMN vote_count DROP NOT NULL;
    RAISE NOTICE 'Successfully made games.vote_count nullable';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to alter games.vote_count: %', SQLERRM;
  END;
  
  -- Make vote_average nullable in software table
  BEGIN
    ALTER TABLE software ALTER COLUMN vote_average DROP NOT NULL;
    RAISE NOTICE 'Successfully made software.vote_average nullable';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to alter software.vote_average: %', SQLERRM;
  END;
  
  -- Make vote_count nullable in software table
  BEGIN
    ALTER TABLE software ALTER COLUMN vote_count DROP NOT NULL;
    RAISE NOTICE 'Successfully made software.vote_count nullable';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to alter software.vote_count: %', SQLERRM;
  END;
END $$;
```


## Testing Strategy

### Dual Testing Approach

This feature requires both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs through randomization

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Configuration**:
```typescript
import fc from 'fast-check';

// Minimum 100 iterations per property test
const propertyConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now() // For reproducibility
};
```

**Test Tagging**: Each property test must reference its design document property
```typescript
describe('Feature: production-perfection-protocol', () => {
  it('Property 1: Adapter Rating Default for Null Values', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer(),
          name: fc.string(),
          rating: fc.constantFrom(null, undefined)
        }),
        (game) => {
          const normalized = adapter.normalizeGameData(game);
          return normalized.vote_average === 5.0;
        }
      ),
      propertyConfig
    );
  });
});
```

### Unit Testing Strategy

#### Adapter Tests

**IGDBAdapter Rating Default Tests**
```typescript
describe('IGDBAdapter', () => {
  describe('normalizeGameData', () => {
    it('should assign 5.0 rating for null rating', () => {
      const game = { id: 1942, name: 'The Witcher 3', rating: null };
      const result = adapter.normalizeGameData(game);
      expect(result.vote_average).toBe(5.0);
    });
    
    it('should assign 5.0 rating for undefined rating', () => {
      const game = { id: 1942, name: 'The Witcher 3' };
      const result = adapter.normalizeGameData(game);
      expect(result.vote_average).toBe(5.0);
    });
    
    it('should NOT assign 5.0 rating for explicit 0', () => {
      const game = { id: 1942, name: 'The Witcher 3', rating: 0 };
      const result = adapter.normalizeGameData(game);
      expect(result.vote_average).toBe(0);
    });
    
    it('should preserve non-null ratings', () => {
      const game = { id: 1942, name: 'The Witcher 3', rating: 85 };
      const result = adapter.normalizeGameData(game);
      expect(result.vote_average).toBe(8.5);
    });
  });
});
```

**TMDBAdapter Rating Default Tests**
```typescript
describe('TMDBAdapter', () => {
  describe('_normalizeMovie', () => {
    it('should assign 5.0 rating when both ar and en are null', () => {
      const ar = { id: 550, title: 'Fight Club', vote_average: null };
      const en = { id: 550, title: 'Fight Club', vote_average: null };
      const result = adapter._normalizeMovie(ar, en);
      expect(result.vote_average).toBe(5.0);
    });
    
    it('should use ar rating if available', () => {
      const ar = { id: 550, title: 'Fight Club', vote_average: 8.5 };
      const en = { id: 550, title: 'Fight Club', vote_average: null };
      const result = adapter._normalizeMovie(ar, en);
      expect(result.vote_average).toBe(8.5);
    });
    
    it('should fallback to en rating if ar is null', () => {
      const ar = { id: 550, title: 'Fight Club', vote_average: null };
      const en = { id: 550, title: 'Fight Club', vote_average: 8.5 };
      const result = adapter._normalizeMovie(ar, en);
      expect(result.vote_average).toBe(8.5);
    });
    
    it('should NOT assign 5.0 for explicit 0', () => {
      const ar = { id: 550, title: 'Fight Club', vote_average: 0 };
      const en = { id: 550, title: 'Fight Club', vote_average: null };
      const result = adapter._normalizeMovie(ar, en);
      expect(result.vote_average).toBe(0);
    });
  });
});
```

#### API Cache Tests

**Cache Performance Tests**
```typescript
describe('API Caching', () => {
  describe('GET /api/home', () => {
    it('should cache response on first request', async () => {
      const response = await request(app).get('/api/home');
      expect(response.body._cache.hit).toBe(false);
      expect(response.body._cache.responseTime).toBeLessThan(100);
    });
    
    it('should return cached response in under 20ms', async () => {
      // First request to populate cache
      await request(app).get('/api/home');
      
      // Second request should hit cache
      const start = Date.now();
      const response = await request(app).get('/api/home');
      const duration = Date.now() - start;
      
      expect(response.body._cache.hit).toBe(true);
      expect(duration).toBeLessThan(20);
    });
    
    it('should include cache metadata in response', async () => {
      const response = await request(app).get('/api/home');
      expect(response.body._cache).toHaveProperty('hit');
      expect(response.body._cache).toHaveProperty('responseTime');
      expect(response.body._cache).toHaveProperty('ttl');
    });
  });
  
  describe('Cache key generation', () => {
    it('should generate different keys for different query params', () => {
      const key1 = generateCacheKey('movies', { page: 1, genre: 'action' });
      const key2 = generateCacheKey('movies', { page: 2, genre: 'action' });
      const key3 = generateCacheKey('movies', { page: 1, genre: 'comedy' });
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
    
    it('should generate same key for same params in different order', () => {
      const key1 = generateCacheKey('movies', { page: 1, genre: 'action' });
      const key2 = generateCacheKey('movies', { genre: 'action', page: 1 });
      
      expect(key1).toBe(key2);
    });
  });
});
```

#### Component Tests

**Edit Review Modal Tests**
```typescript
describe('EditReviewModal', () => {
  const mockReview = {
    id: '123',
    external_id: '550',
    content_type: 'movie',
    title: 'Great movie',
    review_text: 'This is a great movie with excellent acting.',
    rating: 9,
    contains_spoilers: false,
    language: 'en'
  };
  
  it('should pre-populate form with review data', () => {
    render(<EditReviewModal review={mockReview} isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    expect(screen.getByDisplayValue('Great movie')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a great movie with excellent acting.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9')).toBeInTheDocument();
  });
  
  it('should validate minimum review text length', async () => {
    render(<EditReviewModal review={mockReview} isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const textarea = screen.getByRole('textbox', { name: /review/i });
    fireEvent.change(textarea, { target: { value: 'Short' } });
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });
  
  it('should validate maximum review text length', async () => {
    render(<EditReviewModal review={mockReview} isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const textarea = screen.getByRole('textbox', { name: /review/i });
    const longText = 'a'.repeat(5001);
    fireEvent.change(textarea, { target: { value: longText } });
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/must not exceed 5000 characters/i)).toBeInTheDocument();
    });
  });
  
  it('should validate rating range', async () => {
    render(<EditReviewModal review={mockReview} isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const ratingInput = screen.getByRole('spinbutton', { name: /rating/i });
    fireEvent.change(ratingInput, { target: { value: '11' } });
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/between 1 and 10/i)).toBeInTheDocument();
    });
  });
  
  it('should send PUT request on valid submission', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = mockFetch;
    
    const onSuccess = jest.fn();
    render(<EditReviewModal review={mockReview} isOpen={true} onClose={jest.fn()} onSuccess={onSuccess} />);
    
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reviews/123'),
        expect.objectContaining({ method: 'PUT' })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

**Report Review Dialog Tests**
```typescript
describe('ReportReviewDialog', () => {
  it('should display reason dropdown', () => {
    render(<ReportReviewDialog reviewId="123" isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    expect(screen.getByRole('combobox', { name: /reason/i })).toBeInTheDocument();
  });
  
  it('should show custom reason input when "Other" is selected', () => {
    render(<ReportReviewDialog reviewId="123" isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const dropdown = screen.getByRole('combobox', { name: /reason/i });
    fireEvent.change(dropdown, { target: { value: 'other' } });
    
    expect(screen.getByRole('textbox', { name: /describe/i })).toBeInTheDocument();
  });
  
  it('should validate reason selection', async () => {
    render(<ReportReviewDialog reviewId="123" isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/select a reason/i)).toBeInTheDocument();
    });
  });
  
  it('should send POST request on valid submission', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = mockFetch;
    
    render(<ReportReviewDialog reviewId="123" isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);
    
    const dropdown = screen.getByRole('combobox', { name: /reason/i });
    fireEvent.change(dropdown, { target: { value: 'spam' } });
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reviews/123/report'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
  
  it('should show success message and auto-close', async () => {
    jest.useFakeTimers();
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = mockFetch;
    
    const onClose = jest.fn();
    render(<ReportReviewDialog reviewId="123" isOpen={true} onClose={onClose} onSuccess={jest.fn()} />);
    
    const dropdown = screen.getByRole('combobox', { name: /reason/i });
    fireEvent.change(dropdown, { target: { value: 'spam' } });
    
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
    });
    
    jest.advanceTimersByTime(2000);
    
    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
```

### Integration Testing

**Cache Performance Integration Test**
```typescript
describe('Cache Performance Integration', () => {
  it('should achieve sub-20ms response for cached /api/home', async () => {
    // First request to populate cache
    await request(app).get('/api/home');
    
    // Measure 10 cached requests
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await request(app).get('/api/home');
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    expect(avgTime).toBeLessThan(20);
  });
  
  it('should achieve sub-50ms response for first /api/home request', async () => {
    // Clear cache
    cache.flushAll();
    
    const start = Date.now();
    await request(app).get('/api/home');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
  });
});
```

### Test Coverage Goals

- **Adapter Logic**: 100% coverage of rating default logic
- **API Caching**: 90% coverage of cache middleware and key generation
- **Component Logic**: 85% coverage of validation and submission logic
- **Error Handling**: 80% coverage of error paths
- **Property Tests**: Minimum 100 iterations per property

