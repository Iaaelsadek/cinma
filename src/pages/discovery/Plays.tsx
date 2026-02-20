import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { tmdb } from '../../lib/tmdb'
import { errorLogger } from '../../services/errorLogging'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { useCategoryVideos } from '../../hooks/useFetchContent'
import { PageLoader } from '../../components/common/PageLoader'

// Fallback data for plays to ensure sections are not empty
const FALLBACK_PLAYS: Record<string, any[]> = {
  'adel-imam': [
    { id: 111, title: 'مدرسة المشاغبين', poster_path: '/poster_school.jpg', vote_average: 9.0, media_type: 'movie' },
    { id: 112, title: 'الواد سيد الشغال', poster_path: '/poster_sayed.jpg', vote_average: 8.8, media_type: 'movie' },
    { id: 113, title: 'الزعيم', poster_path: '/poster_zaeem.jpg', vote_average: 8.5, media_type: 'movie' },
    { id: 114, title: 'بودي جارد', poster_path: '/poster_bodyguard.jpg', vote_average: 8.2, media_type: 'movie' },
    { id: 115, title: 'شاهد ماشفش حاجة', poster_path: '/poster_shahed.jpg', vote_average: 9.1, media_type: 'movie' }
  ],
  'mohamed-sobhy': [
     { id: 121, title: 'الهمجي', vote_average: 8.5, media_type: 'movie' },
     { id: 122, title: 'تخاريف', vote_average: 8.7, media_type: 'movie' },
     { id: 123, title: 'وجهة نظر', vote_average: 8.9, media_type: 'movie' },
     { id: 124, title: 'لعبة الست', vote_average: 8.6, media_type: 'movie' },
     { id: 125, title: 'ماما امريكا', vote_average: 8.3, media_type: 'movie' }
  ],
  'masrah-masr': [
     { id: 131, title: 'وإسلاماه', vote_average: 8.0, media_type: 'movie' },
     { id: 132, title: 'بعد التحية', vote_average: 7.9, media_type: 'movie' },
     { id: 133, title: 'شيء من الخوف', vote_average: 8.1, media_type: 'movie' },
     { id: 134, title: 'كواليس', vote_average: 8.2, media_type: 'movie' },
     { id: 135, title: 'العجوز والكنز', vote_average: 7.8, media_type: 'movie' }
  ],
  'samir-ghanem': [
     { id: 161, title: 'المتزوجون', vote_average: 9.2, media_type: 'movie' },
     { id: 162, title: 'أخويا هايص وأنا لايص', vote_average: 8.5, media_type: 'movie' },
     { id: 163, title: 'دو ري مي فاصوليا', vote_average: 8.4, media_type: 'movie' },
     { id: 164, title: 'فارس بني خيبان', vote_average: 8.3, media_type: 'movie' },
     { id: 165, title: 'أهلا يا دكتور', vote_average: 8.7, media_type: 'movie' }
  ],
  'classics': [
     { id: 141, title: 'المتزوجون', vote_average: 9.2, media_type: 'movie' },
     { id: 142, title: 'ريا وسكينة', vote_average: 9.0, media_type: 'movie' },
     { id: 143, title: 'سك على بناتك', vote_average: 8.9, media_type: 'movie' },
     { id: 144, title: 'العيال كبرت', vote_average: 9.3, media_type: 'movie' },
     { id: 145, title: 'انها حقا عائلة محترمة', vote_average: 8.8, media_type: 'movie' }
  ],
  'classic': [
     { id: 141, title: 'المتزوجون', vote_average: 9.2, media_type: 'movie' },
     { id: 142, title: 'ريا وسكينة', vote_average: 9.0, media_type: 'movie' },
     { id: 143, title: 'سك على بناتك', vote_average: 8.9, media_type: 'movie' },
     { id: 144, title: 'العيال كبرت', vote_average: 9.3, media_type: 'movie' },
     { id: 145, title: 'انها حقا عائلة محترمة', vote_average: 8.8, media_type: 'movie' }
  ],
  'gulf': [
     { id: 151, title: 'باي باي لندن', vote_average: 9.1, media_type: 'movie' },
     { id: 152, title: 'حامي الديار', vote_average: 8.7, media_type: 'movie' },
     { id: 153, title: 'سيف العرب', vote_average: 8.8, media_type: 'movie' },
     { id: 154, title: 'فرسان المناخ', vote_average: 8.6, media_type: 'movie' },
     { id: 155, title: 'على هامان يا فرعون', vote_average: 8.9, media_type: 'movie' }
  ]
}

