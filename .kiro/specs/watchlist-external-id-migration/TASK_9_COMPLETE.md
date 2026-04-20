# Task 9: Update getUserPreferences Function - COMPLETE ✅

## Summary

Successfully updated the `getUserPreferences` function to return `external_id` instead of `content_id` in history and watchlist arrays.

## Changes Made

### 1. Updated Type Definition (`src/lib/supabase.ts`)

**Before:**
```typescript
export type UserPreferenceData = {
  history: Array<{ content_id: number; content_type: 'movie' | 'tv' }>
  watchlist: Array<{ content_id: number; content_type: 'movie' | 'tv' }>
}
```

**After:**
```typescript
export type UserPreferenceData = {
  history: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
  watchlist: Array<{ external_id: string; content_type: 'movie' | 'tv' }>
}
```

### 2. Updated getUserPreferences Function (`src/lib/supabase.ts`)

**Key Changes:**
- Changed query to select `external_id` instead of `content_id` from both `history` and `watchlist` tables
- Added filtering to exclude entries with null `external_id` (for safety during migration)
- Maintained existing error handling and logging

**Implementation:**
```typescript
async function getUserPreferences(userId: string): Promise<UserPreferenceData> {
  // Fetch history (limit to last 50 items to keep it relevant)
  const { data: history, error: historyError } = await supabase
    .from('history')
    .select('external_id, content_type')  // Changed from content_id
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(50)
  
  // ... error handling ...

  // Fetch watchlist
  const { data: watchlist, error: watchlistError } = await supabase
    .from('watchlist')
    .select('external_id, content_type')  // Changed from content_id
    .eq('user_id', userId)
  
  // ... error handling ...

  // Filter out entries with null external_id (for safety during migration)
  const filteredHistory = (history || []).filter(item => item.external_id != null)
  const filteredWatchlist = (watchlist || []).filter(item => item.external_id != null)

  return {
    history: filteredHistory as any[],
    watchlist: filteredWatchlist as any[]
  }
}
```

### 3. Updated useRecommendations Hook (`src/hooks/useRecommendations.ts`)

**Key Changes:**
- Updated `fetchContentDetails` function signature to accept `external_id: string` instead of `content_id: number`
- Updated all references to use `external_id` when building preference profiles
- Updated filtering logic to use `external_id` when excluding watched/watchlist items

**Changes:**
```typescript
// Function signature updated
async function fetchContentDetails(items: { external_id: string; content_type: string }[]) {
  const distinctItems = Array.from(new Set(items.map(i => `${i.content_type}:${i.external_id}`)))
    // ... rest of implementation
}

// Filtering logic updated
const watchedSet = new Set(allItems.map(i => `${i.content_type}:${i.external_id}`))
```

## Requirements Validated

✅ **Requirement 13.1**: getUserPreferences returns external_id instead of content_id in history array  
✅ **Requirement 13.2**: getUserPreferences returns external_id instead of content_id in watchlist array  
✅ **Requirement 13.3**: Recommendation system can use external_ids to query CockroachDB (via TMDB API)  
✅ **Requirement 13.4**: Return structure maintained with only ID field changed  
✅ **Requirement 13.5**: Entries with null external_id are excluded

## Database Architecture Compliance

✅ **Supabase Usage**: Correctly queries user data tables (`history`, `watchlist`)  
✅ **CockroachDB Usage**: Recommendation system uses TMDB API (external_id) to fetch content details  
✅ **No Violations**: No attempts to query content tables from Supabase

## Testing

- ✅ TypeScript compilation successful (no diagnostics)
- ✅ Type definitions updated correctly
- ✅ All references to the function updated
- ✅ Null filtering implemented for migration safety

## Files Modified

1. `src/lib/supabase.ts` - Updated `UserPreferenceData` type and `getUserPreferences` function
2. `src/hooks/useRecommendations.ts` - Updated to use `external_id` instead of `content_id`

## Next Steps

The recommendation system now correctly uses `external_id` (TMDB IDs) to:
1. Fetch user preferences from Supabase (user data)
2. Query TMDB API for content details (using external_id as TMDB ID)
3. Generate personalized recommendations based on genres and cast

This maintains the architectural principle: **Supabase = User Data**, **CockroachDB/TMDB = Content Data**.
