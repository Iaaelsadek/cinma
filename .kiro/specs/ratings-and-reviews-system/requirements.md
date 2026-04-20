# Requirements Document: Ratings and Reviews System

## Introduction

This feature adds a comprehensive ratings and reviews system to Cinema.online, enabling users to rate content (movies, TV series, games, software) on a 1-10 scale and write detailed text reviews. The system supports bilingual reviews (Arabic and English), social interactions (likes, helpful votes), moderation capabilities, and integration with the existing activity feed system.

The solution maintains the architectural principle: **Supabase = Auth & User Data ONLY**, **CockroachDB = ALL Content**. Reviews and ratings are user data stored in Supabase, while content metadata remains in CockroachDB. The bridge between databases uses `external_id` (TMDB ID) as established in the watchlist-external-id-migration spec.

## Glossary

- **Supabase**: PostgreSQL database used exclusively for authentication and user-related data
- **CockroachDB**: Primary database containing all content (movies, tv_series, games, software, etc.)
- **Review**: User-generated text content with optional rating, title, and metadata
- **Rating**: Numerical score (1-10 scale) assigned by user to content
- **External_ID**: The TMDB (The Movie Database) ID used to identify content across systems
- **TMDB**: The Movie Database - external content metadata provider
- **Content_Type**: Type of content - 'movie', 'tv', 'game', or 'software'
- **Review_Like**: User interaction indicating they found a review helpful
- **Aggregate_Rating**: Calculated average rating from all user ratings for a content item
- **Review_Moderation**: Process of reviewing and managing user-generated content for policy compliance
- **Activity_Feed**: Social feed showing user activities including reviews
- **Rate_Limiting**: Mechanism to prevent spam by limiting action frequency
- **Backend_API**: Express.js server that queries CockroachDB and Supabase
- **Frontend_Component**: React component that displays reviews and ratings

## Requirements

### Requirement 1: Store User Ratings

**User Story:** As a user, I want to rate content on a 1-10 scale, so that I can express my opinion and contribute to aggregate ratings.

#### Acceptance Criteria

1. THE Ratings_Table SHALL store user_id, external_id, external_source, content_type, rating_value, and created_at
2. WHEN a user submits a rating, THE System SHALL validate rating_value is between 1 and 10 inclusive
3. THE Ratings_Table SHALL enforce unique constraint on (user_id, external_id, content_type)
4. WHEN a user rates content they previously rated, THE System SHALL update the existing rating instead of creating duplicate
5. THE System SHALL store external_id as TEXT to reference content in CockroachDB

### Requirement 2: Store User Reviews

**User Story:** As a user, I want to write detailed text reviews with optional titles, so that I can share my thoughts about content.

#### Acceptance Criteria

1. THE Reviews_Table SHALL store user_id, external_id, external_source, content_type, title, review_text, rating, language, and timestamps
2. WHEN a user submits a review, THE System SHALL validate review_text is between 10 and 5000 characters
3. THE Reviews_Table SHALL enforce unique constraint on (user_id, external_id, content_type)
4. WHEN a user submits a review, THE System SHALL store language as 'ar' or 'en' based on user selection
5. THE System SHALL allow reviews with or without ratings (rating is optional)

### Requirement 3: Calculate Aggregate Ratings

**User Story:** As a user, I want to see average ratings and rating counts on content cards, so that I can quickly assess content quality.

#### Acceptance Criteria

1. WHEN aggregate ratings are requested, THE Backend_API SHALL calculate average rating from all user ratings for that external_id
2. THE Backend_API SHALL return rating count (total number of ratings) alongside average rating
3. WHEN no ratings exist for content, THE Backend_API SHALL return null for average rating and 0 for count
4. THE System SHALL round average ratings to one decimal place (e.g., 7.8)
5. THE Backend_API SHALL support batch aggregate rating queries for multiple content items

### Requirement 4: Display Reviews on Content Detail Pages

**User Story:** As a user, I want to see all reviews for content on detail pages, so that I can read others' opinions before watching.

#### Acceptance Criteria

1. WHEN a content detail page loads, THE Frontend_Component SHALL fetch reviews for that external_id from Supabase
2. THE Frontend_Component SHALL display review author username, avatar, rating, title, text, and timestamp
3. WHEN reviews are displayed, THE System SHALL show helpful vote count for each review
4. THE Frontend_Component SHALL indicate if the current user has already reviewed the content
5. THE System SHALL fetch reviewer profile data from Supabase profiles table

