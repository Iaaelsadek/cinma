import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { MovieCard } from '../components/features/media/MovieCard'
import { tmdb, fetchGenres } from '../lib/tmdb'
import { ChevronDown, Filter } from 'lucide-react'

// Mappings
const CATEGORY_MAP: Record<string, any> = {
  foreign: { with_original_language: 'en' }, // Simplified
  arabic: { with_original_language: 'ar' },
  asian: { with_original_language: 'ko|ja|zh' },
  turkish: { with_original_language: 'tr' },
}

const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)

export const CategoryHub = ({ type = 'movie' }: { type?: 'movie' | 'tv' }) => {
  const { category, year, genre } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState<any[]>([])
  const [genresList, setGenresList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'latest' | 'top_rated'>('latest')

  // Fetch Genres on mount
  useEffect(() => {
    fetchGenres(type).then(setGenresList)
  }, [type])

  // Fetch Content based on params
  useEffect(() => {
    setLoading(true)
    const fetchContent = async () => {
      try {
        const params: any = {
          page: 1,
          sort_by: activeTab === 'latest' ? 'primary_release_date.desc' : 'vote_average.desc',
          'vote_count.gte': 50,
        }

        if (type === 'tv') {
          params.sort_by = activeTab === 'latest' ? 'first_air_date.desc' : 'vote_average.desc'
        }

        // Apply Category Filter
        if (category && CATEGORY_MAP[category]) {
          Object.assign(params, CATEGORY_MAP[category])
        }

        // Apply Year Filter
        if (year) {
          if (type === 'movie') {
            params.primary_release_year = year
          } else {
            params.first_air_date_year = year
          }
        }

        // Apply Genre Filter
        if (genre) {
          // Find genre ID from slug/name
          // This is a bit tricky since we only have the slug in URL but need ID.
          // For now, let's assume the genre param is the ID or we try to match name.
          // In a real app we'd have a slug map.
          // Let's try to match by name roughly or pass ID in URL.
          // User asked for /action.
          const g = genresList.find(g => g.name.toLowerCase() === genre.toLowerCase() || g.id.toString() === genre)
          if (g) params.with_genres = g.id
        }

        const endpoint = `/discover/${type}`
        const { data } = await tmdb.get(endpoint, { params })
        
        setContent(data.results.map((item: any) => ({
          ...item,
          media_type: type
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (genresList.length > 0 || !genre) {
       fetchContent()
    }
  }, [category, year, genre, type, activeTab, genresList])

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

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
      <Helmet>
        <title>{`${type === 'movie' ? 'أفلام' : 'مسلسلات'} ${category || ''} ${year || ''} | سينما أونلاين`}</title>
      </Helmet>

      <Breadcrumbs />

      {/* Header Section */}
      <div className="mb-12 relative">
        <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-cairo">
          {type === 'movie' ? 'الأفلام' : 'المسلسلات'}
          {category && <span className="text-primary"> : {category}</span>}
        </h1>
        
        {/* Sub-Category Hub (The Forum Logic) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Year Filter Block */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <Filter size={18} />
              <h3>السنة</h3>
            </div>
            <div className="flex flex-wrap gap-2">
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
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
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

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('latest')}
          className={`text-lg font-bold pb-4 -mb-4 border-b-2 transition-colors ${
            activeTab === 'latest' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          أضيف حديثاً
        </button>
        <button
          onClick={() => setActiveTab('top_rated')}
          className={`text-lg font-bold pb-4 -mb-4 border-b-2 transition-colors ${
            activeTab === 'top_rated' ? 'border-primary text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          الأعلى تقييماً
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
        >
          {content.map((item, i) => (
            <MovieCard key={item.id} movie={item} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
