import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { tmdb, fetchGenres } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { slugify } from '../../lib/utils'
import { useTranslatedContent } from '../../hooks/useTranslatedContent'
import { SkeletonGrid } from '../../components/common/SkeletonGrid'
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
        console.error(`Error fetching ${type} content:`, error)
        return []
      }
    },
    staleTime: 1000 * 60 * 30 // 30 mins
  })

  // Apply translation hook
  const translatedContent = useTranslatedContent(dramaList)
  
  const displayItems = translatedContent.data || dramaList || []

  return (
    <div className="min-h-screen pt-24 px-4 md:px-8 max-w-[2400px] mx-auto pb-12">
      <Helmet>
        <title>{lang === 'ar' ? config.titleAr : config.titleEn} | Online Cinema</title>
        <meta name="description" content={lang === 'ar' ? `أفضل ${config.titleAr} المترجمة` : `Best Translated ${config.titleEn}`} />
      </Helmet>

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
  )
}
