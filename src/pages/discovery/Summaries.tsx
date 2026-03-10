import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useLang } from '../../state/useLang'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { VideoCard } from '../../components/features/media/VideoCard'
import { useCategoryVideos, VideoItem } from '../../hooks/useFetchContent'
import { PageLoader } from '../../components/common/PageLoader'
import { FALLBACK_SUMMARIES } from '../../lib/constants'

export const SummariesPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // Fetch summaries from Supabase (populated from YouTube)
  const { data: dbSummaries, isLoading } = useCategoryVideos('summary', { 
    limit: 50, 
    orderBy: 'created_at',
    year: year ? Number(year) : undefined
  })

  const summaries = (dbSummaries && dbSummaries.length > 0) ? dbSummaries : FALLBACK_SUMMARIES

  if (isLoading) return <PageLoader />

  // Filter if genre is present (simple client-side filter for now)
  const filteredSummaries = genre 
    ? (summaries || []).filter(item => 
        item.title?.toLowerCase().includes(genre.toLowerCase()) || 
        item.description?.toLowerCase().includes(genre.toLowerCase())
      )
    : (summaries || [])
  
  // Map to QuantumHero format
  const heroItems = (filteredSummaries.slice(0, 5) || []).map(item => ({
    id: item.id,
    title: item.title,
    overview: item.description,
    backdrop_path: item.thumbnail, // Use thumbnail as backdrop
    poster_path: item.thumbnail,
    release_date: item.created_at,
    vote_average: 8.5, // Fake rating or derive from views
    media_type: 'video', // Custom type to handle in Watch page
    original_language: 'ar',
    category: 'summary'
  }))

  const displayItems = filteredSummaries.map(item => ({
    ...item,
    backdrop_path: item.thumbnail,
    poster_path: item.thumbnail,
    release_date: item.created_at,
    media_type: 'video',
    original_language: 'ar',
    category: 'summary'
  }))

  const isFiltered = !!genre

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'ملخصات الأفلام - سينما أونلاين' : 'Movie Summaries - Cinema Online'}</title>
      </Helmet>

      {heroItems.length > 0 ? (
        <QuantumHero items={heroItems} />
      ) : (
        !isFiltered && (
          <div className="h-[50vh] flex items-center justify-center">
            <p className="text-zinc-500">{lang === 'ar' ? 'جاري جلب الملخصات...' : 'Fetching summaries...'}</p>
          </div>
        )
      )}

      <div className={`space-y-2 relative z-10 pt-4`}>
        {isFiltered ? (
          <div>
             <h2 className="text-xl font-bold mb-4 capitalize">{genre}</h2>
             {displayItems.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                 {displayItems.map((item, idx) => (
                   <VideoCard key={item.id} video={item} index={idx} />
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
            items={displayItems} 
            title={lang === 'ar' ? 'أحدث الملخصات' : 'Latest Summaries'} 
            type="video"
          />
        )}
      </div>
    </div>
  )
}
