# Implementation Plan: Quran Sermons and Stories

## Overview

This implementation plan breaks down the Quran Sermons and Stories feature into discrete, actionable coding tasks. The feature adds two new tabs to the Quran page: Sermons (الخطب) and Stories (القصص), following the existing Reciters pattern with scholar/narrator lists, content grids, filters, and audio player integration.

**Key Architecture Principles:**
- ALL content data (sermons, stories) → CockroachDB
- ONLY user data (favorites) → Supabase
- Follow existing Quran page patterns (ReciterList, SurahGrid, FilterBar)
- Maintain spiritual design aesthetic (amber/gold, Islamic patterns, glassy effects)
- TypeScript for type safety
- React Query for data fetching and caching

**Implementation Language:** TypeScript (React)

---

## Phase 1: Foundation (Database & API)

### 1. Database Schema and Migration

- [x] 1.1 Create database migration script for CockroachDB
  - Create `scripts/migrations/001_create_quran_sermons_and_stories.sql`
  - Define `quran_sermons` table with all fields (id, title_ar, title_en, scholar_name_ar, scholar_name_en, scholar_image, audio_url, duration_seconds, description_ar, description_en, category, featured, is_active, play_count, created_at, updated_at)
  - Define `quran_stories` table with all fields (id, title_ar, title_en, narrator_name_ar, narrator_name_en, narrator_image, audio_url, duration_seconds, description_ar, description_en, category, source_reference, featured, is_active, play_count, created_at, updated_at)
  - Add CHECK constraints for URL validation, duration > 0, and valid categories
  - Add indexes for category, featured, is_active, scholar/narrator names, play_count
  - Add composite indexes for common query patterns (is_active + featured + play_count + created_at)
  - Create trigger function for auto-updating updated_at timestamp
  - _Requirements: 1.1-1.5, 2.1-2.5_

- [x] 1.2 Run database migration on CockroachDB
  - Execute migration script against CockroachDB
  - Verify all tables created successfully
  - Verify all indexes created successfully
  - Verify constraints are working (test with invalid data)
  - _Requirements: 1.1, 2.1_

- [x] 1.3 Create data seeding script
  - Create `scripts/seed-quran-sermons-stories.js`
  - Implement `seedSermons()` function to read from `scripts/data/sermons.json`
  - Implement `seedStories()` function to read from `scripts/data/stories.json`
  - Add validation for required fields (title_ar, title_en, audio_url)
  - Add URL format validation
  - Handle duplicate entries gracefully with ON CONFLICT DO NOTHING
  - Add progress logging (every 10 records)
  - Add error handling and skip invalid records
  - _Requirements: 25.1-25.8_


- [x] 1.4 Create sample data files
  - Create `scripts/data/sermons.json` with 5-10 sample sermons
  - Create `scripts/data/stories.json` with 5-10 sample stories
  - Include diverse categories for testing
  - Include both featured and non-featured content
  - Use valid HTTPS URLs for audio_url fields
  - _Requirements: 25.2, 25.3_

- [x] 1.5 Run seeding script and verify data
  - Execute `node scripts/seed-quran-sermons-stories.js`
  - Verify sermons inserted successfully
  - Verify stories inserted successfully
  - Query database to confirm data integrity
  - Test category filtering works
  - _Requirements: 25.1-25.7_

### 2. API Endpoints Implementation

- [x] 2.1 Create Sermons API endpoint
  - Create `server/api/quran/sermons.js`
  - Implement GET handler for `/api/quran/sermons`
  - Query CockroachDB WHERE is_active = true
  - Support optional query parameter `category` for filtering
  - Support optional query parameter `featured=true` for featured sermons
  - Support optional query parameter `scholar` for name filtering (ILIKE on both AR and EN)
  - Order results by featured DESC, play_count DESC, created_at DESC
  - Return JSON response with `{ sermons: Sermon[] }` format
  - Add error handling with HTTP 500 and descriptive error messages
  - Log errors to console with context
  - _Requirements: 3.1-3.8_

- [x] 2.2 Create Stories API endpoint
  - Create `server/api/quran/stories.js`
  - Implement GET handler for `/api/quran/stories`
  - Query CockroachDB WHERE is_active = true
  - Support optional query parameter `category` for filtering
  - Support optional query parameter `featured=true` for featured stories
  - Support optional query parameter `narrator` for name filtering (ILIKE on both AR and EN)
  - Order results by featured DESC, play_count DESC, created_at DESC
  - Return JSON response with `{ stories: Story[] }` format
  - Add error handling with HTTP 500 and descriptive error messages
  - _Requirements: 4.1-4.8_


- [x] 2.3 Create Sermon play count endpoint
  - Create `server/api/quran/sermons/[id]/play.js`
  - Implement POST handler for `/api/quran/sermons/:id/play`
  - Increment play_count by 1 in CockroachDB
  - Return updated play_count in response
  - Return 404 if sermon not found or not active
  - Add error handling with HTTP 500
  - _Requirements: 17.1, 17.3_

- [x] 2.4 Create Story play count endpoint
  - Create `server/api/quran/stories/[id]/play.js`
  - Implement POST handler for `/api/quran/stories/:id/play`
  - Increment play_count by 1 in CockroachDB
  - Return updated play_count in response
  - Return 404 if story not found or not active
  - Add error handling with HTTP 500
  - _Requirements: 17.2, 17.4_

