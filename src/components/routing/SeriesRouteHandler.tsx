import { useParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { PageLoader } from '../common/PageLoader'

const SeriesDetails = lazy(() => import('../../pages/media/SeriesDetails').then(m => ({ default: m.default })))
const CategoryHub = lazy(() => import('../../pages/CategoryHub').then(m => ({ default: m.CategoryHub })))

export const SeriesRouteHandler = () => {
  const params = useParams()
  // The param name in App.tsx will be "id" to match existing usage in SeriesDetails
  // But wait, SeriesDetails expects "id" from useParams if not passed as prop.
  // We modified SeriesDetails to accept prop.
  
  // The route in App.tsx will be "/series/:id".
  // So params.id will be "top_rated" or "12345".
  const { id } = params
  
  const isNumeric = /^\d+$/.test(id || '')

  if (isNumeric) {
     return (
        <Suspense fallback={<PageLoader />}>
           <SeriesDetails id={id} />
        </Suspense>
     )
  }

  return (
    <Suspense fallback={<PageLoader />}>
       <CategoryHub type="tv" category={id} />
    </Suspense>
  )
}
