# Implementation Plan - Content Display Fix

## Phase 1: Exploratory Testing (Before Fix)

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Triple Titles Display
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with concrete failing cases (content with 3 distinct titles)
  - Test implementation details:
    - Create mock content with `{ title_ar: 'رانينج مان', title_en: 'Running Man', original_title: '런닝맨' }`
    - Render Watch.tsx component with this content
    - Assert that all 3 titles are displayed separately
    - Assert that Arabic title is displayed as primary
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Only 2 titles displayed instead of 3
    - Original title (Korean) is hidden
    - useDualTitles hook only returns main and sub titles
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Player and Navigation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Test video player functionality (play, pause, seek)
    - Test navigation between episodes
    - Test server selection and reporting
    - Test watch party synchronization
    - Test SEO meta tags generation
    - Test error handling (NotFound, API failures)
  - Write property-based tests capturing observed behavior patterns:
    - For all player interactions → player state changes correctly
    - For all navigation actions → routing works correctly
    - For all server operations → server management works correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

## Phase 2: Implementation

- [x] 3. Fix for content display issues

  - [x] 3.1 Create useTripleTitles hook
    - Create new file `src/hooks/useTripleTitles.ts`
    - Implement hook that returns:
      ```typescript
      {
        arabic: string | null,      // title_ar or name_ar
        english: string | null,     // title_en or name_en
        original: string | null,    // original_title or original_name
        primary: string,            // Arabic first, then English, then original
        hasMultipleTitles: boolean  // true if more than one title exists
      }
      ```
    - Handle edge cases:
      - If original === english, don't duplicate
      - If arabic === english (rare), show once
      - Prioritize arabic > english > original for primary
    - _Bug_Condition: isBugCondition(content) where content has 3 distinct titles_
    - _Expected_Behavior: Display all 3 titles separately with Arabic as primary_
    - _Preservation: Does not affect player, navigation, or other functionality_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Update Watch.tsx to use useTripleTitles
    - Replace `useDualTitles` import with `useTripleTitles`
    - Update component to use `tripleTitles` instead of `dualTitles`
    - Update JSX to display all 3 titles:
      ```tsx
      <div className="titles-container">
        <h1 className="title-primary">{tripleTitles.primary}</h1>
        {tripleTitles.hasMultipleTitles && (
          <div className="titles-secondary">
            {tripleTitles.english && tripleTitles.english !== tripleTitles.primary && (
              <span className="title-english">{tripleTitles.english}</span>
            )}
            {tripleTitles.original && tripleTitles.original !== tripleTitles.primary && tripleTitles.original !== tripleTitles.english && (
              <span className="title-original">{tripleTitles.original}</span>
            )}
          </div>
        )}
      </div>
      ```
    - _Bug_Condition: Content with 3 distinct titles displayed incorrectly_
    - _Expected_Behavior: All 3 titles displayed separately_
    - _Preservation: Player, navigation, SEO unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Update description logic in Watch.tsx
    - Replace current overview logic with:
      ```typescript
      const overview = useMemo(() => {
        const arOverview = details?.overview_ar || details?.overview
        const enOverview = details?.overview_en
        
        if (lang === 'ar') {
          return arOverview || enOverview || 'لا يوجد وصف متاح'
        }
        return enOverview || arOverview || 'No description available'
      }, [details, lang])
      ```
    - Prioritize Arabic description first
    - Fall back to English if Arabic not available
    - _Bug_Condition: Descriptions not prioritizing Arabic_
    - _Expected_Behavior: Arabic description shown first_
    - _Preservation: Description display logic only, no other changes_
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 3.4 Fix seasons fetching in Watch.tsx
    - Add state for seasons: `const [seasons, setSeasons] = useState<Season[]>([])`
    - Add useEffect to fetch seasons for TV series:
      ```typescript
      useEffect(() => {
        if (type === 'tv' && details?.slug) {
          getSeasons(details.slug).then(setSeasons).catch(console.error)
        }
      }, [type, details?.slug])
      ```
    - Pass seasons to EpisodeSelector component
    - _Bug_Condition: Seasons not fetched or displayed correctly_
    - _Expected_Behavior: All seasons fetched and displayed_
    - _Preservation: Episode navigation unchanged_
    - _Requirements: 2.7, 2.8, 2.9_

  - [x] 3.5 Update slug-only routing in Watch.tsx
    - Remove fallback to ID: remove `const identifier = slug || id`
    - Add validation to reject requests without slug:
      ```typescript
      if (!slug) {
        setError(true)
        setFetchError(true)
        setLoading(false)
        return
      }
      const identifier = slug
      ```
    - Update all API calls to use slug only
    - _Bug_Condition: IDs used in URLs instead of slugs_
    - _Expected_Behavior: Only slugs accepted in routing_
    - _Preservation: Existing slug-based routing unchanged_
    - _Requirements: 2.10, 2.11, 2.13_

  - [x] 3.6 Update contentAPI.ts services
    - Update `getSeasons` function:
      ```typescript
      export async function getSeasons(seriesSlug: string): Promise<Season[]> {
        const data = await fetchAPI(`/api/db/tv/${seriesSlug}/seasons`)
        return data as Season[]
      }
      ```
    - Update `getEpisodes` function:
      ```typescript
      export async function getEpisodes(seriesSlug: string, seasonNumber: number): Promise<Episode[]> {
        const data = await fetchAPI(`/api/db/tv/${seriesSlug}/seasons/${seasonNumber}/episodes`)
        return data as Episode[]
      }
      ```
    - Add TypeScript interfaces:
      ```typescript
      export interface Season {
        id: string
        season_number: number
        name: string
        name_ar: string | null
        name_en: string | null
        overview: string | null
        overview_ar: string | null
        overview_en: string | null
        episode_count: number
        air_date: string | null
        poster_url: string | null
      }
      
      export interface Episode {
        id: string
        episode_number: number
        name: string
        name_ar: string | null
        name_en: string | null
        overview: string | null
        overview_ar: string | null
        overview_en: string | null
        runtime: number | null
        air_date: string | null
        still_url: string | null
        vote_average: number | null
      }
      ```
    - _Bug_Condition: API not returning all required fields_
    - _Expected_Behavior: All fields returned from API_
    - _Preservation: Existing API functionality unchanged_
    - _Requirements: 2.14_

  - [x] 3.7 Update EpisodeSelector.tsx (if exists)
    - Update to display triple titles for seasons and episodes
    - Use useTripleTitles hook for season/episode names
    - Display descriptions with Arabic priority
    - Ensure all links use slugs only
    - _Bug_Condition: Seasons/episodes not displaying all titles_
    - _Expected_Behavior: All titles displayed for seasons/episodes_
    - _Preservation: Episode selection functionality unchanged_
    - _Requirements: 2.7, 2.8, 2.9_

