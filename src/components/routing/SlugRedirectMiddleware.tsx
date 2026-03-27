import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import type { ContentType } from '../../lib/slugResolver'

interface SlugRedirectMiddlewareProps {
  contentType: ContentType
  children: React.ReactNode
}

/**
 * Middleware component to detect numeric IDs and redirect to slug-based URLs
 * 
 * Features:
 * - Detects if slug parameter is actually a numeric ID (legacy URL)
 * - Queries database to get the corresponding slug
 * - Performs 301 redirect to slug-based URL
 * - Preserves query parameters and hash fragments
 * - If no slug exists, renders content without redirect
 */
export const SlugRedirectMiddleware: React.FC<SlugRedirectMiddlewareProps> = ({ 
  contentType, 
  children 
}) => {
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const slug = params.slug || params.id
  
  useEffect(() => {
    // Check if slug is numeric (legacy URL format)
    const isNumeric = slug && /^\d+$/.test(slug)
    
    if (!isNumeric) {
      // Not a legacy URL, no redirect needed
      return
    }
    
    // Legacy URL detected - fetch slug from database
    const performRedirect = async () => {
      try {
        const contentId = parseInt(slug, 10)
        
        // Query database to get slug for this content ID
        const API_BASE = '/api/db'
        const tableName = getTableName(contentType)
        
        const response = await fetch(`${API_BASE}/slug/get-by-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: contentId,
            table: tableName
          })
        })
        
        if (!response.ok) {
          // No slug found, serve content without redirect
          return
        }
        
        const data = await response.json()
        const contentSlug = data?.slug
        
        if (!contentSlug) {
          // No slug available, serve content without redirect
          return
        }
        
        // Build new URL with slug
        const pathSegments = location.pathname.split('/')
        const slugIndex = pathSegments.findIndex(segment => segment === slug)
        
        if (slugIndex !== -1) {
          pathSegments[slugIndex] = contentSlug
        }
        
        const newPath = pathSegments.join('/')
        
        // Preserve query parameters and hash
        const search = location.search
        const hash = location.hash
        const newUrl = `${newPath}${search}${hash}`
        
        // Perform 301 redirect (replace in history)
        navigate(newUrl, { replace: true })
      } catch (error) {
        // On error, serve content without redirect
      }
    }
    
    performRedirect()
  }, [slug, contentType, navigate, location])
  
  return <>{children}</>
}

/**
 * Map content type to database table name
 */
function getTableName(contentType: ContentType): string {
  switch (contentType) {
    case 'movie':
      return 'movies'
    case 'tv':
      return 'tv_series'
    case 'actor':
      return 'actors'
    case 'game':
      return 'games'
    case 'software':
      return 'software'
    case 'cinematic':
      return 'cinematics'
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}
