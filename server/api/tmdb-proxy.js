// ? TMDB API Proxy - Hide API Key from Frontend
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

if (!TMDB_API_KEY) {
  console.error('? TMDB_API_KEY not found in environment variables')
}

// Memory Cache for TMDB requests to protect API keys & speed up homepage
const cache = new Map()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Auto-cleanup expired cache
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt < now) {
      cache.delete(key)
    }
  }
}, 10 * 60 * 1000)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let tmdbPath = req.path
    if (tmdbPath.startsWith('/api/tmdb/')) {
      tmdbPath = tmdbPath.replace('/api/tmdb/', '')
    }
    
    tmdbPath = tmdbPath.replace(/^\//, '')
    
    if (!tmdbPath) {
      return res.status(400).json({ error: 'Missing TMDB endpoint path' })
    }

    // Build TMDB URL
    const url = new URL(`${TMDB_BASE_URL}/${tmdbPath}`)
    
    // Forward query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'api_key') {
        url.searchParams.set(key, String(value))
      }
    })
    
    // Cache Key
    const cacheKey = url.toString()
    
    // Check Cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (cached.expiresAt > Date.now()) {
        console.log(`[CACHE HIT] ${tmdbPath}`)
        return res.status(200).json(cached.data)
      } else {
        cache.delete(cacheKey)
      }
    }

    url.searchParams.set('api_key', TMDB_API_KEY)
    console.log(`[CACHE MISS] Fetching: ${tmdbPath}`)
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`TMDB Error ${response.status}: ${errorText}`)
      return res.status(response.status).json({ error: `TMDB API Error: ${response.statusText}` })
    }
    
    const data = await response.json()
    
    // Filter unreleased content
    if (data && data.results && Array.isArray(data.results)) {
      const today = new Date()
      data.results = data.results.filter(item => {
        const releaseDateStr = item.release_date || item.first_air_date
        if (!releaseDateStr) return true
        const rDate = new Date(releaseDateStr)
        if (isNaN(rDate.getTime())) return true
        return rDate <= today
      })
    }
    
    // Save to Cache
    cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS
    })
    
    return res.status(200).json(data)
  } catch (error) {
    console.error('TMDB Proxy Error:', error)
    return res.status(500).json({ error: 'Internal server error resolving TMDB request' })
  }
}