- [x] 2.5 Test API endpoints with manual requests
  - Test GET /api/quran/sermons (all sermons)
  - Test GET /api/quran/sermons?category=friday-khutbah
  - Test GET /api/quran/sermons?featured=true
  - Test GET /api/quran/sermons?scholar=محمد
  - Test GET /api/quran/stories (all stories)
  - Test GET /api/quran/stories?category=prophets
  - Test POST /api/quran/sermons/1/play
  - Test POST /api/quran/stories/1/play
  - Verify error responses for invalid requests
  - _Requirements: 3.1-3.8, 4.1-4.8_

---

## Phase 2: Core UI Components & TypeScript Types

### 3. TypeScript Types and Interfaces

- [x] 3.1 Create Sermon types
  - Create `src/types/quran-sermons.ts`
  - Define `SermonCategory` type with all 8 categories
  - Define `Sermon` interface with all fields matching database schema
  - Define `Scholar` interface for grouped sermon data
  - Export all types
  - _Requirements: 5.1-5.10, 10.1_

- [x] 3.2 Create Story types
  - Create `src/types/quran-stories.ts`
  - Define `StoryCategory` type with all 8 categories
  - Define `Story` interface with all fields matching database schema
  - Define `Narrator` interface for grouped story data
  - Export all types
  - _Requirements: 6.1-6.10, 11.1_


- [x] 3.3 Extend Audio Player types
  - Update `src/types/quran-player.ts`
  - Add `'sermon' | 'story'` to `TrackType` union type
  - Add optional fields to `QuranTrack`: category, duration, description
  - Ensure backward compatibility with existing recitation tracks
  - _Requirements: 7.1-7.2_

### 4. Utility Functions

- [x] 4.1 Create sermon utility functions
  - Create `src/lib/sermon-utils.ts`
  - Implement `groupSermonsByScholar(sermons: Sermon[]): Scholar[]` function
  - Implement `formatDuration(seconds: number): string` function (MM:SS or HH:MM:SS)
  - Implement `formatPlayCount(count: number): string` function (K/M suffixes)
  - Add unit tests for each utility function
  - _Requirements: 12.1, 12.4, 17.8_

- [x] 4.2 Create story utility functions
  - Create `src/lib/story-utils.ts`
  - Implement `groupStoriesByNarrator(stories: Story[]): Narrator[]` function
  - Reuse `formatDuration` and `formatPlayCount` from sermon-utils
  - Add unit tests for grouping function
  - _Requirements: 12.1, 12.4_

- [x] 4.3 Create play tracking utility
  - Create `src/lib/play-tracking.ts`
  - Implement `wasRecentlyPlayed(trackId: string, trackType: string): boolean`
  - Implement `recordPlayTracking(trackId: string, trackType: string): void`
  - Use localStorage with 1-hour tracking window
  - Clean old entries automatically
  - Add error handling for localStorage failures
  - _Requirements: 17.5, 17.6_

### 5. React Hooks for Data Fetching

- [x] 5.1 Create useSermons hook
  - Create `src/hooks/useSermons.ts`
  - Use React Query (useQuery) for data fetching
  - Accept optional parameters: category, featured, scholar
  - Build query string from parameters
  - Fetch from `/api/quran/sermons`
  - Return `{ data, isLoading, error }` object
  - Configure staleTime: 5 minutes
  - Configure retry: 3 attempts with exponential backoff
  - Add error logging
  - _Requirements: 8.1-8.7_


- [x] 5.2 Create useStories hook
  - Create `src/hooks/useStories.ts`
  - Use React Query (useQuery) for data fetching
  - Accept optional parameters: category, featured, narrator
  - Build query string from parameters
  - Fetch from `/api/quran/stories`
  - Return `{ data, isLoading, error }` object
  - Configure staleTime: 5 minutes
  - Configure retry: 3 attempts with exponential backoff
  - Add error logging
  - _Requirements: 8.1-8.7_

- [x] 5.3 Create useSermonAudio hook
  - Create `src/hooks/useSermonAudio.ts`
  - Import useQuranPlayerStore
  - Implement `playSermon(sermon: Sermon)` function
  - Convert sermon to QuranTrack format with type='sermon'
  - Ensure HTTPS URLs for audio and images
  - Implement `isCurrentSermon(sermonId: number): boolean` function
  - Implement `trackPlayCompletion(sermonId: number)` function
  - Call POST /api/quran/sermons/:id/play on completion
  - Don't throw errors on analytics failures
  - _Requirements: 7.1-7.9, 17.1_

- [x] 5.4 Create useStoryAudio hook
  - Create `src/hooks/useStoryAudio.ts`
  - Import useQuranPlayerStore
  - Implement `playStory(story: Story)` function
  - Convert story to QuranTrack format with type='story'
  - Ensure HTTPS URLs for audio and images
  - Implement `isCurrentStory(storyId: number): boolean` function
  - Implement `trackPlayCompletion(storyId: number)` function
  - Call POST /api/quran/stories/:id/play on completion
  - Don't throw errors on analytics failures
  - _Requirements: 7.1-7.9, 17.2_

### 6. Scholar/Narrator List Components