### Requirement 5: Enable Review Editing and Deletion

**User Story:** As a user, I want to edit or delete my own reviews, so that I can update my opinions or remove outdated content.

#### Acceptance Criteria

1. WHEN a user views their own review, THE Frontend_Component SHALL display edit and delete buttons
2. WHEN a user clicks edit, THE System SHALL populate the review form with existing review data
3. WHEN a user submits edited review, THE System SHALL update the existing review record with updated_at timestamp
4. WHEN a user deletes their review, THE System SHALL remove the review and associated review_likes records
5. THE System SHALL prevent users from editing or deleting reviews they did not create

### Requirement 6: Support Review Likes (Helpful Votes)

**User Story:** As a user, I want to mark reviews as helpful, so that useful reviews are highlighted for other users.

#### Acceptance Criteria

1. THE Review_Likes_Table SHALL store review_id, user_id, and created_at
2. WHEN a user clicks helpful on a review, THE System SHALL insert a record in review_likes table
3. WHEN a user clicks helpful again on same review, THE System SHALL remove the like (toggle behavior)
4. THE System SHALL display total helpful count for each review
5. THE System SHALL prevent users from liking their own reviews

### Requirement 7: Filter and Sort Reviews

**User Story:** As a user, I want to filter and sort reviews by criteria, so that I can find the most relevant reviews quickly.

#### Acceptance Criteria

1. THE Backend_API SHALL support sorting reviews by 'most_helpful', 'newest', 'highest_rating', and 'lowest_rating'
2. WHEN sort is 'most_helpful', THE System SHALL order reviews by helpful vote count descending
3. WHEN sort is 'newest', THE System SHALL order reviews by created_at descending
4. WHEN sort is 'highest_rating', THE System SHALL order reviews by rating descending then helpful count descending
5. THE Backend_API SHALL support filtering reviews by language ('ar', 'en', or 'all')

### Requirement 8: Implement Rate Limiting for Reviews

**User Story:** As a system administrator, I want to prevent spam by rate limiting review submissions, so that the platform maintains quality content.

#### Acceptance Criteria

1. THE System SHALL limit users to 10 review submissions per hour
2. WHEN rate limit is exceeded, THE System SHALL return error message "Too many reviews. Please try again later."
3. THE System SHALL track review submission timestamps per user in memory or cache
4. THE Rate_Limiter SHALL reset user's submission count after 1 hour from first submission
5. THE System SHALL exempt admin and supervisor roles from rate limiting

### Requirement 9: Implement Rate Limiting for Ratings

**User Story:** As a system administrator, I want to prevent rating manipulation by rate limiting rating submissions, so that aggregate ratings remain trustworthy.

#### Acceptance Criteria

1. THE System SHALL limit users to 50 rating submissions per hour
2. WHEN rate limit is exceeded, THE System SHALL return error message "Too many ratings. Please try again later."
3. THE System SHALL track rating submission timestamps per user in memory or cache
4. THE Rate_Limiter SHALL reset user's submission count after 1 hour from first submission
5. THE System SHALL allow rating updates (changing existing rating) without counting toward rate limit

### Requirement 10: Integrate with Activity Feed

**User Story:** As a user, I want my reviews to appear in my activity feed, so that my followers can see my content opinions.

#### Acceptance Criteria

1. WHEN a user submits a review, THE System SHALL create an activity_feed entry with type 'review'
2. THE Activity_Feed_Entry SHALL store external_id in metadata for content reference
3. WHEN activity feed displays review activity, THE Frontend_Component SHALL fetch content details from CockroachDB using external_id
4. THE Activity_Feed SHALL display review title, rating, and excerpt (first 150 characters)
5. WHEN content is deleted from CockroachDB, THE Activity_Feed SHALL display placeholder content for review activities

### Requirement 11: Display Aggregate Ratings on Content Cards

**User Story:** As a user, I want to see average ratings and rating counts on content cards, so that I can quickly assess content quality while browsing.

#### Acceptance Criteria