const CATEGORY_QUERIES: Record<string, string> = {
  'adel-imam': 'مسرحية عادل امام',
  'mohamed-sobhy': 'مسرحية محمد صبحي',
  'samir-ghanem': 'مسرحية سمير غانم',
  'gulf': 'مسرحية طارق العلي|مسرحية عبدالحسين عبدالرضا', // Expanded query logic needed or just pick one representative
  'masrah-masr': 'مسرح مصر',
  'classics': 'مسرحية', // Map 'classics' URL to generic play search
  'classic': 'مسرحية',
  'full': 'full' // Special case for YouTube
}

const fetchPlays = async (query: string, year?: string) => {
  // 1. Try Supabase
  let q = supabase.from('movies').select('*').eq('is_play', true)
  
  if (query) {
      // Handle composite queries if any, for now simple split
      const searchTerms = query.split('|')
      // If multiple terms, we might need OR logic. Supabase .or() syntax: .or('title.ilike.%term1%,title.ilike.%term2%')
      
      if (searchTerms.length > 1) {
          const orClause = searchTerms.map(term => `title.ilike.%${term}%`).join(',')
          q = q.or(orClause)
      } else {
          const searchTerm = query.replace('مسرحية ', '').trim()
          if (searchTerm && searchTerm !== 'مسرحية') {
             q = q.ilike('title', `%${searchTerm}%`)
          }
      }
  }
  
  if (year) {
     q = q.gte('release_date', `${year}-01-01`).lte('release_date', `${year}-12-31`)
  }
  
  const { data, error } = await q.order('vote_average', { ascending: false })
  
  if (!error && data && data.length > 0) {
    return data.map((item: any) => ({ ...item, media_type: 'movie' }))
  }

  // 2. Fallback to TMDB Search
  try {
    // If query contains multiple terms (split by |), take the first one for TMDB
    const simpleQuery = query.split('|')[0]
    const tmdbQuery = simpleQuery.replace('مسرحية', '').trim() || 'مسرحية'
    
    const { data: tmdbData } = await tmdb.get('/search/movie', {
      params: {
        query: tmdbQuery,
        language: 'ar-SA',
        page: 1
      }
    })

    if (tmdbData.results && tmdbData.results.length > 0) {
       return tmdbData.results.map((item: any) => ({ ...item, media_type: 'movie', is_play: true }))
    }
  } catch (err) {
    errorLogger.logError({
      message: 'Failed to fetch plays from TMDB',
      severity: 'low',
      category: 'network',
      context: { error: err, query }
    })
  }

  return []
}