- [x] 6.1 Create ScholarList component
  - Create `src/components/features/quran/ScholarList.tsx`
  - Accept props: scholars, selectedScholar, onSelect, isLoading
  - Implement search input with state management
  - Implement "Featured" toggle button
  - Filter scholars by search query (Arabic or English names)
  - Filter scholars by featured status when toggle enabled
  - Display scholar cards with image, name (AR/EN based on lang), sermon count
  - Highlight selected scholar with amber styling
  - Show featured badge (Heart icon) for featured scholars
  - Display loading skeleton when isLoading=true
  - Display empty state when no scholars found
  - Use Framer Motion for animations
  - Follow ReciterList styling patterns
  - _Requirements: 5.1-5.3, 12.1-12.6_


- [x] 6.2 Create NarratorList component
  - Create `src/components/features/quran/NarratorList.tsx`
  - Accept props: narrators, selectedNarrator, onSelect, isLoading
  - Implement search input with state management
  - Implement "Featured" toggle button
  - Filter narrators by search query (Arabic or English names)
  - Filter narrators by featured status when toggle enabled
  - Display narrator cards with image, name (AR/EN based on lang), story count
  - Highlight selected narrator with amber styling
  - Show featured badge (Heart icon) for featured narrators
  - Display loading skeleton when isLoading=true
  - Display empty state when no narrators found
  - Use Framer Motion for animations
  - Follow ReciterList styling patterns
  - _Requirements: 6.1-6.3, 12.1-12.6_

### 7. Content Grid Components

- [x] 7.1 Create SermonCard component
  - Create `src/components/features/quran/SermonCard.tsx`
  - Accept props: sermon, active, isPlaying, onClick, idx, viewMode
  - Support both grid and list view modes
  - Display play/pause icon based on active and isPlaying state
  - Display sermon title (AR/EN based on lang)
  - Display duration using formatDuration utility
  - Display play count using formatPlayCount utility
  - Display category badge with color coding
  - Animate with Framer Motion (stagger based on idx)
  - Apply amber styling when active
  - Follow SurahCard styling patterns
  - _Requirements: 5.5-5.7, 10.2_

- [x] 7.2 Create SermonGrid component
  - Create `src/components/features/quran/SermonGrid.tsx`
  - Accept props: sermons, selectedScholar, viewMode, isPlaying, currentTrack, onPlaySermon
  - Display empty state when no scholar selected
  - Render SermonCard components in grid or list layout
  - Pass active state based on currentTrack comparison
  - Use AnimatePresence for enter/exit animations
  - Support responsive grid columns (2-8 columns based on screen size)
  - Add custom scrollbar styling
  - Follow SurahGrid patterns
  - _Requirements: 5.4-5.9_


- [x] 7.3 Create StoryCard component
  - Create `src/components/features/quran/StoryCard.tsx`
  - Accept props: story, active, isPlaying, onClick, idx, viewMode
  - Support both grid and list view modes
  - Display play/pause icon based on active and isPlaying state
  - Display story title (AR/EN based on lang)
  - Display duration using formatDuration utility
  - Display play count using formatPlayCount utility
  - Display category badge with color coding
  - Animate with Framer Motion (stagger based on idx)
  - Apply amber styling when active
  - Follow SurahCard styling patterns
  - _Requirements: 6.5-6.7, 11.2_

- [x] 7.4 Create StoryGrid component
  - Create `src/components/features/quran/StoryGrid.tsx`
  - Accept props: stories, selectedNarrator, viewMode, isPlaying, currentTrack, onPlayStory
  - Display empty state when no narrator selected
  - Render StoryCard components in grid or list layout
  - Pass active state based on currentTrack comparison
  - Use AnimatePresence for enter/exit animations
  - Support responsive grid columns (2-8 columns based on screen size)
  - Add custom scrollbar styling
  - Follow SurahGrid patterns
  - _Requirements: 6.4-6.9_

### 8. Filter Components

- [x] 8.1 Create SermonFilters component
  - Create `src/components/features/quran/SermonFilters.tsx`
  - Accept props: searchQuery, setSearchQuery, selectedCategories, setSelectedCategories, viewMode, setViewMode, filteredCount
  - Implement search input with GlassInput component
  - Implement view mode toggle (Grid/List) with GlassButton
  - Implement category filter buttons (all 8 sermon categories)
  - Support multi-category selection
  - Display filtered count
  - Use amber color scheme
  - Follow FilterBar styling patterns
  - _Requirements: 5.6-5.7, 10.1-10.5_

- [x] 8.2 Create StoryFilters component
  - Create `src/components/features/quran/StoryFilters.tsx`
  - Accept props: searchQuery, setSearchQuery, selectedCategories, setSelectedCategories, viewMode, setViewMode, filteredCount
  - Implement search input with GlassInput component
  - Implement view mode toggle (Grid/List) with GlassButton
  - Implement category filter buttons (all 8 story categories)
  - Support multi-category selection
  - Display filtered count
  - Use amber color scheme
  - Follow FilterBar styling patterns
  - _Requirements: 6.6-6.7, 11.1-11.5_


### 9. Header Components

- [x] 9.1 Create ScholarHeader component
  - Create `src/components/features/quran/ScholarHeader.tsx`
  - Accept props: scholar
  - Display scholar image or placeholder
  - Display scholar name (AR/EN based on lang)
  - Display sermon count
  - Display featured badge if applicable
  - Use amber/gold styling with glassy effects
  - Follow ReciterHeader patterns
  - _Requirements: 12.3, 12.5_

