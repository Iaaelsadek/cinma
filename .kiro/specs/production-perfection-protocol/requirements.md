# Requirements Document

## Introduction

This feature implements three critical production improvements for Cinema.online to achieve enterprise-grade performance and user experience. The improvements address data quality issues (neutral rating defaults), performance bottlenecks (API response times), and incomplete frontend functionality (review editing and reporting).

## Glossary

- **Rating_System**: The numerical scoring mechanism (0-10 scale) used to evaluate content quality
- **Neutral_Rating**: A default rating value of 5.0 assigned to content lacking external ratings
- **API_Cache**: In-memory storage layer using node-cache for rapid response delivery
- **Cache_TTL**: Time-To-Live duration (5 minutes) before cached data expires
- **IGDBAdapter**: Adapter module responsible for fetching game data from IGDB API
- **TMDBAdapter**: Adapter module responsible for fetching movie/TV data from TMDB API
- **CoreIngestor**: Central ingestion module that writes normalized content to CockroachDB
- **Review_Component**: Frontend React components displaying user reviews (MovieDetails.tsx, SeriesDetails.tsx, GameDetails.tsx, SoftwareDetails.tsx)
- **Edit_Review_Modal**: User interface component for modifying existing review content
- **Report_Review_Dialog**: User interface component for flagging inappropriate reviews
- **CockroachDB**: Primary database storing all content (movies, TV, games, software)
- **Supabase**: Secondary database storing user data and reviews
- **Home_Route**: API endpoint /api/home serving aggregated homepage content
- **Movies_Route**: API endpoint /api/movies serving movie listings
- **TV_Route**: API endpoint /api/tv serving TV series listings

## Requirements

### Requirement 1: Neutral Rating Default for Unrated Content

**User Story:** As a content curator, I want unrated content to receive a neutral 5.0 rating instead of 0, so that new content is not unfairly penalized in sorting algorithms.

#### Acceptance Criteria

1. WHEN IGDBAdapter fetches game data with missing rating field, THE IGDBAdapter SHALL assign vote_average value of 5.0
2. WHEN TMDBAdapter fetches movie data with missing vote_average field, THE TMDBAdapter SHALL assign vote_average value of 5.0
3. WHEN TMDBAdapter fetches TV series data with missing vote_average field, THE TMDBAdapter SHALL assign vote_average value of 5.0
4. WHEN CoreIngestor receives content with null vote_average, THE CoreIngestor SHALL assign vote_average value of 5.0
5. WHEN content is sorted by vote_average, THE Rating_System SHALL treat 5.0 as neutral position in ranking
6. THE IGDBAdapter SHALL NOT assign 5.0 rating when rating field contains value 0
7. THE TMDBAdapter SHALL NOT assign 5.0 rating when vote_average field contains value 0

### Requirement 2: Database Schema Update for Nullable Ratings

**User Story:** As a database administrator, I want rating columns to be nullable, so that the system can distinguish between "no rating" and "rated as zero".

#### Acceptance Criteria

1. THE CockroachDB SHALL allow NULL values in games.vote_average column
2. THE CockroachDB SHALL allow NULL values in software.vote_average column
3. THE CockroachDB SHALL allow NULL values in games.vote_count column
4. THE CockroachDB SHALL allow NULL values in software.vote_count column
5. WHEN migration executes, THE CockroachDB SHALL preserve existing rating data
6. WHEN new content is inserted with NULL rating, THE CockroachDB SHALL accept the insertion without error

### Requirement 3: Rating Default Verification Test

**User Story:** As a quality assurance engineer, I want to verify rating defaults work correctly, so that I can confirm the fix resolves the production issue.

#### Acceptance Criteria

1. WHEN "The Witcher 3" (IGDB ID: 1942) is re-ingested, THE Rating_System SHALL assign vote_average of 5.0 if IGDB returns null rating
2. WHEN verification test executes, THE Rating_System SHALL log the assigned vote_average value
3. WHEN verification test completes, THE Rating_System SHALL report success or failure status
4. THE Rating_System SHALL query CockroachDB to confirm stored vote_average matches expected value

### Requirement 4: API Response Caching for Sub-50ms Performance

**User Story:** As an end user, I want homepage and content listings to load in under 50ms, so that the application feels instant and responsive.

#### Acceptance Criteria

1. WHEN first request hits /api/home endpoint, THE API_Cache SHALL store response with 5-minute TTL
2. WHEN subsequent request hits /api/home endpoint within TTL, THE API_Cache SHALL return cached response in under 20ms
3. WHEN first request hits /api/movies endpoint, THE API_Cache SHALL store response with 5-minute TTL
4. WHEN subsequent request hits /api/movies endpoint within TTL, THE API_Cache SHALL return cached response in under 20ms
5. WHEN first request hits /api/tv endpoint, THE API_Cache SHALL store response with 5-minute TTL
6. WHEN subsequent request hits /api/tv endpoint within TTL, THE API_Cache SHALL return cached response in under 20ms
7. WHEN cache TTL expires, THE API_Cache SHALL fetch fresh data from CockroachDB
8. THE API_Cache SHALL include query parameters in cache key to prevent incorrect data serving
9. THE API_Cache SHALL use node-cache library for in-memory storage
10. WHEN cache is hit, THE API_Cache SHALL add cache metadata to response indicating cached status

