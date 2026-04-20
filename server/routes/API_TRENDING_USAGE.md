# `/api/trending` Endpoint Usage Guide

## Quick Start

```javascript
// Fetch trending movies
const response = await fetch('/api/trending?type=movie&limit=10');
const { data } = await response.json();

// Fetch trending TV series
const response = await fetch('/api/trending?type=tv&limit=10');
const { data } = await response.json();

// Fetch mixed trending content
const response = await fetch('/api/trending?type=all&limit=20');
const { data } = await response.json();
```

---

## API Reference

### Endpoint
```
GET /api/trending
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `'all'` | Content type: `'movie'`, `'tv'`, or `'all'` |
| `timeWindow` | string | `'week'` | Time window: `'day'` or `'week'` |
| `limit` | number | `20` | Number of results (max: 100) |

### Response Format

```typescript
{
  data: Array<{
    id: string;
    slug: string;
    title?: string;           // For movies
    name?: string;            // For TV series
    title_ar?: string;
    title_en?: string;
    name_ar?: string;
    name_en?: string;
    poster_url: string;
    backdrop_url: string;
    vote_average: number;
    release_date?: string;    // For movies
    first_air_date?: string;  // For TV series
    popularity: number;
    views_count: string;
    original_language: string;
    overview: string;         // Truncated to 150 chars
    content_type: 'movie' | 'tv';
  }>;
  total: number;
  type: string;
  timeWindow: string;
  _cache: {
    hit: boolean;
    responseTime: number;
    ttl: number;
  };
}
```

---

## Usage Examples

### React Component

```typescript
import { useQuery } from '@tanstack/react-query';

function TrendingMovies() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending', 'movie'],
    queryFn: async () => {
      const response = await fetch('/api/trending?type=movie&limit=20');
      return response.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data.data.map(movie => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
```

### Vue Component

```vue
<script setup>
import { ref, onMounted } from 'vue';

const trendingContent = ref([]);

onMounted(async () => {
  const response = await fetch('/api/trending?type=all&limit=15');
  const data = await response.json();
  trendingContent.value = data.data;
});
</script>

<template>
  <div>
    <ContentCard 
      v-for="item in trendingContent" 
      :key="item.id" 
      :content="item" 
    />
  </div>
</template>
```

### Vanilla JavaScript

```javascript
async function loadTrendingContent() {
  try {
    const response = await fetch('/api/trending?type=all&limit=20');
    const { data } = await response.json();
    
    const container = document.getElementById('trending-container');
    container.innerHTML = data.map(item => `
      <div class="content-card">
        <img src="${item.poster_url}" alt="${item.title || item.name}">
        <h3>${item.title || item.name}</h3>
        <p>Rating: ${item.vote_average}/10</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load trending content:', error);
  }
}

loadTrendingContent();
```

---

## Trending Algorithm

The endpoint uses a weighted scoring system:

```
trending_score = (views_count × 0.3) + (popularity × 0.7)
```

**Factors**:
- **30% views_count**: User engagement on our platform
- **70% popularity**: TMDB popularity metric

This balances internal engagement with external validation.

---

## Caching

- **Cache Duration**: 5 minutes (300 seconds)
- **Cache Key**: Includes all query parameters
- **Cache Metadata**: Included in `_cache` field

```javascript
const { data, _cache } = await response.json();

if (_cache.hit) {
  console.log('Served from cache');
  console.log(`Response time: ${_cache.responseTime}ms`);
}
```

---

## Data Quality Guarantees

All returned content is guaranteed to have:

✅ Valid slug (not empty, not 'content')  
✅ Published status (`is_published = TRUE`)  
✅ Poster URL (fallback placeholder if missing)  
✅ Truncated overview (max 150 characters)  
✅ Content type label (`movie` or `tv`)

---

## Error Handling

```javascript
async function fetchTrending() {
  try {
    const response = await fetch('/api/trending?type=movie');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch trending content:', error);
    // Handle error (show fallback UI, retry, etc.)
  }
}
```

---

## Performance Tips

1. **Use Caching**: Responses are cached for 5 minutes
2. **Limit Results**: Request only what you need (default: 20)
3. **Specific Types**: Use `type=movie` or `type=tv` for faster queries
4. **Pagination**: For large lists, fetch in batches

```javascript
// Good: Specific type, reasonable limit
fetch('/api/trending?type=movie&limit=10')

// Avoid: Large limits on mixed types
fetch('/api/trending?type=all&limit=100')
```

---

## Migration from TMDB

### Before (TMDB API)
```javascript
// ❌ OLD: Direct TMDB call
const { data } = await tmdb.get('/trending/movie/week');
```

### After (CockroachDB API)
```javascript
// ✅ NEW: CockroachDB endpoint
const response = await fetch('/api/trending?type=movie&timeWindow=week');
const { data } = await response.json();
```

### Benefits
- ✅ All content has valid slugs
- ✅ Content exists in our database
- ✅ No "Missing slug" errors
- ✅ Consistent with architecture
- ✅ Cached for better performance

---

## Testing

Run the test suite:

```bash
node scripts/test-trending-endpoint.js
```

Expected output:
```
🚀 Testing /api/trending endpoint
✅ Passed: 7
❌ Failed: 0
📈 Success Rate: 100.0%
🎉 All tests passed!
```

---

## Support

For issues or questions:
- Check server logs for errors
- Verify database connection
- Ensure content is published (`is_published = TRUE`)
- Confirm slugs are valid

---

**Last Updated**: 2025-01-XX  
**Endpoint Version**: 1.0  
**Status**: ✅ Production Ready
