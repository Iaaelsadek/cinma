import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { tmdb } from '../../lib/tmdb'
import { SeoHead } from '../../components/common/SeoHead'
import { Layers, Film, ChevronRight, Calendar, Star } from 'lucide-react'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { motion } from 'framer-motion'

type Part = {
  id: number
  title: string
  poster: string
  year: number | null
  type: string
  vote_average?: number
}

export const Parts = () => {
  const { type, id } = useParams()
  const [details, setDetails] = useState<any>(null)
  const [collection, setCollection] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lang] = useState<'ar' | 'en'>('ar')
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const path = type === 'movie' ? `/movie/${id}` : `/tv/${id}`
        const { data } = await tmdb.get(path, { params: { append_to_response: 'recommendations' } })
        
        if (mounted) {
          setDetails(data)
          setRecommendations(data.recommendations?.results || [])
        }

        if (type === 'movie' && data.belongs_to_collection) {
          const { data: colData } = await tmdb.get(`/collection/${data.belongs_to_collection.id}`)
          if (mounted) setCollection(colData)
        }
      } catch (err) {
        console.error('Failed to fetch parts:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, type])

  const parts = useMemo(() => {
    if (type === 'movie' && collection?.parts) {
      return (collection.parts as any[])
        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
        .map(p => ({
          id: p.id,
          title: p.title,
          poster: p.poster_path ? `https://image.tmdb.org/t/p/w342${p.poster_path}` : '',
          year: p.release_date ? new Date(p.release_date).getFullYear() : null,
          type: 'movie',
          vote_average: p.vote_average
        }))
    }
    
    return recommendations.map((p: any) => ({
      id: p.id,
      title: p.title || p.name,
      poster: p.poster_path ? `https://image.tmdb.org/t/p/w342${p.poster_path}` : '',
      year: (p.release_date || p.first_air_date) ? new Date(p.release_date || p.first_air_date).getFullYear() : null,
      type: p.media_type || (type === 'tv' ? 'tv' : 'movie'),
      vote_average: p.vote_average
    }))
  }, [collection, recommendations, type])

  const title = details?.title || details?.name || ''

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] p-8">
      <div className="mx-auto max-w-[2400px] px-4 md:px-12 w-full">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse mb-8" />
        <SkeletonGrid count={12} variant="video" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-20">
      <SeoHead 
        title={`${t('الأجزاء والترشيحات', 'Parts & Recommendations')} - ${title}`}
        description={details?.overview}
      />

      <div className="relative h-[40vh] w-full overflow-hidden">
        {details?.backdrop_path && (
          <img 
            src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`}
            className="w-full h-full object-cover opacity-40 scale-105 blur-sm"
            alt=""
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <Layers size={18} />
              <span>{type === 'movie' && collection ? t('سلسلة الأفلام', 'Movie Collection') : t('ترشيحات ذات صلة', 'Related Recommendations')}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white">{title}</h1>
            <div className="flex items-center justify-center gap-4 text-zinc-400 text-sm">
              <Link to={`/watch/${type}/${id}`} className="flex items-center gap-1 hover:text-white transition-colors">
                <ChevronRight size={16} className="rotate-180" />
                {t('العودة للمشاهدة', 'Back to Watch')}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-[2400px] px-4 md:px-12 w-full -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {parts.map((part, index) => (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link 
                to={`/watch/${part.type}/${part.id}`}
                className="group block relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/50 transition-all duration-500 shadow-2xl hover:shadow-primary/20"
              >
                {part.poster ? (
                  <img 
                    src={part.poster} 
                    alt={part.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Film size={48} />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1">
                    {part.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-primary font-black uppercase">{part.year}</span>
                    {part.vote_average && (
                      <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                        <Star size={10} fill="currentColor" />
                        {part.vote_average.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>

                {part.id === Number(id) && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-tighter shadow-lg">
                    {t('تشاهده الآن', 'Watching Now')}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