- [x] 9.2 Create NarratorHeader component
  - Create `src/components/features/quran/NarratorHeader.tsx`
  - Accept props: narrator
  - Display narrator image or placeholder
  - Display narrator name (AR/EN based on lang)
  - Display story count
  - Display featured badge if applicable
  - Use amber/gold styling with glassy effects
  - Follow ReciterHeader patterns
  - _Requirements: 12.3, 12.5_

---

## Phase 3: Audio Player Integration

### 10. Audio Player Store Updates

- [x] 10.1 Update Quran Player Store for track types
  - Update `src/state/useQuranPlayerStore.ts`
  - Add `onTrackComplete` callback to state interface
  - Add track completion detection at 95% progress
  - Call `onTrackComplete(trackId, trackType)` when track reaches 95%
  - Use ref to prevent duplicate completion calls
  - Ensure backward compatibility with existing recitation tracks
  - _Requirements: 7.5, 7.8, 17.1-17.2_

- [x] 10.2 Update audio player UI for sermon/story tracks
  - Update `src/components/features/quran/FullPlayer.tsx`
  - Display scholar name when track type is 'sermon'
  - Display narrator name when track type is 'story'
  - Display appropriate icon for sermon tracks (different from Quran icon)
  - Display appropriate icon for story tracks (different from Quran icon)
  - Maintain all existing player features (play/pause, seek, volume, speed)
  - _Requirements: 7.3-7.4, 7.7, 7.9_


- [x] 10.3 Update mini player for sermon/story tracks
  - Update `src/components/features/quran/MiniPlayer.tsx`
  - Display scholar/narrator name based on track type
  - Display sermon/story title
  - Use appropriate icons for different track types
  - Maintain all existing mini player features
  - _Requirements: 7.3-7.4_

- [x] 10.4 Implement play count tracking integration
  - In useSermonAudio hook, set up onTrackComplete callback
  - Check wasRecentlyPlayed before incrementing
  - Call trackPlayCompletion when track reaches 95%
  - Record play tracking in localStorage
  - In useStoryAudio hook, set up onTrackComplete callback
  - Check wasRecentlyPlayed before incrementing
  - Call trackPlayCompletion when track reaches 95%
  - Record play tracking in localStorage
  - _Requirements: 17.1-17.7_

---

## Phase 4: Tab Navigation & Page Integration

### 11. Quran Page Tab Integration

- [x] 11.1 Update Quran page with tab state management
  - Update `src/pages/discovery/Quran.tsx`
  - Add state: `activeTab: 'reciters' | 'sermons' | 'stories'`
  - Update tab buttons to switch between three tabs
  - Sync activeTab with URL query parameter `?tab=`
  - Read URL parameter on page load and set initial tab
  - Update URL when tab changes (without page reload)
  - Maintain existing Reciters tab functionality
  - _Requirements: 9.1-9.5_

- [x] 11.2 Create Sermons tab content
  - In Quran.tsx, add conditional rendering for Sermons tab
  - Fetch sermons using useSermons hook
  - Group sermons by scholar using utility function
  - Manage selected scholar state
  - Manage sermon search and filter state
  - Render ScholarList component
  - Render ScholarHeader when scholar selected
  - Render SermonFilters component
  - Render SermonGrid component
  - Integrate useSermonAudio hook for playback
  - Handle loading and error states
  - _Requirements: 5.1-5.10, 9.2_


- [x] 11.3 Create Stories tab content
  - In Quran.tsx, add conditional rendering for Stories tab
  - Fetch stories using useStories hook
  - Group stories by narrator using utility function
  - Manage selected narrator state
  - Manage story search and filter state
  - Render NarratorList component
  - Render NarratorHeader when narrator selected
  - Render StoryFilters component
  - Render StoryGrid component
  - Integrate useStoryAudio hook for playback
  - Handle loading and error states
  - _Requirements: 6.1-6.10, 9.3_

- [x] 11.4 Implement tab transition animations
  - Add Framer Motion animations for tab switching
  - Animate tab button active state with amber glow
  - Ensure smooth transitions between tab content
  - Maintain spiritual design aesthetic
  - _Requirements: 9.7_

- [x] 11.5 Test tab navigation and URL state
  - Test clicking each tab updates URL
  - Test loading page with ?tab=sermons activates Sermons tab
  - Test loading page with ?tab=stories activates Stories tab
  - Test loading page with ?tab=reciters activates Reciters tab
  - Test loading page without tab parameter defaults to reciters
  - Test browser back/forward buttons work correctly
  - Test audio continues playing when switching tabs
  - _Requirements: 9.4-9.5, 9.8, 7.6_

---

## Phase 5: Testing & Quality Assurance

### 12. Unit Tests

- [ ] 12.1 Write unit tests for utility functions
  - Test `groupSermonsByScholar` with various inputs
  - Test `groupStoriesByNarrator` with various inputs
  - Test `formatDuration` with edge cases (0, 59, 60, 3599, 3600, 7200)
  - Test `formatPlayCount` with edge cases (0, 999, 1000, 1500, 999999, 1000000)
  - Test `wasRecentlyPlayed` and `recordPlayTracking` functions
  - _Requirements: 26.1_