1. WHEN content cards are rendered, THE Frontend_Component SHALL fetch aggregate ratings from Backend_API
2. THE Frontend_Component SHALL display average rating as stars or numerical value (e.g., "7.8/10")
3. THE Frontend_Component SHALL display rating count (e.g., "1.2K ratings")
4. WHEN no ratings exist, THE Frontend_Component SHALL display "No ratings yet"
5. THE System SHALL cache aggregate ratings for 5 minutes to reduce database load

### Requirement 12: Support Bilingual Reviews

**User Story:** As a bilingual user, I want to write reviews in Arabic or English, so that I can express myself in my preferred language.

#### Acceptance Criteria

1. THE Review_Form SHALL provide language selector with options 'العربية' and 'English'
2. WHEN language is 'ar', THE Review_Form SHALL set text direction to RTL (right-to-left)
3. WHEN language is 'en', THE Review_Form SHALL set text direction to LTR (left-to-right)
4. THE System SHALL store selected language in reviews table language column
5. THE Frontend_Component SHALL display reviews in their original language with proper text direction

### Requirement 13: Validate Review Content

**User Story:** As a system administrator, I want to validate review content before storage, so that the platform maintains quality standards.

#### Acceptance Criteria

1. WHEN a review is submitted, THE System SHALL reject reviews with review_text shorter than 10 characters
2. WHEN a review is submitted, THE System SHALL reject reviews with review_text longer than 5000 characters
3. WHEN a review title is provided, THE System SHALL reject titles longer than 200 characters
4. THE System SHALL trim whitespace from review_text and title before validation
5. THE System SHALL reject reviews containing only whitespace or special characters

### Requirement 14: Implement Review Moderation

**User Story:** As a moderator, I want to flag and hide inappropriate reviews, so that the platform remains safe and respectful.

#### Acceptance Criteria

1. THE Reviews_Table SHALL include is_hidden boolean column with default false
2. WHEN a review is flagged by moderator, THE System SHALL set is_hidden to true
3. WHEN reviews are fetched, THE System SHALL exclude reviews where is_hidden is true
4. THE Backend_API SHALL provide admin endpoint to list all reviews including hidden ones
5. THE System SHALL allow admin and supervisor roles to hide/unhide reviews

### Requirement 15: Create Backend API Endpoints for Reviews

**User Story:** As a frontend developer, I want RESTful API endpoints for review operations, so that I can implement review features efficiently.

#### Acceptance Criteria

1. THE Backend_API SHALL provide POST /api/reviews endpoint to create reviews
2. THE Backend_API SHALL provide PUT /api/reviews/:id endpoint to update reviews
3. THE Backend_API SHALL provide DELETE /api/reviews/:id endpoint to delete reviews
4. THE Backend_API SHALL provide GET /api/reviews endpoint to fetch reviews with query parameters (external_id, content_type, sort, language)
5. THE Backend_API SHALL provide GET /api/reviews/:id endpoint to fetch single review by ID

### Requirement 16: Create Backend API Endpoints for Ratings

**User Story:** As a frontend developer, I want RESTful API endpoints for rating operations, so that I can implement rating features efficiently.

#### Acceptance Criteria

1. THE Backend_API SHALL provide POST /api/ratings endpoint to create or update ratings
2. THE Backend_API SHALL provide DELETE /api/ratings endpoint to delete user's rating
3. THE Backend_API SHALL provide GET /api/ratings/user endpoint to fetch user's rating for specific content
4. THE Backend_API SHALL provide GET /api/ratings/aggregate endpoint to fetch aggregate ratings for content
5. THE Backend_API SHALL provide POST /api/ratings/aggregate/batch endpoint to fetch aggregate ratings for multiple content items

### Requirement 17: Create Backend API Endpoints for Review Likes

**User Story:** As a frontend developer, I want API endpoints for review like operations, so that I can implement helpful voting features.

#### Acceptance Criteria

1. THE Backend_API SHALL provide POST /api/reviews/:id/like endpoint to toggle review like
2. THE Backend_API SHALL provide GET /api/reviews/:id/likes endpoint to fetch like count
3. WHEN like is toggled, THE Backend_API SHALL return updated like count and user's like status
4. THE Backend_API SHALL validate user is authenticated before allowing like operations
5. THE Backend_API SHALL prevent users from liking their own reviews

### Requirement 18: Implement Review Pagination

**User Story:** As a user, I want reviews to load in pages, so that pages with many reviews load quickly.

