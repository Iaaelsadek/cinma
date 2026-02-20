import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { tmdb, fetchGenres } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { slugify } from '../../lib/utils'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { SectionHeader } from '../../components/common/SectionHeader'
import { Tv, Film, Clapperboard, Globe, Moon, BookOpen, Baby, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

export type ContentPreset = 
  | 'disney' 
  | 'spacetoon' 
  | 'cartoons' 
  | 'arabic' 
  | 'foreign' 
  | 'indian' 
  | 'ramadan' 
  | 'religious'

interface Props {
  preset: ContentPreset
  type?: 'movie' | 'tv' // Optional override
}

export const DynamicContentPage = ({ preset, type: propType }: Props) => {
  const { lang } = useLang()
  const { genre: paramGenre, year: paramYear, rating: paramRating } = useParams()
  const [page, setPage] = useState(1)

  const config = {
    disney: {
      titleAr: 'عالم ديزني',
      titleEn: 'Disney World',
      category: 'Disney',
      color: 'blue' as const,
      icon: <Sparkles />,
      params: { with_companies: '2|3', sort_by: 'popularity.desc' }
    },
    spacetoon: {
      titleAr: 'كوكب سبيس تون',
      titleEn: 'Spacetoon Planet',
      category: 'Spacetoon',
      color: 'pink' as const,
      icon: <Baby />,
      params: { with_genres: '16,10751', sort_by: 'popularity.desc' } // Animation + Family
    },
    cartoons: {
      titleAr: 'أفلام كرتون',
      titleEn: 'Cartoons & Animation',
      category: 'Animation',
      color: 'purple' as const,
      icon: <Baby />,
      params: { with_genres: '16', sort_by: 'popularity.desc' }
    },
    arabic: {
      titleAr: 'المحتوى العربي',
      titleEn: 'Arabic Content',
      category: 'Arabic',
      color: 'green' as const,
      icon: <Globe />,
      params: { with_original_language: 'ar', sort_by: 'popularity.desc' }
    },
    foreign: {
      titleAr: 'المحتوى الأجنبي',
      titleEn: 'Foreign Content',
      category: 'Foreign',
      color: 'indigo' as const,
      icon: <Globe />,
      params: { with_original_language: 'en', sort_by: 'popularity.desc' }
    },
    indian: {
      titleAr: 'السينما الهندية',
      titleEn: 'Indian Cinema',
      category: 'Indian',
      color: 'orange' as const,
      icon: <Film />,
      params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    },
    ramadan: {
      titleAr: 'مسلسلات رمضان',
      titleEn: 'Ramadan Series',
      category: 'Ramadan',
      color: 'gold' as const,
      icon: <Moon />,
      // Note: This is a best-effort. Specific Ramadan keyword usually requires ID.
      // Using a known keyword ID for "Ramadan" or just text search fallback if needed.
      // For now, we'll try a broad search or keyword. 
      // Keyword 'Ramadan': 209288 (from TMDB if exists) or just generic query
      params: { with_keywords: '209288', sort_by: 'primary_release_date.desc' }, 
      defaultType: 'tv'
    },
    religious: {
      titleAr: 'برامج دينية',
      titleEn: 'Religious Programs',
      category: 'Religious',
      color: 'green' as const,
      icon: <BookOpen />,
      params: { with_genres: '99', with_keywords: 'islam|quran|religion', sort_by: 'popularity.desc' } // Documentary
    }
  }[preset]

  const mediaType = propType || (config as any).defaultType || 'movie'
  const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv'

  const [contentList, setContentList] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const { data: newItems, isLoading, isFetching } = useQuery({
    queryKey: [preset, mediaType, paramGenre, paramYear, paramRating, page],
    queryFn: async () => {
      try {
        const params: any = {
          ...config.params,
          page,
          'vote_count.gte': 5
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
                // If config already has with_genres, append or replace? 
                // Usually we want to filter WITHIN the preset.
                // e.g. Cartoons (16) + Action (28) -> 16,28
                if (params.with_genres) {
                    params.with_genres = `${params.with_genres},${genre.id}`
                } else {
                    params.with_genres = genre.id
                }
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
            original_language: item.original_language,
            category: config.category,
            genre_ids: item.genre_ids,
            overview: item.overview
        }))

        return { results: tmdbItems, total_pages: tmdbRes.data.total_pages }
      } catch (error) {
        return { results: [], total_pages: 1 }
      }
    },
    staleTime: 1000 * 60 * 30 // 30 mins
  })

  // Reset list when filters change
  useEffect(() => {
    setPage(1)
    setContentList([])
  }, [preset, mediaType, paramGenre, paramYear, paramRating])

  // Append items
  useEffect(() => {
    if (newItems?.results) {
      setContentList(prev => {
        // If page is 1, replace. Else append.
        if (page === 1) return newItems.results
        // Filter duplicates just in case
        const ids = new Set(prev.map(i => i.id))
        const uniqueNew = newItems.results.filter((i: any) => !ids.has(i.id))
        return [...prev, ...uniqueNew]
      })
      setTotalPages(newItems.total_pages)
    }
  }, [newItems, page])

  const title = lang === 'ar' ? config.titleAr : config.titleEn

  return (
    <>
      <Helmet>
        <title>{title} | Cinema Online</title>
      </Helmet>
      
      <div className="min-h-screen pt-24 pb-16 container mx-auto px-4">
        <SectionHeader 
          title={title}
          icon={config.icon}
          color={config.color}
        />

        {/* Filters could go here (Year, Genre, Rating) - for now relying on URL params */}
        
        {isLoading && page === 1 ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-8">
              {contentList.map((item: any) => (
                <MovieCard key={item.id} movie={item} />
              ))}
            </div>
            
            {contentList.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-20 text-gray-500">
                {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}

            {page < totalPages && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isFetching}
                  className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white font-bold disabled:opacity-50"
                >
                  {isFetching ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </span>
                  ) : (
                    lang === 'ar' ? 'عرض المزيد' : 'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
