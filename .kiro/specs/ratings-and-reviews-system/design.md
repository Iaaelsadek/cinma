# Design Document: Ratings and Reviews System

## Overview

This design document specifies the technical approach for implementing a comprehensive ratings and reviews system for Cinema.online. The system enables users to rate content (movies, TV series, games, software) on a 1-10 scale and write detailed bilingual reviews (Arabic/English) with social interactions (likes, helpful votes) and moderation capabilities.

### Problem Statement

Cinema.online currently lacks a native ratings and reviews system. Users cannot express their opinions about content, and there's no way to aggregate community ratings to help users make informed viewing decisions. The platform needs a robust review system that:

- Allows users to rate content on a 1-10 scale
- Supports detailed text reviews with optional titles
- Enables bilingual reviews (Arabic and English)
- Provides social interactions (helpful votes)
- Integrates with the existing activity feed
- Maintains data integrity using external_id bridge pattern
- Prevents spam through rate limiting
- Supports moderation and content reporting

### Solution Approach

Implement a complete ratings and reviews system following the established architectural pattern: **Supabase = Auth & User Data ONLY**, **CockroachDB = ALL Content**. Reviews and ratings are user data stored in Supabase, while content metadata remains in CockroachDB. The bridge between databases uses `external_id` (TMDB ID) as established in the watchlist-external-id-migration spec.

### Architectural Principles

**Database Separation:**
- **Supabase**: User-generated content (ratings, reviews, review_likes, review_reports, review_drafts)
- **CockroachDB**: Content metadata (movies, tv_series, games, software)
- **Bridge**: external_id (TMDB ID) serves as the foreign key equivalent across databases

**No Cross-Database Foreign Keys:**
- Cannot enforce referential integrity across Supabase and CockroachDB
- Application layer responsible for maintaining data consistency
- Graceful degradation when content is missing (show placeholders)

**Rate Limiting:**
- In-memory rate limiting for review submissions (10/hour)
- In-memory rate limiting for rating submissions (50/hour)
- Prevents spam and rating manipulation

**Caching Strategy:**
- Aggregate ratings cached for 5 minutes
- Cache invalidation on new rating submission
- Reduces database load for frequently accessed content


## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│     (React Components: ReviewForm, ReviewList, RatingInput)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Uses external_id (TMDB ID)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Supabase Client Layer                        │
│              (src/lib/supabase.ts functions)                    │
│                                                                  │
│  • submitRating(userId, external_id, rating_value)             │
│  • submitReview(userId, external_id, review_text, ...)         │
│  • getReviews(external_id, content_type) → [Review, ...]       │
│  • likeReview(userId, review_id)                               │
│  • getAggregateRating(external_id, content_type)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Stores external_id
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Supabase Database                          │
│                    (User Data Tables)                           │
│                                                                  │
│  • ratings (user_id, external_id, rating_value, ...)           │
│  • reviews (user_id, external_id, review_text, ...)            │
│  • review_likes (review_id, user_id, ...)                      │
│  • review_reports (review_id, reporter_user_id, ...)           │
│  • review_drafts (user_id, external_id, draft_text, ...)       │
│  • review_views (review_id, user_id, ...)                      │
└─────────────────────────────────────────────────────────────────┘

                         ║
                         ║ Bridge via external_id (TMDB ID)
                         ║
┌────────────────────────▼────────────────────────────────────────┐
│                   Backend API Layer                             │
│              (Express.js server routes)                         │
│                                                                  │
│  • GET /api/reviews?external_id=550&content_type=movie         │
│  • POST /api/reviews (create review)                           │
│  • PUT /api/reviews/:id (update review)                        │
│  • DELETE /api/reviews/:id (delete review)                     │
│  • POST /api/ratings (create/update rating)                    │
│  • GET /api/ratings/aggregate (get aggregate ratings)          │
│  • POST /api/ratings/aggregate/batch (batch aggregate)         │
│  • POST /api/reviews/:id/like (toggle helpful vote)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Queries by external_id for content details
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   CockroachDB Database                          │
│                   (Content Tables)                              │
│                                                                  │
│  • movies (id UUID, external_source, external_id, ...)         │
│  • tv_series (id UUID, external_source, external_id, ...)      │
│  • games (id UUID, external_source, external_id, ...)          │
│  • software (id UUID, external_source, external_id, ...)       │
│                                                                  │
│  Constraint: UNIQUE (external_source, external_id)             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Submitting a Rating:**
```
1. User clicks rating stars on Movie Details page
2. Frontend extracts TMDB ID from movie data (e.g., "550")
3. Frontend calls: submitRating(userId, "550", "movie", 8)
4. Supabase upserts: {user_id, external_id: "550", external_source: "tmdb", content_type: "movie", rating_value: 8}
5. Backend invalidates aggregate rating cache for external_id "550"
6. Success response returned to frontend
```

**Submitting a Review:**
```
1. User writes review in ReviewForm component
2. User selects language (Arabic/English) and optional rating
3. Frontend calls: submitReview(userId, "550", "movie", reviewText, title, rating, language)
4. Backend validates: review_text length (10-5000 chars), rate limit check
5. Supabase inserts: {user_id, external_id: "550", review_text, title, rating, language, ...}
6. Backend creates activity_feed entry with type 'review'
7. Backend deletes review draft if exists
8. Success response returned to frontend
```

**Displaying Reviews:**
```
1. User navigates to Movie Details page
2. Frontend calls: getReviews("550", "movie", {sort: "most_helpful", limit: 20})
3. Supabase returns: [{review_id, user_id, review_text, rating, helpful_count, ...}, ...]
4. Frontend fetches reviewer profiles from Supabase
5. Frontend calls: POST /api/content/batch with [{external_id: "550", content_type: "movie"}]
6. Backend returns content details from CockroachDB
7. Frontend renders reviews with full context
```

**Displaying Aggregate Ratings:**
```
1. Frontend renders content cards (e.g., Movies page)
2. Frontend collects all unique external_ids from visible cards
3. Frontend calls: POST /api/ratings/aggregate/batch with [{external_id: "550", content_type: "movie"}, ...]
4. Backend checks cache for each external_id
5. For cache misses, backend queries Supabase ratings table and calculates average
6. Backend caches results for 5 minutes
7. Backend returns: [{external_id: "550", average_rating: 7.8, rating_count: 1234}, ...]
8. Frontend displays ratings on cards (e.g., "7.8/10 (1.2K ratings)")
```

**Handling Missing Content:**
```
1. If CockroachDB query returns null for an external_id
2. Backend includes null in response array at that position
3. Frontend detects null and displays placeholder:
   - Title: "Content Unavailable"
   - Poster: Default placeholder image
   - Reviews still visible with "Remove" button functional
```


## Components and Interfaces

### Supabase Schema Changes

#### Ratings Table

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv', 'game', 'software')),
  rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_ratings_user_content UNIQUE (user_id, external_id, content_type)
);

CREATE INDEX idx_ratings_user ON ratings(user_id, created_at DESC);
CREATE INDEX idx_ratings_external ON ratings(external_id, content_type);
CREATE INDEX idx_ratings_aggregate ON ratings(external_id, content_type, rating_value);
```

**Purpose:** Store individual user ratings for content

**Key Fields:**
- `external_id`: TMDB ID as TEXT (e.g., "550")
- `external_source`: Always 'tmdb' for movies/tv
- `content_type`: 'movie', 'tv', 'game', or 'software'
- `rating_value`: Integer 1-10 (inclusive)
- `updated_at`: Tracks when rating was last changed

**Constraints:**
- Unique constraint ensures one rating per user per content
- Check constraint enforces 1-10 rating range
- Cascade delete when user is deleted

#### Reviews Table

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv', 'game', 'software')),
  title TEXT CHECK (LENGTH(title) <= 200),
  review_text TEXT NOT NULL CHECK (LENGTH(review_text) >= 10 AND LENGTH(review_text) <= 5000),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  language TEXT NOT NULL CHECK (language IN ('ar', 'en')),
  contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  edit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_reviews_user_content UNIQUE (user_id, external_id, content_type)
);

CREATE INDEX idx_reviews_external ON reviews(external_id, content_type, created_at DESC);
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC);
CREATE INDEX idx_reviews_language ON reviews(language, created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC, created_at DESC);
CREATE INDEX idx_reviews_hidden ON reviews(is_hidden, created_at DESC);
```

**Purpose:** Store user-written reviews with optional ratings

**Key Fields:**
- `title`: Optional review title (max 200 chars)
- `review_text`: Required review body (10-5000 chars)
- `rating`: Optional rating (1-10), can be null
- `language`: 'ar' (Arabic) or 'en' (English)
- `contains_spoilers`: Flag for spoiler warnings
- `is_hidden`: Moderation flag (hidden reviews excluded from queries)
- `is_verified`: Badge for users who watched content (checked against history table)
- `edit_count`: Tracks number of edits (max 5 allowed)

**Constraints:**
- Unique constraint ensures one review per user per content
- Check constraints enforce text length limits
- Rating is optional (can be null)

#### Review Likes Table

```sql
CREATE TABLE review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_review_likes UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_likes_review ON review_likes(review_id);
CREATE INDEX idx_review_likes_user ON review_likes(user_id, created_at DESC);
```

**Purpose:** Track "helpful" votes on reviews

**Key Fields:**
- `review_id`: Reference to review
- `user_id`: User who found review helpful

**Constraints:**
- Unique constraint prevents duplicate likes
- Cascade delete when review or user is deleted

#### Review Reports Table

```sql
CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (LENGTH(reason) >= 10 AND LENGTH(reason) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT uq_review_reports UNIQUE (review_id, reporter_user_id)
);

CREATE INDEX idx_review_reports_status ON review_reports(status, created_at DESC);
CREATE INDEX idx_review_reports_review ON review_reports(review_id);
```

