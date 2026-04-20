/**
 * Legacy URL Handler Component
 * 
 * Detects legacy URLs with IDs embedded in slugs and redirects to clean URLs
 * Example: /watch/movie/spider-man-12345 -> /watch/movie/spider-man
 */

import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { detectLegacyUrl, generateRedirectUrl } from '../../lib/url-utils'
import { logger } from '../../lib/logger'

interface LegacyUrlHandlerProps {
  type: 'movie' | 'tv' | 'game' | 'software' | 'actor'
}

export const LegacyUrlHandler = ({ type }: LegacyUrlHandlerProps) => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleLegacyUrl = async () => {
      if (!slug) return

      // Detect if this is a legacy URL with ID
      const detection = detectLegacyUrl(slug)
      
      if (!detection.isLegacy || !detection.id) {
        // Not a legacy URL, nothing to do
        return
      }

      logger.info(`Legacy URL detected: ${slug} -> ID: ${detection.id}`)

      try {
        // Extract season and episode from URL if present (for TV series)
        let season: number | undefined
        let episode: number | undefined
        
        if (type === 'tv') {
          const pathParts = location.pathname.split('/')
          const sIndex = pathParts.findIndex(p => p.startsWith('s'))
          const eIndex = pathParts.findIndex(p => p.startsWith('ep'))
          
          if (sIndex !== -1) {
            const sMatch = pathParts[sIndex].match(/^s(\d+)$/)
            if (sMatch) season = parseInt(sMatch[1], 10)
          }
          
          if (eIndex !== -1) {
            const eMatch = pathParts[eIndex].match(/^ep(\d+)$/)
            if (eMatch) episode = parseInt(eMatch[1], 10)
          }
        }

        // Generate clean redirect URL
        const cleanUrl = await generateRedirectUrl(
          detection.id,
          type,
          season,
          episode
        )

        if (cleanUrl) {
          logger.info(`Redirecting to clean URL: ${cleanUrl}`)
          // Preserve query params and hash
          navigate(`${cleanUrl}${location.search}${location.hash}`, { replace: true })
        } else {
          logger.warn(`Could not generate redirect URL for ${type} ID ${detection.id}`)
          // Content not found, let the page handle 404
        }
      } catch (err: any) {
        logger.error('Legacy URL handling failed:', err)
        // Let the page handle the error
      }
    }

    handleLegacyUrl()
  }, [slug, type, navigate, location])

  return null // This component doesn't render anything
}
