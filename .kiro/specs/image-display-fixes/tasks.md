# Image Display Fixes - Task List

## Phase 1: Foundation Components

### Task 1: Create Unified Placeholder Component
- [x] 1.1 Create `src/components/common/UnifiedPlaceholder.tsx`
  - [x] 1.1.1 Implement SVG placeholder with gradient background
  - [x] 1.1.2 Add content type icons (🎬 movie, 📺 TV, 🎮 game, 💻 software, 🎌 anime)
  - [x] 1.1.3 Add bilingual text support (Arabic/English)
  - [x] 1.1.4 Implement size variants (sm, md, lg)
  - [x] 1.1.5 Apply lumen design system colors
- [ ] 1.2 Create unit tests for UnifiedPlaceholder
  - [ ] 1.2.1 Test all content type variants
  - [ ] 1.2.2 Test size variants
  - [ ] 1.2.3 Test with/without text display

### Task 2: Create Image Utility Functions
- [x] 2.1 Create `src/lib/image-utils.ts`
  - [x] 2.1.1 Implement `isValidURL()` function
  - [x] 2.1.2 Implement `sanitizeImageURL()` function
  - [x] 2.1.3 Implement `constructFallbackChain()` function
  - [x] 2.1.4 Add TypeScript types for image inputs
- [ ] 2.2 Create unit tests for image utilities
  - [ ] 2.2.1 Test URL validation with valid/invalid inputs
  - [ ] 2.2.2 Test sanitization with whitespace and special characters
  - [ ] 2.2.3 Test fallback chain construction with various combinations

### Task 3: Create Image Cache System
- [x] 3.1 Create `src/lib/image-cache.ts`
  - [x] 3.1.1 Implement in-memory Map-based cache
  - [x] 3.1.2 Implement `getCacheStatus()` function
  - [x] 3.1.3 Implement `setCacheStatus()` function
  - [x] 3.1.4 Implement `clearCache()` function
- [ ] 3.2 Create unit tests for image cache
  - [ ] 3.2.1 Test cache set and get operations
  - [ ] 3.2.2 Test cache clear operation
  - [ ] 3.2.3 Test cache with multiple concurrent operations

## Phase 2: Core Component Fixes

### Task 4: Enhance OptimizedImage Component
- [x] 4.1 Update `src/components/common/OptimizedImage.tsx`
  - [x] 4.1.1 Add retry logic with exponential backoff (max 3 attempts)
  - [x] 4.1.2 Add timeout handling (10s default)
  - [x] 4.1.3 Integrate UnifiedPlaceholder for final failures
  - [x] 4.1.4 Add `fallbackSrc` prop for explicit fallback URL
  - [x] 4.1.5 Add `maxRetries` prop (default 3)
  - [x] 4.1.6 Add `timeout` prop (default 10000ms)
  - [x] 4.1.7 Add `onFinalError` callback prop
  - [x] 4.1.8 Implement retry state management
  - [x] 4.1.9 Improve WebP detection and fallback logic
  - [x] 4.1.10 Enhance blur-up progressive loading
- [ ] 4.2 Update OptimizedImage tests
  - [ ] 4.2.1 Test retry logic with simulated failures
  - [ ] 4.2.2 Test timeout behavior
  - [ ] 4.2.3 Test exponential backoff delays
  - [ ] 4.2.4 Test final error callback

### Task 5: Refactor TmdbImage Component
- [ ] 5.1 Update `src/components/common/TmdbImage.tsx`
  - [ ] 5.1.1 Remove `getUrl()` function (TMDB URL construction)
  - [ ] 5.1.2 Change `path` prop to `src` prop (accept resolved URLs)
  - [ ] 5.1.3 Add `fallbackSrc` prop
  - [ ] 5.1.4 Integrate OptimizedImage internally
  - [ ] 5.1.5 Replace inline fallback with UnifiedPlaceholder
  - [ ] 5.1.6 Remove direct TMDB API dependencies
  - [ ] 5.1.7 Keep size prop for aspect ratio calculation only
- [ ] 5.2 Update TmdbImage tests
  - [ ] 5.2.1 Test with pre-resolved URLs
  - [ ] 5.2.2 Test fallback behavior
  - [ ] 5.2.3 Verify no TMDB API calls in tests

### Task 6: Update MovieCard Component
- [x] 6.1 Update `src/components/features/media/MovieCard.tsx`
  - [x] 6.1.1 Implement `getImageSource()` function with fallback chain
  - [x] 6.1.2 Prioritize `thumbnail` field from CockroachDB
  - [x] 6.1.3 Add URL validation using `isValidURL()`
  - [x] 6.1.4 Remove TMDB API URL construction
  - [x] 6.1.5 Integrate UnifiedPlaceholder for null image sources
  - [x] 6.1.6 Update OptimizedImage usage with retry props
  - [x] 6.1.7 Add error state management for placeholder display
  - [x] 6.1.8 Sanitize thumbnail URLs before rendering