- [ ] 12.2 Write unit tests for React hooks
  - Test useSermons hook returns correct data shape
  - Test useSermons hook with filter parameters
  - Test useStories hook returns correct data shape
  - Test useStories hook with filter parameters
  - Test useSermonAudio hook playSermon function
  - Test useStoryAudio hook playStory function
  - Mock API responses for testing
  - _Requirements: 26.1_


- [ ] 12.3 Write component tests for UI components
  - Test ScholarList renders correctly with data
  - Test ScholarList search filtering works
  - Test ScholarList featured toggle works
  - Test NarratorList renders correctly with data
  - Test SermonCard displays all required information
  - Test StoryCard displays all required information
  - Test SermonFilters category selection works
  - Test StoryFilters category selection works
  - Use React Testing Library
  - _Requirements: 26.3_

### 13. Property-Based Tests

- [ ]* 13.1 Write property test for URL validation (Property 1)
  - Create `src/__tests__/quran-sermons/properties/url-validation.property.test.ts`
  - Use fast-check to generate random sermon/story data
  - Verify audio_url matches valid HTTP/HTTPS format
  - Run 100 iterations minimum
  - **Property 1: URL Validation for Audio Files**
  - **Validates: Requirements 1.5, 2.5**

- [ ]* 13.2 Write property test for active content filtering (Property 2)
  - Create `src/__tests__/quran-sermons/properties/active-filtering.property.test.ts`
  - Test API returns only records with is_active=true
  - Use fast-check to generate random filter parameters
  - **Property 2: Active Content Filtering**
  - **Validates: Requirements 3.1, 4.1**

- [ ]* 13.3 Write property test for sorting order (Property 3)
  - Create `src/__tests__/quran-sermons/properties/sorting-order.property.test.ts`
  - Verify results ordered by featured DESC, play_count DESC, created_at DESC
  - Test with various data combinations
  - **Property 3: Sorting Order Consistency**
  - **Validates: Requirements 3.3, 4.3**

- [ ]* 13.4 Write property test for category filtering (Property 4)
  - Create `src/__tests__/quran-sermons/properties/category-filtering.property.test.ts`
  - Test all returned items match specified category
  - Use fast-check to test all valid categories
  - **Property 4: Category Filtering Accuracy**
  - **Validates: Requirements 3.4, 4.4**

- [ ]* 13.5 Write property test for featured filtering (Property 5)
  - Create `src/__tests__/quran-sermons/properties/featured-filtering.property.test.ts`
  - Test featured=true returns only featured items
  - **Property 5: Featured Content Filtering**
  - **Validates: Requirements 3.5, 4.5**


- [ ]* 13.6 Write property test for scholar/narrator filtering (Property 6)
  - Create `src/__tests__/quran-sermons/properties/name-filtering.property.test.ts`
  - Test name search matches Arabic or English names
  - Use fast-check to generate random name queries
  - **Property 6: Scholar/Narrator Name Filtering**
  - **Validates: Requirements 3.6, 4.6**

- [ ]* 13.7 Write property test for search completeness (Property 7)
  - Create `src/__tests__/quran-sermons/properties/search-completeness.property.test.ts`
  - Test all displayed items match search query
  - **Property 7: Search Filtering Completeness**
  - **Validates: Requirements 5.2, 6.2**

- [ ]* 13.8 Write property test for play count increment (Property 15)
  - Create `src/__tests__/quran-sermons/properties/play-count.property.test.ts`
  - Test play_count increases by exactly 1 on completion
  - Use fast-check to test with random sermon/story IDs
  - **Property 15: Play Count Increment**
  - **Validates: Requirements 7.8, 17.1-17.2**

- [ ]* 13.9 Write property test for URL state sync (Property 19)
  - Create `src/__tests__/quran-sermons/properties/url-state.property.test.ts`
  - Test URL parameter matches active tab
  - **Property 19: URL State Synchronization**
  - **Validates: Requirement 9.4**

- [ ]* 13.10 Write property test for category validation (Property 22)
  - Create `src/__tests__/quran-sermons/properties/category-validation.property.test.ts`
  - Test database rejects invalid categories
  - Test database accepts all valid categories
  - **Property 22: Category Validation**
  - **Validates: Requirements 10.4, 11.4**

### 14. Integration Tests

- [ ]* 14.1 Write E2E test for sermon playback flow
  - Create `src/__tests__/quran-sermons/integration/sermon-flow.test.ts`
  - Test: Load page → Select scholar → Click sermon → Audio plays
  - Verify API calls made correctly
  - Verify UI updates correctly
  - Verify audio player state changes
  - _Requirements: 26.4_


- [ ]* 14.2 Write E2E test for story playback flow
  - Create `src/__tests__/quran-sermons/integration/story-flow.test.ts`
  - Test: Load page → Select narrator → Click story → Audio plays
  - Verify API calls made correctly
  - Verify UI updates correctly
  - Verify audio player state changes
  - _Requirements: 26.4_

- [ ]* 14.3 Write integration test for tab switching
  - Create `src/__tests__/quran-sermons/integration/tab-switching.test.ts`
  - Test switching between all three tabs
  - Verify URL updates correctly
  - Verify content renders correctly for each tab
  - Verify audio continues playing during tab switch
  - _Requirements: 9.1-9.8_

### 15. Accessibility Tests

