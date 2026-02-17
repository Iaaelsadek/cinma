import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { useCategoryVideos } from '../../hooks/useFetchContent'

const fetchPlays = async (query: string, year?: string) => {
  let q = supabase.from('movies').select('*').eq('is_play', true)
  
  if (query) {
      const searchTerm = query.replace('مسرحية ', '').trim()
      if (searchTerm && searchTerm !== 'مسرحية') {
         q = q.ilike('title', `%${searchTerm}%`)
      }
  }
  
  if (year) {
     q = q.gte('release_date', `${year}-01-01`).lte('release_date', `${year}-12-31`)
  }
  
  const { data, error } = await q.order('vote_average', { ascending: false })
  
  if (error) {
    console.error('Failed to fetch plays:', error)
    return []
  }
  return data.map((item: any) => ({ ...item, media_type: 'movie' }))
}

// Fallback data for plays to ensure sections are not empty
const FALLBACK_PLAYS = {
  'adel-imam': [
    { id: 1, title: 'مدرسة المشاغبين', poster_path: 'https://image.tmdb.org/t/p/w500/uFw2Q4Vw1hG4d1.jpg', vote_average: 9.0, media_type: 'movie' },
    { id: 2, title: 'الواد سيد الشغال', poster_path: 'https://image.tmdb.org/t/p/w500/uFw2Q4Vw1hG4d2.jpg', vote_average: 8.8, media_type: 'movie' },
    { id: 3, title: 'الزعيم', poster_path: 'https://image.tmdb.org/t/p/w500/uFw2Q4Vw1hG4d3.jpg', vote_average: 8.5, media_type: 'movie' },
    { id: 4, title: 'بودي جارد', poster_path: 'https://image.tmdb.org/t/p/w500/uFw2Q4Vw1hG4d4.jpg', vote_average: 8.2, media_type: 'movie' },
    { id: 5, title: 'شاهد ماشفش حاجة', poster_path: 'https://image.tmdb.org/t/p/w500/uFw2Q4Vw1hG4d5.jpg', vote_average: 9.1, media_type: 'movie' }
  ],
  'mohamed-sobhy': [
     { id: 11, title: 'الهمجي', vote_average: 8.5, media_type: 'movie' },
     { id: 12, title: 'تخاريف', vote_average: 8.7, media_type: 'movie' },
     { id: 13, title: 'وجهة نظر', vote_average: 8.9, media_type: 'movie' },
     { id: 14, title: 'لعبة الست', vote_average: 8.6, media_type: 'movie' },
     { id: 15, title: 'ماما امريكا', vote_average: 8.3, media_type: 'movie' }
  ]
}


const CATEGORY_QUERIES: Record<string, string> = {
  'adel-imam': 'مسرحية عادل امام',
  'mohamed-sobhy': 'مسرحية محمد صبحي',
  'samir-ghanem': 'مسرحية سمير غانم',
  'gulf': 'مسرحية طارق العلي',
  'classic': 'مسرحية',
  'full': 'full' // Special case for YouTube
}

export const PlaysPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // YouTube Content
  const { data: ytPlays } = useCategoryVideos('play', { limit: 20 })
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
  const { data: filteredPlays } = useQuery({
    queryKey: ['plays-filtered', genre, year],
    queryFn: () => query && query !== 'full' ? fetchPlays(query, year) : Promise.resolve([]),
    enabled: !!query && query !== 'full'
  })
  
  let displayFiltered = genre === 'full' ? ytPlaysMapped : (filteredPlays || [])

  // Filter by year for YouTube content if needed (TMDB is handled by API param)
  if (year && genre === 'full') {
    displayFiltered = displayFiltered.filter(item => item.release_date?.startsWith(year))
  }

  // Filter by rating for all content
   if (rating) {
      displayFiltered = displayFiltered.filter(item => item.vote_average >= Number(rating))
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

   const samirGhanem = useQuery({ queryKey: ['plays-samir-ghanem'], queryFn: () => fetchPlays('مسرحية سمير غانم'), enabled: !isFiltered })
   const classics = useQuery({ queryKey: ['plays-classics'], queryFn: () => fetchPlays('مسرحية'), enabled: !isFiltered })
   const gulf = useQuery({ queryKey: ['plays-gulf'], queryFn: () => fetchPlays('مسرحية طارق العلي'), enabled: !isFiltered })

   const heroItems = ytPlaysMapped.length > 0 ? ytPlaysMapped.slice(0, 10) : (classics.data?.slice(0, 10) || [])

   return (
    <div className="min-h-screen text-white pb-24 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'المسرحيات - سينما أونلاين' : 'Plays - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10 px-4 md:px-0">
        
        {isFiltered ? (
           <div className="px-4 md:px-12">
              <h2 className="text-3xl font-bold mb-8 capitalize">{genre?.replace('-', ' ')}</h2>
              <QuantumTrain 
                items={displayFiltered} 
                title={lang === 'ar' ? 'نتائج' : 'Results'}
                type={genre === 'full' ? 'video' : undefined}
              />
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
          </>
        )}
      </div>
    </div>
  )
}