**Purpose:** Track user reports of inappropriate reviews

**Key Fields:**
- `reason`: User-provided reason for report (10-500 chars)
- `status`: 'pending', 'reviewed', or 'dismissed'
- `reviewed_by`: Moderator who reviewed the report

**Constraints:**
- Unique constraint prevents duplicate reports from same user
- Cascade delete when review or reporter is deleted

#### Review Drafts Table

```sql
CREATE TABLE review_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  external_source TEXT NOT NULL DEFAULT 'tmdb',
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'tv', 'game', 'software')),
  title TEXT,
  review_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  language TEXT CHECK (language IN ('ar', 'en')),
  contains_spoilers BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_review_drafts UNIQUE (user_id, external_id, content_type)
);

CREATE INDEX idx_review_drafts_user ON review_drafts(user_id, updated_at DESC);
```

**Purpose:** Auto-save review drafts while user is typing

**Key Fields:**
- All fields optional except user_id, external_id, content_type
- `updated_at`: Tracks last auto-save time

**Constraints:**
- Unique constraint ensures one draft per user per content
- Deleted when review is published

#### Review Views Table

```sql
CREATE TABLE review_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_views_review ON review_views(review_id);
CREATE INDEX idx_review_views_user ON review_views(user_id, viewed_at DESC);
```

**Purpose:** Track review views for calculating helpful percentage

**Key Fields:**
- `review_id`: Review that was viewed
- `user_id`: User who viewed (nullable for anonymous views)

**Notes:**
- Used to calculate: helpful_percentage = (helpful_votes / total_views) * 100
- Only displayed when review has >= 10 views


### TypeScript Interfaces

#### Supabase Function Signatures (src/lib/supabase.ts)

```typescript
// Rating Functions
export async function submitRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software',
  ratingValue: number
): Promise<void>

export async function getUserRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<{ rating_value: number; created_at: string } | null>

export async function deleteRating(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<void>

// Review Functions
export async function submitReview(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  reviewText: string
  title?: string
  rating?: number
  language: 'ar' | 'en'
  containsSpoilers?: boolean
}): Promise<{ id: string }>

export async function updateReview(
  reviewId: string,
  userId: string,
  updates: {
    reviewText?: string
    title?: string
    rating?: number
    containsSpoilers?: boolean
  }
): Promise<void>

export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<void>

export async function getReviews(
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software',
  options?: {
    sort?: 'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating'
    language?: 'ar' | 'en' | 'all'
    ratingFilter?: 'all' | 'positive' | 'mixed' | 'negative'
    limit?: number
    offset?: number
  }
): Promise<Array<Review>>

export async function getUserReview(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<Review | null>

export async function searchReviews(
  query: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<Array<Review>>

// Review Like Functions
export async function likeReview(
  reviewId: string,
  userId: string
): Promise<{ liked: boolean; likeCount: number }>

export async function getReviewLikeStatus(
  reviewId: string,
  userId: string
): Promise<boolean>

export async function getReviewLikeCount(
  reviewId: string
): Promise<number>

// Review Report Functions
export async function reportReview(
  reviewId: string,
  reporterUserId: string,
  reason: string
): Promise<void>

// Review Draft Functions
export async function saveReviewDraft(args: {
  userId: string
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  title?: string
  reviewText?: string
  rating?: number
  language?: 'ar' | 'en'
  containsSpoilers?: boolean
}): Promise<void>

export async function getReviewDraft(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<ReviewDraft | null>

export async function deleteReviewDraft(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv' | 'game' | 'software'
): Promise<void>

// Review View Tracking
export async function trackReviewView(
  reviewId: string,
  userId: string | null
): Promise<void>

export async function getReviewViewCount(
  reviewId: string
): Promise<number>

// User Review Statistics
export async function getUserReviewStats(
  userId: string
): Promise<{
  totalReviews: number
  totalHelpfulVotes: number
  averageRating: number
}>

// Type Definitions
export type Review = {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  title: string | null
  review_text: string
  rating: number | null
  language: 'ar' | 'en'
  contains_spoilers: boolean
  is_hidden: boolean
  is_verified: boolean
  edit_count: number
  created_at: string
  updated_at: string
  user?: Profile
  helpful_count?: number
  is_liked?: boolean
  view_count?: number
  helpful_percentage?: number
}

export type ReviewDraft = {
  id: string
  user_id: string
  external_id: string
  external_source: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  title: string | null
  review_text: string | null
  rating: number | null
  language: 'ar' | 'en' | null
  contains_spoilers: boolean
  updated_at: string
}
```


### Backend API Endpoints

#### POST /api/ratings

**Purpose:** Create or update a user's rating for content

**Request Body:**
```typescript
{
  external_id: string      // e.g., "550"
  content_type: 'movie' | 'tv' | 'game' | 'software'
  rating_value: number     // 1-10 inclusive
  external_source?: string // default: 'tmdb'
}
```

**Response:**
```typescript
{
  success: true,
  rating: {
    id: string
    rating_value: number
    created_at: string
    updated_at: string
  }
}
```

**Implementation (server/routes/reviews.js):**
```javascript
router.post('/ratings', authenticateUser, rateLimitRatings, async (req, res) => {
  const { external_id, content_type, rating_value, external_source = 'tmdb' } = req.body
  const userId = req.user.id
  
  // Validate inputs
  if (!external_id || !content_type || !rating_value) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  
  if (rating_value < 1 || rating_value > 10 || !Number.isInteger(rating_value)) {
    return res.status(400).json({ error: 'Rating must be integer between 1 and 10' })
  }
  
  if (!['movie', 'tv', 'game', 'software'].includes(content_type)) {
    return res.status(400).json({ error: 'Invalid content_type' })
  }
  
  try {
    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id: userId,
        external_id,
        external_source,
        content_type,
        rating_value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,external_id,content_type' })
      .select()
      .single()
    
    if (error) throw error
    
    // Invalidate aggregate rating cache
    cache.del(`aggregate_rating:${external_id}:${content_type}`)
    
    res.json({ success: true, rating: data })
  } catch (error) {
    console.error(`[${req.id}] Error submitting rating:`, error)
    res.status(500).json({ error: 'Failed to submit rating' })
  }
})
```

#### DELETE /api/ratings

**Purpose:** Delete a user's rating

**Query Parameters:**
- `external_id`: Content external ID
- `content_type`: Content type

**Response:**
```typescript
{ success: true }
```

#### GET /api/ratings/user

**Purpose:** Get user's rating for specific content

**Query Parameters:**
- `external_id`: Content external ID
- `content_type`: Content type

**Response:**
```typescript
{
  rating_value: number
  created_at: string
  updated_at: string
} | null
```

#### GET /api/ratings/aggregate

**Purpose:** Get aggregate rating for content

**Query Parameters:**
- `external_id`: Content external ID
- `content_type`: Content type

**Response:**
```typescript
{
  external_id: string
  content_type: string
  average_rating: number | null  // Rounded to 1 decimal place
  rating_count: number
}
```