- [ ]* 15.1 Run axe-core accessibility tests
  - Create `src/__tests__/quran-sermons/accessibility/a11y.test.tsx`
  - Test ScholarList component with axe
  - Test NarratorList component with axe
  - Test SermonCard component with axe
  - Test StoryCard component with axe
  - Test SermonFilters component with axe
  - Test StoryFilters component with axe
  - Ensure no accessibility violations
  - _Requirements: 18.1-18.9, 26.6_

- [ ]* 15.2 Test keyboard navigation
  - Create `src/__tests__/quran-sermons/accessibility/keyboard-nav.test.tsx`
  - Test Tab key navigation through all interactive elements
  - Test Enter/Space key activation of buttons
  - Test Arrow key navigation in grids
  - Test Escape key for closing modals/dropdowns
  - Verify focus indicators are visible
  - _Requirements: 18.2-18.3_

- [ ]* 15.3 Test screen reader support
  - Create `src/__tests__/quran-sermons/accessibility/screen-reader.test.tsx`
  - Test ARIA labels are present and correct
  - Test live regions announce playback state changes
  - Test all images have alt text
  - Test form inputs have associated labels
  - _Requirements: 18.1, 18.4, 18.6, 18.8_


### 16. Responsive Design Tests

- [ ]* 16.1 Test mobile layout (< 768px)
  - Create `src/__tests__/quran-sermons/responsive/mobile.test.tsx`
  - Test sidebar stacks vertically on mobile
  - Test grid columns adjust for mobile (2 columns)
  - Test touch targets are minimum 44x44px
  - Test text remains readable
  - _Requirements: 14.1-14.3, 14.6, 26.7_

- [ ]* 16.2 Test tablet layout (768px-1024px)
  - Create `src/__tests__/quran-sermons/responsive/tablet.test.tsx`
  - Test sidebar and content layout
  - Test grid columns adjust for tablet (4-6 columns)
  - Test touch interactions work correctly
  - _Requirements: 14.1-14.3_

- [ ]* 16.3 Test desktop layout (> 1024px)
  - Create `src/__tests__/quran-sermons/responsive/desktop.test.tsx`
  - Test sidebar and content side-by-side
  - Test grid columns at maximum (8 columns)
  - Test hover states work correctly
  - _Requirements: 14.1-14.3_

- [ ]* 16.4 Test RTL support
  - Create `src/__tests__/quran-sermons/responsive/rtl.test.tsx`
  - Test layout flips correctly for Arabic
  - Test text alignment is correct
  - Test icons and UI elements mirror correctly
  - _Requirements: 14.4-14.5, 26.8_

---

## Phase 6: Performance & Polish

### 17. Performance Optimization

- [x] 17.1 Implement image lazy loading
  - Create `src/components/features/quran/LazyImage.tsx`
  - Use Intersection Observer API
  - Load images only when in viewport
  - Add fade-in transition on load
  - Provide fallback for scholars/narrators without images
  - _Requirements: 12.6, 15.3_

- [x] 17.2 Configure React Query caching
  - Update React Query client configuration
  - Set staleTime: 5 minutes for sermon/story queries
  - Set cacheTime: 30 minutes
  - Disable refetchOnWindowFocus
  - Enable refetchOnReconnect
  - _Requirements: 15.1, 15.5_


- [x] 17.3 Implement search debouncing
  - Add 300ms debounce to search inputs
  - Use useDebouncedValue hook or similar
  - Prevent excessive re-renders during typing
  - _Requirements: 13.3, 15.3_

- [x] 17.4 Add loading skeletons
  - Create SermonCardSkeleton component
  - Create StoryCardSkeleton component
  - Create ScholarListSkeleton component
  - Create NarratorListSkeleton component
  - Display skeletons during data loading
  - Match layout of actual components
  - _Requirements: 16.1_

- [ ] 17.5 Optimize database queries
  - Verify composite indexes are being used
  - Run EXPLAIN ANALYZE on common queries
  - Optimize query performance if needed
  - Add query result caching at API level if beneficial
  - _Requirements: 15.1-15.2_

### 18. Error Handling

- [ ] 18.1 Implement API error handling
  - Add try-catch blocks to all API endpoints
  - Return appropriate HTTP status codes (404, 500)
  - Return descriptive error messages in JSON
  - Log errors to console with context
  - _Requirements: 3.7, 4.7, 16.2-16.4_

- [x] 18.2 Implement UI error states
  - Create ErrorMessage component for API failures
  - Add retry button to error messages
  - Display user-friendly error messages (Arabic and English)
  - Show error state in sermon/story grids
  - Show error state in scholar/narrator lists
  - _Requirements: 16.2-16.3, 16.8_

- [ ] 18.3 Implement audio error handling
  - Add error event listener to audio player
  - Handle network errors (MEDIA_ERR_NETWORK)
  - Handle decode errors (MEDIA_ERR_DECODE)
  - Handle unsupported format errors (MEDIA_ERR_SRC_NOT_SUPPORTED)
  - Display error notification with retry option
  - Log audio errors without interrupting user experience
  - _Requirements: 16.3, 16.7_


- [ ] 18.4 Implement graceful degradation
  - Show cached data if API fails
  - Display maintenance message if database unavailable
  - Allow offline playback of previously loaded audio
  - Provide fallback UI for missing images
  - _Requirements: 16.6-16.7_

### 19. SEO Optimization

