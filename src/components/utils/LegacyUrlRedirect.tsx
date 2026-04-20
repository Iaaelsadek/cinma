/**
 * Legacy URL Redirect Component
 * 
 * This component detects legacy URLs with IDs and redirects to clean slug-based URLs.
 * It runs on every route change and performs a 301-like redirect when a legacy URL is detected.
 * 
 * Requirements:
 * - 3.1: Detect legacy URLs by checking if the last segment after the final hyphen is a numeric ID
 * - 3.2: Query the database to find content by ID and redirect to clean URL
 * - 3.3: Handle errors gracefully when redirect generation fails
 */

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { detectLegacyUrl, parseWatchUrl, generateRedirectUrl } from '../../lib/url-utils'

export const LegacyUrlRedirect = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAndRedirect = async () => {
      const pathname = location.pathname

      // Only process watch URLs
      if (!pathname.startsWith('/watch/')) {
        return
      }

      // Parse the watch URL
      const parsed = parseWatchUrl(pathname)
      if (!parsed) {
        return
      }

      // Check if slug contains legacy ID (Requirement 3.1)
      const legacyCheck = detectLegacyUrl(parsed.slug)

      if (legacyCheck.isLegacy && legacyCheck.id) {

        try {
          // Generate redirect URL by querying database (Requirement 3.2)
          const redirectUrl = await generateRedirectUrl(
            legacyCheck.id,
            parsed.contentType,
            parsed.season,
            parsed.episode
          )

          if (redirectUrl) {
            // Use replace to avoid adding to history (301-like behavior)
            // Note: In a client-side React app, we use navigate with replace
            // For true HTTP 301, this would need server-side handling
            navigate(redirectUrl, { replace: true })
          } else {
            // Handle error when redirect generation fails (Requirement 3.3)
            console.warn(`⚠️ Could not generate redirect URL for ID: ${legacyCheck.id}`)
            console.warn(`   Content may not exist or is missing a slug`)
            // Don't navigate - let the page handle the 404
          }
        } catch (error: any) {
          // Handle errors gracefully (Requirement 3.3)
          console.error('❌ Error during legacy URL redirect:', error)
          // Don't navigate - let the page handle the error
        }
      }
    }

    checkAndRedirect()
  }, [location.pathname, navigate])

  // This component doesn't render anything
  return null
}