### Requirement 5: Cache Performance Monitoring

**User Story:** As a system administrator, I want to monitor cache performance metrics, so that I can verify sub-50ms targets are met.

#### Acceptance Criteria

1. WHEN cached response is served, THE API_Cache SHALL log response time in milliseconds
2. WHEN response time exceeds 20ms for cached requests, THE API_Cache SHALL log warning message
3. WHEN response time exceeds 50ms for first requests, THE API_Cache SHALL log warning message
4. THE API_Cache SHALL include cache hit/miss status in response metadata
5. THE API_Cache SHALL track cache hit rate for monitoring

### Requirement 6: Edit Review Functionality Implementation

**User Story:** As a user, I want to edit my published reviews, so that I can correct mistakes or update my opinion.

#### Acceptance Criteria

1. WHEN user clicks edit button on their review, THE Review_Component SHALL display Edit_Review_Modal
2. WHEN Edit_Review_Modal opens, THE Edit_Review_Modal SHALL pre-populate form with existing review data
3. WHEN user modifies review text in modal, THE Edit_Review_Modal SHALL validate minimum 10 characters
4. WHEN user modifies review text in modal, THE Edit_Review_Modal SHALL validate maximum 5000 characters
5. WHEN user modifies rating in modal, THE Edit_Review_Modal SHALL validate integer between 1 and 10
6. WHEN user submits edited review, THE Edit_Review_Modal SHALL send PUT request to /api/reviews/:id endpoint
7. WHEN PUT request succeeds, THE Review_Component SHALL refresh reviews list
8. WHEN PUT request succeeds, THE Edit_Review_Modal SHALL display success message
9. WHEN PUT request fails, THE Edit_Review_Modal SHALL display error message
10. THE Edit_Review_Modal SHALL include title field (optional, max 200 characters)
11. THE Edit_Review_Modal SHALL include spoilers checkbox
12. THE Edit_Review_Modal SHALL close after successful submission
13. THE Review_Component SHALL display edit button only for reviews owned by current user

### Requirement 7: Report Review Functionality Implementation

**User Story:** As a user, I want to report inappropriate reviews, so that moderators can review and remove harmful content.

#### Acceptance Criteria

1. WHEN user clicks report button on any review, THE Review_Component SHALL display Report_Review_Dialog
2. WHEN Report_Review_Dialog opens, THE Report_Review_Dialog SHALL display reason selection dropdown
3. THE Report_Review_Dialog SHALL provide reason options: "Spam", "Offensive Language", "Spoilers", "Harassment", "Other"
4. WHEN user selects "Other" reason, THE Report_Review_Dialog SHALL display text input for custom reason
5. WHEN user submits report without selecting reason, THE Report_Review_Dialog SHALL display validation error
6. WHEN user submits valid report, THE Report_Review_Dialog SHALL send POST request to /api/reviews/:id/report endpoint
7. WHEN POST request succeeds, THE Report_Review_Dialog SHALL display confirmation message
8. WHEN POST request succeeds, THE Report_Review_Dialog SHALL close after 2 seconds
9. WHEN POST request fails, THE Report_Review_Dialog SHALL display error message
10. THE Report_Review_Dialog SHALL prevent duplicate reports from same user for same review
11. THE Review_Component SHALL require user authentication before allowing report submission

### Requirement 8: TODO Comment Removal

**User Story:** As a developer, I want all TODO comments removed from review components, so that the codebase reflects completed functionality.

#### Acceptance Criteria

1. THE MovieDetails.tsx SHALL NOT contain any TODO comments related to edit functionality
2. THE MovieDetails.tsx SHALL NOT contain any TODO comments related to report functionality
3. THE SeriesDetails.tsx SHALL NOT contain any TODO comments related to edit functionality
4. THE SeriesDetails.tsx SHALL NOT contain any TODO comments related to report functionality
5. THE GameDetails.tsx SHALL NOT contain any TODO comments related to edit functionality
6. THE GameDetails.tsx SHALL NOT contain any TODO comments related to report functionality
7. THE SoftwareDetails.tsx SHALL NOT contain any TODO comments related to edit functionality
8. THE SoftwareDetails.tsx SHALL NOT contain any TODO comments related to report functionality

### Requirement 9: Console Log Cleanup

**User Story:** As a developer, I want console.log statements removed from production code, so that the application maintains professional logging standards.

#### Acceptance Criteria

