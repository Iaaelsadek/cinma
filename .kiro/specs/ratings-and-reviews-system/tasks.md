# Implementation Plan: Ratings and Reviews System

## Overview

This implementation adds a comprehensive ratings and reviews system to Cinema.online, enabling users to rate content (movies, TV series, games, software) on a 1-10 scale and write detailed bilingual reviews (Arabic/English) with social interactions and moderation capabilities.

**Key Implementation Points:**
- Backend: JavaScript/TypeScript (Node.js + Express.js)
- Frontend: TypeScript/React
- Database: Supabase (PostgreSQL) for user data (ratings, reviews), CockroachDB for content
- Bridge: external_id (TMDB ID) connects user data to content
- Rate Limiting: In-memory rate limiting for spam prevention
- Caching: 5-minute cache for aggregate ratings

**Architectural Principle:**
- Supabase = Auth & User Data ONLY (ratings, reviews, review_likes, etc.)
- CockroachDB = ALL Content (movies, tv_series, games, software)
- Bridge via external_id (TMDB ID stored as TEXT)

## Tasks

- [x] 1. Create Supabase database schema
  - [x] 1.1 Create ratings table
    - Create ratings table with columns: id, user_id, external_id, external_source, content_type, rating_value, created_at, updated_at
    - Add unique constraint on (user_id, external_id, content_type)
    - Add check constraint: rating_value between 1 and 10
    - Add indexes: (user_id, created_at DESC), (external_id, content_type), (external_id, content_type, rating_value)
    - Use Supabase SQL Editor or migration file
    - _Requirements: 1.1, 1.2, 1.3, 28.1_

  - [x] 1.2 Create reviews table
    - Create reviews table with columns: id, user_id, external_id, external_source, content_type, title, review_text, rating, language, contains_spoilers, is_hidden, is_verified, edit_count, created_at, updated_at
    - Add unique constraint on (user_id, external_id, content_type)
    - Add check constraints: review_text length 10-5000, title length max 200, rating 1-10 or null, language in ('ar', 'en')
    - Add indexes: (external_id, content_type, created_at DESC), (user_id, created_at DESC), (language, created_at DESC), (rating DESC, created_at DESC), (is_hidden, created_at DESC)
    - Add full-text search index on review_text and title
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 14.1, 26.1, 26.2, 28.2, 28.3_
  
  - [x] 1.3 Create review_likes table
    - Create review_likes table with columns: id, review_id, user_id, created_at
    - Add unique constraint on (review_id, user_id)
    - Add foreign key: review_id references reviews(id) ON DELETE CASCADE
    - Add indexes: (review_id), (user_id, review_id), (user_id, created_at DESC)
    - _Requirements: 6.1, 6.2, 6.3, 28.4_
  
  - [x] 1.4 Create review_reports table
    - Create review_reports table with columns: id, review_id, reporter_user_id, reason, status, created_at, reviewed_at, reviewed_by
    - Add unique constraint on (review_id, reporter_user_id)
    - Add check constraint: reason length 10-500, status in ('pending', 'reviewed', 'dismissed')
    - Add indexes: (status, created_at DESC), (review_id)
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  
  - [x] 1.5 Create review_drafts table
    - Create review_drafts table with columns: id, user_id, external_id, external_source, content_type, title, review_text, rating, language, contains_spoilers, updated_at
    - Add unique constraint on (user_id, external_id, content_type)
    - Add index: (user_id, updated_at DESC)
    - _Requirements: 36.1, 36.2, 36.3_
  
  - [x] 1.6 Create review_views table
    - Create review_views table with columns: id, review_id, user_id, viewed_at
    - Add indexes: (review_id), (user_id, viewed_at DESC)
    - _Requirements: 39.1, 39.5_
  
  - [x]* 1.7 Write property test for database schema constraints
    - **Property 1: Rating Value Validation**
    - **Validates: Requirements 1.2, 38.1, 38.2, 38.4**
    - Generate random rating values and verify database accepts 1-10, rejects others
    - Test with 100+ iterations using fast-check

- [x] 2. Checkpoint - Verify database schema
  - Ensure all tables created with correct constraints and indexes, ask the user if questions arise.

- [x] 3. Create backend rate limiting middleware
  - [x] 3.1 Implement rate limiter utility
    - Create server/middleware/rateLimiter.js
    - Implement createRateLimiter function with in-memory cache (NodeCache)
    - Support configurable maxRequests, windowMs, and error message
    - Exempt admin and supervisor roles from rate limiting
    - Track rate limits per user_id with automatic reset after window expires
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 3.2 Create review rate limiter
    - Export rateLimitReviews middleware (10 reviews per hour)
    - Return 429 status with descriptive error message when limit exceeded
    - Include resetIn time in error response
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 3.3 Create rating rate limiter
    - Export rateLimitRatings middleware (50 ratings per hour)
    - Exclude rating updates from rate limit counter (only count new ratings)
    - Return 429 status with descriptive error message when limit exceeded
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  
  - [x]* 3.4 Write property test for rate limiting
    - **Property 23: Review Submission Rate Limiting**
    - **Validates: Requirements 8.1**
    - Verify 11th review submission within 1 hour fails with 429 error
  
  - [x]* 3.5 Write property test for rate limit reset
    - **Property 24: Rate Limit Reset**
    - **Validates: Requirements 8.4, 9.4**
    - Verify rate limit resets after 1 hour window

