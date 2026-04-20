// Embed Proxy - Foundation (Core) & Modules (Branches)
import fetch from 'node-fetch'

// Simple in-memory cache for proxied content (30 seconds TTL for development)
const proxyCache = new Map()
const CACHE_TTL = 30 * 1000 // 30 seconds (reduced for faster updates during development)

// Clear cache on startup to ensure fresh content
proxyCache.clear()
console.log('🧹 Proxy cache cleared on startup')

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
    // Check cache first
    const cacheKey = url
    const cached = proxyCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Serving from cache:', url)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('X-Frame-Options', 'ALLOWALL')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.removeHeader('X-Frame-Options')
      res.removeHeader('Content-Security-Policy')
      return res.status(200).send(cached.html)
    }
    
    // Fetch the content from the target URL with optimized settings
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br', // Enable compression
        'Referer': new URL(url).origin,
        'Connection': 'keep-alive', // Reuse connections
      },
      timeout: 10000, // Reduced from 15s to 10s
      compress: true // Enable automatic decompression
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch upstream: ${response.status} ${response.statusText}`)
    }

    // Get the HTML content
    let html = await response.text()

    // 5. Core Protection Removal: Strip X-Frame-Options and CSP headers from HTML meta tags
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    
    // 🧹 Clean up problematic CSP directives from inline meta tags
    html = html.replace(/navigate-to[^;]*;?/gi, '') // Remove navigate-to directive
    
    // Inject base tag to fix relative URLs within the iframe
    const baseUrl = new URL(url).origin
    const baseTag = `<base href="${baseUrl}/">`
    
    // 🛡️ CONDITIONAL PROTECTION: Only for VidSrc.cc
    const needsProtection = url.includes('vidsrc.cc')
    
    // 🚫 AGGRESSIVE AD BLOCKING SCRIPT (Only for protected servers) - TEMPORARILY DISABLED FOR TESTING
    const adBlockScript = '' // Disabled to test if it's causing video playback issues
    /*
    const adBlockScript = needsProtection ? `
    <script>
    (function() {
      'use strict';
      
      // IMMEDIATE: Block window.open() before anything else loads
      window.open = function() {
        console.log('🚫 Blocked popup ad');
        return null;
      };
      
      // IMMEDIATE: Block all <a> tags with target="_blank" and external links
      document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.tagName === 'A') {
          const href = target.getAttribute('href');
          const targetAttr = target.getAttribute('target');
          
          // Block external links and _blank targets
          if (targetAttr === '_blank' || (href && !href.startsWith('#') && !href.startsWith('javascript:'))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('🚫 Blocked link popup:', href);
            return false;
          }
        }
      }, true);
      
      // Block ALL mousedown events that might trigger popups
      document.addEventListener('mousedown', function(e) {
        const target = e.target;
        const tagName = target.tagName?.toLowerCase();
        
        // Allow video player controls
        if (tagName === 'video' || tagName === 'button' || target.closest('video') || target.closest('[class*="player"]')) {
          return;
        }
        
        // Check if this is likely an ad overlay
        const computedStyle = window.getComputedStyle(target);
        const zIndex = parseInt(computedStyle.zIndex);
        
        // Block high z-index overlays (common ad technique)
        if (zIndex > 1000) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('🚫 Blocked high z-index overlay click');
          return false;
        }
      }, true);
      
      // Block ALL contextmenu events (right-click ads)
      document.addEventListener('contextmenu', function(e) {
        const target = e.target;
        if (!target.closest('video')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('🚫 Blocked contextmenu ad');
          return false;
        }
      }, true);
      
      // Block ALL auxclick events (middle-click ads)
      document.addEventListener('auxclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🚫 Blocked auxclick ad');
        return false;
      }, true);
      
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
        'revenuehits',
        'adnium',
        'adskeeper',
        'mgid',
        'taboola',
        'outbrain'
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
          '[class*="banner"]',
          '[id*="banner"]',
          'iframe[src*="ads"]',
          'iframe[src*="ad"]',
          'a[target="_blank"]', // Remove all _blank links
          '[style*="z-index: 999"]', // Remove high z-index overlays
          '[style*="z-index:999"]',
          '[style*="position: fixed"]', // Remove fixed position overlays
          '[style*="position:fixed"]'
        ];
        
        adSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            // Don't remove video player elements
            if (el.closest('video') || el.closest('[class*="player"]')) {
              return;
            }
            
            if (el.offsetHeight > 0 && el.offsetWidth > 0) {
              el.remove();
              console.log('🚫 Removed ad element:', selector);
            }
          });
        });
        
        // Remove invisible overlays
        document.querySelectorAll('div, a, span').forEach(el => {
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex);
          const opacity = parseFloat(style.opacity);
          const position = style.position;
          
          // Remove transparent high z-index elements (ad overlays)
          if ((zIndex > 1000 || position === 'fixed') && (opacity < 0.1 || style.visibility === 'hidden')) {
            el.remove();
            console.log('🚫 Removed invisible overlay');
          }
        });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeAds);
      } else {
        removeAds();
      }
      
      // Continuous monitoring - run every 500ms (more aggressive)
      setInterval(removeAds, 500);
      
      console.log('✅ Ultra-aggressive ad blocker initialized');
    })();
    </script>
    ` : ''
    */
    
    // 🌐 Arabic Subtitle Auto-Enable Script (Injected before </body>)
    const subtitleScript = `
    <script>
    console.log('🌐 Arabic subtitle auto-enable initialized');
    
    var attemptCount = 0;
    var maxAttempts = 15;
    
    function tryEnableArabic() {
      attemptCount++;
      console.log('[SUB] Attempt ' + attemptCount + '/' + maxAttempts);
      
      try {
        var video = document.querySelector('video');
        
        if (!video) {
          console.log('[SUB] ⏳ Video element not found yet');
          if (attemptCount < maxAttempts) {
            setTimeout(tryEnableArabic, 1000);
          }
          return;
        }
        
        if (!video.textTracks || video.textTracks.length === 0) {
          console.log('[SUB] ⏳ Text tracks not loaded yet');
          if (attemptCount < maxAttempts) {
            setTimeout(tryEnableArabic, 1000);
          }
          return;
        }
        
        var tracks = Array.from(video.textTracks);
        console.log('[SUB] Found ' + tracks.length + ' tracks');
        
        var found = false;
        for (var i = 0; i < tracks.length; i++) {
          var t = tracks[i];
          console.log('[SUB] Track ' + i + ': lang=' + t.language + ', label=' + t.label + ', mode=' + t.mode);
          
          var isArabic = t.language === 'ar' || 
                         t.language === 'ara' || 
                         t.language === 'ar-SA' ||
                         (t.label && t.label.toLowerCase().indexOf('arab') !== -1) ||
                         (t.label && t.label.indexOf('عرب') !== -1);
          
          if (isArabic) {
            t.mode = 'showing';
            found = true;
            console.log('[SUB] ✅ Arabic enabled: ' + (t.label || t.language));
          } else {
            t.mode = 'hidden';
          }
        }
        
        if (found) {
          console.log('[SUB] ✅ Success! Arabic subtitle activated');
        } else {
          console.log('[SUB] ⚠️ No Arabic track found');
          if (attemptCount < maxAttempts) {
            setTimeout(tryEnableArabic, 1000);
          } else {
            console.log('[SUB] ❌ Gave up after ' + maxAttempts + ' attempts');
          }
        }
      } catch(e) {
        console.log('[SUB] ❌ Error: ' + e.message);
        if (attemptCount < maxAttempts) {
          setTimeout(tryEnableArabic, 1000);
        }
      }
    }
    
    // Start after 3 seconds
    setTimeout(tryEnableArabic, 3000);
    <\/script>
    `
    
    // Inject base tag and protection script (if needed)
    if (needsProtection) {
      // Put protection script FIRST - before any other scripts can load
      html = html.replace(/<head>/i, `<head>\n${adBlockScript}`)
      html = html.replace(/<head>/i, `<head>\n${baseTag}`)
      // حقن سكريبت الترجمة قبل </body> مباشرة عشان يشتغل بعد كل سكريبتات vidsrc
      html = html.replace(/<\/body>/i, `${subtitleScript}\n</body>`)
    } else {
      html = html.replace(/<head>/i, `<head>\n${baseTag}`)
      // حقن سكريبت الترجمة قبل </body> مباشرة
      html = html.replace(/<\/body>/i, `${subtitleScript}\n</body>`)
    }

    // 6. Response Headers Preparation
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Frame-Options', 'ALLOWALL') // Override frame options
    res.setHeader('Access-Control-Allow-Origin', '*') // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    
    // 🧹 Clean Permissions-Policy: Replace 'popup' with modern 'window-management'
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
      'accelerometer=(), gyroscope=(), magnetometer=(), window-management=()'
    )
    
    // 🛡️ AGGRESSIVE CSP for VidSrc.cc only
    if (needsProtection) {
      res.setHeader('Content-Security-Policy', 
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' * data:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
        "frame-src *; " +
        "img-src * data: blob:; " +
        "media-src * blob: data:; " +
        "connect-src *;"
      )
    } else {
      // Remove strict security headers for other servers
      res.removeHeader('X-Frame-Options')
      res.removeHeader('Content-Security-Policy')
    }
    
    // Store in cache for future requests
    proxyCache.set(cacheKey, {
      html,
      timestamp: Date.now()
    })
    
    // Clean old cache entries (keep cache size manageable)
    if (proxyCache.size > 100) {
      const oldestKey = proxyCache.keys().next().value
      proxyCache.delete(oldestKey)
    }
    
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
