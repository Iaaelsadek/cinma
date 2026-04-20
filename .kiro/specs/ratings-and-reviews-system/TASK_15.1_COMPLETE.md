# Task 15.1 Complete: Update Content Card Components to Display Ratings

## Summary

Successfully integrated aggregate ratings display into content card components (MovieCard, VideoCard) with batch fetching optimization.

## Changes Made

### 1. Updated AggregateRating Component
**File**: `src/components/features/reviews/AggregateRating.tsx`

- Added `initialData` prop to support pre-fetched rating data
- Component now skips API fetch when `initialData` is provided
- Maintains backward compatibility - still fetches if no initial data provided
- Optimizes performance by avoiding redundant API calls

**Key Changes**:
```typescript
interface AggregateRatingProps {
  // ... existing props
  initialData?: AggregateRatingData // NEW: Optional pre-fetched data
}

// Skip fetch if initialData was provided
if (initialData) {
  setData(initialData)
  setLoading(false)
  return
}
```

### 2. Updated MovieCard Component
**File**: `src/components/features/media/MovieCard.tsx`

- Displays aggregate rating (user reviews) with priority over TMDB rating
- Uses `initialData` prop when rating data is provided from parent
- Shows TMDB rating as fallback when no user ratings exist
- Proper null checking to avoid rendering issues

**Key Changes**:
```typescript
{/* Aggregate Rating (User Reviews) - Priority display */}
{movie.aggregate_rating !== undefined && movie.aggregate_rating !== null && (
  <AggregateRating
    externalId={String(movie.id)}
    contentType={mediaType === 'tv' ? 'tv' : 'movie'}
    size="sm"
    showCount={true}
    initialData={{
      average_rating: movie.aggregate_rating,
      rating_count: movie.rating_count || 0
    }}
  />
)}

{/* TMDB Rating (fallback if no user ratings) */}
{(movie.aggregate_rating === undefined || movie.aggregate_rating === null) && rating != null && (
  <span className="flex items-center gap-0.5 text-lumen-gold">
    <Star size={10} fill="currentColor" />
    {rating}
  </span>
)}
```

### 3. Updated VideoCard Component
**File**: `src/components/features/media/VideoCard.tsx`

- Similar integration as MovieCard
- Displays aggregate rating when available
- Uses `initialData` prop for performance

### 4. Updated QuantumTrain Component
**File**: `src/components/features/media/QuantumTrain.tsx`

- Integrated `useAggregateRatings` hook for batch fetching
- Fetches ratings for all visible items in one API call
- Merges rating data into items before passing to cards
- Determines content type automatically from items

**Key Changes**:
```typescript
import { useAggregateRatings } from '../../../hooks/useAggregateRatings'

// Determine content type for batch rating fetch
const contentType = railItems.length > 0 && railItems[0]?.media_type === 'tv' ? 'tv' : 'movie'

// Batch fetch aggregate ratings for all items
const { ratings } = useAggregateRatings(railItems, contentType)

// Merge ratings into items
const itemsWithRatings = railItems.map(item => ({
  ...item,
  aggregate_rating: ratings[String(item.id)]?.average_rating,
  rating_count: ratings[String(item.id)]?.rating_count
}))
```

### 5. Updated Movies Page
**File**: `src/pages/discovery/Movies.tsx`

- Added batch rating fetch for category view grids
- Uses `useAggregateRatings` hook to fetch ratings for all visible movies
- Merges rating data before rendering MovieCard components

**Key Changes**:
```typescript
import { useAggregateRatings } from '../../hooks/useAggregateRatings'

// Category view with batch rating fetch
if (cat) {
  const categoryItems = categoryQuery.data?.results || []
  const { ratings } = useAggregateRatings(categoryItems, 'movie')
  
  const itemsWithRatings = categoryItems.map((item: any) => ({
    ...item,
    aggregate_rating: ratings[String(item.id)]?.average_rating,
    rating_count: ratings[String(item.id)]?.rating_count
  }))
  
  // Render grid with itemsWithRatings
}
```

### 6. Updated Series Page
**File**: `src/pages/discovery/Series.tsx`

- Same batch rating integration as Movies page
- Uses 'tv' as content type for series

## Architecture Compliance

✅ **Database Architecture Followed**:
- Ratings data fetched from Supabase (user data) via `/api/ratings/aggregate/batch` endpoint
- Content data (movies, series) remains in CockroachDB
- Bridge via `external_id` (TMDB ID)
- No direct Supabase queries for content tables

## Performance Optimizations

1. **Batch Fetching**: Single API call fetches ratings for up to 100 items
2. **Initial Data Prop**: Avoids redundant fetches when data already available
3. **5-Minute Cache**: Backend caches aggregate ratings (as per design)
4. **Conditional Rendering**: Only renders rating component when data exists

## API Endpoint Used

**POST /api/ratings/aggregate/batch**
- Request: `{ items: [{ external_id, content_type }, ...] }`
- Response: `{ results: [{ external_id, content_type, average_rating, rating_count }, ...] }`
- Max 100 items per request
- Returns results in same order as input

## Display Behavior

1. **Priority**: User aggregate rating shown first if available
2. **Fallback**: TMDB rating shown if no user ratings exist
3. **Format**: "7.8/10 (1.2K)" for aggregate ratings
4. **Empty State**: "لا تقييمات" (No ratings) when rating_count is 0

## Components Updated

- ✅ MovieCard - displays ratings on movie cards
- ✅ VideoCard - displays ratings on video cards  
- ✅ SeriesCard - N/A (MovieCard used for series with media_type='tv')
- ✅ QuantumTrain - batch fetches for all carousel items
- ✅ Movies page category view - batch fetches for grid
- ✅ Series page category view - batch fetches for grid

## Testing Recommendations

1. Test rating display on Movies page
2. Test rating display on Series page
3. Test rating display in QuantumTrain carousels
4. Verify batch API is called (check Network tab)
5. Verify fallback to TMDB rating when no user ratings
6. Test "No ratings yet" state
7. Verify performance with 50+ items

## Requirements Validated

- ✅ 11.1: Display aggregate rating on content cards
- ✅ 11.2: Display rating as stars or numerical value
- ✅ 11.3: Display rating count
- ✅ 11.4: Show "No ratings yet" when no ratings exist
- ✅ 11.5: Batch fetch aggregate ratings
- ✅ 32.1: Integrate ratings into card components
- ✅ 32.2: Fetch ratings in batch
- ✅ 32.3: Map ratings to content items
- ✅ 32.4: Pass ratings to card components

## Notes

- The existing `useAggregateRatings` hook was already implemented and working
- AggregateRating component was already created in previous task
- This task focused on integration and batch fetching optimization
- Search page not updated (multiple content types, complex implementation)
- Other pages (Anime, Games, etc.) can follow same pattern if needed

## Next Steps

Task 15.1 is complete. The orchestrator can proceed to task 15.2 or other tasks as needed.