1. THE MovieDetails.tsx SHALL NOT contain console.log statements in edit review handler
2. THE MovieDetails.tsx SHALL NOT contain console.log statements in report review handler
3. THE SeriesDetails.tsx SHALL NOT contain console.log statements in edit review handler
4. THE SeriesDetails.tsx SHALL NOT contain console.log statements in report review handler
5. THE GameDetails.tsx SHALL NOT contain console.log statements in edit review handler
6. THE GameDetails.tsx SHALL NOT contain console.log statements in report review handler
7. THE SoftwareDetails.tsx SHALL NOT contain console.log statements in edit review handler
8. THE SoftwareDetails.tsx SHALL NOT contain console.log statements in report review handler

### Requirement 10: Review API Endpoint Verification

**User Story:** As a backend developer, I want to verify existing review endpoints support required operations, so that frontend implementation can proceed without backend changes.

#### Acceptance Criteria

1. THE Review_API SHALL expose PUT /api/reviews/:id endpoint for updating reviews
2. THE Review_API SHALL expose POST /api/reviews/:id/report endpoint for reporting reviews
3. WHEN PUT /api/reviews/:id receives valid request, THE Review_API SHALL update review in Supabase
4. WHEN PUT /api/reviews/:id receives request from non-owner, THE Review_API SHALL return 403 Forbidden
5. WHEN POST /api/reviews/:id/report receives valid request, THE Review_API SHALL create report record in Supabase
6. THE Review_API SHALL validate authentication token for both endpoints
7. THE Review_API SHALL return appropriate error messages for validation failures

### Requirement 11: Edit Review Modal Component Creation

**User Story:** As a frontend developer, I want a reusable Edit Review Modal component, so that all detail pages can share consistent edit functionality.

#### Acceptance Criteria

1. THE Edit_Review_Modal SHALL accept review object as prop
2. THE Edit_Review_Modal SHALL accept onSuccess callback as prop
3. THE Edit_Review_Modal SHALL accept onClose callback as prop
4. THE Edit_Review_Modal SHALL support both Arabic and English languages
5. THE Edit_Review_Modal SHALL use existing toast notification system for feedback
6. THE Edit_Review_Modal SHALL match existing design system styling
7. THE Edit_Review_Modal SHALL be responsive for mobile and desktop viewports
8. THE Edit_Review_Modal SHALL disable submit button during API request
9. THE Edit_Review_Modal SHALL show loading spinner during submission

### Requirement 12: Report Review Dialog Component Creation

**User Story:** As a frontend developer, I want a reusable Report Review Dialog component, so that all detail pages can share consistent report functionality.

#### Acceptance Criteria

1. THE Report_Review_Dialog SHALL accept reviewId as prop
2. THE Report_Review_Dialog SHALL accept onSuccess callback as prop
3. THE Report_Review_Dialog SHALL accept onClose callback as prop
4. THE Report_Review_Dialog SHALL support both Arabic and English languages
5. THE Report_Review_Dialog SHALL use existing toast notification system for feedback
6. THE Report_Review_Dialog SHALL match existing design system styling
7. THE Report_Review_Dialog SHALL be responsive for mobile and desktop viewports
8. THE Report_Review_Dialog SHALL disable submit button during API request
9. THE Report_Review_Dialog SHALL show loading spinner during submission

### Requirement 13: Integration Testing for Cache Performance

**User Story:** As a quality assurance engineer, I want automated tests verifying cache performance, so that regressions are caught before production deployment.

#### Acceptance Criteria

1. WHEN integration test executes, THE Integration_Test SHALL measure first request response time to /api/home
2. WHEN integration test executes, THE Integration_Test SHALL measure second request response time to /api/home
3. WHEN second request completes, THE Integration_Test SHALL verify response time is under 20ms
4. WHEN integration test executes, THE Integration_Test SHALL verify cache hit metadata is present in second response
5. THE Integration_Test SHALL test /api/movies endpoint with same methodology
6. THE Integration_Test SHALL test /api/tv endpoint with same methodology
7. WHEN any cached request exceeds 20ms, THE Integration_Test SHALL fail with descriptive error message

### Requirement 14: Database Migration Script for Nullable Ratings

**User Story:** As a database administrator, I want an automated migration script, so that schema changes are applied consistently across environments.

#### Acceptance Criteria

1. THE Migration_Script SHALL connect to CockroachDB using environment credentials
2. THE Migration_Script SHALL execute ALTER TABLE games ALTER COLUMN vote_average DROP NOT NULL
3. THE Migration_Script SHALL execute ALTER TABLE games ALTER COLUMN vote_count DROP NOT NULL
4. THE Migration_Script SHALL execute ALTER TABLE software ALTER COLUMN vote_average DROP NOT NULL
5. THE Migration_Script SHALL execute ALTER TABLE software ALTER COLUMN vote_count DROP NOT NULL
6. WHEN migration completes successfully, THE Migration_Script SHALL log success message
7. WHEN migration fails, THE Migration_Script SHALL log error details and exit with non-zero code
8. THE Migration_Script SHALL be idempotent (safe to run multiple times)
