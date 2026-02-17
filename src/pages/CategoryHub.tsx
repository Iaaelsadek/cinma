import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SeoHead } from '../components/common/SeoHead'
import { motion } from 'framer-motion'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { MovieCard } from '../components/features/media/MovieCard'
import { tmdb, fetchGenres } from '../lib/tmdb'
import { ChevronDown, Filter, Star, Clock, TrendingUp, SearchX } from 'lucide-react'

// Mappings
const CATEGORY_MAP: Record<string, any> = {
  foreign: { with_original_language: 'en' },
  arabic: { with_original_language: 'ar' },
  asian: { with_original_language: 'ko|ja|zh|th|vi|id' },
  turkish: { with_original_language: 'tr' },
  indian: { with_original_language: 'hi|ta|te|ml' },
  animation: { with_genres: 16 }, // 16 is Animation ID
}

const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i)

export const CategoryHub = ({ type: propsType = 'movie' }: { type?: 'movie' | 'tv' }) => {
  const { category, year: paramYear, genre, rating } = useParams()
  const navigate = useNavigate()
  // Determine type based on URL path or fallback to props
  const pathType = window.location.pathname.includes('/series') ? 'tv' : 'movie'
  const type = propsType || pathType
  const year = paramYear ? Number(paramYear) : undefined

  const [content, setContent] = useState<any[]>([])
  const [featuredContent, setFeaturedContent] = useState<any[]>([])
  const [genresList, setGenresList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'latest' | 'top_rated' | 'trending'>('latest')
  const [totalPages, setTotalPages] = useState(1)

  // Fetch Genres on mount
  useEffect(() => {
    fetchGenres(type).then(setGenresList)
  }, [type])

  // Build params based on URL and filters
  const buildParams = (p: number, sort: string) => {
    const params: any = {
      page: p,
      sort_by: sort,
      'vote_count.gte': 50,
      include_adult: false,
    }

    // Apply Category Filter
    if (category && CATEGORY_MAP[category]) {
      Object.assign(params, CATEGORY_MAP[category])
    }

    // Apply Rating Filter
    if (rating) {
      params['vote_average.gte'] = Number(rating)
      // Sorting by vote_average makes sense when filtering by rating
      if (sort === 'popularity.desc') {
        params.sort_by = 'vote_average.desc'
      }
    }

    // Apply Year Filter
    if (year) {
      if (type === 'movie') {
        params.primary_release_year = year
      } else {
        params.first_air_date_year = year
      }
    }

    // Apply Genre Filter (from URL genre param OR category when category looks like a genre)
    const resolveGenreId = (slug: string) => {
      if (!genresList.length) return null
      return genresList.find(g => 
        g.name.toLowerCase() === slug.toLowerCase() || 
        g.id.toString() === slug
      )
    }

    if (genre) {
      const g = resolveGenreId(genre)
      if (g) {
        if (params.with_genres) params.with_genres = `${params.with_genres},${g.id}`
        else params.with_genres = g.id
      }
    }

    // If category is not a known category but matches a genre (e.g. /movies/action/1990)
    if (category && !CATEGORY_MAP[category]) {
      const g = resolveGenreId(category)
      if (g) {
        if (params.with_genres) params.with_genres = `${params.with_genres},${g.id}`
        else params.with_genres = g.id
      }
    }

    return params
  }

  // Need genresList when genre param or unknown category (e.g. /movies/action/1990)
  const needsGenresForQuery = (!!genre && genresList.length === 0) ||
    (!!category && !CATEGORY_MAP[category] && genresList.length === 0)

  // Fetch Featured Content (Only for Hub Root - no year/genre drilling)
  useEffect(() => {
    if (year || genre || rating) return
    if (needsGenresForQuery) return

    const fetchFeatured = async () => {
      try {
        const params = buildParams(1, 'vote_average.desc')
        params['vote_count.gte'] = 300
        const endpoint = `/discover/${type}`
        const { data } = await tmdb.get(endpoint, { params })
        setFeaturedContent((data.results || []).slice(0, 5).map((item: any) => ({ ...item, media_type: type })))
      } catch (err) {
        console.error(err)
      }
    }

    fetchFeatured()
  }, [category, year, genre, type, genresList, needsGenresForQuery])

  // Fetch Main Content
  useEffect(() => {
    if (needsGenresForQuery) return

    setLoading(true)
    const fetchContent = async () => {
      try {
        let sort = 'primary_release_date.desc'
        if (type === 'tv') sort = 'first_air_date.desc'
        if (activeTab === 'top_rated') sort = 'vote_average.desc'
        if (activeTab === 'trending') sort = 'popularity.desc'

        const params = buildParams(1, sort)
        const endpoint = `/discover/${type}`
        const { data } = await tmdb.get(endpoint, { params })

        setContent((data.results || []).map((item: any) => ({
          ...item,
          media_type: type
        })))
        setTotalPages(data.total_pages ?? 1)
        setPage(1)
      } catch (err) {
        console.error(err)
        setContent([])
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [category, year, genre, type, activeTab, genresList, needsGenresForQuery])

  // Load More
  const loadMore = async () => {
    const nextPage = page + 1
    try {
      let sort = 'primary_release_date.desc'
      if (type === 'tv') sort = 'first_air_date.desc'
      if (activeTab === 'top_rated') sort = 'vote_average.desc'
      if (activeTab === 'trending') sort = 'popularity.desc'

      const params = buildParams(nextPage, sort)
      const endpoint = `/discover/${type}`
      const { data } = await tmdb.get(endpoint, { params })
      
      setContent(prev => [...prev, ...data.results.map((item: any) => ({ ...item, media_type: type }))])
      setPage(nextPage)
    } catch (err) {
      console.error(err)
    }
  }

  const handleYearChange = (y: number) => {
    const base = type === 'movie' ? '/movies' : '/series'
    const cat = category || 'all'
    navigate(`${base}/${cat}/${y}${genre ? `/${genre}` : ''}`)
  }

  const handleGenreChange = (gName: string) => {
    const base = type === 'movie' ? '/movies' : '/series'
    const cat = category || 'all'
    const y = year || new Date().getFullYear()
    navigate(`${base}/${cat}/${y}/${gName.toLowerCase()}`)
  }

  const categoryTitle = useMemo(() => {
    if (category === 'foreign') return 'أجنبي'
    if (category === 'arabic') return 'عربي'
    if (category === 'asian') return 'آسيوي'
    if (category === 'turkish') return 'تركي'
    if (category === 'indian') return 'هندي'
    if (category === 'animation') return 'انيميشن'
    // Unknown category might be a genre name (e.g. action)
    if (category && genresList.length > 0) {
      const g = genresList.find(x => x.name.toLowerCase() === category.toLowerCase())
      if (g) return g.name
    }
    return category || 'الكل'
  }, [category, genresList])

  const hubTitle = `${type === 'movie' ? 'أفلام' : 'مسلسلات'} ${categoryTitle} ${year || ''} ${genre || ''} ${rating ? `تقييم ${rating}+` : ''}`.trim()
  const hubDesc = `استكشف أفضل ${hubTitle} على سينما أونلاين - جودة عالية ومترجم`

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <SeoHead
        title={`${hubTitle} | سينما أونلاين`}
        description={hubDesc}
      />

      <Breadcrumbs />

      {/* Header Section */}
      <div className="mb-12 relative">
        <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-cairo">
          {type === 'movie' ? 'أفلام' : 'مسلسلات'}
          {category && <span className="text-primary"> : {categoryTitle}</span>}
        </h1>
        
        {/* Sub-Category Hub (The Forum Logic) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Year Filter Block */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <Filter size={18} />
              <h3>السنة</h3>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => handleYearChange(y)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    Number(year) === y 
                      ? 'bg-primary text-white shadow-lg scale-105' 
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Filter Block */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 text-secondary font-bold">
              <ChevronDown size={18} />
              <h3>التصنيف</h3>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
              {genresList.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGenreChange(g.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    genre?.toLowerCase() === g.name.toLowerCase()
                      ? 'bg-secondary text-white shadow-lg'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Section (Silo Content Deepening) */}
      {!year && !genre && featuredContent.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-6 text-yellow-500">
            <Star className="fill-current" />
            <h2 className="text-2xl font-bold text-white">الأفضل في {categoryTitle}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {featuredContent.map((item, i) => (
              <MovieCard key={`featured-${item.id}`} movie={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('latest')}
          className={`text-lg font-bold pb-4 -mb-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'latest' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock size={18} />
          أضيف حديثاً
        </button>
        <button
          onClick={() => setActiveTab('top_rated')}
          className={`text-lg font-bold pb-4 -mb-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'top_rated' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Star size={18} />
          الأعلى تقييماً
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`text-lg font-bold pb-4 -mb-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'trending' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp size={18} />
          الأكثر شهرة
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : content.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md"
        >
          <SearchX size={64} className="text-zinc-500 mb-6" />
          <h2 className="text-xl md:text-2xl font-bold text-zinc-200 mb-2">لا يوجد محتوى</h2>
          <p className="text-zinc-400 text-center max-w-md mb-6">
            لم نجد أفلاماً أو مسلسلات تطابق اختياراتك. جرّب تغيير السنة أو التصنيف.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate(type === 'movie' ? '/movies' : '/series')}
              className="px-6 py-2 rounded-xl bg-primary/20 border border-primary/40 hover:bg-primary/30 text-primary font-bold transition-all"
            >
              تصفح الكل
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
          >
            {content.map((item, i) => (
              <MovieCard key={item.id} movie={item} index={i} />
            ))}
          </motion.div>
          
          {/* Load More */}
          {page < totalPages && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={loadMore}
                className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all"
              >
                تحميل المزيد
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