## Phase 3: Backend API Updates

- [x] 4. Update Backend API endpoints

  - [x] 4.1 Update /api/movies/:slug endpoint
    - Ensure SQL query returns all required fields:
      ```sql
      SELECT 
        id, slug, external_id, external_source,
        title, title_ar, title_en, original_title,
        overview, overview_ar, overview_en,
        original_language, poster_url, backdrop_url,
        release_date, vote_average, vote_count, popularity, runtime,
        genres, status, is_published
      FROM movies
      WHERE slug = $1 AND is_published = true
      ```
    - Add slug validation (reject numeric-only IDs)
    - _Bug_Condition: Missing fields in API response_
    - _Expected_Behavior: All fields returned_
    - _Preservation: Existing movie fetching unchanged_
    - _Requirements: 2.13, 2.14_

  - [x] 4.2 Update /api/tv/:slug endpoint
    - Ensure SQL query returns all required fields:
      ```sql
      SELECT 
        id, slug, external_id, external_source,
        name, name_ar, name_en, original_name,
        overview, overview_ar, overview_en,
        original_language, poster_url, backdrop_url,
        first_air_date, last_air_date, vote_average, vote_count, popularity,
        number_of_seasons, number_of_episodes,
        genres, status, type, is_published
      FROM tv_series
      WHERE slug = $1 AND is_published = true
      ```
    - Add slug validation
    - _Bug_Condition: Missing fields in API response_
    - _Expected_Behavior: All fields returned_
    - _Preservation: Existing TV fetching unchanged_
    - _Requirements: 2.13, 2.14_

  - [x] 4.3 Create/Update /api/tv/:slug/seasons endpoint
    - Create or update endpoint to return seasons:
      ```sql
      SELECT 
        s.id, s.season_number,
        s.name, s.name_ar, s.name_en,
        s.overview, s.overview_ar, s.overview_en,
        s.episode_count, s.air_date, s.poster_url
      FROM seasons s
      JOIN tv_series tv ON s.series_id = tv.id
      WHERE tv.slug = $1
      ORDER BY s.season_number ASC
      ```
    - Add slug validation
    - _Bug_Condition: Seasons not returned or missing fields_
    - _Expected_Behavior: All seasons with all fields returned_
    - _Preservation: N/A (new/updated endpoint)_
    - _Requirements: 2.7, 2.14_

  - [x] 4.4 Create/Update /api/tv/:slug/seasons/:seasonNumber/episodes endpoint
    - Create or update endpoint to return episodes:
      ```sql
      SELECT 
        e.id, e.episode_number,
        e.name, e.name_ar, e.name_en,
        e.overview, e.overview_ar, e.overview_en,
        e.runtime, e.air_date, e.still_url, e.vote_average
      FROM episodes e
      JOIN seasons s ON e.season_id = s.id
      JOIN tv_series tv ON s.series_id = tv.id
      WHERE tv.slug = $1 AND s.season_number = $2
      ORDER BY e.episode_number ASC
      ```
    - Add slug validation
    - _Bug_Condition: Episodes not returned or missing fields_
    - _Expected_Behavior: All episodes with all fields returned_
    - _Preservation: N/A (new/updated endpoint)_
    - _Requirements: 2.8, 2.14_

