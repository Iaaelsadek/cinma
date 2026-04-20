/**
 * Legacy Redirect Component for Explicit ID Routes
 * 
 * This component handles explicit ID-based routes like /movie/id/123 and redirects
 * them to clean slug-based URLs like /movie/spider-man.
 * 
 * Requirements:
 * - 3.1: Detect legacy URLs with explicit ID parameter
 * - 3.2: Query the database to find content by ID and redirect to clean URL
 * - 3.3: Handle errors gracefully when redirect generation fails
 */

import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { logger } from '../../lib/logger'

interface LegacyRedirectProps {
  type: 'movie' | 'tv' | 'actor' | 'game' | 'software'
}

export const LegacyRedirect = ({ type }: LegacyRedirectProps) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const performRedirect = async () => {
      // Validate ID parameter (Requirement 3.1)
      if (!id || !/^\d+$/.test(id)) {
        logger.warn(`Invalid ID parameter for legacy redirect: ${id}`)
        return
      }

      try {
        // Query database to find content by ID (Requirement 3.2)
        const response = await fetch('/api/db/slug/get-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: parseInt(id, 10),
            table: type === 'tv' ? 'tv_series' : type === 'actor' ? 'actors' : `${type}s`
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.slug) {
            const basePath = type === 'tv' ? 'series' : type
            // Redirect to new SEO-friendly URL (301-like behavior)
            // Preserve query parameters and hash
            navigate(`/${basePath}/${data.slug}${location.search}${location.hash}`, { replace: true })
            logger.info(`Legacy redirect: ${type} id ${id} → /${basePath}/${data.slug}`)
          } else {
            // Handle missing slug (Requirement 3.3)
            logger.warn(`Content found but missing slug for ${type} id ${id}`)
            // Don't navigate - let the page handle the error
          }
        } else {
          // Handle error when content not found (Requirement 3.3)
          logger.warn(`Legacy redirect failed for ${type} id ${id}: ${response.statusText}`)
          // Don't navigate - let the page handle the 404
        }
      } catch (err: any) {
        // Handle errors gracefully (Requirement 3.3)
        logger.error('Legacy redirect failed:', err)
        // Don't navigate - let the page handle the error
      }
    }

    performRedirect()
  }, [id, type, navigate, location])

  return null // This component doesn't render anything
}