- [ ] 6.2 Update MovieCard tests
  - [ ] 6.2.1 Test fallback chain: thumbnail → poster_path → backdrop_path → placeholder
  - [ ] 6.2.2 Test with null/empty thumbnail
  - [ ] 6.2.3 Test with invalid URLs
  - [ ] 6.2.4 Test placeholder display

## Phase 3: Bug Condition Testing

### Task 7: Bug Condition Exploration Tests
- [x] 7.1 Create `src/__tests__/image-display-fixes/bug-condition-exploration.test.tsx`
  - [x] 7.1.1 (PBT) Test TMDB API usage detection
  - [x] 7.1.2 (PBT) Test missing thumbnail detection
  - [x] 7.1.3 (PBT) Test invalid URL detection
  - [x] 7.1.4 (PBT) Test empty string detection
  - [x] 7.1.5 (PBT) Test whitespace-only URL detection
  - [x] 7.1.6 (PBT) Test null/undefined detection
  - [x] 7.1.7 (PBT) Test CORS error detection
  - [x] 7.1.8 (PBT) Test fallback chain failures

### Task 8: Fix Checking Property Tests
- [x] 8.1 Create `src/__tests__/image-display-fixes/fix-checking.test.tsx`
  - [x] 8.1.1 (PBT) Property: All images load from CockroachDB (no TMDB API)
  - [x] 8.1.2 (PBT) Property: Fallback chain works for all missing thumbnails
  - [x] 8.1.3 (PBT) Property: Retry logic executes max 3 times
  - [x] 8.1.4 (PBT) Property: Exponential backoff delays are correct
  - [x] 8.1.5 (PBT) Property: Timeout triggers after 10s
  - [x] 8.1.6 (PBT) Property: WebP served to modern browsers
  - [x] 8.1.7 (PBT) Property: JPEG fallback for older browsers
  - [x] 8.1.8 (PBT) Property: Lazy loading works for below-fold images
  - [x] 8.1.9 (PBT) Property: Unified placeholder shown on all failures
  - [x] 8.1.10 (PBT) Property: No white boxes displayed

### Task 9: Preservation Checking Tests
- [ ] 9.1 Create `src/__tests__/image-display-fixes/preservation-tests.test.tsx`
  - [ ] 9.1.1 Test valid thumbnail URLs continue to work
  - [ ] 9.1.2 Test hover effects still trigger correctly
  - [ ] 9.1.3 Test trailer overlays still appear
  - [ ] 9.1.4 Test action buttons still function
  - [ ] 9.1.5 Test navigation still works on click
  - [ ] 9.1.6 Test grid layouts maintain spacing
  - [ ] 9.1.7 Test responsive behavior unchanged
  - [ ] 9.1.8 Test lazy loading for priority images
  - [ ] 9.1.9 Test onLoad callbacks still fire
  - [ ] 9.1.10 Test aspect ratio preservation
  - [ ] 9.1.11 Test accessibility attributes unchanged
  - [ ] 9.1.12 Test performance characteristics maintained

## Phase 4: Validation and Documentation

### Task 10: Manual Testing and Validation
- [ ] 10.1 Browser testing
  - [ ] 10.1.1 Test in Chrome (WebP support)
  - [ ] 10.1.2 Test in Firefox (WebP support)
  - [ ] 10.1.3 Test in Safari (WebP support)
  - [ ] 10.1.4 Test in older browsers (JPEG fallback)
- [ ] 10.2 Network condition testing
  - [ ] 10.2.1 Test with fast connection (images load quickly)
  - [ ] 10.2.2 Test with slow 3G (timeout and retry logic)
  - [ ] 10.2.3 Test with offline mode (placeholder display)
  - [ ] 10.2.4 Test with intermittent connection (retry success)
- [ ] 10.3 Performance validation
  - [ ] 10.3.1 Measure LCP (Largest Contentful Paint) before/after
  - [ ] 10.3.2 Verify zero TMDB API calls in network tab
  - [ ] 10.3.3 Measure lazy loading impact on initial page load
  - [ ] 10.3.4 Verify image cache reduces redundant loads
- [ ] 10.4 Accessibility audit
  - [ ] 10.4.1 Verify alt text on all images
  - [ ] 10.4.2 Verify placeholder has appropriate ARIA labels
  - [ ] 10.4.3 Test with screen reader
  - [ ] 10.4.4 Verify keyboard navigation works
- [ ] 10.5 Create implementation summary
  - [ ] 10.5.1 Document all changes made
  - [ ] 10.5.2 Document test results
  - [ ] 10.5.3 Document performance improvements
  - [ ] 10.5.4 Document any remaining issues

## Notes

- All PBT tasks marked with (PBT) should use @fast-check/vitest
- Retry delays: 1000ms, 2000ms, 4000ms (exponential backoff)
- Timeout: 10000ms (10 seconds)
- Max retries: 3 attempts
- Fallback chain order: thumbnail → poster_path → backdrop_path → placeholder
- UnifiedPlaceholder should match lumen design system
- All tests should verify zero TMDB API calls