#### Acceptance Criteria

1. THE Backend_API SHALL support limit and offset query parameters for review pagination
2. THE Backend_API SHALL default to 20 reviews per page when limit is not specified
3. THE Backend_API SHALL return total review count in response metadata
4. THE Backend_API SHALL limit maximum page size to 100 reviews
5. THE Frontend_Component SHALL implement infinite scroll or pagination controls for reviews

### Requirement 19: Display User's Own Rating on Content Pages

**User Story:** As a user, I want to see my own rating on content detail pages, so that I remember what I rated the content.

#### Acceptance Criteria

1. WHEN a content detail page loads, THE Frontend_Component SHALL fetch user's rating from Backend_API
2. THE Frontend_Component SHALL display user's rating prominently (e.g., highlighted stars)
3. WHEN user has not rated content, THE Frontend_Component SHALL display empty rating interface
4. WHEN user clicks on rating interface, THE System SHALL submit or update their rating
5. THE Frontend_Component SHALL update displayed rating immediately after submission

### Requirement 20: Validate External ID References

**User Story:** As a developer, I want to validate external_id references before storing reviews/ratings, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a review or rating is submitted, THE System SHALL validate external_id is non-empty string
2. THE System SHALL validate content_type is one of: 'movie', 'tv', 'game', 'software'
3. THE System SHALL set external_source to 'tmdb' by default for movies and tv content
4. THE System SHALL reject operations with null or empty external_id with descriptive error
5. THE System SHALL log validation errors with context (user_id, external_id, content_type)

### Requirement 21: Handle Missing Content Gracefully

**User Story:** As a user, I want to see my reviews even if content is deleted from CockroachDB, so that my contributions are not lost.

#### Acceptance Criteria

1. WHEN content is deleted from CockroachDB, THE System SHALL still display user's reviews with placeholder content
2. THE Frontend_Component SHALL display "Content Unavailable" for missing content in review lists
3. THE System SHALL allow users to delete reviews for missing content
4. THE Backend_API SHALL return reviews even when content lookup fails
5. THE System SHALL log missing content references for administrative review

### Requirement 22: Implement Review Search

**User Story:** As a user, I want to search reviews by keywords, so that I can find specific opinions or topics.

#### Acceptance Criteria

1. THE Backend_API SHALL provide GET /api/reviews/search endpoint with query parameter
2. WHEN search query is provided, THE System SHALL search in review_text and title fields
3. THE System SHALL support case-insensitive search in both Arabic and English
4. THE Backend_API SHALL return reviews ordered by relevance then helpful count
5. THE System SHALL limit search results to 100 reviews maximum

### Requirement 23: Display Review Statistics on User Profiles

**User Story:** As a user, I want to see review statistics on my profile, so that I can track my contribution to the community.

#### Acceptance Criteria

1. THE Profile_Page SHALL display total number of reviews written by user
2. THE Profile_Page SHALL display total number of helpful votes received on user's reviews
3. THE Profile_Page SHALL display average rating given by user across all their reviews
4. THE Backend_API SHALL provide endpoint to fetch user review statistics
5. THE System SHALL update review statistics in real-time when reviews are added/deleted

### Requirement 24: Implement Review Reporting

**User Story:** As a user, I want to report inappropriate reviews, so that moderators can review and take action.

#### Acceptance Criteria

1. THE Review_Reports_Table SHALL store review_id, reporter_user_id, reason, and created_at
2. WHEN a user reports a review, THE System SHALL insert record in review_reports table
3. THE System SHALL prevent duplicate reports (same user reporting same review multiple times)
4. THE Backend_API SHALL provide admin endpoint to list reported reviews
5. THE System SHALL send notification to moderators when review is reported

### Requirement 25: Cache Aggregate Ratings

**User Story:** As a system administrator, I want to cache aggregate ratings, so that database load is reduced and pages load faster.

#### Acceptance Criteria

1. THE Backend_API SHALL cache aggregate ratings in memory for 5 minutes
2. WHEN a new rating is submitted, THE System SHALL invalidate cache for that content's aggregate rating
3. WHEN aggregate rating is requested and cache is valid, THE System SHALL return cached value
4. THE Cache SHALL use key format: "aggregate_rating:{external_id}:{content_type}"
5. THE System SHALL implement cache with TTL (time-to-live) of 300 seconds

