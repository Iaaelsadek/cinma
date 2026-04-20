import React from 'react'
import type { ContentType } from '../../../types/unified-section'
import { MovieCard } from './MovieCard'
import { SkeletonGrid } from '../../common/Skeletons'
import { useAggregateRatings } from '../../../hooks/useAggregateRatings'

interface ContentGridProps {
  items: any[]
  contentType: ContentType
  isLoading?: boolean
  lang: 'ar' | 'en'
}

export const ContentGrid: React.FC<ContentGridProps> = React.memo(({
  items,
  contentType,
  isLoading,
  lang
}) => {
  // جلب التقييمات المجمعة لكل العناصر
  const { ratings } = useAggregateRatings(items, contentType === 'series' || contentType === 'anime' ? 'tv' : 'movie')
  
  // دمج التقييمات مع العناصر
  const itemsWithRatings = React.useMemo(() => 
    items.map((item: any) => ({
      ...item,
      aggregate_rating: ratings[String(item.id)]?.average_rating,
      rating_count: ratings[String(item.id)]?.rating_count,
      review_count: ratings[String(item.id)]?.review_count
    })),
    [items, ratings]
  )
  
  if (isLoading) {
    return <SkeletonGrid count={40} variant="poster" />
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-lumen-silver mb-4">
          {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
        </p>
        <p className="text-sm text-lumen-silver/70">
          {lang === 'ar' 
            ? 'جرب تغيير الفلاتر أو البحث عن شيء آخر' 
            : 'Try changing filters or searching for something else'}
        </p>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6" data-content-grid>
      {itemsWithRatings.map((item: any, index: number) => (
        <MovieCard
          key={item.id}
          movie={{
            ...item,
            media_type: contentType === 'series' || contentType === 'anime' ? 'tv' : contentType
          }}
          index={index}
        />
      ))}
    </div>
  )
})