## Phase 4: Validation

- [x] 5. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - Triple Titles Display
  - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
  - The test from task 1 encodes the expected behavior
  - When this test passes, it confirms the expected behavior is satisfied
  - Run bug condition exploration test from step 1
  - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
  - Verify all 3 titles are displayed:
    - Arabic title as primary
    - English title as secondary
    - Original title as tertiary
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Verify preservation tests still pass
  - **Property 2: Preservation** - Player and Navigation Behavior
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - Run preservation property tests from step 2
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Confirm all tests still pass after fix:
    - Player functionality unchanged
    - Navigation works correctly
    - Server management unchanged
    - Watch party synchronization works
    - SEO meta tags correct
    - Error handling unchanged
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

## Phase 5: Testing

- [ ] 7. Unit Tests

  - [ ] 7.1 Test useTripleTitles hook
    - Test with 3 distinct titles → returns all 3
    - Test with 2 titles (original === english) → returns 2
    - Test with 1 title → returns 1
    - Test with null/undefined → returns fallback
    - Test priority: arabic > english > original

  - [ ] 7.2 Test description logic
    - Test with overview_ar only → returns Arabic
    - Test with overview_en only → returns English
    - Test with both → returns Arabic (ar locale) or English (en locale)
    - Test with neither → returns fallback message

  - [ ] 7.3 Test API services
    - Test getSeasons with valid slug → returns seasons array
    - Test getEpisodes with valid slug and season → returns episodes array
    - Test with invalid slug → handles error gracefully

- [ ] 8. Integration Tests

  - [ ] 8.1 Test full Watch.tsx flow
    - Open Watch page with content having 3 titles
    - Verify all 3 titles displayed
    - Verify Arabic description shown first
    - Verify seasons and episodes load correctly
    - Verify player works correctly

  - [ ] 8.2 Test TV series with seasons
    - Open TV series page
    - Verify seasons list loads
    - Select a season
    - Verify episodes list loads
    - Select an episode
    - Verify player loads with correct episode

  - [ ] 8.3 Test slug-only routing
    - Try accessing with slug → works
    - Try accessing with ID → shows error
    - Verify all links use slugs

  - [ ] 8.4 Test multilingual content
    - Test Korean content (Running Man)
    - Test Chinese content
    - Test Turkish content
    - Test Arabic content
    - Verify all titles display correctly

- [ ] 9. Property-Based Tests

  - [ ] 9.1 Generate random content with varying titles
    - Property: For all content with 3 distinct titles, all 3 are displayed
    - Property: For all content, Arabic title is primary if exists
    - Property: For all content, original title shown if different from English

  - [ ] 9.2 Generate random content with varying descriptions
    - Property: For all content with overview_ar, Arabic shown first (ar locale)
    - Property: For all content without overview_ar, English shown as fallback
    - Property: For all content without any overview, fallback message shown

  - [ ] 9.3 Generate random TV series
    - Property: For all TV series, seasons are fetched and displayed
    - Property: For all seasons, episodes are fetched and displayed
    - Property: For all episodes, navigation uses slugs only

## Phase 6: Documentation

- [ ] 10. Update documentation

  - [ ] 10.1 Update CONTENT_INGESTION_RULES.md (if needed)
    - Document requirement for 3 titles (title_ar, title_en, original_title)
    - Document requirement for 2 descriptions (overview_ar, overview_en)
    - Document slug generation rules
    - Document that all content must have slugs

  - [ ] 10.2 Add inline documentation
    - Document useTripleTitles hook usage
    - Document description priority logic
    - Document seasons/episodes fetching flow

## Phase 7: Checkpoint

- [ ] 11. Final verification
  - Ensure all tests pass
  - Verify no console errors
  - Verify no TypeScript errors
  - Test on multiple content types (movies, TV series, different languages)
  - Ask user if any questions arise or if ready to proceed with next phase