- [ ] 19.1 Add dynamic meta tags
  - Update SeoHead component in Quran.tsx
  - Generate unique titles for each tab
  - Generate descriptive meta descriptions
  - Include scholar/narrator names in descriptions
  - Support both Arabic and English meta tags
  - _Requirements: 19.1-19.2_

- [ ] 19.2 Implement Open Graph tags
  - Add og:title, og:description, og:image tags
  - Add og:type as "website"
  - Add og:url with canonical URL
  - Create social media preview image for Quran page
  - _Requirements: 19.3, 23.5-23.6_

- [ ] 19.3 Add JSON-LD structured data
  - Create SermonStructuredData component
  - Create StoryStructuredData component
  - Use AudioObject schema from schema.org
  - Include title, description, contentUrl, duration, author
  - Include play count as interactionStatistic
  - _Requirements: 19.4_

- [ ] 19.4 Implement semantic HTML
  - Use article, section, nav elements appropriately
  - Use proper heading hierarchy (h1, h2, h3)
  - Use semantic button and link elements
  - Ensure proper HTML5 structure
  - _Requirements: 19.7_

### 20. Audio Quality & Format Support

- [ ] 20.1 Validate audio file formats
  - Ensure all seeded audio files are MP3 or M4A/AAC
  - Verify minimum bitrate of 128kbps
  - Test audio playback across browsers
  - Add format validation to seeding script
  - _Requirements: 22.1-22.3_


- [ ] 20.2 Implement audio streaming
  - Ensure audio player uses progressive download
  - Don't require full file download before playback
  - Preload metadata only (not full audio)
  - Test streaming works on slow connections
  - _Requirements: 22.4, 22.6_

- [ ] 20.3 Add audio preloading for next track
  - Detect next sermon/story in queue
  - Preload metadata for next track
  - Don't download full audio until needed
  - Improve perceived performance
  - _Requirements: 22.5_

### 21. Sharing Features

- [ ] 21.1 Add share button to sermon/story cards
  - Add Share icon button to SermonCard
  - Add Share icon button to StoryCard
  - Open share modal on click
  - _Requirements: 23.1_

- [ ] 21.2 Implement share modal
  - Create ShareModal component
  - Display sharing options: WhatsApp, Telegram, Twitter, Copy Link
  - Generate shareable URLs: `/quran?tab=sermons&id=123`
  - Implement copy to clipboard functionality
  - Show success message after copying
  - _Requirements: 23.2-23.4_

- [ ] 21.3 Implement deep linking
  - Parse `id` query parameter on page load
  - Auto-select correct tab based on URL
  - Auto-play sermon/story if ID provided
  - Handle invalid IDs gracefully
  - _Requirements: 23.4_

- [ ] 21.4 Add Web Share API support
  - Detect if Web Share API is available
  - Use native share on mobile devices
  - Fall back to custom modal on desktop
  - Test on iOS and Android
  - _Requirements: 23.8_

### 22. Final Polish

- [ ] 22.1 Add reduced motion support
  - Create CSS media query for prefers-reduced-motion
  - Disable animations when reduced motion preferred
  - Disable Framer Motion animations
  - Disable pulse and spin animations
  - _Requirements: 18.7_


- [ ] 22.2 Verify color contrast ratios
  - Test all text meets WCAG AA standards (4.5:1)
  - Test amber text on dark backgrounds
  - Test white text on amber backgrounds
  - Use contrast checker tool
  - Adjust colors if needed
  - _Requirements: 18.5_

- [ ] 22.3 Add empty states
  - Create empty state for no scholar selected
  - Create empty state for no narrator selected
  - Create empty state for no search results
  - Create empty state for no sermons/stories available
  - Use appropriate icons and messages (Arabic and English)
  - _Requirements: 5.9, 6.9, 13.6_

- [ ] 22.4 Implement loading states
  - Show loading spinner during API requests
  - Show skeleton loaders during initial load
  - Show loading indicator during tab switches
  - Show loading state in audio player
  - _Requirements: 16.1, 16.5_

- [ ] 22.5 Add success feedback
  - Show toast notification when sermon/story starts playing
  - Show success message when link copied to clipboard
  - Show confirmation when favorite added (if implemented)
  - Use subtle, non-intrusive notifications
  - _Requirements: 16.8_

### 23. Documentation

- [ ] 23.1 Document API endpoints
  - Create API documentation for GET /api/quran/sermons
  - Create API documentation for GET /api/quran/stories
  - Create API documentation for POST /api/quran/sermons/:id/play
  - Create API documentation for POST /api/quran/stories/:id/play
  - Include request/response examples
  - Document query parameters
  - _Requirements: 27.1_

- [ ] 23.2 Document database schema
  - Document quran_sermons table structure
  - Document quran_stories table structure
  - Document all fields and constraints
  - Document indexes and their purpose
  - _Requirements: 27.2_


- [ ] 23.3 Document React components
  - Add JSDoc comments to all components
  - Document component props with TypeScript
  - Add usage examples for complex components
  - Document state management patterns
  - _Requirements: 27.3_

- [ ] 23.4 Create troubleshooting guide
  - Document common issues and solutions
  - Add debugging tips for audio playback issues
  - Add debugging tips for API connection issues
  - Add debugging tips for database query issues
  - _Requirements: 27.8_