**Implementation:**
```javascript
router.get('/ratings/aggregate', async (req, res) => {
  const { external_id, content_type } = req.query
  
  if (!external_id || !content_type) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }
  
  // Check cache first
  const cacheKey = `aggregate_rating:${external_id}:${content_type}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.json(cached)
  }
  
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('rating_value')
      .eq('external_id', external_id)
      .eq('content_type', content_type)
    
    if (error) throw error
    
    const rating_count = data.length
    let average_rating = null
    
    if (rating_count > 0) {
      const sum = data.reduce((acc, curr) => acc + curr.rating_value, 0)
      average_rating = Math.round((sum / rating_count) * 10) / 10 // Round to 1 decimal
    }
    
    const result = {
      external_id,
      content_type,
      average_rating,
      rating_count
    }
    
    // Cache for 5 minutes
    cache.set(cacheKey, result, 300)
    
    res.json(result)
  } catch (error) {
    console.error(`[${req.id}] Error fetching aggregate rating:`, error)
    res.status(500).json({ error: 'Failed to fetch aggregate rating' })
  }
})
```

#### POST /api/ratings/aggregate/batch

**Purpose:** Get aggregate ratings for multiple content items

**Request Body:**
```typescript
{
  items: Array<{
    external_id: string
    content_type: 'movie' | 'tv' | 'game' | 'software'
  }>
}
```

**Response:**
```typescript
{
  results: Array<{
    external_id: string
    content_type: string
    average_rating: number | null
    rating_count: number
  }>
}
```

**Implementation:**
```javascript
router.post('/ratings/aggregate/batch', async (req, res) => {
  const { items } = req.body
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' })
  }
  
  if (items.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per request' })
  }
  
  const results = []
  
  for (const item of items) {
    const { external_id, content_type } = item
    
    // Check cache
    const cacheKey = `aggregate_rating:${external_id}:${content_type}`
    const cached = cache.get(cacheKey)
    
    if (cached) {
      results.push(cached)
      continue
    }
    
    // Query database
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating_value')
        .eq('external_id', external_id)
        .eq('content_type', content_type)
      
      if (error) throw error
      
      const rating_count = data.length
      let average_rating = null
      
      if (rating_count > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.rating_value, 0)
        average_rating = Math.round((sum / rating_count) * 10) / 10
      }
      
      const result = {
        external_id,
        content_type,
        average_rating,
        rating_count
      }
      
      cache.set(cacheKey, result, 300)
      results.push(result)
    } catch (error) {
      console.error(`Error fetching aggregate for ${external_id}:`, error)
      results.push({
        external_id,
        content_type,
        average_rating: null,
        rating_count: 0
      })
    }
  }
  
  res.json({ results })
})
```


#### POST /api/reviews

**Purpose:** Create a new review

**Request Body:**
```typescript
{
  external_id: string
  content_type: 'movie' | 'tv' | 'game' | 'software'
  review_text: string      // 10-5000 characters
  title?: string           // Max 200 characters
  rating?: number          // 1-10, optional
  language: 'ar' | 'en'
  contains_spoilers?: boolean
  external_source?: string // default: 'tmdb'
}
```

**Response:**
```typescript
{
  success: true,
  review: {
    id: string
    created_at: string
    // ... other fields
  }
}
```

**Rate Limiting:** 10 reviews per hour per user

#### PUT /api/reviews/:id

**Purpose:** Update an existing review

**Request Body:**
```typescript
{
  review_text?: string
  title?: string
  rating?: number
  contains_spoilers?: boolean
}
```

**Response:**
```typescript
{
  success: true,
  review: { /* updated review */ }
}
```

**Constraints:**
- User can only edit their own reviews
- Maximum 5 edits per review (edit_count <= 5)
- Increments edit_count on each update

#### DELETE /api/reviews/:id

**Purpose:** Delete a review

**Response:**
```typescript
{ success: true }
```

**Constraints:**
- User can only delete their own reviews
- Cascades to delete review_likes and review_reports

#### GET /api/reviews

**Purpose:** Get reviews for content with filtering and sorting

**Query Parameters:**
- `external_id` (required): Content external ID
- `content_type` (required): Content type
- `sort`: 'most_helpful' | 'newest' | 'highest_rating' | 'lowest_rating' (default: 'most_helpful')
- `language`: 'ar' | 'en' | 'all' (default: 'all')
- `rating_filter`: 'all' | 'positive' (7-10) | 'mixed' (4-6) | 'negative' (1-3) (default: 'all')
- `limit`: Number of reviews per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```typescript
{
  reviews: Array<Review>,
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
```

**Implementation:**
```javascript
router.get('/reviews', async (req, res) => {
  const { 
    external_id, 
    content_type, 
    sort = 'most_helpful',
    language = 'all',
    rating_filter = 'all',
    limit = 20,
    offset = 0
  } = req.query
  
  if (!external_id || !content_type) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }
  
  const parsedLimit = Math.min(parseInt(limit) || 20, 100)
  const parsedOffset = parseInt(offset) || 0
  
  try {
    let query = supabase
      .from('reviews')
      .select('*, user:profiles(*)', { count: 'exact' })
      .eq('external_id', external_id)
      .eq('content_type', content_type)
      .eq('is_hidden', false)
    
    // Language filter
    if (language !== 'all') {
      query = query.eq('language', language)
    }
    
    // Rating filter
    if (rating_filter === 'positive') {
      query = query.gte('rating', 7)
    } else if (rating_filter === 'mixed') {
      query = query.gte('rating', 4).lte('rating', 6)
    } else if (rating_filter === 'negative') {
      query = query.lte('rating', 3)
    }
    
    // Sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'highest_rating') {
      query = query.order('rating', { ascending: false, nullsLast: true })
    } else if (sort === 'lowest_rating') {
      query = query.order('rating', { ascending: true, nullsLast: true })
    }
    // most_helpful sorting requires join with review_likes (handled below)
    
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    // Fetch helpful counts for each review
    const reviewIds = data.map(r => r.id)
    const { data: likesData } = await supabase
      .from('review_likes')
      .select('review_id')
      .in('review_id', reviewIds)
    
    const likeCounts = {}
    likesData?.forEach(like => {
      likeCounts[like.review_id] = (likeCounts[like.review_id] || 0) + 1
    })
    
    // Add helpful_count to each review
    const reviews = data.map(review => ({
      ...review,
      helpful_count: likeCounts[review.id] || 0
    }))
    
    // Sort by most_helpful if requested
    if (sort === 'most_helpful') {
      reviews.sort((a, b) => b.helpful_count - a.helpful_count)
    }
    
    res.json({
      reviews,
      pagination: {
        total: count,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + parsedLimit < count
      }
    })
  } catch (error) {
    console.error(`[${req.id}] Error fetching reviews:`, error)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})
```

#### GET /api/reviews/:id

**Purpose:** Get single review by ID

**Response:**
```typescript
{
  review: Review
}
```

#### POST /api/reviews/:id/like

**Purpose:** Toggle helpful vote on review

**Response:**
```typescript
{
  liked: boolean        // true if now liked, false if unliked
  like_count: number    // Updated total like count
}
```

**Implementation:**
```javascript
router.post('/reviews/:id/like', authenticateUser, async (req, res) => {
  const { id: reviewId } = req.params
  const userId = req.user.id
  
  try {
    // Check if review exists and get author
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single()
    
    if (reviewError || !review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    // Prevent users from liking their own reviews
    if (review.user_id === userId) {
      return res.status(400).json({ error: 'Cannot like your own review' })
    }
    
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle()
    
    let liked = false
    
    if (existingLike) {
      // Unlike
      await supabase
        .from('review_likes')
        .delete()
        .eq('id', existingLike.id)
      liked = false
    } else {
      // Like
      await supabase
        .from('review_likes')
        .insert({ review_id: reviewId, user_id: userId })
      liked = true
      
      // Create notification for review author
      await supabase
        .from('notifications')
        .insert({
          user_id: review.user_id,
          title: 'Someone found your review helpful',
          message: 'A user marked your review as helpful',
          type: 'info',
          data: { review_id: reviewId }
        })
    }
    
    // Get updated like count
    const { count } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)
    
    res.json({ liked, like_count: count || 0 })
  } catch (error) {
    console.error(`[${req.id}] Error toggling review like:`, error)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})
```

#### GET /api/reviews/search

**Purpose:** Search reviews by keywords

**Query Parameters:**
- `q` (required): Search query
- `limit`: Results limit (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```typescript
{
  reviews: Array<Review>,
  total: number
}
```

#### POST /api/reviews/:id/report

**Purpose:** Report inappropriate review

**Request Body:**
```typescript
{
  reason: string  // 10-500 characters
}
```

**Response:**
```typescript
{ success: true }
```

#### GET /api/reviews/user/:userId/stats

**Purpose:** Get user's review statistics

**Response:**
```typescript
{
  total_reviews: number
  total_helpful_votes: number
  average_rating: number
}
```


### Frontend Components

#### RatingInput Component

**Purpose:** Interactive star rating input (1-10 scale)

**Location:** `src/components/features/reviews/RatingInput.tsx`

**Props:**
```typescript
interface RatingInputProps {
  value: number | null
  onChange: (rating: number) => void
  readonly?: boolean
  size?: 'small' | 'medium' | 'large'
  showValue?: boolean
}
```

**Features:**
- 10-star display (half-stars for visual appeal)
- Hover preview before selection
- Click to set rating
- Keyboard accessible (arrow keys to change rating)
- RTL support for Arabic interface

**Implementation Notes:**
- Uses 5 star icons, each representing 2 points (1-2, 3-4, 5-6, 7-8, 9-10)
- Displays numerical value (e.g., "8/10") when showValue is true
- Readonly mode for displaying existing ratings

#### ReviewForm Component

**Purpose:** Form for writing/editing reviews

**Location:** `src/components/features/reviews/ReviewForm.tsx`

**Props:**
```typescript
interface ReviewFormProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  existingReview?: Review
  onSubmit: (review: Review) => void
  onCancel?: () => void
}
```

**Features:**
- Language selector (Arabic/English) with RTL/LTR switching
- Optional title input (max 200 chars)
- Review text textarea (10-5000 chars) with character counter
- Optional rating input (RatingInput component)
- Spoiler warning checkbox
- Auto-save draft every 30 seconds
- Load existing draft on mount
- Validation with error messages
- Submit button disabled until valid

**State Management:**
```typescript
const [language, setLanguage] = useState<'ar' | 'en'>('en')
const [title, setTitle] = useState('')
const [reviewText, setReviewText] = useState('')
const [rating, setRating] = useState<number | null>(null)
const [containsSpoilers, setContainsSpoilers] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
const [errors, setErrors] = useState<Record<string, string>>({})
```

**Auto-Save Logic:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (reviewText.length > 0) {
      saveReviewDraft({
        userId,
        externalId,
        contentType,
        title,
        reviewText,
        rating,
        language,
        containsSpoilers
      })
    }
  }, 30000) // 30 seconds
  
  return () => clearTimeout(timer)
}, [reviewText, title, rating, language, containsSpoilers])
```

#### ReviewCard Component

**Purpose:** Display single review with interactions

**Location:** `src/components/features/reviews/ReviewCard.tsx`

**Props:**
```typescript
interface ReviewCardProps {
  review: Review
  currentUserId?: string
  onEdit?: (review: Review) => void
  onDelete?: (reviewId: string) => void
  onLike?: (reviewId: string) => void
  onReport?: (reviewId: string) => void
}
```