export const PlaysPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // YouTube Content
  const { data: ytPlays, isLoading: ytLoading } = useCategoryVideos('plays', { limit: 20 })
  const ytPlaysMapped = (ytPlays || []).map(item => ({
    id: item.id,
    title: item.title,
    overview: item.description,
    backdrop_path: item.thumbnail,
    poster_path: item.thumbnail,
    release_date: item.created_at,
    vote_average: 8.0,
    media_type: 'video',
    original_language: 'ar',
    category: 'plays'
  }))

  // If a genre is selected, we only show that genre
  const query = genre ? CATEGORY_QUERIES[genre] : null
  const isFiltered = !!genre

  // Fetch filtered content if genre exists and is not 'full' (YouTube)
  const { data: filteredPlays, isLoading: filteredLoading } = useQuery({
    queryKey: ['plays-filtered', genre, year],
    queryFn: async () => {
       if (!query || query === 'full') return []
       const res = await fetchPlays(query, year)
       if (res.length > 0) return res
       // Use fallback if available and result is empty
       if (genre && FALLBACK_PLAYS[genre]) return FALLBACK_PLAYS[genre]
       return []
    },
    enabled: !!query && query !== 'full'
  })
  
  let displayFiltered = genre === 'full' ? ytPlaysMapped : (filteredPlays || [])

  // Filter by year for YouTube content if needed (TMDB is handled by API param)
  if (year && genre === 'full') {
    displayFiltered = displayFiltered.filter((item: any) => item.release_date?.startsWith(year))
  }

  // Filter by rating for all content
   if (rating) {
      displayFiltered = displayFiltered.filter((item: any) => item.vote_average >= Number(rating))
   }

   // Prefetch sections if not filtered
   const adelImam = useQuery({ queryKey: ['plays-adel-imam'], queryFn: async () => {
      const res = await fetchPlays('مسرحية عادل امام')
      return res.length > 0 ? res : FALLBACK_PLAYS['adel-imam']
   }, enabled: !isFiltered })

   const mohamedSobhy = useQuery({ queryKey: ['plays-mohamed-sobhy'], queryFn: async () => {
      const res = await fetchPlays('مسرحية محمد صبحي')
      return res.length > 0 ? res : FALLBACK_PLAYS['mohamed-sobhy']
   }, enabled: !isFiltered })

   const samirGhanem = useQuery({ queryKey: ['plays-samir-ghanem'], queryFn: async () => {
      const res = await fetchPlays('مسرحية سمير غانم')
      return res.length > 0 ? res : (FALLBACK_PLAYS['samir-ghanem'] || [])
   }, enabled: !isFiltered })

   const classics = useQuery({ queryKey: ['plays-classics'], queryFn: async () => {
      const res = await fetchPlays('مسرحية')
      return res.length > 0 ? res : (FALLBACK_PLAYS['classics'] || [])
   }, enabled: !isFiltered })

   const gulf = useQuery({ queryKey: ['plays-gulf'], queryFn: async () => {
      const res = await fetchPlays('مسرحية طارق العلي|مسرحية عبدالحسين عبدالرضا')
      return res.length > 0 ? res : (FALLBACK_PLAYS['gulf'] || [])
   }, enabled: !isFiltered })

   const masrahMasr = useQuery({ queryKey: ['plays-masrah-masr'], queryFn: async () => {
      const res = await fetchPlays('مسرح مصر')
      return res.length > 0 ? res : (FALLBACK_PLAYS['masrah-masr'] || [])
   }, enabled: !isFiltered })

   const isLoading = ytLoading || (isFiltered ? filteredLoading : (adelImam.isLoading || mohamedSobhy.isLoading || samirGhanem.isLoading || classics.isLoading || gulf.isLoading || masrahMasr.isLoading))

   if (isLoading) return <PageLoader />

   const heroItems = ytPlaysMapped.length > 0 ? ytPlaysMapped.slice(0, 10) : (classics.data?.slice(0, 10) || [])

   return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'المسرحيات - سينما أونلاين' : 'Plays - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        
        {isFiltered ? (
           <div>
              <h2 className="text-xl font-bold mb-4 capitalize">{genre?.replace('-', ' ')}</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {displayFiltered.map((item: any, idx: number) => (
                  <MovieCard key={item.id} movie={item} index={idx} />
                ))}
              </div>
           </div>
        ) : (
          <>
            {ytPlaysMapped.length > 0 && (
              <QuantumTrain 
                items={ytPlaysMapped} 
                title={lang === 'ar' ? 'مسرحيات كاملة (يوتيوب)' : 'Full Plays (YouTube)'} 
                type="video"
                link="/plays/full"
              />
            )}

            <QuantumTrain 
              items={classics.data || []} 
              title={lang === 'ar' ? 'مسرحيات كلاسيكية' : 'Classic Plays'} 
              link="/plays/classic"
            />
            
            <QuantumTrain 
              items={adelImam.data || []} 
              title={lang === 'ar' ? 'مسرحيات عادل إمام' : 'Adel Imam Plays'} 
              link="/plays/adel-imam"
            />

            <QuantumTrain 
              items={mohamedSobhy.data || []} 
              title={lang === 'ar' ? 'مسرحيات محمد صبحي' : 'Mohamed Sobhy Plays'} 
              link="/plays/mohamed-sobhy"
            />

            <QuantumTrain 
              items={samirGhanem.data || []} 
              title={lang === 'ar' ? 'مسرحيات سمير غانم' : 'Samir Ghanem Plays'} 
              link="/plays/samir-ghanem"
            />

            <QuantumTrain 
              items={gulf.data || []} 
              title={lang === 'ar' ? 'مسرحيات خليجية' : 'Gulf Plays'} 
              link="/plays/gulf"
            />

            <QuantumTrain 
              items={masrahMasr.data || []} 
              title={lang === 'ar' ? 'مسرح مصر' : 'Masrah Masr'} 
              link="/plays/masrah-masr"
            />
          </>
        )}
      </div>
    </div>
  )
}