### 24. Final Testing & Deployment

- [ ] 24.1 Run full test suite
  - Run all unit tests: `npm test`
  - Run all property-based tests
  - Run all integration tests
  - Run all accessibility tests
  - Ensure all tests pass
  - Fix any failing tests
  - _Requirements: 26.1-26.10_

- [ ] 24.2 Test across browsers
  - Test on Chrome (latest)
  - Test on Firefox (latest)
  - Test on Safari (latest)
  - Test on Edge (latest)
  - Test on mobile Safari (iOS)
  - Test on mobile Chrome (Android)
  - Fix any browser-specific issues
  - _Requirements: 22.8, 26.10_

- [ ] 24.3 Test responsive layouts
  - Test on mobile devices (iPhone, Android)
  - Test on tablets (iPad, Android tablets)
  - Test on desktop (various screen sizes)
  - Test on ultra-wide monitors
  - Verify layouts work correctly at all breakpoints
  - _Requirements: 14.1-14.8, 26.7_

- [ ] 24.4 Performance testing
  - Measure page load time (target < 3 seconds)
  - Measure Core Web Vitals (LCP, FID, CLS)
  - Test with slow 3G network simulation
  - Optimize if performance targets not met
  - _Requirements: 15.8, 19.8, 26.9_


- [ ] 24.5 Security review
  - Verify all audio URLs use HTTPS
  - Verify all image URLs use HTTPS
  - Check for SQL injection vulnerabilities in API
  - Check for XSS vulnerabilities in UI
  - Verify input validation on all endpoints
  - _Requirements: 1.5, 2.5_

- [ ] 24.6 Content review
  - Verify all seeded sermons have correct data
  - Verify all seeded stories have correct data
  - Check for any placeholder or test data
  - Verify audio files are accessible
  - Verify images are accessible
  - _Requirements: 25.1-25.8_

- [ ] 24.7 Checkpoint - Ensure all tests pass
  - Run complete test suite one final time
  - Verify no console errors in browser
  - Verify no console warnings in browser
  - Check for any TODO comments in code
  - Ask user if any questions or issues arise
  - _Requirements: All_

---

## Notes

### Task Marking Convention
- `[ ]` - Not started
- `[x]` - Completed
- `[ ]*` - Optional (can be skipped for faster MVP)

### Optional Tasks
Tasks marked with `*` are optional and primarily related to testing. These can be skipped to accelerate MVP delivery, but are recommended for production quality:
- All property-based tests (13.1-13.10)
- All integration tests (14.1-14.3)
- All accessibility tests (15.1-15.3)
- All responsive design tests (16.1-16.4)

### Requirements Coverage
Each task references specific requirements from the requirements document for traceability. The format is `_Requirements: X.Y_` where X is the requirement number and Y is the acceptance criteria number.

### Implementation Order
Tasks are organized into 6 phases that build on each other:
1. **Phase 1**: Database and API foundation
2. **Phase 2**: TypeScript types and UI components
3. **Phase 3**: Audio player integration
4. **Phase 4**: Tab navigation and page integration
5. **Phase 5**: Testing and quality assurance
6. **Phase 6**: Performance optimization and polish


### Checkpoints
Checkpoints are included at strategic points to ensure quality and allow for user feedback:
- After Phase 1: Database and API verified working
- After Phase 4: Core functionality complete and integrated
- After Phase 6: Final testing and deployment readiness

### Database Architecture Compliance
**CRITICAL**: This feature strictly follows the database architecture rules:
- ✅ ALL sermon and story content → CockroachDB
- ✅ API endpoints query CockroachDB via `server/api/quran/` pattern
- ❌ NEVER use Supabase for content data
- ✅ Supabase ONLY for user data (favorites - optional feature, not in MVP)

### Design Consistency
All components follow existing Quran page patterns:
- ScholarList mirrors ReciterList
- SermonGrid mirrors SurahGrid
- SermonFilters mirrors FilterBar
- Amber/gold color scheme (#f59e0b, #d97706)
- Islamic geometric patterns
- Glassy backdrop-blur effects
- Smooth Framer Motion animations
- RTL support for Arabic

### Property-Based Testing
32 properties have been identified in the design document. The most critical properties are included as optional tasks (13.1-13.10). Each property test:
- Uses fast-check library
- Runs minimum 100 iterations
- References the property number from design document
- Validates specific requirements

### Testing Strategy
The feature uses a dual testing approach:
- **Unit tests**: Verify specific examples and edge cases
- **Property tests**: Verify universal correctness across all inputs
- **Integration tests**: Verify end-to-end user flows
- **Accessibility tests**: Verify WCAG AA compliance

Both unit and property tests are complementary and necessary for comprehensive coverage.

---

## Summary

This implementation plan provides a complete, step-by-step guide for implementing the Quran Sermons and Stories feature. The plan is organized into 6 phases with 24 major task groups and 100+ individual tasks.

**Estimated Effort:**
- Phase 1 (Database & API): 2-3 days
- Phase 2 (UI Components): 4-5 days
- Phase 3 (Audio Integration): 1-2 days
- Phase 4 (Tab Navigation): 1-2 days
- Phase 5 (Testing): 3-4 days (optional tasks can be skipped)
- Phase 6 (Polish): 2-3 days

**Total Estimated Time**: 13-19 days (8-10 days without optional testing tasks)