- [x] 4. Create backend API endpoints for ratings
  - [x] 4.1 Implement POST /api/ratings endpoint
    - Create server/routes/reviews.js (or add to existing routes file)
    - Accept: external_id, content_type, rating_value, external_source (default 'tmdb')
    - Validate: rating_value is integer 1-10, content_type is valid, external_id is non-empty
    - Use Supabase upsert with conflict on (user_id, external_id, content_type)
    - Invalidate aggregate rating cache after successful submission
    - Apply authenticateUser and rateLimitRatings middleware
    - _Requirements: 16.1, 1.2, 1.3, 1.4, 20.1, 20.2, 20.3, 38.1_

  - [x] 4.2 Implement DELETE /api/ratings endpoint
    - Accept query parameters: external_id, content_type
    - Delete rating for current user
    - Invalidate aggregate rating cache
    - Apply authenticateUser middleware
    - _Requirements: 16.2_
  
  - [x] 4.3 Implement GET /api/ratings/user endpoint
    - Accept query parameters: external_id, content_type
    - Return user's rating for specific content (or null if not rated)
    - Apply authenticateUser middleware
    - _Requirements: 16.3, 19.1, 19.2_
  
  - [x] 4.4 Implement GET /api/ratings/aggregate endpoint
    - Accept query parameters: external_id, content_type
    - Check cache first (5-minute TTL)
    - Query Supabase ratings table and calculate average (rounded to 1 decimal)
    - Return: average_rating (null if no ratings), rating_count
    - Cache result for 5 minutes
    - _Requirements: 16.4, 3.1, 3.2, 3.3, 3.4, 25.1, 25.2, 25.4, 25.5_
  
  - [x] 4.5 Implement POST /api/ratings/aggregate/batch endpoint
    - Accept array of {external_id, content_type} objects (max 100)
    - Check cache for each item
    - Query Supabase in parallel for cache misses (group by content_type)
    - Calculate aggregates and cache results
    - Return results in same order as input array
    - _Requirements: 16.5, 3.5, 11.5, 25.1, 25.2_
  
  - [x]* 4.6 Write property test for rating upsert behavior
    - **Property 2: Rating Upsert Behavior**
    - **Validates: Requirements 1.3, 1.4**
    - Verify multiple rating submissions result in single record with latest value
  
  - [x]* 4.7 Write property test for aggregate rating calculation
    - **Property 7: Aggregate Rating Calculation**
    - **Validates: Requirements 3.1, 3.4**
    - Verify average equals sum/count rounded to 1 decimal place
  
  - [x]* 4.8 Write unit tests for rating endpoints
    - Test valid rating submission (1-10)
    - Test invalid rating values (0, 11, 7.5, null)
    - Test rating update (upsert behavior)
    - Test rating deletion
    - Test aggregate calculation with various rating sets
    - Test batch endpoint with multiple items
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 5. Checkpoint - Verify rating endpoints
  - Ensure all rating endpoints working correctly, ask the user if questions arise.

- [x] 6. Create backend API endpoints for reviews
  - [x] 6.1 Implement content sanitization utility
    - Create server/utils/sanitize.js
    - Implement sanitizeReviewText function (remove all HTML tags, trim whitespace)
    - Implement sanitizeReviewTitle function (remove HTML and scripts)
    - Use DOMPurify or similar library
    - _Requirements: 29.1, 29.2, 29.3, 29.4_
  
  - [x] 6.2 Implement POST /api/reviews endpoint
    - Accept: external_id, content_type, review_text, title (optional), rating (optional), language, contains_spoilers (optional)
    - Sanitize review_text and title before validation
    - Validate: review_text 10-5000 chars, title max 200 chars, rating 1-10 or null, language 'ar' or 'en'
    - Check if user already reviewed (unique constraint)
    - Check review verification (query history table for external_id match)
    - Insert review into Supabase with is_verified flag
    - Create activity_feed entry with type 'review'
    - Delete review draft if exists
    - Apply authenticateUser and rateLimitReviews middleware
    - _Requirements: 15.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 10.1, 10.2, 36.4, 40.1, 40.2, 40.3_
  
  - [x] 6.3 Implement PUT /api/reviews/:id endpoint
    - Accept: review_text (optional), title (optional), rating (optional), contains_spoilers (optional)
    - Verify user owns the review (user_id matches)
    - Check edit_count < 5 (max 5 edits allowed)
    - Sanitize inputs before validation
    - Update review with new values, increment edit_count, update updated_at
    - Apply authenticateUser middleware
    - _Requirements: 15.2, 5.1, 5.2, 5.3, 26.3, 26.5_
  
  - [x] 6.4 Implement DELETE /api/reviews/:id endpoint
    - Verify user owns the review
    - Delete review (cascades to review_likes and review_reports)
    - Apply authenticateUser middleware
    - _Requirements: 15.3, 5.4, 5.5_
  
  - [x] 6.5 Implement GET /api/reviews endpoint
    - Accept query params: external_id, content_type, sort, language, rating_filter, limit, offset
    - Validate: external_id required, content_type required
    - Filter: language ('ar', 'en', 'all'), rating_filter ('all', 'positive' 7-10, 'mixed' 4-6, 'negative' 1-3)
    - Sort: 'most_helpful' (join review_likes), 'newest', 'highest_rating', 'lowest_rating'
    - Exclude is_hidden reviews
    - Fetch helpful_count for each review (count from review_likes)
    - Include user profile data (join profiles table)
    - Support pagination (default 20, max 100 per page)
    - Return: reviews array, pagination metadata (total, limit, offset, hasMore)
    - _Requirements: 15.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 7.4, 7.5, 18.1, 18.2, 18.3, 18.4, 33.1, 33.2, 33.3, 33.4_

  - [x] 6.6 Implement GET /api/reviews/:id endpoint
    - Fetch single review by ID
    - Include user profile data
    - Include helpful_count
    - Return 404 if not found
    - _Requirements: 15.5_
  
  - [x] 6.7 Implement GET /api/reviews/search endpoint
    - Accept query params: q (search query), limit, offset
    - Search in review_text and title fields (case-insensitive)
    - Support Arabic and English text search
    - Order by relevance then helpful_count
    - Limit results to 100 maximum
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  
  - [x]* 6.8 Write property test for review text validation
    - **Property 3: Review Text Length Validation**
    - **Validates: Requirements 2.2**
    - Verify reviews with 10-5000 chars accepted, others rejected
  
  - [x]* 6.9 Write property test for review uniqueness
    - **Property 4: Review Uniqueness**
    - **Validates: Requirements 2.3**
    - Verify only one review exists per user-content combination
  
  - [x]* 6.10 Write unit tests for review endpoints
    - Test review creation with valid inputs
    - Test review creation with invalid text length
    - Test duplicate review rejection
    - Test review update by owner
    - Test review update by non-owner (should fail)
    - Test review deletion
    - Test review filtering and sorting
    - Test review search
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 22.1_

