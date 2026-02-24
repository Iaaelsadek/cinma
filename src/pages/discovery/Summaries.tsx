import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { VideoCard } from '../../components/features/media/VideoCard'
import { useCategoryVideos } from '../../hooks/useFetchContent'
import { PageLoader } from '../../components/common/PageLoader'

export const SummariesPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // Fetch summaries from Supabase (populated from YouTube)
  const { data: dbSummaries, isLoading } = useCategoryVideos('summary', { 
    limit: 50, 
    orderBy: 'created_at',
    year: year ? Number(year) : undefined
  })

  // Fallback data
  const FALLBACK_SUMMARIES = [
      {
        id: 's1',
        title: 'ملخص فيلم Interstellar',
        description: 'ملخص فيلم الخيال العلمي الملحمي Interstellar للمخرج كريستوفر نولان.',
        thumbnail: 'https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
        created_at: '2024-01-01',
        category: 'summary'
      },
      {
        id: 's2',
        title: 'ملخص فيلم Inception',
        description: 'رحلة في عالم الأحلام مع فيلم Inception.',
        thumbnail: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        created_at: '2024-01-02',
        category: 'summary'
      },
      {
        id: 's3',
        title: 'ملخص فيلم The Dark Knight',
        description: 'قصة باتمان والجوكر في تحفة نولان الخالدة.',
        thumbnail: 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
        created_at: '2024-01-03',
        category: 'summary'
      },
       {
        id: 's4',
        title: 'ملخص فيلم Oppenheimer',
        description: 'قصة مخترع القنبلة الذرية وصراعه النفسي.',
        thumbnail: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        created_at: '2024-01-04',
        category: 'summary'
      },
       {
        id: 's5',
        title: 'ملخص فيلم Dune: Part Two',
        description: 'تكملة ملحمة بول أتريديس في صحراء أراكيس.',
        thumbnail: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        created_at: '2024-01-05',
        category: 'summary'
      }
    ]

  const summaries = (dbSummaries && dbSummaries.length > 0) ? dbSummaries : FALLBACK_SUMMARIES


  if (isLoading) return <PageLoader />

  // Filter if genre is present (simple client-side filter for now)
  // This assumes the description or title might contain the genre or tags
  // Since we don't have explicit genre tags in the video table yet
  let filteredSummaries = genre 
    ? (summaries || []).filter(item => 
        item.title?.toLowerCase().includes(genre.toLowerCase()) || 
        item.description?.toLowerCase().includes(genre.toLowerCase())
      )
    : (summaries || [])
  
  if (rating) {
      // Since rating is fake, we can't really filter by it accurately yet.
      // But for consistency, let's say we filter if we had real ratings.
      // For now, we'll just ignore it or show all, or maybe filter by views?
      // filteredSummaries = filteredSummaries.filter(...)
  }

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
        <QuantumHero items={heroItems} type="video" />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
