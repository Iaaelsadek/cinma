import { useParams } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SeoHead } from '../../components/common/SeoHead'
import { ErrorMessage } from '../../components/common/ErrorMessage'
import { SkeletonHero, SkeletonGrid } from '../../components/common/Skeletons'
import { useQuery } from '@tanstack/react-query'
import { getSummaries } from '../../services/contentQueries'

export const SummariesPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // CRITICAL: Fetch summaries from CockroachDB using contentQueries service
  const { data: summariesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['summaries', year],
    queryFn: async () => {
      return await getSummaries({ page: 1, limit: 100 })
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // SEO metadata
  const seoTitle = lang === 'ar' 
    ? 'ملخصات الأفلام - مراجعات سريعة | فور سيما'
    : 'Movie Summaries - Quick Reviews | 4Cima'
  
  const seoDescription = lang === 'ar'
    ? 'شاهد ملخصات سريعة ومراجعات شاملة لأحدث الأفلام والمسلسلات.'
    : 'Watch quick summaries and comprehensive reviews of the latest movies and series.'

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <SeoHead title={seoTitle} description={seoDescription} />
        <SkeletonHero />
        <div className="space-y-2 pt-4">
          <SkeletonGrid count={12} variant="video" />
        </div>
      </div>
    )
  }

  // Error state with ErrorMessage
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SeoHead title={seoTitle} description={seoDescription} noIndex />
        <ErrorMessage
          type="network"
          title="فشل في تحميل الملخصات"
          message="تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى."
          error={error}
          onRetry={() => refetch()}
          showHomeButton
          showBackButton
        />
      </div>
    )
  }

  const summaries = summariesResponse?.data || []

  // Filter if genre is present (simple client-side filter)
  const filteredSummaries = genre 
    ? summaries.filter(item => 
        item.title?.toLowerCase().includes(genre.toLowerCase()) || 
        item.overview?.toLowerCase().includes(genre.toLowerCase())
      )
    : summaries
  
  // Filter by year if provided
  const displaySummaries = year
    ? filteredSummaries.filter(item => {
        const itemYear = item.release_date ? new Date(item.release_date).getFullYear() : 0
        return itemYear === Number(year)
      })
    : filteredSummaries

  const heroItems = displaySummaries.slice(0, 5)
  const isFiltered = !!genre || !!year

  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead 
        title={seoTitle}
        description={seoDescription}
        type="website"
      />

      {heroItems.length > 0 ? (
        <QuantumHero items={heroItems} />
      ) : (
        !isFiltered && (
          <div className="h-[50vh] flex items-center justify-center">
            <p className="text-zinc-500">{lang === 'ar' ? 'لا توجد ملخصات متاحة' : 'No summaries available'}</p>
          </div>
        )
      )}

      <div className={`space-y-2 relative z-10 pt-4`}>
        {isFiltered ? (
          <div>
             <h2 className="text-xl font-bold mb-4 capitalize">{genre || `Year ${year}`}</h2>
             {displaySummaries.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                 {displaySummaries.map((item, idx) => (
                   <MovieCard key={item.id} movie={item as any} index={idx} />
                 ))}
               </div>
             ) : (
               <div className="text-center text-zinc-500 py-12">
                 {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
               </div>
             )}
          </div>
        ) : (
          <QuantumTrain 
            items={displaySummaries} 
            title={lang === 'ar' ? 'أحدث الملخصات' : 'Latest Summaries'} 
          />
        )}
      </div>
    </div>
  )
}
