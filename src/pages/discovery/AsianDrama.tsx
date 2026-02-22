import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { tmdb, fetchGenres } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { slugify } from '../../lib/utils'
import { useTranslatedContent } from '../../hooks/useTranslatedContent'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { SectionHeader } from '../../components/common/SectionHeader'
import { Tv, Film } from 'lucide-react'

type AsianDramaType = 'chinese' | 'korean' | 'turkish' | 'bollywood'

interface Props {
  type: AsianDramaType
}

export const AsianDramaPage = ({ type }: Props) => {
  const { lang } = useLang()
  const { genre: paramGenre, year: paramYear, rating: paramRating } = useParams()

  const config = {
    chinese: {
      langCode: 'zh',
      titleAr: 'مسلسلات صينية',
      titleEn: 'Chinese Dramas',
      category: 'Chinese Drama',
      color: 'red' as const,
      icon: <Tv />
    },
    korean: {
      langCode: 'ko',
      titleAr: 'الدراما الكورية',
      titleEn: 'K-Drama',
      category: 'K-Drama',
      color: 'pink' as const,
      icon: <Film />
    },
    turkish: {
      langCode: 'tr',
      titleAr: 'الدراما التركية',
      titleEn: 'Turkish Drama',
      category: 'Turkish Drama',
      color: 'cyan' as const,
      icon: <Film />
    },
    bollywood: {
        langCode: 'hi',
        titleAr: 'أفلام بوليوود',
        titleEn: 'Bollywood Movies',
        category: 'Bollywood',
        color: 'gold' as const,
        icon: <Film />,
        mediaType: 'movie'
    }
  }[type]

  const { data: dramaList, isLoading } = useQuery({
    queryKey: [`${type}-drama-all`, paramGenre, paramYear, paramRating],
    queryFn: async () => {
      try {
        const mediaType = config.mediaType || 'tv'
        const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv'
        
        const params: any = {
          with_original_language: config.langCode,
          sort_by: 'popularity.desc',
          'vote_count.gte': 10
        }

        if (paramYear) {
            if (mediaType === 'movie') {
                params.primary_release_year = paramYear
            } else {
                params.first_air_date_year = paramYear
            }
        }
        
        if (paramRating) {
          params['vote_average.gte'] = Number(paramRating)
        }

        // If genre param exists, try to map it to TMDB genre ID
        if (paramGenre) {
            const genres = await fetchGenres(mediaType as any)
            const genre = genres.find((g: any) => slugify(g.name) === paramGenre || g.id.toString() === paramGenre)
            if (genre) {
                params.with_genres = genre.id
            }
        }

        const tmdbRes = await tmdb.get(endpoint, { params })
        
        const tmdbItems = tmdbRes.data.results.map((item: any) => ({
            id: item.id,
            title: item.name || item.title || item.original_name || item.original_title,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.first_air_date || item.release_date,
            media_type: mediaType,
            original_language: config.langCode,
            category: config.category,
            genre_ids: item.genre_ids,
            overview: item.overview
        }))

        return tmdbItems
      } catch (error) {
        // Silently fail
        return []
      }
    },
    staleTime: 1000 * 60 * 30 // 30 mins
  })

  // Hub Logic
  const fetchHubSection = async (genreId: number | null, sortBy: string = 'popularity.desc') => {
    const mediaType = config.mediaType || 'tv'
    const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv'
    const params: any = {
      with_original_language: config.langCode,
      sort_by: sortBy,
      'vote_count.gte': 10
    }
    if (genreId) params.with_genres = genreId
    
    const { data } = await tmdb.get(endpoint, { params })
    return data.results.map((item: any) => ({ ...item, media_type: mediaType }))
  }

  const topRated = useQuery({ 
    queryKey: [`${type}-top-rated`], 
    queryFn: () => fetchHubSection(null, 'vote_average.desc'),
    enabled: !paramGenre 
  })

  const romance = useQuery({ 
    queryKey: [`${type}-romance`], 
    queryFn: () => fetchHubSection(10749), // Romance
    enabled: !paramGenre 
  })

  const action = useQuery({ 
    queryKey: [`${type}-action`], 
    queryFn: () => fetchHubSection(config.mediaType === 'movie' ? 28 : 10759), // Action
    enabled: !paramGenre 
  })

  const comedy = useQuery({ 
    queryKey: [`${type}-comedy`], 
    queryFn: () => fetchHubSection(35), // Comedy
    enabled: !paramGenre 
  })

  const crime = useQuery({ 
    queryKey: [`${type}-crime`], 
    queryFn: () => fetchHubSection(80), // Crime
    enabled: !paramGenre 
  })

  const fantasy = useQuery({ 
    queryKey: [`${type}-fantasy`], 
    queryFn: () => fetchHubSection(14), // Fantasy
    enabled: !paramGenre 
  })

  const history = useQuery({ 
    queryKey: [`${type}-history`], 
    queryFn: () => fetchHubSection(36), // History
    enabled: !paramGenre 
  })

  const thriller = useQuery({ 
    queryKey: [`${type}-thriller`], 
    queryFn: () => fetchHubSection(53), // Thriller
    enabled: !paramGenre 
  })

  const family = useQuery({ 
    queryKey: [`${type}-family`], 
    queryFn: () => fetchHubSection(10751), // Family
    enabled: !paramGenre 
  })

  const music = useQuery({ 
    queryKey: [`${type}-music`], 
    queryFn: () => fetchHubSection(10402), // Music
    enabled: !paramGenre 
  })

  // Apply translation hook
  const translatedContent = useTranslatedContent(dramaList)
  
  const displayItems = translatedContent.data || dramaList || []
  const heroItems = displayItems.slice(0, 10)
  const isFiltered = !!paramGenre || !!paramYear || !!paramRating

  return (
    <div className="min-h-screen pb-4 max-w-[2400px] mx-auto w-full">
      <Helmet>
        <title>{lang === 'ar' ? config.titleAr : config.titleEn} | Online Cinema</title>
        <meta name="description" content={lang === 'ar' ? `أفضل ${config.titleAr} المترجمة` : `Best Translated ${config.titleEn}`} />
      </Helmet>

      {!isFiltered ? (
        <>
          <QuantumHero items={heroItems} />
          
          <div className="space-y-2 relative z-10 pt-4">
             <QuantumTrain 
               items={displayItems.slice(0, 15)} 
               title={lang === 'ar' ? 'الأكثر رواجاً' : 'Trending Now'} 
               link={`/${type}/trending`}
             />

             <QuantumTrain 
               items={topRated.data || []} 
               title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
               link={`/${type}/top-rated`}
             />

             <QuantumTrain 
               items={romance.data || []} 
               title={lang === 'ar' ? 'رومانسي ودراما' : 'Romance & Drama'} 
               link={`/${type}/romance`}
             />

             <QuantumTrain 
               items={action.data || []} 
               title={lang === 'ar' ? 'أكشن وإثارة' : 'Action & Thriller'} 
               link={`/${type}/action`}
             />

             <QuantumTrain 
               items={comedy.data || []} 
               title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
               link={`/${type}/comedy`}
             />

             {type === 'chinese' && (
               <>
                 <QuantumTrain 
                   items={fantasy.data || []} 
                   title={lang === 'ar' ? 'خيال وأساطير (Wuxia)' : 'Fantasy & Myth (Wuxia)'} 
                   link={`/${type}/fantasy`}
                   color="purple"
                 />
                 <QuantumTrain 
                   items={history.data || []} 
                   title={lang === 'ar' ? 'دراما تاريخية' : 'Historical Drama'} 
                   link={`/${type}/history`}
                   color="gold"
                 />
               </>
             )}

             {type === 'korean' && (
               <>
                 <QuantumTrain 
                   items={history.data || []} 
                   title={lang === 'ar' ? 'تاريخي (Sageuk)' : 'Historical (Sageuk)'} 
                   link={`/${type}/history`}
                   color="gold"
                 />
                 <QuantumTrain 
                   items={thriller.data || []} 
                   title={lang === 'ar' ? 'غموض وتشويق' : 'Mystery & Thriller'} 
                   link={`/${type}/thriller`}
                   color="red"
                 />
                 <QuantumTrain 
                   items={family.data || []} 
                   title={lang === 'ar' ? 'دراما عائلية' : 'Family Drama'} 
                   link={`/${type}/family`}
                   color="green"
                 />
               </>
             )}

             {type === 'turkish' && (
               <>
                 <QuantumTrain 
                   items={history.data || []} 
                   title={lang === 'ar' ? 'تاريخي (Ertugrul)' : 'Historical (Ertugrul)'} 
                   link={`/${type}/history`}
                   color="gold"
                 />
                 <QuantumTrain 
                   items={crime.data || []} 
                   title={lang === 'ar' ? 'أكشن ومافيا' : 'Action & Mafia'} 
                   link={`/${type}/crime`}
                   color="red"
                 />
                 <QuantumTrain 
                   items={family.data || []} 
                   title={lang === 'ar' ? 'دراما عائلية' : 'Family Drama'} 
                   link={`/${type}/family`}
                   color="green"
                 />
               </>
             )}

             {type === 'bollywood' && (
               <>
                 <QuantumTrain 
                   items={romance.data || []} 
                   title={lang === 'ar' ? 'رومانسي' : 'Romance'} 
                   link={`/${type}/romance`}
                   color="red"
                 />
                 <QuantumTrain 
                   items={action.data || []} 
                   title={lang === 'ar' ? 'أكشن' : 'Action'} 
                   link={`/${type}/action`}
                   color="blue"
                 />
                 <QuantumTrain 
                   items={comedy.data || []} 
                   title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
                   link={`/${type}/comedy`}
                   color="orange"
                 />
                 <QuantumTrain 
                   items={music.data || []} 
                   title={lang === 'ar' ? 'موسيقي واستعراضي' : 'Musical'} 
                   link={`/${type}/music`}
                   color="pink"
                 />
               </>
             )}
          </div>
        </>
      ) : (
        <div className="pt-24 px-4 md:px-12">
            <SectionHeader 
                title={lang === 'ar' ? config.titleAr : config.titleEn} 
                icon={config.icon} 
                color={config.color}
            />

            {isLoading ? (
                <SkeletonGrid count={20} variant="poster" />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {displayItems.map((item: any, idx: number) => (
                    <MovieCard key={item.id} movie={item} index={idx} />
                ))}
                </div>
            )}
            
            {!isLoading && displayItems.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                </div>
            )}
        </div>
      )}
    </div>
  )
}