**Features:**
- User avatar and username (links to profile)
- Review title (if provided)
- Star rating display (if provided)
- Review text with "Read More" expansion for long reviews
- Spoiler warning with "Show Spoilers" button
- Helpful vote button with count
- Edit/Delete buttons (only for review author)
- Report button (for other users)
- Verified badge (if user watched content)
- Edited badge (if edit_count > 0)
- Timestamp (relative time, e.g., "2 days ago")
- Language indicator (flag icon)
- RTL/LTR text direction based on review language

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [Avatar] Username  [Verified Badge]  [Language Flag]   │
│          2 days ago  [Edited]                           │
├─────────────────────────────────────────────────────────┤
│ ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ 8/10                                    │
│                                                         │
│ Review Title (if provided)                              │
│                                                         │
│ [⚠️ Contains Spoilers - Click to Show]                 │
│                                                         │
│ Review text goes here... (with Read More if long)      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [👍 Helpful (45)] [Edit] [Delete] [Report]             │
└─────────────────────────────────────────────────────────┘
```

#### ReviewList Component

**Purpose:** Display list of reviews with filtering/sorting

**Location:** `src/components/features/reviews/ReviewList.tsx`

**Props:**
```typescript
interface ReviewListProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  currentUserId?: string
}
```

**Features:**
- Filter controls (language, rating range)
- Sort controls (most helpful, newest, highest/lowest rating)
- Pagination or infinite scroll
- Loading states
- Empty state ("No reviews yet")
- User's own review highlighted at top
- Review count display

**State Management:**
```typescript
const [reviews, setReviews] = useState<Review[]>([])
const [sort, setSort] = useState<SortOption>('most_helpful')
const [languageFilter, setLanguageFilter] = useState<'all' | 'ar' | 'en'>('all')
const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
const [isLoading, setIsLoading] = useState(false)
```

#### AggregateRating Component

**Purpose:** Display aggregate rating with visual representation

**Location:** `src/components/features/reviews/AggregateRating.tsx`

**Props:**
```typescript
interface AggregateRatingProps {
  externalId: string
  contentType: 'movie' | 'tv' | 'game' | 'software'
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean
}
```

**Features:**
- Star rating display (filled based on average)
- Numerical rating (e.g., "7.8/10")
- Rating count (e.g., "1.2K ratings")
- Loading skeleton
- Empty state ("No ratings yet")
- Click to scroll to reviews section

**Display Formats:**
- Small: ⭐ 7.8 (1.2K)
- Medium: ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ 7.8/10 (1,234 ratings)
- Large: Full stars + breakdown by rating (1-10 distribution bars)

#### ReviewFilters Component

**Purpose:** Filter and sort controls for review list

**Location:** `src/components/features/reviews/ReviewFilters.tsx`

**Props:**
```typescript
interface ReviewFiltersProps {
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  language: 'all' | 'ar' | 'en'
  onLanguageChange: (language: 'all' | 'ar' | 'en') => void
  ratingFilter: RatingFilter
  onRatingFilterChange: (filter: RatingFilter) => void
}
```

**Features:**
- Sort dropdown (Most Helpful, Newest, Highest Rating, Lowest Rating)
- Language tabs (All, العربية, English)
- Rating filter buttons (All, Positive 7-10, Mixed 4-6, Negative 1-3)
- Active filter indicators
- Responsive layout (stacks on mobile)


## Data Models

### External ID Bridge Pattern

**Supabase → CockroachDB Bridge:**
```
Supabase reviews.external_id (TEXT "550") 
    ↓
    Bridge via TMDB ID
    ↓
CockroachDB movies WHERE external_source='tmdb' AND external_id='550'
```

**Data Flow Example:**

1. User writes review for Fight Club (TMDB ID: 550)
2. Supabase stores: `{user_id, external_id: "550", content_type: "movie", review_text: "..."}`
3. Frontend fetches reviews: `getReviews("550", "movie")`
4. Frontend fetches content details: `POST /api/content/batch` with `[{external_id: "550", content_type: "movie"}]`
5. Backend queries CockroachDB: `SELECT * FROM movies WHERE external_source='tmdb' AND external_id='550'`
6. Frontend displays review with full movie context (title, poster, etc.)

### Rating Aggregation Logic

**Calculation:**
```typescript
function calculateAggregateRating(ratings: Array<{ rating_value: number }>) {
  if (ratings.length === 0) {
    return { average_rating: null, rating_count: 0 }
  }
  
  const sum = ratings.reduce((acc, curr) => acc + curr.rating_value, 0)
  const average = sum / ratings.length
  const rounded = Math.round(average * 10) / 10 // Round to 1 decimal place
  
  return {
    average_rating: rounded,
    rating_count: ratings.length
  }
}
```

**Example:**
- Ratings: [8, 9, 7, 10, 8, 7, 9, 8]
- Sum: 66
- Average: 66 / 8 = 8.25
- Rounded: 8.3
- Result: { average_rating: 8.3, rating_count: 8 }

### Review Helpful Percentage

**Calculation:**
```typescript
function calculateHelpfulPercentage(helpfulVotes: number, totalViews: number) {
  if (totalViews < 10) {
    return null // Don't show percentage for reviews with < 10 views
  }
  
  const percentage = (helpfulVotes / totalViews) * 100
  return Math.round(percentage) // Round to nearest integer
}
```

**Display:**
- Views < 10: Show only helpful count (e.g., "5 found this helpful")
- Views >= 10: Show percentage (e.g., "85% found this helpful (45 of 53)")

### Review Verification Logic

**Verification Check:**
```typescript
async function checkReviewVerification(
  userId: string,
  externalId: string,
  contentType: 'movie' | 'tv'
): Promise<boolean> {
  // Check if user has this content in their history
  const { data, error } = await supabase
    .from('history')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .limit(1)
  
  if (error || !data || data.length === 0) {
    return false
  }
  
  return true
}
```

**When to Verify:**
- On review submission: Check history and set `is_verified` flag
- On history update: Update existing reviews' `is_verified` flag
- Display "Verified Watch" badge on verified reviews

## Integration Points

### Activity Feed Integration

**Creating Activity on Review Submission:**

```typescript
// In submitReview function
async function submitReview(args: SubmitReviewArgs) {
  // ... validation and review insertion ...
  
  // Create activity feed entry
  await addActivity({
    user_id: args.userId,
    type: 'review',
    content_id: reviewId, // Review ID, not content ID
    content_type: 'review',
    metadata: {
      external_id: args.externalId,
      external_source: 'tmdb',
      content_type: args.contentType,
      rating: args.rating,
      title: args.title,
      review_excerpt: args.reviewText.substring(0, 150) + '...'
    }
  })
}
```

**Displaying Review Activities in Feed:**

```typescript
// In ActivityFeed component
function renderReviewActivity(activity: Activity) {
  const { external_id, content_type, rating, title, review_excerpt } = activity.metadata
  
  // Fetch content details from CockroachDB
  const content = await fetchContentDetails(external_id, content_type)
  
  return (
    <ActivityCard>
      <UserInfo user={activity.user} />
      <div>reviewed {content?.title || 'Content Unavailable'}</div>
      {rating && <RatingDisplay value={rating} />}
      {title && <h4>{title}</h4>}
      <p>{review_excerpt}</p>
      <Link to={`/reviews/${activity.content_id}`}>Read full review</Link>
    </ActivityCard>
  )
}
```

### Batch Content API Usage

**Fetching Content for Multiple Reviews:**

```typescript
async function fetchReviewsWithContent(
  externalId: string,
  contentType: string
): Promise<Array<ReviewWithContent>> {
  // Fetch reviews from Supabase
  const reviews = await getReviews(externalId, contentType)
  
  // Fetch reviewer profiles (already included in getReviews)
  
  // Fetch content details from CockroachDB
  const content = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ external_id: externalId, content_type: contentType }]
    })
  }).then(res => res.json())
  
  // Combine data
  return reviews.map(review => ({
    ...review,
    content: content.results[0] || null
  }))
}
```

**Fetching Aggregate Ratings for Content Cards:**

```typescript
async function fetchContentCardsWithRatings(
  contentItems: Array<{ external_id: string; content_type: string }>
): Promise<Array<ContentCardData>> {
  // Fetch content details from CockroachDB
  const contentResponse = await fetch('/api/content/batch', {
    method: 'POST',
    body: JSON.stringify({ items: contentItems })
  }).then(res => res.json())
  
  // Fetch aggregate ratings from backend
  const ratingsResponse = await fetch('/api/ratings/aggregate/batch', {
    method: 'POST',
    body: JSON.stringify({ items: contentItems })
  }).then(res => res.json())
  
  // Combine data
  return contentResponse.results.map((content, index) => ({
    ...content,
    aggregate_rating: ratingsResponse.results[index]
  }))
}
```

### Notification System Integration

**Review Like Notification:**

```typescript
// When user likes a review
async function likeReview(reviewId: string, userId: string) {
  // ... like logic ...
  
  // Get review author
  const review = await getReview(reviewId)
  
  // Don't notify if user likes their own review
  if (review.user_id === userId) return
  
  // Create notification
  await createNotification({
    userId: review.user_id,
    title: 'Someone found your review helpful',
    message: `A user marked your review as helpful`,
    type: 'info',
    data: {
      review_id: reviewId,
      liker_user_id: userId
    }
  })
}
```

**Review Report Notification (for moderators):**

```typescript
// When user reports a review
async function reportReview(reviewId: string, reporterUserId: string, reason: string) {
  // ... report logic ...
  
  // Get all moderators
  const moderators = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'supervisor'])
  
  // Notify all moderators
  for (const moderator of moderators) {
    await createNotification({
      userId: moderator.id,
      title: 'Review reported',
      message: `A review has been reported for: ${reason.substring(0, 50)}...`,
      type: 'warning',
      data: {
        review_id: reviewId,
        reporter_user_id: reporterUserId
      }
    })
  }
}
```

### User Profile Statistics

**Displaying Review Stats on Profile:**

```typescript
// In Profile component
async function loadUserReviewStats(userId: string) {
  const stats = await fetch(`/api/reviews/user/${userId}/stats`)
    .then(res => res.json())
  
  return (
    <ProfileStats>
      <Stat label="Reviews Written" value={stats.total_reviews} />
      <Stat label="Helpful Votes Received" value={stats.total_helpful_votes} />
      <Stat label="Average Rating Given" value={stats.average_rating.toFixed(1)} />
    </ProfileStats>
  )
}
```

**Backend Implementation:**

```javascript
router.get('/reviews/user/:userId/stats', async (req, res) => {
  const { userId } = req.params
  
  try {
    // Get total reviews
    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_hidden', false)
    
    // Get total helpful votes
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('is_hidden', false)
    
    const reviewIds = reviews.map(r => r.id)
    const { count: totalHelpfulVotes } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .in('review_id', reviewIds)
    
    // Get average rating
    const { data: ratingsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('user_id', userId)
      .eq('is_hidden', false)
      .not('rating', 'is', null)
    
    let averageRating = 0
    if (ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc, curr) => acc + curr.rating, 0)
      averageRating = sum / ratingsData.length
    }
    
    res.json({
      total_reviews: totalReviews || 0,
      total_helpful_votes: totalHelpfulVotes || 0,
      average_rating: averageRating
    })
  } catch (error) {
    console.error(`[${req.id}] Error fetching user review stats:`, error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})
```


## Performance Optimizations

### Caching Strategy

**Aggregate Rating Cache:**

```typescript
// Cache Configuration
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes TTL
  checkperiod: 60 // Check for expired keys every 60 seconds
})