### Requirement 26: Support Review Editing History

**User Story:** As a moderator, I want to see review edit history, so that I can detect abuse or manipulation.

#### Acceptance Criteria

1. THE Reviews_Table SHALL include updated_at timestamp that updates on each edit
2. THE Reviews_Table SHALL include edit_count integer that increments on each edit
3. WHEN a review is edited, THE System SHALL increment edit_count and update updated_at
4. THE Frontend_Component SHALL display "Edited" badge on reviews where edit_count > 0
5. THE System SHALL limit users to 5 edits per review to prevent abuse

### Requirement 27: Implement Batch Content Details Lookup

**User Story:** As a frontend developer, I want to fetch content details for multiple reviews efficiently, so that review lists load quickly.

#### Acceptance Criteria

1. THE Frontend_Component SHALL collect all unique external_ids from review list
2. THE Frontend_Component SHALL call POST /api/content/batch endpoint with external_ids array
3. THE Backend_API SHALL return content details for all requested external_ids
4. THE Frontend_Component SHALL map content details to reviews by external_id
5. THE System SHALL handle missing content by displaying placeholders in review list

### Requirement 28: Add Database Indexes for Performance

**User Story:** As a database administrator, I want optimized indexes on review tables, so that queries remain performant at scale.

#### Acceptance Criteria

1. THE Ratings_Table SHALL have index on (external_id, content_type) for aggregate calculations
2. THE Reviews_Table SHALL have index on (external_id, content_type, created_at DESC) for fetching reviews
3. THE Reviews_Table SHALL have index on (user_id, created_at DESC) for user profile queries
4. THE Review_Likes_Table SHALL have index on (review_id) for counting likes
5. THE Review_Likes_Table SHALL have index on (user_id, review_id) for checking user's like status

### Requirement 29: Implement Review Content Sanitization

**User Story:** As a security engineer, I want to sanitize review content, so that XSS attacks are prevented.

#### Acceptance Criteria

1. WHEN a review is submitted, THE System SHALL sanitize review_text to remove HTML tags
2. THE System SHALL sanitize title to remove HTML tags and script content
3. THE System SHALL preserve line breaks and basic formatting in review_text
4. THE System SHALL encode special characters to prevent XSS attacks
5. THE Frontend_Component SHALL render review content as plain text with preserved line breaks

### Requirement 30: Support Review Permalinks

**User Story:** As a user, I want to share direct links to specific reviews, so that I can reference reviews in discussions.

#### Acceptance Criteria

1. THE Frontend_Component SHALL generate unique URL for each review (e.g., /reviews/:reviewId)
2. WHEN a review permalink is accessed, THE System SHALL fetch review and associated content details
3. THE Review_Page SHALL display review with full content details and context
4. THE System SHALL handle missing reviews with 404 error page
5. THE Review_Page SHALL include Open Graph meta tags for social media sharing

### Requirement 31: Implement Review Notifications

**User Story:** As a user, I want to receive notifications when someone likes my review, so that I stay engaged with the community.

#### Acceptance Criteria

1. WHEN a user likes a review, THE System SHALL create notification for review author
2. THE Notification SHALL include liker's username and review title
3. THE System SHALL not create notification when user likes their own review
4. THE System SHALL batch notifications (max 1 notification per review per hour)
5. THE System SHALL mark notification as read when user views their review

### Requirement 32: Display Review Count on Content Cards

**User Story:** As a user, I want to see review count on content cards, so that I know how many people have reviewed the content.

#### Acceptance Criteria

1. WHEN content cards are rendered, THE Frontend_Component SHALL fetch review counts from Backend_API
2. THE Frontend_Component SHALL display review count (e.g., "45 reviews")
3. WHEN no reviews exist, THE Frontend_Component SHALL display "No reviews yet"
4. THE Backend_API SHALL support batch review count queries for multiple content items
5. THE System SHALL cache review counts for 5 minutes to reduce database load

### Requirement 33: Implement Review Sorting by User Rating

**User Story:** As a user, I want to filter reviews to see only highly-rated or poorly-rated reviews, so that I can understand different perspectives.

#### Acceptance Criteria