- [x] 7. Create backend API endpoints for review interactions
  - [x] 7.1 Implement POST /api/reviews/:id/like endpoint
    - Check if review exists and get author user_id
    - Prevent users from liking their own reviews
    - Check if user already liked (query review_likes)
    - If liked: delete like record (unlike)
    - If not liked: insert like record, create notification for review author
    - Return: liked (boolean), like_count (updated count)
    - Apply authenticateUser middleware
    - _Requirements: 17.1, 17.3, 6.2, 6.3, 6.5, 31.1_
  
  - [x] 7.2 Implement GET /api/reviews/:id/likes endpoint
    - Return like count for review
    - _Requirements: 17.2_

  - [x] 7.3 Implement POST /api/reviews/:id/report endpoint
    - Accept: reason (10-500 chars)
    - Validate reason length
    - Check for duplicate report (same user, same review)
    - Insert report with status 'pending'
    - Create notifications for all moderators (admin and supervisor roles)
    - Apply authenticateUser middleware
    - _Requirements: 24.1, 24.2, 24.3, 24.5_
  
  - [x] 7.4 Implement GET /api/reviews/user/:userId/stats endpoint
    - Calculate total_reviews (count from reviews where user_id and not is_hidden)
    - Calculate total_helpful_votes (count from review_likes for user's reviews)
    - Calculate average_rating (average of rating field for user's reviews)
    - Return statistics object
    - _Requirements: 23.1, 23.2, 23.3, 23.4_
  
  - [x]* 7.5 Write property test for review like toggle
    - **Property 19: Review Like Toggle**
    - **Validates: Requirements 6.3**
    - Verify liking twice results in unliked state
  
  - [x]* 7.6 Write property test for self-like prevention
    - **Property 20: Self-Like Prevention**
    - **Validates: Requirements 6.5**
    - Verify users cannot like their own reviews
  
  - [x]* 7.7 Write unit tests for review interaction endpoints
    - Test like creation
    - Test like toggle (unlike)
    - Test self-like prevention
    - Test review reporting
    - Test duplicate report prevention
    - Test user stats calculation
    - _Requirements: 17.1, 17.2, 17.3, 24.1, 24.2, 23.4_

- [x] 8. Create backend admin endpoints for moderation
  - [x] 8.1 Implement GET /api/admin/reviews endpoint
    - Require admin or supervisor role
    - Return all reviews including is_hidden ones
    - Support filtering by is_hidden status
    - Apply authenticateUser middleware with role check
    - _Requirements: 14.4_
  
  - [x] 8.2 Implement PUT /api/admin/reviews/:id/hide endpoint
    - Require admin or supervisor role
    - Set is_hidden to true
    - Apply authenticateUser middleware with role check
    - _Requirements: 14.2, 14.5_
  
  - [x] 8.3 Implement PUT /api/admin/reviews/:id/unhide endpoint
    - Require admin or supervisor role
    - Set is_hidden to false
    - Apply authenticateUser middleware with role check
    - _Requirements: 14.5_

  - [x] 8.4 Implement GET /api/admin/reports endpoint
    - Require admin or supervisor role
    - Return all review reports with review and reporter details
    - Support filtering by status ('pending', 'reviewed', 'dismissed')
    - Order by created_at DESC
    - Apply authenticateUser middleware with role check
    - _Requirements: 24.4_
  
  - [x] 8.5 Implement PUT /api/admin/reports/:id/status endpoint
    - Require admin or supervisor role
    - Update report status and set reviewed_by, reviewed_at
    - Apply authenticateUser middleware with role check
    - _Requirements: 24.4_
  
  - [x]* 8.6 Write unit tests for admin endpoints
    - Test admin can view all reviews including hidden
    - Test admin can hide/unhide reviews
    - Test non-admin cannot access admin endpoints
    - Test admin can view and update reports
    - _Requirements: 14.2, 14.4, 14.5, 24.4_

- [x] 9. Checkpoint - Verify all backend endpoints
  - Ensure all API endpoints working correctly with proper authentication and validation, ask the user if questions arise.

- [x] 10. Create Supabase helper functions
  - [x] 10.1 Implement rating functions in src/lib/supabase.ts
    - submitRating(userId, externalId, contentType, ratingValue): upsert rating
    - getUserRating(userId, externalId, contentType): get user's rating or null
    - deleteRating(userId, externalId, contentType): delete user's rating
    - Add input validation (reject null/empty external_id)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 20.1, 20.4_
  
  - [x] 10.2 Implement review functions in src/lib/supabase.ts
    - submitReview(args): insert review with validation
    - updateReview(reviewId, userId, updates): update review with ownership check
    - deleteReview(reviewId, userId): delete review with ownership check
    - getReviews(externalId, contentType, options): fetch reviews with filtering/sorting
    - getUserReview(userId, externalId, contentType): get user's review or null
    - searchReviews(query, options): search reviews by keywords
    - Add input validation for all functions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 22.1_
  
  - [x] 10.3 Implement review interaction functions in src/lib/supabase.ts
    - likeReview(reviewId, userId): toggle like and return status
    - getReviewLikeStatus(reviewId, userId): check if user liked review
    - getReviewLikeCount(reviewId): get like count
    - reportReview(reviewId, reporterUserId, reason): submit report
    - getUserReviewStats(userId): get user's review statistics
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 24.1, 23.4_

  - [x] 10.4 Implement review draft functions in src/lib/supabase.ts
    - saveReviewDraft(args): upsert draft
    - getReviewDraft(userId, externalId, contentType): fetch draft or null
    - deleteReviewDraft(userId, externalId, contentType): delete draft
    - _Requirements: 36.1, 36.2, 36.3, 36.4_
  
  - [x] 10.5 Implement review view tracking functions in src/lib/supabase.ts
    - trackReviewView(reviewId, userId): insert view record
    - getReviewViewCount(reviewId): get view count
    - _Requirements: 39.5_
  
  - [x]* 10.6 Write property test for external ID validation
    - **Property 30: External ID Validation**
    - **Validates: Requirements 20.1, 20.4**
    - Verify null/empty/whitespace external_ids are rejected
  
  - [x]* 10.7 Write unit tests for Supabase functions
    - Test all rating functions with valid and invalid inputs
    - Test all review functions with valid and invalid inputs
    - Test review interaction functions
    - Test draft functions
    - _Requirements: 1.1, 2.1, 6.1, 36.1_

- [x] 11. Create frontend rating components
  - [x] 11.1 Create RatingInput component
    - Location: src/components/features/reviews/RatingInput.tsx
    - Props: value, onChange, readonly, size, showValue
    - Display 10-star rating (5 stars, each representing 2 points)
    - Support hover preview before selection
    - Support keyboard navigation (arrow keys)
    - Support RTL for Arabic interface
    - Display numerical value when showValue is true (e.g., "8/10")
    - _Requirements: 1.1, 19.1, 19.3, 19.4_
  
  - [x] 11.2 Create AggregateRating component
    - Location: src/components/features/reviews/AggregateRating.tsx
    - Props: externalId, contentType, size, showCount
    - Fetch aggregate rating from backend API
    - Display star rating and numerical value (e.g., "7.8/10")
    - Display rating count (e.g., "1.2K ratings")
    - Show loading skeleton while fetching
    - Show "No ratings yet" when no ratings exist
    - Support click to scroll to reviews section
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 3.1, 3.2, 3.3_
  
  - [x]* 11.3 Write unit tests for rating components
    - Test RatingInput renders correctly
    - Test RatingInput onChange callback
    - Test AggregateRating displays correct values
    - Test AggregateRating loading and empty states
    - _Requirements: 11.1, 11.2_

- [x] 12. Create frontend review form component
  - [x] 12.1 Create ReviewForm component
    - Location: src/components/features/reviews/ReviewForm.tsx
    - Props: externalId, contentType, existingReview, onSubmit, onCancel
    - Language selector (Arabic/English) with RTL/LTR switching
    - Title input (optional, max 200 chars)
    - Review text textarea (10-5000 chars) with character counter
    - Optional rating input (use RatingInput component)
    - Spoiler warning checkbox
    - Auto-save draft every 30 seconds
    - Load existing draft on mount
    - Validation with error messages
    - Submit button disabled until valid
    - _Requirements: 12.1, 12.2, 12.3, 2.2, 13.1, 13.2, 13.3, 36.5, 37.1, 37.2_

  - [x]* 12.2 Write property test for review form validation
    - **Property 3: Review Text Length Validation**
    - **Validates: Requirements 2.2, 13.1**
    - Verify form accepts 10-5000 chars, rejects others
  
  - [x]* 12.3 Write unit tests for ReviewForm component
    - Test form renders correctly
    - Test language switching (RTL/LTR)
    - Test character counter
    - Test validation errors
    - Test auto-save draft functionality
    - Test form submission
    - _Requirements: 12.1, 12.2, 12.3, 36.5_

- [x] 13. Create frontend review display components
  - [x] 13.1 Create ReviewCard component
    - Location: src/components/features/reviews/ReviewCard.tsx
    - Props: review, currentUserId, onEdit, onDelete, onLike, onReport
    - Display user avatar and username (link to profile)
    - Display review title (if provided)
    - Display star rating (if provided) using RatingInput component
    - Display review text with "Read More" expansion for long reviews
    - Display spoiler warning with "Show Spoilers" button
    - Display helpful vote button with count
    - Display edit/delete buttons (only for review author)
    - Display report button (for other users)
    - Display verified badge (if is_verified is true)
    - Display edited badge (if edit_count > 0)
    - Display timestamp (relative time, e.g., "2 days ago")
    - Display language indicator (flag icon)
    - Support RTL/LTR text direction based on review language
    - _Requirements: 4.2, 4.3, 4.4, 5.1, 26.4, 37.3, 37.4, 37.5, 40.3_
  
  - [x] 13.2 Create ReviewList component
    - Location: src/components/features/reviews/ReviewList.tsx
    - Props: externalId, contentType, currentUserId
    - Display filter controls (language, rating range)
    - Display sort controls (most helpful, newest, highest/lowest rating)
    - Display user's own review highlighted at top
    - Display review count
    - Support pagination or infinite scroll
    - Display loading states
    - Display empty state ("No reviews yet")
    - _Requirements: 4.1, 7.1, 7.2, 7.3, 7.4, 7.5, 18.1, 18.5, 32.1, 32.3, 33.5_
  
  - [x] 13.3 Create ReviewFilters component
    - Location: src/components/features/reviews/ReviewFilters.tsx
    - Props: sort, onSortChange, language, onLanguageChange, ratingFilter, onRatingFilterChange
    - Sort dropdown (Most Helpful, Newest, Highest Rating, Lowest Rating)
    - Language tabs (All, العربية, English)
    - Rating filter buttons (All, Positive 7-10, Mixed 4-6, Negative 1-3)
    - Active filter indicators
    - Responsive layout (stacks on mobile)
    - _Requirements: 7.1, 7.5, 33.1, 33.5_

  - [x]* 13.4 Write property test for review display completeness
    - **Property 10: Review Display Completeness**
    - **Validates: Requirements 4.2**
    - Verify all required fields are displayed
  
  - [x]* 13.5 Write unit tests for review display components
    - Test ReviewCard renders all fields correctly
    - Test ReviewCard shows edit/delete for owner only
    - Test ReviewCard spoiler warning functionality
    - Test ReviewList filtering and sorting
    - Test ReviewList pagination
    - Test ReviewFilters state management
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 7.1, 18.5_

- [x] 14. Integrate reviews into content detail pages
  - [x] 14.1 Update MovieDetails page
    - Location: src/pages/media/MovieDetails.tsx (or similar)
    - Add RatingInput component for user to rate movie
    - Add AggregateRating component to display average rating
    - Add "Write Review" button that opens ReviewForm
    - Add ReviewList component to display all reviews
    - Fetch user's existing rating and review on page load
    - Handle rating submission and update UI immediately
    - Handle review submission and refresh review list
    - Use external_id (TMDB ID) from movie data
    - _Requirements: 4.1, 11.1, 19.1, 19.4, 19.5_
  
  - [x] 14.2 Update SeriesDetails page
    - Location: src/pages/media/SeriesDetails.tsx (or similar)
    - Add same rating and review functionality as MovieDetails
    - Use external_id (TMDB ID) from series data
    - _Requirements: 4.1, 11.1, 19.1_
  
  - [x] 14.3 Update GameDetails page (if exists)
    - Add rating and review functionality
    - Use external_id from game data
    - _Requirements: 4.1, 11.1_
  
  - [x] 14.4 Update SoftwareDetails page (if exists)
    - Add rating and review functionality
    - Use external_id from software data
    - _Requirements: 4.1, 11.1_
  
  - [ ]* 14.5 Write integration tests for content detail pages
    - Test rating submission flow
    - Test review submission flow
    - Test review editing flow
    - Test review deletion flow
    - _Requirements: 4.1, 5.1, 5.3, 5.4, 19.5_

- [x] 15. Integrate aggregate ratings into content cards
  - [x] 15.1 Update content card components to display ratings
    - Update VideoCard, MovieCard, SeriesCard components
    - Add AggregateRating component to each card
    - Fetch aggregate ratings in batch for all visible cards
    - Use POST /api/ratings/aggregate/batch endpoint
    - Display rating as stars or numerical value (e.g., "7.8/10")
    - Display rating count (e.g., "1.2K ratings")
    - Show "No ratings yet" when no ratings exist
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 32.1, 32.2, 32.3, 32.4_

  - [x] 15.2 Implement batch rating fetch in content list pages
    - Update Movies, Series, Games pages
    - Collect all external_ids from visible content
    - Call batch aggregate endpoint
    - Map ratings to content items
    - Pass ratings to card components
    - _Requirements: 11.5, 32.5_
  
  - [ ]* 15.3 Write unit tests for content card rating display
    - Test rating display on cards
    - Test batch rating fetch
    - Test "No ratings yet" state
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 16. Integrate reviews into activity feed
  - [x] 16.1 Update addActivity function for reviews
    - Location: src/lib/supabase.ts or activity-related file
    - When review is submitted, create activity_feed entry with type 'review'
    - Store external_id, content_type, rating, title, review_excerpt in metadata
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 16.2 Update activity feed display component
    - Location: Activity feed component
    - Add rendering for 'review' activity type
    - Fetch content details from CockroachDB using external_id (POST /api/content/batch)
    - Display review title, rating, and excerpt (first 150 chars)
    - Display content title and poster (or "Content Unavailable" if missing)
    - Link to full review page
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [-]* 16.3 Write property test for review activity creation
    - **Property 28: Review Activity Creation**
    - **Validates: Requirements 10.1, 10.2**
    - Verify activity created with correct metadata
  
  - [ ]* 16.4 Write unit tests for activity feed review display
    - Test review activity rendering
    - Test content details fetching
    - Test missing content handling
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 17. Create review permalink pages
  - [x] 17.1 Create ReviewPage component
    - Location: src/pages/ReviewPage.tsx
    - Route: /reviews/:reviewId
    - Fetch review by ID from backend
    - Fetch content details from CockroachDB using external_id
    - Display full review with all context
    - Display content details (title, poster, etc.)
    - Handle missing review (404 error page)
    - Handle missing content (show placeholder)
    - Add Open Graph meta tags for social media sharing
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ]* 17.2 Write unit tests for ReviewPage
    - Test review page renders correctly
    - Test 404 handling for missing review
    - Test missing content handling
    - _Requirements: 30.1, 30.2, 30.4_

- [x] 18. Checkpoint - Verify frontend integration
  - Ensure all frontend components integrated and working correctly, ask the user if questions arise.

- [x] 19. Integrate reviews into user profile page
  - [x] 19.1 Add review statistics to profile
    - Location: src/pages/Profile.tsx (or similar)
    - Fetch user review stats from backend
    - Display total reviews written
    - Display total helpful votes received
    - Display average rating given
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_
  
  - [x] 19.2 Add user reviews section to profile
    - Display list of user's reviews
    - Fetch reviews from backend (GET /api/reviews with user filter)
    - Fetch content details for each review using batch endpoint
    - Display reviews with content context
    - Handle missing content gracefully
    - Support pagination
    - _Requirements: 23.1_
  
  - [ ]* 19.3 Write unit tests for profile review integration
    - Test review stats display
    - Test user reviews list
    - Test missing content handling
    - _Requirements: 23.1, 23.4_

- [x] 20. Implement review count display on content cards
  - [x] 20.1 Create backend endpoint for review counts
    - Add GET /api/reviews/count endpoint
    - Accept query params: external_id, content_type
    - Return review count for content
    - Support batch queries (POST /api/reviews/count/batch)
    - Cache counts for 5 minutes
    - _Requirements: 32.4, 32.5_
  
  - [x] 20.2 Update content cards to display review count
    - Fetch review counts in batch with aggregate ratings
    - Display count (e.g., "45 reviews")
    - Show "No reviews yet" when count is 0
    - _Requirements: 32.1, 32.2, 32.3_
  
  - [ ]* 20.3 Write unit tests for review count display
    - Test review count fetching
    - Test review count display on cards
    - _Requirements: 32.1, 32.4_

- [x] 21. Implement caching for aggregate ratings
  - [x] 21.1 Set up cache infrastructure
    - Use NodeCache or similar in-memory cache
    - Configure 5-minute TTL for aggregate ratings
    - Configure 5-minute TTL for review counts
    - _Requirements: 25.1, 25.5, 32.5_
  
  - [x] 21.2 Implement cache invalidation
    - Invalidate aggregate rating cache when new rating submitted
    - Invalidate aggregate rating cache when rating updated
    - Invalidate aggregate rating cache when rating deleted
    - Invalidate review count cache when review submitted
    - Invalidate review count cache when review deleted
    - _Requirements: 25.2, 25.3_
  
  - [ ]* 21.3 Write unit tests for caching
    - Test cache hit returns cached value
    - Test cache miss queries database
    - Test cache invalidation on rating submission
    - Test cache TTL expiration
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

- [x] 22. Implement notification system for reviews
  - [x] 22.1 Create notification for review likes
    - When user likes a review, create notification for review author
    - Include liker's username and review title in notification
    - Don't create notification for self-likes
    - Batch notifications (max 1 per review per hour)
    - _Requirements: 31.1, 31.2, 31.3, 31.4_
  
  - [x] 22.2 Mark notifications as read
    - When user views their review, mark like notifications as read
    - _Requirements: 31.5_
  
  - [ ]* 22.3 Write unit tests for review notifications
    - Test notification creation on like
    - Test no notification for self-like
    - Test notification batching
    - _Requirements: 31.1, 31.2, 31.3, 31.4_

- [x] 23. Implement review view tracking
  - [x] 23.1 Track review views
    - When review is displayed, call trackReviewView function
    - Store view with review_id and user_id (nullable for anonymous)
    - _Requirements: 39.5_
  
  - [x] 23.2 Calculate and display helpful percentage
    - Calculate: (helpful_votes / total_views) * 100
    - Only display when review has >= 10 views
    - Display as "85% found this helpful (45 of 53)"
    - _Requirements: 39.1, 39.2, 39.3, 39.4_
  
  - [ ]* 23.3 Write unit tests for view tracking
    - Test view tracking
    - Test helpful percentage calculation
    - Test percentage not shown for < 10 views
    - _Requirements: 39.1, 39.2, 39.3, 39.4_

- [x] 24. Implement content verification for reviews
  - [x] 24.1 Check user history for verification
    - When review is submitted, query history table for matching external_id
    - Set is_verified to true if content found in user's history
    - _Requirements: 40.1, 40.2, 40.4_
  
  - [x] 24.2 Display verification badge
    - Show "Verified Watch" badge on verified reviews
    - _Requirements: 40.3_
  
  - [x] 24.3 Update verification on history changes
    - When user's history is updated, check and update review verification status
    - _Requirements: 40.5_
  
  - [ ]* 24.4 Write unit tests for review verification
    - Test verification check on review submission
    - Test verification badge display
    - Test verification update on history change
    - _Requirements: 40.1, 40.2, 40.3, 40.5_

- [x] 25. Checkpoint - Verify advanced features
  - Ensure caching, notifications, view tracking, and verification working correctly, ask the user if questions arise.

- [x] 26. Implement admin moderation dashboard
  - [x] 26.1 Create AdminReviewsDashboard component
    - Location: src/pages/admin/ReviewsDashboard.tsx
    - Display all reviews including hidden ones
    - Filter by is_hidden status
    - Show hide/unhide buttons for each review
    - Require admin or supervisor role
    - _Requirements: 14.1, 14.2, 14.4, 14.5_
  
  - [x] 26.2 Create AdminReportsDashboard component
    - Location: src/pages/admin/ReportsDashboard.tsx
    - Display all review reports
    - Filter by status (pending, reviewed, dismissed)
    - Show review content and reporter details
    - Allow updating report status
    - Require admin or supervisor role
    - _Requirements: 24.4, 24.5_
  
  - [ ]* 26.3 Write unit tests for admin dashboards
    - Test admin can view all reviews
    - Test admin can hide/unhide reviews
    - Test admin can view and update reports
    - Test non-admin cannot access dashboards
    - _Requirements: 14.2, 14.4, 14.5, 24.4_

- [x] 27. Implement review analytics (optional)
  - [x] 27.1 Create analytics endpoint
    - Location: server/routes/reviews.js
    - GET /api/admin/analytics endpoint
    - Calculate: total reviews, average rating, reviews per day
    - Calculate: top reviewed content (by review count)
    - Calculate: most helpful reviewers (by total helpful votes)
    - Support date range filtering
    - Require admin or supervisor role
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_
  
  - [x] 27.2 Create AnalyticsDashboard component
    - Location: src/pages/admin/AnalyticsDashboard.tsx
    - Display review analytics
    - Show charts and graphs for trends
    - Support date range selection
    - Require admin or supervisor role
    - _Requirements: 35.1, 35.2, 35.3, 35.4_
  
  - [ ]* 27.3 Write unit tests for analytics
    - Test analytics calculation
    - Test date range filtering
    - Test analytics dashboard display
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

- [x] 28. Add error handling and logging
  - [x] 28.1 Implement comprehensive error logging
    - Log all validation errors with context (user_id, external_id, content_type)
    - Log all database errors with stack traces
    - Log all rate limit violations
    - Log unmappable content references
    - Use structured logging format
    - _Requirements: 20.5_
  
  - [x] 28.2 Implement frontend error handling
    - Display user-friendly error messages for all error types
    - Handle 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (duplicate), 429 (rate limit)
    - Show retry options for network errors
    - Log errors to monitoring service (e.g., Sentry)
    - _Requirements: 11.2, 11.5_

  - [x] 28.3 Add timeout handling for API requests
    - Implement 10-second timeout for all API requests
    - Show timeout error message to user
    - Implement retry logic with exponential backoff
    - _Requirements: 11.2_
  
  - [ ]* 28.4 Write unit tests for error handling
    - Test validation error display
    - Test rate limit error display
    - Test network error handling
    - Test timeout handling
    - _Requirements: 11.2, 11.5_

- [x] 29. Implement security measures
  - [x] 29.1 Add authentication middleware to all protected routes
    - Verify Supabase auth token on all write operations
    - Reject requests without valid token (401)
    - Validate user_id from token matches request body
    - Allow read operations without authentication
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5_
  
  - [x] 29.2 Implement content sanitization
    - Sanitize review_text and title to remove HTML tags
    - Preserve line breaks in review_text
    - Encode special characters to prevent XSS
    - Apply sanitization on both frontend and backend
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_
  
  - [x] 29.3 Add Content Security Policy headers
    - Set CSP headers in server response
    - Restrict script sources to prevent XSS
    - _Requirements: 29.5_
  
  - [x] 29.4 Implement SQL injection prevention
    - Use parameterized queries (Supabase handles this automatically)
    - Validate all inputs before database operations
    - Never construct raw SQL with user input
    - _Requirements: 29.1, 29.2_
  
  - [ ]* 29.5 Write security tests
    - Test XSS prevention (HTML tags removed)
    - Test authentication validation
    - Test authorization checks
    - Test SQL injection prevention
    - _Requirements: 29.1, 29.2, 29.4, 29.5, 34.1_

- [x] 30. Create documentation
  - [x] 30.1 Create API documentation
    - Document all rating endpoints with request/response examples
    - Document all review endpoints with request/response examples
    - Document all admin endpoints
    - Document error codes and handling
    - Include authentication requirements
    - File: docs/RATINGS_AND_REVIEWS_API.md
    - _Requirements: 19.3_
  
  - [x] 30.2 Update DATABASE_ARCHITECTURE.md
    - Document ratings and reviews tables in Supabase
    - Document external_id bridge pattern for reviews
    - Update examples to include review operations
    - File: .kiro/DATABASE_ARCHITECTURE.md
    - _Requirements: 19.1_

  - [x] 30.3 Create user guide
    - Document how to rate content
    - Document how to write reviews
    - Document review features (spoilers, language, editing)
    - Document helpful voting
    - Document review reporting
    - File: docs/USER_GUIDE_REVIEWS.md
    - _Requirements: 19.2_
  
  - [x] 30.4 Create developer guide
    - Document how to integrate reviews into new content types
    - Document external_id bridge pattern usage
    - Document caching strategy
    - Document rate limiting configuration
    - Include code examples
    - File: docs/DEVELOPER_GUIDE_REVIEWS.md
    - _Requirements: 19.2, 19.4_
  
  - [x] 30.5 Update README.md
    - Add ratings and reviews system overview
    - Link to detailed documentation
    - _Requirements: 19.5_

- [x] 31. Performance optimization
  - [x] 31.1 Optimize database queries
    - Ensure all indexes are created and used
    - Use batch queries where possible
    - Minimize N+1 query problems
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_
  
  - [x] 31.2 Implement pagination for large result sets
    - Use cursor-based pagination for reviews
    - Implement infinite scroll in frontend
    - Limit page size to prevent large payloads
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [x] 31.3 Optimize batch content fetching
    - Group batch requests by content_type
    - Use parallel queries with Promise.all
    - Cache content details on frontend
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_
  
  - [ ]* 31.4 Write performance tests
    - Test aggregate rating calculation performance
    - Test batch endpoint performance with 100 items
    - Test review list pagination performance
    - _Requirements: 18.1, 18.2, 27.1_

- [x] 32. Accessibility improvements
  - [x] 32.1 Add ARIA labels to interactive elements
    - Add labels to rating inputs
    - Add labels to review form fields
    - Add labels to filter and sort controls
    - Add labels to like and report buttons
  
  - [x] 32.2 Ensure keyboard navigation
    - Support keyboard navigation for rating input
    - Support keyboard navigation for review list
    - Support keyboard shortcuts for common actions
  
  - [x] 32.3 Add screen reader support
    - Add descriptive text for screen readers
    - Announce dynamic content changes
    - Provide context for interactive elements
  
  - [ ]* 32.4 Write accessibility tests
    - Test keyboard navigation
    - Test ARIA labels
    - Test screen reader compatibility

- [x] 33. Final integration testing
  - [ ]* 33.1 Write end-to-end tests for rating flow
    - Test complete rating submission flow
    - Test rating update flow
    - Test rating deletion flow
    - Test aggregate rating display
    - _Requirements: 1.1, 1.3, 1.4, 3.1_
  
  - [ ]* 33.2 Write end-to-end tests for review flow
    - Test complete review submission flow
    - Test review editing flow
    - Test review deletion flow
    - Test review filtering and sorting
    - Test review search
    - _Requirements: 2.1, 5.1, 5.3, 5.4, 7.1, 22.1_
  
  - [ ]* 33.3 Write end-to-end tests for review interactions
    - Test review like/unlike flow
    - Test review reporting flow
    - Test review moderation flow
    - _Requirements: 6.1, 6.2, 6.3, 24.1, 14.2_
  
  - [ ]* 33.4 Write integration tests for activity feed
    - Test review activity creation
    - Test review activity display
    - Test missing content handling
    - _Requirements: 10.1, 10.3, 10.5_
  
  - [ ]* 33.5 Write integration tests for profile page
    - Test review stats display
    - Test user reviews list
    - Test review editing from profile
    - _Requirements: 23.1, 23.4_

- [x] 34. Final checkpoint - Pre-deployment verification
  - Ensure all tests pass, all features working correctly, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All user data (ratings, reviews) stored in Supabase
- All content data (movies, series, games, software) queried from CockroachDB via API
- Bridge between databases uses external_id (TMDB ID stored as TEXT)
- Rate limiting prevents spam (10 reviews/hour, 50 ratings/hour)
- Aggregate ratings cached for 5 minutes
- Reviews support bilingual content (Arabic/English) with RTL/LTR
- Comprehensive moderation tools for admins
- Social features: helpful votes, verification badges, activity feed integration

## Implementation Language

- **Backend**: JavaScript/TypeScript (Node.js + Express.js)
- **Frontend**: TypeScript/React
- **Database**: Supabase (PostgreSQL) for user data, CockroachDB for content
- **Testing**: Jest + fast-check (property-based testing)
- **Caching**: NodeCache (in-memory)
- **Sanitization**: DOMPurify

## Database Architecture Reminder

**CRITICAL: Follow the established database architecture**

- **Supabase**: Auth & User Data ONLY
  - Tables: ratings, reviews, review_likes, review_reports, review_drafts, review_views
  - Also: profiles, watchlist, continue_watching, history, activity_feed, notifications
  
- **CockroachDB**: ALL Content
  - Tables: movies, tv_series, games, software, seasons, episodes, actors
  - Access via API endpoints (server/routes/content.js)
  - Use POST /api/content/batch for fetching content by external_id

- **Bridge**: external_id (TMDB ID as TEXT)
  - Stored in Supabase user data tables
  - Used to query CockroachDB content tables
  - Format: external_source='tmdb', external_id='550' (as TEXT)

**Never query content tables directly from Supabase. Always use CockroachDB API.**