// Cache Key Format
const cacheKey = `aggregate_rating:${external_id}:${content_type}`

// Cache Operations
function getCachedAggregateRating(externalId: string, contentType: string) {
  return cache.get(cacheKey)
}

function setCachedAggregateRating(externalId: string, contentType: string, data: any) {
  cache.set(cacheKey, data, 300) // 5 minutes
}

function invalidateAggregateRatingCache(externalId: string, contentType: string) {
  cache.del(cacheKey)
}
```

**Cache Invalidation Triggers:**
- New rating submitted → Invalidate cache for that content
- Rating updated → Invalidate cache for that content
- Rating deleted → Invalidate cache for that content

**Review Count Cache:**

```typescript
// Cache review counts separately (less frequently updated)
const reviewCountCacheKey = `review_count:${external_id}:${content_type}`

// Cache for 10 minutes (reviews submitted less frequently than ratings)
cache.set(reviewCountCacheKey, count, 600)
```

### Database Indexes

**Ratings Table Indexes:**

```sql
-- For aggregate rating calculations (most frequent query)
CREATE INDEX idx_ratings_aggregate ON ratings(external_id, content_type, rating_value);

-- For user rating lookups
CREATE INDEX idx_ratings_user ON ratings(user_id, created_at DESC);

-- For external_id lookups
CREATE INDEX idx_ratings_external ON ratings(external_id, content_type);
```

**Reviews Table Indexes:**

```sql
-- For fetching reviews by content (most frequent query)
CREATE INDEX idx_reviews_external ON reviews(external_id, content_type, created_at DESC);

-- For user profile queries
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC);

-- For language filtering
CREATE INDEX idx_reviews_language ON reviews(language, created_at DESC);

-- For rating-based sorting
CREATE INDEX idx_reviews_rating ON reviews(rating DESC, created_at DESC);

-- For moderation queries
CREATE INDEX idx_reviews_hidden ON reviews(is_hidden, created_at DESC);

-- For full-text search (PostgreSQL)
CREATE INDEX idx_reviews_search ON reviews USING gin(to_tsvector('english', review_text || ' ' || COALESCE(title, '')));
```

**Review Likes Table Indexes:**

```sql
-- For counting likes per review
CREATE INDEX idx_review_likes_review ON review_likes(review_id);

-- For checking user's like status
CREATE INDEX idx_review_likes_user_review ON review_likes(user_id, review_id);

-- For user activity queries
CREATE INDEX idx_review_likes_user ON review_likes(user_id, created_at DESC);
```

**Review Reports Table Indexes:**

```sql
-- For moderator dashboard (pending reports)
CREATE INDEX idx_review_reports_status ON review_reports(status, created_at DESC);

-- For review-specific reports
CREATE INDEX idx_review_reports_review ON review_reports(review_id);
```

### Pagination Implementation

**Cursor-Based Pagination (Recommended for large datasets):**

```typescript
// Instead of offset-based pagination, use cursor-based for better performance
interface PaginationOptions {
  limit: number
  cursor?: string // created_at timestamp of last item
}

async function getReviewsPaginated(
  externalId: string,
  contentType: string,
  options: PaginationOptions
) {
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('external_id', externalId)
    .eq('content_type', contentType)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(options.limit)
  
  if (options.cursor) {
    query = query.lt('created_at', options.cursor)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  const nextCursor = data.length === options.limit 
    ? data[data.length - 1].created_at 
    : null
  
  return {
    reviews: data,
    nextCursor,
    hasMore: nextCursor !== null
  }
}
```

**Infinite Scroll Implementation:**

```typescript
// In ReviewList component
const [reviews, setReviews] = useState<Review[]>([])
const [cursor, setCursor] = useState<string | null>(null)
const [hasMore, setHasMore] = useState(true)
const [isLoading, setIsLoading] = useState(false)

const loadMoreReviews = async () => {
  if (isLoading || !hasMore) return
  
  setIsLoading(true)
  
  try {
    const response = await fetch(
      `/api/reviews?external_id=${externalId}&content_type=${contentType}&limit=20&cursor=${cursor || ''}`
    )
    const data = await response.json()
    
    setReviews(prev => [...prev, ...data.reviews])
    setCursor(data.nextCursor)
    setHasMore(data.hasMore)
  } catch (error) {
    console.error('Error loading reviews:', error)
  } finally {
    setIsLoading(false)
  }
}

// Intersection Observer for infinite scroll
useEffect(() => {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadMoreReviews()
      }
    },
    { threshold: 0.5 }
  )
  
  if (loadMoreTriggerRef.current) {
    observer.observe(loadMoreTriggerRef.current)
  }
  
  return () => observer.disconnect()
}, [hasMore, isLoading])
```

### Rate Limiting Implementation

**In-Memory Rate Limiter:**

```typescript
// server/middleware/rateLimiter.js
import NodeCache from 'node-cache'

const rateLimitCache = new NodeCache({ stdTTL: 3600 }) // 1 hour TTL

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message: string
}

function createRateLimiter(config: RateLimitConfig) {
  return (req, res, next) => {
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    // Exempt admin and supervisor roles
    if (req.user.role === 'admin' || req.user.role === 'supervisor') {
      return next()
    }
    
    const key = `ratelimit:${userId}`
    const now = Date.now()
    
    let userData = rateLimitCache.get(key) || { count: 0, resetTime: now + config.windowMs }
    
    // Reset if window expired
    if (now > userData.resetTime) {
      userData = { count: 0, resetTime: now + config.windowMs }
    }
    
    // Check limit
    if (userData.count >= config.maxRequests) {
      const resetIn = Math.ceil((userData.resetTime - now) / 1000 / 60) // minutes
      return res.status(429).json({ 
        error: config.message,
        resetIn: `${resetIn} minutes`
      })
    }
    
    // Increment count
    userData.count++
    rateLimitCache.set(key, userData)
    
    next()
  }
}

// Rate limiters for different operations
export const rateLimitReviews = createRateLimiter({
  maxRequests: 10,
  windowMs: 3600000, // 1 hour
  message: 'Too many reviews. Please try again later.'
})

export const rateLimitRatings = createRateLimiter({
  maxRequests: 50,
  windowMs: 3600000, // 1 hour
  message: 'Too many ratings. Please try again later.'
})
```

**Usage in Routes:**

```javascript
router.post('/reviews', authenticateUser, rateLimitReviews, async (req, res) => {
  // Review submission logic
})

router.post('/ratings', authenticateUser, rateLimitRatings, async (req, res) => {
  // Rating submission logic
})
```

### Batch Query Optimization

**Optimized Aggregate Rating Batch Query:**

```javascript
// Instead of sequential queries, use parallel queries with Promise.all
router.post('/ratings/aggregate/batch', async (req, res) => {
  const { items } = req.body
  
  // Group items by content_type for efficient querying
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.content_type]) acc[item.content_type] = []
    acc[item.content_type].push(item.external_id)
    return acc
  }, {})
  
  // Query all content types in parallel
  const queries = Object.entries(groupedItems).map(async ([contentType, externalIds]) => {
    const { data, error } = await supabase
      .from('ratings')
      .select('external_id, rating_value')
      .eq('content_type', contentType)
      .in('external_id', externalIds)
    
    if (error) throw error
    
    // Group by external_id and calculate aggregates
    const aggregates = {}
    data.forEach(rating => {
      if (!aggregates[rating.external_id]) {
        aggregates[rating.external_id] = { sum: 0, count: 0 }
      }
      aggregates[rating.external_id].sum += rating.rating_value
      aggregates[rating.external_id].count++
    })
    
    return { contentType, aggregates }
  })
  
  const results = await Promise.all(queries)
  
  // Format response in original order
  const formattedResults = items.map(item => {
    const typeResult = results.find(r => r.contentType === item.content_type)
    const aggregate = typeResult?.aggregates[item.external_id]
    
    if (!aggregate) {
      return {
        external_id: item.external_id,
        content_type: item.content_type,
        average_rating: null,
        rating_count: 0
      }
    }
    
    return {
      external_id: item.external_id,
      content_type: item.content_type,
      average_rating: Math.round((aggregate.sum / aggregate.count) * 10) / 10,
      rating_count: aggregate.count
    }
  })
  
  res.json({ results: formattedResults })
})
```


## Security Measures

### Content Sanitization

**Review Text Sanitization:**

```typescript
import DOMPurify from 'isomorphic-dompurify'

function sanitizeReviewText(text: string): string {
  // Remove all HTML tags
  const sanitized = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  })
  
  // Trim whitespace
  return sanitized.trim()
}