1. THE Backend_API SHALL support rating_filter query parameter with values: 'all', 'positive' (7-10), 'mixed' (4-6), 'negative' (1-3)
2. WHEN rating_filter is 'positive', THE System SHALL return only reviews with rating >= 7
3. WHEN rating_filter is 'mixed', THE System SHALL return only reviews with rating between 4 and 6
4. WHEN rating_filter is 'negative', THE System SHALL return only reviews with rating <= 3
5. THE Frontend_Component SHALL provide filter buttons for rating ranges

### Requirement 34: Validate User Authentication for Review Operations

**User Story:** As a security engineer, I want to validate user authentication for all review operations, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a review operation is requested, THE Backend_API SHALL validate Supabase auth token
2. THE System SHALL reject requests without valid auth token with 401 Unauthorized error
3. THE System SHALL validate user_id from token matches user_id in request body
4. THE System SHALL allow read operations (GET) without authentication
5. THE System SHALL require authentication for write operations (POST, PUT, DELETE)

### Requirement 35: Implement Review Analytics

**User Story:** As a content manager, I want to see review analytics, so that I can understand user engagement and content quality trends.

#### Acceptance Criteria

1. THE Backend_API SHALL provide admin endpoint to fetch review analytics
2. THE Analytics SHALL include total reviews count, average rating, reviews per day
3. THE Analytics SHALL include top reviewed content (by review count)
4. THE Analytics SHALL include most helpful reviewers (by total helpful votes received)
5. THE System SHALL calculate analytics for specified date range

### Requirement 36: Support Review Drafts

**User Story:** As a user, I want to save review drafts, so that I can complete my review later without losing progress.

#### Acceptance Criteria

1. THE Review_Drafts_Table SHALL store user_id, external_id, content_type, title, review_text, rating, and updated_at
2. WHEN a user saves draft, THE System SHALL upsert record in review_drafts table
3. WHEN a user opens review form for content, THE System SHALL load existing draft if available
4. WHEN a user publishes review, THE System SHALL delete corresponding draft
5. THE System SHALL automatically save drafts every 30 seconds while user is typing

### Requirement 37: Implement Spoiler Warnings

**User Story:** As a user, I want to mark reviews as containing spoilers, so that other users can choose whether to read them.

#### Acceptance Criteria

1. THE Reviews_Table SHALL include contains_spoilers boolean column with default false
2. THE Review_Form SHALL provide checkbox to mark review as containing spoilers
3. WHEN a review contains spoilers, THE Frontend_Component SHALL display "Contains Spoilers" warning
4. THE Frontend_Component SHALL hide spoiler review text behind "Show Spoilers" button
5. WHEN user clicks "Show Spoilers", THE System SHALL reveal full review text

### Requirement 38: Validate Rating Value Range

**User Story:** As a developer, I want to validate rating values, so that invalid ratings are rejected before storage.

#### Acceptance Criteria

1. WHEN a rating is submitted, THE System SHALL validate rating_value is integer between 1 and 10 inclusive
2. THE System SHALL reject ratings with decimal values (e.g., 7.5)
3. THE System SHALL reject ratings outside 1-10 range with error "Rating must be between 1 and 10"
4. THE System SHALL reject null or undefined rating values
5. THE System SHALL validate rating on both frontend and backend

### Requirement 39: Display Helpful Vote Percentage

**User Story:** As a user, I want to see what percentage of users found a review helpful, so that I can assess review quality.

#### Acceptance Criteria

1. THE Backend_API SHALL calculate helpful percentage as (helpful_votes / total_views) * 100
2. WHEN helpful percentage is calculated, THE System SHALL round to nearest integer
3. THE Frontend_Component SHALL display helpful percentage (e.g., "85% found this helpful")
4. WHEN review has fewer than 10 views, THE System SHALL not display percentage
5. THE System SHALL track review views in review_views table

### Requirement 40: Implement Review Verification Badge

**User Story:** As a user, I want to see verification badges on reviews from users who actually watched the content, so that I can trust review authenticity.

#### Acceptance Criteria

1. WHEN a user writes review for content in their history, THE System SHALL mark review as verified
2. THE Reviews_Table SHALL include is_verified boolean column with default false
3. THE Frontend_Component SHALL display "Verified Watch" badge on verified reviews
4. THE System SHALL check user's history table for matching external_id before marking as verified
5. THE System SHALL update verification status when user's history changes

