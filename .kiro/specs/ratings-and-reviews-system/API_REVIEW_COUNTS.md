# Review Count API Endpoints

## Overview

These endpoints provide review count information for content items, with built-in caching to optimize performance.

## Endpoints

### GET /api/reviews/count

Get the review count for a single content item.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| external_id | string | Yes | Content external ID (TMDB ID) |
| content_type | string | Yes | Content type: 'movie', 'tv', 'game', 'software' |

**Response:**

```json
{
  "count": 42
}
```

**Example Request:**

```bash
curl "https://api.cinema.online/api/reviews/count?external_id=550&content_type=movie"
```

**Example Response:**

```json
{
  "count": 127
}
```

**Error Responses:**

- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Database error

---

### POST /api/reviews/count/batch

Get review counts for multiple content items in a single request.

**Request Body:**

```json
{
  "items": [
    { "external_id": "550", "content_type": "movie" },
    { "external_id": "551", "content_type": "movie" }
  ]
}
```

**Constraints:**
- Maximum 100 items per request
- Items array must not be empty

**Response:**

```json
{
  "results": [
    { "external_id": "550", "content_type": "movie", "count": 127 },
    { "external_id": "551", "content_type": "movie", "count": 45 }
  ]
}
```

**Example Request:**

```bash
curl -X POST "https://api.cinema.online/api/reviews/count/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "external_id": "550", "content_type": "movie" },
      { "external_id": "600", "content_type": "tv" },
      { "external_id": "700", "content_type": "game" }
    ]
  }'
```

**Example Response:**

```json
{
  "results": [
    { "external_id": "550", "content_type": "movie", "count": 127 },
    { "external_id": "600", "content_type": "tv", "count": 89 },
    { "external_id": "700", "content_type": "game", "count": 34 }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body or too many items
- `500 Internal Server Error` - Database error

**Notes:**
- Results are returned in the same order as the input items
- Invalid items will have `count: 0` and may include an `error` field
- Each item is processed independently

---

## Caching

Both endpoints use a 5-minute cache to optimize performance:

- **Cache Key Format:** `review_count:${content_type}:${external_id}`
- **TTL:** 300 seconds (5 minutes)
- **Cache Invalidation:** Automatic after TTL expires

### Cache Behavior

1. **Cache Hit:** Returns cached count immediately
2. **Cache Miss:** Queries database, caches result, returns count
3. **Batch Requests:** Each item checks cache independently

---

## Data Filtering

Review counts **exclude** hidden reviews:
- Only reviews where `is_hidden = false` are counted
- Ensures moderated content doesn't affect public counts

---

## Performance Considerations

### Single Request
- **Cached:** ~1ms response time
- **Uncached:** ~50-100ms response time

### Batch Request (100 items)
- **All Cached:** ~5ms response time
- **All Uncached:** ~2-5 seconds response time
- **Mixed:** Proportional to cache hit ratio

### Optimization Tips

1. **Use Batch Endpoint:** Always prefer batch over multiple single requests
2. **Cache Warming:** Pre-fetch counts for popular content
3. **Pagination:** Fetch counts only for visible content
4. **Debouncing:** Avoid rapid repeated requests

---

## Integration Examples

### React Hook

```typescript
import { useState, useEffect } from 'react'

export function useReviewCount(externalId: string, contentType: string) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch(
          `/api/reviews/count?external_id=${externalId}&content_type=${contentType}`
        )
        const data = await response.json()
        setCount(data.count)
      } catch (error) {
        console.error('Failed to fetch review count:', error)
        setCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [externalId, contentType])

  return { count, loading }
}
```

### Batch Fetching

```typescript
async function fetchReviewCounts(items: Array<{ external_id: string, content_type: string }>) {
  const response = await fetch('/api/reviews/count/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  })
  
  const { results } = await response.json()
  
  // Create a map for easy lookup
  const countMap = new Map()
  results.forEach(item => {
    const key = `${item.content_type}:${item.external_id}`
    countMap.set(key, item.count)
  })
  
  return countMap
}
```

### Content Card Component

```typescript
function ContentCard({ content }) {
  const { count, loading } = useReviewCount(content.external_id, content.content_type)
  
  return (
    <div className="content-card">
      <h3>{content.title}</h3>
      {loading ? (
        <span>Loading...</span>
      ) : count > 0 ? (
        <span>{count} reviews</span>
      ) : (
        <span>No reviews yet</span>
      )}
    </div>
  )
}
```

---

## Related Endpoints

- `GET /api/reviews` - Fetch reviews for content
- `GET /api/ratings/aggregate` - Get aggregate ratings
- `POST /api/ratings/aggregate/batch` - Batch aggregate ratings

---

## Requirements Validated

- ✅ **32.4:** Backend API supports review count queries
- ✅ **32.5:** Backend API supports batch review count queries
- ✅ Cache counts for 5 minutes
- ✅ Exclude hidden reviews from count
- ✅ Support batch queries (max 100 items)
- ✅ Return results in same order as input

---

**Last Updated:** 2024
**Version:** 1.0