function sanitizeReviewTitle(title: string): string {
  // Remove HTML and script content
  const sanitized = DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  
  return sanitized.trim()
}
```

**Backend Validation:**

```javascript
router.post('/reviews', authenticateUser, rateLimitReviews, async (req, res) => {
  let { review_text, title, rating } = req.body
  
  // Sanitize inputs
  review_text = sanitizeReviewText(review_text)
  if (title) title = sanitizeReviewTitle(title)
  
  // Validate after sanitization
  if (!review_text || review_text.length < 10 || review_text.length > 5000) {
    return res.status(400).json({ 
      error: 'Review text must be between 10 and 5000 characters' 
    })
  }
  
  if (title && title.length > 200) {
    return res.status(400).json({ 
      error: 'Title must be 200 characters or less' 
    })
  }
  
  // Continue with review submission...
})
```

### XSS Prevention

**Frontend Rendering:**

```typescript
// In ReviewCard component
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="review-card">
      {/* Safe rendering - React escapes by default */}
      <h3>{review.title}</h3>
      
      {/* Preserve line breaks but escape HTML */}
      <p style={{ whiteSpace: 'pre-wrap' }}>
        {review.review_text}
      </p>
      
      {/* NEVER use dangerouslySetInnerHTML with user content */}
      {/* ❌ WRONG: <div dangerouslySetInnerHTML={{ __html: review.review_text }} /> */}
    </div>
  )
}
```

**Content Security Policy (CSP):**

```javascript
// In server/index.js
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://lhpuwupbhpcqkwqugkhh.supabase.co"
  )
  next()
})
```

### Authentication Validation

**Middleware for Protected Routes:**

```javascript
// server/middleware/auth.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side key
)

export async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  const token = authHeader.substring(7)
  
  try {
    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    // Fetch user profile for role checking
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user'
    }
    
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}
```

**Authorization Checks:**

```javascript
// Check if user owns the review before allowing edit/delete
router.put('/reviews/:id', authenticateUser, async (req, res) => {
  const { id: reviewId } = req.params
  const userId = req.user.id
  
  // Fetch review to check ownership
  const { data: review, error } = await supabase
    .from('reviews')
    .select('user_id, edit_count')
    .eq('id', reviewId)
    .single()
  
  if (error || !review) {
    return res.status(404).json({ error: 'Review not found' })
  }
  
  // Check ownership
  if (review.user_id !== userId) {
    return res.status(403).json({ error: 'You can only edit your own reviews' })
  }
  
  // Check edit limit
  if (review.edit_count >= 5) {
    return res.status(400).json({ error: 'Maximum edit limit reached (5 edits)' })
  }
  
  // Continue with update...
})
```

### Input Validation

**Comprehensive Validation Function:**

```typescript
interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

function validateReviewInput(input: {
  external_id: string
  content_type: string
  review_text: string
  title?: string
  rating?: number
  language: string
}): ValidationResult {
  const errors: Record<string, string> = {}
  
  // Validate external_id
  if (!input.external_id || typeof input.external_id !== 'string' || !input.external_id.trim()) {
    errors.external_id = 'external_id is required and must be a non-empty string'
  }
  
  // Validate content_type
  if (!['movie', 'tv', 'game', 'software'].includes(input.content_type)) {
    errors.content_type = 'content_type must be one of: movie, tv, game, software'
  }
  
  // Validate review_text
  const textLength = input.review_text?.trim().length || 0
  if (textLength < 10) {
    errors.review_text = 'Review text must be at least 10 characters'
  } else if (textLength > 5000) {
    errors.review_text = 'Review text must be 5000 characters or less'
  }
  
  // Validate title (optional)
  if (input.title && input.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or less'
  }
  
  // Validate rating (optional)
  if (input.rating !== undefined && input.rating !== null) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) {
      errors.rating = 'Rating must be an integer between 1 and 10'
    }
  }
  
  // Validate language
  if (!['ar', 'en'].includes(input.language)) {
    errors.language = 'Language must be either "ar" or "en"'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
```

**Frontend Validation:**

```typescript
// In ReviewForm component
function validateForm(): boolean {
  const newErrors: Record<string, string> = {}
  
  if (reviewText.trim().length < 10) {
    newErrors.reviewText = 'Review must be at least 10 characters'
  } else if (reviewText.trim().length > 5000) {
    newErrors.reviewText = 'Review must be 5000 characters or less'
  }
  
  if (title && title.trim().length > 200) {
    newErrors.title = 'Title must be 200 characters or less'
  }
  
  if (rating && (rating < 1 || rating > 10)) {
    newErrors.rating = 'Rating must be between 1 and 10'
  }
  
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### SQL Injection Prevention

**Parameterized Queries (Supabase automatically handles this):**

```typescript
// ✅ SAFE - Supabase uses parameterized queries
const { data, error } = await supabase
  .from('reviews')
  .select('*')
  .eq('external_id', userInput) // Automatically escaped
  .eq('content_type', contentType)

// ❌ DANGEROUS - Never construct raw SQL with user input
// const query = `SELECT * FROM reviews WHERE external_id = '${userInput}'`
```

**Backend Query Validation:**

```javascript
// Always validate and sanitize before database operations
router.get('/reviews', async (req, res) => {
  const { external_id, content_type } = req.query
  
  // Validate inputs
  if (!external_id || typeof external_id !== 'string') {
    return res.status(400).json({ error: 'Invalid external_id' })
  }
  
  if (!['movie', 'tv', 'game', 'software'].includes(content_type)) {
    return res.status(400).json({ error: 'Invalid content_type' })
  }
  
  // Safe to proceed with query
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('external_id', external_id)
    .eq('content_type', content_type)
  
  // ...
})
```

### Rate Limiting for Security

**Prevent Brute Force Attacks:**

```typescript
// Stricter rate limiting for authentication endpoints
const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 900000, // 15 minutes
  message: 'Too many authentication attempts. Please try again later.'
})

// Apply to sensitive endpoints
router.post('/reviews/:id/report', authenticateUser, authRateLimiter, async (req, res) => {
  // Report handling logic
})
```

**IP-Based Rate Limiting (for anonymous endpoints):**

```typescript
function createIPRateLimiter(config: RateLimitConfig) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress
    const key = `ratelimit:ip:${ip}`
    
    // Similar logic to user-based rate limiter
    // ...
  }
}
```


## Error Handling

### Input Validation Errors

**Invalid External ID:**
```typescript
if (!externalId || externalId.trim() === '') {
  throw new Error('external_id is required and cannot be empty')
}
```

**Invalid Rating Value:**
```typescript
if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 10) {
  return res.status(400).json({ 
    error: 'Rating must be an integer between 1 and 10',
    received: ratingValue
  })
}
```

**Invalid Review Text Length:**
```typescript
const textLength = reviewText.trim().length

if (textLength < 10) {
  return res.status(400).json({ 
    error: 'Review text must be at least 10 characters',
    current: textLength,
    minimum: 10
  })
}

if (textLength > 5000) {
  return res.status(400).json({ 
    error: 'Review text must be 5000 characters or less',
    current: textLength,
    maximum: 5000
  })
}
```

**Invalid Content Type:**
```typescript
const validTypes = ['movie', 'tv', 'game', 'software']

if (!validTypes.includes(contentType)) {
  return res.status(400).json({ 
    error: `Invalid content_type: ${contentType}`,
    validTypes
  })
}
```

### Database Errors

**Duplicate Review (Unique Constraint Violation):**
```typescript
try {
  await supabase.from('reviews').insert({ 
    user_id: userId, 
    external_id: externalId, 
    content_type: contentType,
    review_text: reviewText
  })
} catch (error) {
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    return res.status(409).json({ 
      error: 'You have already reviewed this content',
      message: 'Please edit your existing review instead'
    })
  }
  throw error
}
```

**Review Not Found:**
```typescript
const { data: review, error } = await supabase
  .from('reviews')
  .select('*')
  .eq('id', reviewId)
  .single()

if (error || !review) {
  return res.status(404).json({ 
    error: 'Review not found',
    reviewId
  })
}
```

**Content Not Found (Graceful Degradation):**
```typescript
// Don't throw error - return null and let frontend handle gracefully
const result = await fetch('/api/content/batch', {
  method: 'POST',
  body: JSON.stringify({ items: [{ external_id: externalId, content_type: contentType }] })
})

const { results } = await result.json()

if (results[0] === null) {
  // Content not found in CockroachDB
  // Frontend will show placeholder: "Content Unavailable"
  return {
    review,
    content: null // Frontend handles this gracefully
  }
}

return {
  review,
  content: results[0]
}
```

### Authorization Errors

**Unauthorized Edit Attempt:**
```typescript
if (review.user_id !== req.user.id) {
  return res.status(403).json({ 
    error: 'Forbidden',
    message: 'You can only edit your own reviews'
  })
}
```

**Edit Limit Exceeded:**
```typescript
if (review.edit_count >= 5) {
  return res.status(400).json({ 
    error: 'Edit limit exceeded',
    message: 'Maximum 5 edits allowed per review',
    current: review.edit_count,
    maximum: 5
  })
}
```

**Self-Like Prevention:**
```typescript
if (review.user_id === req.user.id) {
  return res.status(400).json({ 
    error: 'Cannot like your own review'
  })
}
```

### Rate Limiting Errors

**Review Rate Limit Exceeded:**
```typescript
if (userData.count >= 10) {
  const resetIn = Math.ceil((userData.resetTime - Date.now()) / 1000 / 60)
  return res.status(429).json({ 
    error: 'Too many reviews',
    message: 'You have submitted too many reviews. Please try again later.',
    limit: 10,
    resetIn: `${resetIn} minutes`
  })
}
```

**Rating Rate Limit Exceeded:**
```typescript
if (userData.count >= 50) {
  const resetIn = Math.ceil((userData.resetTime - Date.now()) / 1000 / 60)
  return res.status(429).json({ 
    error: 'Too many ratings',
    message: 'You have submitted too many ratings. Please try again later.',
    limit: 50,
    resetIn: `${resetIn} minutes`
  })
}
```

### Network Errors

**Timeout Handling:**
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

try {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
    signal: controller.signal
  })
  clearTimeout(timeout)
  return await response.json()
} catch (error) {
  clearTimeout(timeout)
  if (error.name === 'AbortError') {
    throw new Error('Request timeout: Review submission took too long')
  }
  throw error
}
```

**Retry Logic for Failed Requests:**
```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      
      // Retry server errors (5xx)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
        continue
      }
      
      return response
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      throw error
    }
  }
}
```

### Error Logging

**Comprehensive Error Logging:**
```typescript
function logError(context: string, error: any, metadata?: Record<string, any>) {
  console.error(`[${new Date().toISOString()}] ${context}:`, {
    error: error.message || error,
    stack: error.stack,
    ...metadata
  })
  
  // Send to error tracking service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: metadata })
  }
}

