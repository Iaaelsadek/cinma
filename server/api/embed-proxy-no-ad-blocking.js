// Embed Proxy - WITHOUT AD BLOCKING (Clean Version)
// This is the original version without any ad blocking
// Use this for production when you want to allow all content

import fetch from 'node-fetch'

// ==========================================
// 🛡️ Modules (Branches) - Prepared for future
// ==========================================

/**
 * Origin Check Module
 * Verifies if the request comes from our allowed domains
 */
const verifyOrigin = (req) => {
  const referer = req.headers.referer || req.headers.referrer
  const origin = req.headers.origin

  // Development & Testing bypass
  if (process.env.NODE_ENV === 'development') return true

  // Allowed domains (Foundation)
  const allowedOrigins = [
    'localhost:5173',
    'localhost:5174',
    'cinma.online',
    'www.cinma.online',
    'cinmabot.online',
    'www.cinmabot.online'
  ]

  const checkUrl = (url) => {
    if (!url) return false
    try {
      const hostname = new URL(url).hostname
      return allowedOrigins.some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`))
    } catch (e) {
      return false
    }
  }

  return checkUrl(origin) || checkUrl(referer) || true
}

/**
 * Token Validation Module (Prepared for Phase 2)
 */
const verifyToken = (req) => {
  return true // Currently bypassed
}

// ==========================================
// 🏗️ Foundation (Core) - Main Proxy Handler
// ==========================================

export default async function handler(req, res) {
  // 1. Method Check
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 2. Extract Parameters
  const { url } = req.query
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' })
  }

  // 3. Apply Modules
  if (!verifyOrigin(req)) {
    return res.status(403).send('Forbidden: Hotlinking is not allowed.')
  }

  if (!verifyToken(req)) {
    return res.status(401).send('Unauthorized: Invalid or missing token.')
  }

  // 4. Core Logic: Fetch and Process target URL
  try {
    // Fetch the content from the target URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Referer': new URL(url).origin,
      },
      timeout: 15000
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch upstream: ${response.status} ${response.statusText}`)
    }

    // Get the HTML content
    let html = await response.text()

    // 5. Core Protection Removal: Strip X-Frame-Options and CSP headers from HTML meta tags
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    
    // Inject base tag to fix relative URLs within the iframe
    const baseUrl = new URL(url).origin
    const baseTag = `<base href="${baseUrl}/">`
    html = html.replace(/<head>/i, `<head>\n${baseTag}`)

    // 6. Response Headers Preparation
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Frame-Options', 'ALLOWALL')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    
    // Remove strict security headers
    res.removeHeader('X-Frame-Options')
    res.removeHeader('Content-Security-Policy')
    
    // 7. Send modified HTML
    res.status(200).send(html)
  } catch (error) {
    console.error('Embed proxy core error:', error.message)
    res.status(502).json({ 
      error: 'Upstream connection failed',
      details: error.message 
    })
  }
}
