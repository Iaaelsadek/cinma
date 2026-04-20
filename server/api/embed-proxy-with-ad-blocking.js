// Embed Proxy - WITH AGGRESSIVE AD BLOCKING
// This version includes comprehensive ad blocking for testing purposes
// Use this when you need maximum ad protection during server testing

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

  return checkUrl(origin) || checkUrl(referer) || true // TEMPORARILY: Always return true (Removing restrictions as requested)
}

/**
 * Token Validation Module (Prepared for Phase 2)
 */
const verifyToken = (req) => {
  // const token = req.query.token
  // return validateTokenLogic(token)
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

  // 3. Apply Modules (Currently disabled/relaxed per user request)
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
      timeout: 15000 // 15 seconds timeout
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
    
    // 🚫 AGGRESSIVE AD BLOCKING SCRIPT
    const adBlockScript = `
    <script>
    (function() {
      'use strict';
      
      console.log('🛡️ Cinema.online Ad Blocker - ACTIVE');
      
      // Block window.open() completely
      const originalOpen = window.open;
      window.open = function() {
        console.log('🚫 Blocked popup ad');
        return null;
      };
      
      // Block all popunder attempts
      window.addEventListener('click', function(e) {
        if (e.isTrusted === false) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }, true);
      
      // Block redirect attempts
      let isRedirecting = false;
      Object.defineProperty(window, 'location', {
        get: function() { return document.location; },
        set: function(val) {
          if (!isRedirecting) {
            console.log('🚫 Blocked redirect to:', val);
            return;
          }
          document.location = val;
        }
      });
      
      // Block common ad scripts
      const blockList = [
        'disable-devtool',
        'popads',
        'popcash',
        'propeller',
        'adcash',
        'exoclick',
        'juicyads',
        'trafficjunky',
        'plugrush',
        'adsterra',
        'hilltopads',
        'clickadu',
        'bidvertiser',
        'revenuehits'
      ];
      
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if (name === 'src' && blockList.some(ad => value.includes(ad))) {
              console.log('🚫 Blocked ad script:', value);
              return;
            }
            return originalSetAttribute.call(element, name, value);
          };
        }
        
        return element;
      };
      
      // Block setTimeout/setInterval for ad scripts
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;
      
      window.setTimeout = function(fn, delay) {
        if (typeof fn === 'string' && blockList.some(ad => fn.includes(ad))) {
          console.log('🚫 Blocked setTimeout ad');
          return 0;
        }
        return originalSetTimeout.apply(window, arguments);
      };
      
      window.setInterval = function(fn, delay) {
        if (typeof fn === 'string' && blockList.some(ad => fn.includes(ad))) {
          console.log('🚫 Blocked setInterval ad');
          return 0;
        }
        return originalSetInterval.apply(window, arguments);
      };
      
      // Remove ad elements on DOM load
      function removeAds() {
        const adSelectors = [
          '[class*="ad-"]',
          '[id*="ad-"]',
          '[class*="ads-"]',
          '[id*="ads-"]',
          '[class*="popup"]',
          '[id*="popup"]',
          'iframe[src*="ads"]',
          'iframe[src*="ad"]'
        ];
        
        adSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el.offsetHeight > 0 && el.offsetWidth > 0) {
              el.remove();
              console.log('🚫 Removed ad element:', selector);
            }
          });
        });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeAds);
      } else {
        removeAds();
      }
      
      // Continuous monitoring
      setInterval(removeAds, 2000);
      
      console.log('✅ Ad blocker initialized');
    })();
    </script>
    `
    
    html = html.replace(/<head>/i, `<head>\n${baseTag}\n${adBlockScript}`)

    // 6. Response Headers Preparation
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Frame-Options', 'ALLOWALL') // Override frame options
    res.setHeader('Access-Control-Allow-Origin', '*') // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    
    // Remove strict security headers set by Express/Helmet that block embedding
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