// Usage
try {
  await submitReview(reviewData)
} catch (error) {
  logError('Review submission failed', error, {
    userId,
    externalId,
    contentType,
    reviewTextLength: reviewData.review_text.length
  })
  throw error
}
```

**Frontend Error Display:**
```typescript
// In ReviewForm component
const [error, setError] = useState<string | null>(null)

async function handleSubmit() {
  setError(null)
  
  try {
    await submitReview(reviewData)
    onSuccess()
  } catch (error: any) {
    // Display user-friendly error message
    if (error.response?.status === 429) {
      setError('You have submitted too many reviews. Please try again later.')
    } else if (error.response?.status === 409) {
      setError('You have already reviewed this content. Please edit your existing review.')
    } else if (error.response?.status === 400) {
      setError(error.response.data.error || 'Invalid input. Please check your review.')
    } else {
      setError('Failed to submit review. Please try again.')
    }
  }
}

return (
  <form onSubmit={handleSubmit}>
    {error && (
      <div className="error-message" role="alert">
        {error}
      </div>
    )}
    {/* Form fields */}
  </form>
)
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Rating Value Validation

*For any* rating submission, if the rating_value is an integer between 1 and 10 inclusive, the system should accept it; otherwise, the system should reject it with a validation error.

**Validates: Requirements 1.2, 38.1, 38.2, 38.4**

### Property 2: Rating Upsert Behavior

*For any* user and content combination (user_id, external_id, content_type), submitting a rating multiple times should result in only one rating record existing, with the rating_value updated to the most recent submission.

**Validates: Requirements 1.3, 1.4**

### Property 3: Review Text Length Validation

*For any* review submission, if the review_text length (after trimming) is between 10 and 5000 characters inclusive, the system should accept it; otherwise, the system should reject it with a validation error.

**Validates: Requirements 2.2**

### Property 4: Review Uniqueness

*For any* user and content combination (user_id, external_id, content_type), only one review should exist in the database at any time.

**Validates: Requirements 2.3**

### Property 5: Review Language Storage

*For any* review submission with language selection ('ar' or 'en'), the stored review should have the same language value as was submitted.

**Validates: Requirements 2.4**

### Property 6: Optional Review Rating

*For any* review submission, the system should accept reviews with rating set to null (no rating) or with a valid rating value (1-10).

**Validates: Requirements 2.5**

### Property 7: Aggregate Rating Calculation

*For any* set of ratings for a content item, the calculated average_rating should equal the sum of all rating_values divided by the count, rounded to one decimal place.

**Validates: Requirements 3.1, 3.4**

### Property 8: Rating Count Accuracy

*For any* content item, the returned rating_count should equal the number of rating records in the database for that external_id and content_type.

**Validates: Requirements 3.2**

### Property 9: Batch Aggregate Order Preservation

*For any* array of content items sent to the batch aggregate endpoint, the response array should contain results in the same order as the input array.

**Validates: Requirements 3.5**

### Property 10: Review Display Completeness

*For any* review rendered in the UI, the displayed output should contain the review author's username, avatar, rating (if present), title (if present), review_text, and timestamp.

**Validates: Requirements 4.2**

### Property 11: Helpful Count Accuracy

*For any* review, the displayed helpful_count should equal the number of records in the review_likes table for that review_id.

**Validates: Requirements 4.3, 6.4**

### Property 12: User Review Indicator

*For any* content page, if the current user has submitted a review for that content, the UI should display an indicator showing they have already reviewed it.

**Validates: Requirements 4.4**

### Property 13: Review Ownership Controls

*For any* review, edit and delete buttons should be visible if and only if the review's user_id matches the current user's id.

**Validates: Requirements 5.1**

### Property 14: Review Edit Form Population

*For any* review being edited, the review form fields (title, review_text, rating, language, contains_spoilers) should be populated with the existing review's values.

**Validates: Requirements 5.2**

### Property 15: Review Edit Metadata Update

*For any* review edit submission, the system should update the review's updated_at timestamp to the current time and increment edit_count by 1.

**Validates: Requirements 5.3, 26.1, 26.2, 26.3**

### Property 16: Review Deletion Cascade

*For any* review deletion, the review record and all associated review_likes records should be removed from the database.

**Validates: Requirements 5.4**

### Property 17: Review Authorization

*For any* review edit or delete operation, if the requesting user's id does not match the review's user_id, the operation should fail with a 403 Forbidden error.

**Validates: Requirements 5.5**

### Property 18: Review Like Creation

*For any* review like action by a user who has not previously liked that review, a new record should be inserted in the review_likes table.

**Validates: Requirements 6.2**

### Property 19: Review Like Toggle

*For any* review, if a user likes it and then likes it again, the final state should be unliked (no record in review_likes table for that user and review).

**Validates: Requirements 6.3**

### Property 20: Self-Like Prevention

