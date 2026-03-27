
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
      if (!id || !/^\d+$/.test(id)) return

      try {
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
            navigate(`/${basePath}/${data.slug}${location.search}${location.hash}`, { replace: true })
          }
        }
      } catch (err) {
        logger.error('Legacy redirect failed:', err)
      }
    }

    performRedirect()
  }, [id, type, navigate, location])

  return null // This component doesn't render anything
}