*For any* review, if a user attempts to like their own review (user_id matches review's user_id), the operation should fail with an error.

**Validates: Requirements 6.5**

### Property 21: Review Sort Order Correctness

*For any* set of reviews sorted by a given criterion (most_helpful, newest, highest_rating, lowest_rating), each review in the result should have a sort value greater than or equal to the next review's sort value.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 22: Review Language Filtering

*For any* language filter ('ar', 'en', or 'all'), the returned reviews should only include reviews matching that language, or all reviews if filter is 'all'.

**Validates: Requirements 7.5**

### Property 23: Review Submission Rate Limiting

*For any* non-admin user, submitting more than 10 reviews within a 1-hour window should result in the 11th submission failing with a 429 rate limit error.

**Validates: Requirements 8.1**

### Property 24: Rate Limit Reset

*For any* user who has hit a rate limit, after 1 hour from their first submission in the window, they should be able to submit again without rate limit errors.

**Validates: Requirements 8.4, 9.4**

### Property 25: Admin Rate Limit Exemption

*For any* user with role 'admin' or 'supervisor', rate limits should not apply to their review or rating submissions.

**Validates: Requirements 8.5**

### Property 26: Rating Submission Rate Limiting

*For any* non-admin user, submitting more than 50 new ratings within a 1-hour window should result in the 51st submission failing with a 429 rate limit error.

**Validates: Requirements 9.1**

### Property 27: Rating Update Exemption

*For any* existing rating update (changing rating_value for same user_id, external_id, content_type), the rate limit counter should not increment.

**Validates: Requirements 9.5**

### Property 28: Review Activity Creation

*For any* review submission, an activity_feed entry with type 'review' should be created with the review's external_id stored in the metadata.

**Validates: Requirements 10.1, 10.2**

### Property 29: Activity Feed Review Display

*For any* review activity in the activity feed, the displayed data should include the review's title (if present), rating (if present), and an excerpt of the first 150 characters of review_text.

**Validates: Requirements 10.4**

### Property 30: External ID Validation

*For any* review or rating submission, if external_id is null, empty string, or whitespace-only, the system should reject the operation with a validation error.

**Validates: Requirements 20.1, 20.4**

### Property 31: Content Type Validation

*For any* review or rating submission, if content_type is not one of ['movie', 'tv', 'game', 'software'], the system should reject the operation with a validation error.

**Validates: Requirements 20.2**

### Property 32: Default External Source

*For any* movie or tv review/rating submission where external_source is not provided, the system should default external_source to 'tmdb'.

**Validates: Requirements 20.3**

### Property 33: Edit Badge Display

*For any* review where edit_count is greater than 0, the UI should display an "Edited" badge.

**Validates: Requirements 26.4**

### Property 34: Edit Limit Enforcement

*For any* review with edit_count equal to 5, further edit attempts should fail with an error indicating the edit limit has been reached.

**Validates: Requirements 26.5**


## Testing Strategy

### Dual Testing Approach

The ratings and reviews system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples and edge cases
- Integration points between components
- Error conditions and boundary cases
- UI component rendering
- API endpoint responses

**Property-Based Tests:**
- Universal properties across all inputs
- Comprehensive input coverage through randomization
- Validation logic across input ranges
- Data integrity properties
- Business logic invariants

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library Selection:**
- **JavaScript/TypeScript**: fast-check (recommended for Node.js and browser)
- **Backend Tests**: fast-check with Jest or Vitest
- **Frontend Tests**: fast-check with React Testing Library

**Test Configuration:**
```typescript
import fc from 'fast-check'

// Minimum 100 iterations per property test
fc.assert(
  fc.property(/* arbitraries */, (/* inputs */) => {
    // Property assertion
  }),
  { numRuns: 100 } // Minimum iterations
)
```

**Tagging Requirements:**

Each property-based test MUST include a comment tag referencing the design document property:

```typescript
/**
 * Feature: ratings-and-reviews-system, Property 1: Rating Value Validation
 * 
 * For any rating submission, if the rating_value is an integer between 1 and 10 
 * inclusive, the system should accept it; otherwise, the system should reject it 
 * with a validation error.
 */
test('Property 1: Rating value validation', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -100, max: 100 }),
      (ratingValue) => {
        const isValid = ratingValue >= 1 && ratingValue <= 10
        const result = validateRatingValue(ratingValue)
        
        if (isValid) {
          expect(result.valid).toBe(true)
        } else {
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Test Examples

**Rating Submission:**
```typescript
describe('Rating Submission', () => {
  test('should accept valid rating of 8', async () => {
    const result = await submitRating(userId, '550', 'movie', 8)
    expect(result.rating_value).toBe(8)
  })
  
  test('should reject rating of 0', async () => {
    await expect(
      submitRating(userId, '550', 'movie', 0)
    ).rejects.toThrow('Rating must be between 1 and 10')
  })
  
  test('should reject rating of 11', async () => {
    await expect(
      submitRating(userId, '550', 'movie', 11)
    ).rejects.toThrow('Rating must be between 1 and 10')
  })
  
  test('should reject decimal rating of 7.5', async () => {
    await expect(
      submitRating(userId, '550', 'movie', 7.5)
    ).rejects.toThrow('Rating must be an integer')
  })
})
```

**Review Text Validation:**
```typescript
describe('Review Text Validation', () => {
  test('should accept review with 10 characters', async () => {
    const result = await submitReview({
      userId,
      externalId: '550',
      contentType: 'movie',
      reviewText: 'Great film',
      language: 'en'
    })
    expect(result.id).toBeDefined()
  })
  
  test('should reject review with 9 characters', async () => {
    await expect(
      submitReview({
        userId,
        externalId: '550',
        contentType: 'movie',
        reviewText: 'Too short',
        language: 'en'
      })
    ).rejects.toThrow('Review text must be at least 10 characters')
  })
  
  test('should reject review with 5001 characters', async () => {
    const longText = 'a'.repeat(5001)
    await expect(
      submitReview({
        userId,
        externalId: '550',
        contentType: 'movie',
        reviewText: longText,
        language: 'en'
      })
    ).rejects.toThrow('Review text must be 5000 characters or less')
  })
})
```

### Property-Based Test Examples

**Property 1: Rating Value Validation**
```typescript
/**
 * Feature: ratings-and-reviews-system, Property 1: Rating Value Validation
 */
test('Property 1: Rating value validation', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -100, max: 100 }),
      (ratingValue) => {
        const isValid = ratingValue >= 1 && ratingValue <= 10
        const result = validateRatingValue(ratingValue)
        
        return isValid ? result.valid : !result.valid
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property 2: Rating Upsert Behavior**
```typescript
/**
 * Feature: ratings-and-reviews-system, Property 2: Rating Upsert Behavior
 */
test('Property 2: Rating upsert behavior', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.string(), // userId
      fc.string(), // externalId
      fc.constantFrom('movie', 'tv', 'game', 'software'),
      fc.integer({ min: 1, max: 10 }),
      fc.integer({ min: 1, max: 10 }),
      async (userId, externalId, contentType, rating1, rating2) => {
        // Submit first rating
        await submitRating(userId, externalId, contentType, rating1)
        
        // Submit second rating
        await submitRating(userId, externalId, contentType, rating2)
        
        // Query database
        const ratings = await getRatings(userId, externalId, contentType)
        
        // Should only have one rating with the second value
        expect(ratings.length).toBe(1)
        expect(ratings[0].rating_value).toBe(rating2)
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property 7: Aggregate Rating Calculation**
```typescript
/**
 * Feature: ratings-and-reviews-system, Property 7: Aggregate Rating Calculation
 */
test('Property 7: Aggregate rating calculation', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 100 }),
      (ratings) => {
        const sum = ratings.reduce((acc, val) => acc + val, 0)
        const expected = Math.round((sum / ratings.length) * 10) / 10
        
        const result = calculateAggregateRating(
          ratings.map(r => ({ rating_value: r }))
        )
        
        expect(result.average_rating).toBe(expected)
        expect(result.rating_count).toBe(ratings.length)
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property 19: Review Like Toggle**
```typescript
/**
 * Feature: ratings-and-reviews-system, Property 19: Review Like Toggle
 */
test('Property 19: Review like toggle', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.string(), // reviewId
      fc.string(), // userId
      async (reviewId, userId) => {
        // Like the review
        await likeReview(reviewId, userId)
        const afterFirstLike = await getReviewLikeStatus(reviewId, userId)
        expect(afterFirstLike).toBe(true)
        
        // Unlike the review (toggle)
        await likeReview(reviewId, userId)
        const afterSecondLike = await getReviewLikeStatus(reviewId, userId)
        expect(afterSecondLike).toBe(false)
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property 21: Review Sort Order Correctness**
```typescript
/**
 * Feature: ratings-and-reviews-system, Property 21: Review Sort Order Correctness
 */
test('Property 21: Review sort order correctness', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.string(),
          helpful_count: fc.integer({ min: 0, max: 1000 }),
          created_at: fc.date(),
          rating: fc.option(fc.integer({ min: 1, max: 10 }))
        }),
        { minLength: 2, maxLength: 50 }
      ),
      fc.constantFrom('most_helpful', 'newest', 'highest_rating', 'lowest_rating'),
      (reviews, sortBy) => {
        const sorted = sortReviews(reviews, sortBy)
        
        // Check that each item is >= next item according to sort criterion
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i]
          const next = sorted[i + 1]
          
          if (sortBy === 'most_helpful') {
            expect(current.helpful_count).toBeGreaterThanOrEqual(next.helpful_count)
          } else if (sortBy === 'newest') {
            expect(current.created_at.getTime()).toBeGreaterThanOrEqual(next.created_at.getTime())
          } else if (sortBy === 'highest_rating') {
            const currentRating = current.rating ?? -1
            const nextRating = next.rating ?? -1
            expect(currentRating).toBeGreaterThanOrEqual(nextRating)
          } else if (sortBy === 'lowest_rating') {
            const currentRating = current.rating ?? 11
            const nextRating = next.rating ?? 11
            expect(currentRating).toBeLessThanOrEqual(nextRating)
          }
        }
      }
    ),
    { numRuns: 100 }
  )
})
```

### Integration Tests

**Review Submission Flow:**
```typescript
describe('Review Submission Integration', () => {
  test('should create review, activity, and delete draft', async () => {
    // Save draft
    await saveReviewDraft({
      userId,
      externalId: '550',
      contentType: 'movie',
      reviewText: 'Draft review text',
      language: 'en'
    })
    
    // Submit review
    const review = await submitReview({
      userId,
      externalId: '550',
      contentType: 'movie',
      reviewText: 'Final review text',
      rating: 8,
      language: 'en'
    })
    
    // Verify review created
    expect(review.id).toBeDefined()
    
    // Verify activity created
    const activities = await getActivityFeed(userId)
    const reviewActivity = activities.find(a => a.type === 'review')
    expect(reviewActivity).toBeDefined()
    expect(reviewActivity.metadata.external_id).toBe('550')
    
    // Verify draft deleted
    const draft = await getReviewDraft(userId, '550', 'movie')
    expect(draft).toBeNull()
  })
})
```

**Aggregate Rating with Cache:**
```typescript
describe('Aggregate Rating Caching', () => {
  test('should cache and invalidate aggregate ratings', async () => {
    const externalId = '550'
    const contentType = 'movie'
    
    // Submit first rating
    await submitRating(user1Id, externalId, contentType, 8)
    
    // Fetch aggregate (should calculate and cache)
    const first = await getAggregateRating(externalId, contentType)
    expect(first.average_rating).toBe(8.0)
    expect(first.rating_count).toBe(1)
    
    // Fetch again (should use cache)
    const second = await getAggregateRating(externalId, contentType)
    expect(second).toEqual(first)
    
    // Submit second rating (should invalidate cache)
    await submitRating(user2Id, externalId, contentType, 10)
    
    // Fetch aggregate (should recalculate)
    const third = await getAggregateRating(externalId, contentType)
    expect(third.average_rating).toBe(9.0)
    expect(third.rating_count).toBe(2)
  })
})
```

### Test Coverage Goals

**Minimum Coverage Targets:**
- Unit Tests: 80% code coverage
- Property Tests: All 34 correctness properties implemented
- Integration Tests: All critical user flows covered
- E2E Tests: Happy path for review submission and display

**Critical Paths to Test:**
1. Rating submission → Aggregate calculation → Display on cards
2. Review submission → Activity creation → Feed display
3. Review like → Count update → Notification
4. Review edit → Metadata update → Badge display
5. Rate limiting → Error response → Reset after window


## Summary

This design document specifies a comprehensive ratings and reviews system for Cinema.online that:

**Architecture:**
- Follows the established pattern: Supabase for user data (ratings, reviews), CockroachDB for content
- Uses external_id (TMDB ID) as the bridge between databases
- Implements graceful degradation when content is missing

**Database Schema:**
- 6 new Supabase tables: ratings, reviews, review_likes, review_reports, review_drafts, review_views
- Comprehensive indexes for performance
- Proper constraints and cascading deletes

**API Endpoints:**
- RESTful endpoints for ratings (POST, DELETE, GET)
- RESTful endpoints for reviews (POST, PUT, DELETE, GET)
- Batch aggregate rating endpoint for efficient content card rendering
- Review search and filtering endpoints

**Frontend Components:**
- RatingInput: Interactive 1-10 star rating
- ReviewForm: Bilingual review editor with auto-save
- ReviewCard: Rich review display with interactions
- ReviewList: Filtered and sorted review list
- AggregateRating: Visual rating display
- ReviewFilters: Sort and filter controls

**Performance:**
- 5-minute caching for aggregate ratings
- Cursor-based pagination for large datasets
- Batch queries for multiple content items
- Optimized database indexes

**Security:**
- Content sanitization (DOMPurify)
- XSS prevention
- Authentication validation on all write operations
- Authorization checks for edit/delete
- Rate limiting (10 reviews/hour, 50 ratings/hour)
- Input validation on frontend and backend

**Integration:**
- Activity feed integration for review activities
- Notification system for review likes and reports
- User profile statistics
- Batch content API usage for efficient data fetching

**Testing:**
- 34 correctness properties for property-based testing
- Comprehensive unit tests for edge cases
- Integration tests for critical flows
- Minimum 100 iterations per property test

The system is designed to scale, maintain data integrity, prevent abuse, and provide an excellent user experience for both Arabic and English speakers.

