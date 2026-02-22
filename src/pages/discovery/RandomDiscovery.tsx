import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { PageLoader } from '../../components/common/PageLoader'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { Shuffle } from 'lucide-react'
import { motion } from 'framer-motion'

export const RandomDiscovery = () => {
  const { lang } = useLang()
  const [key, setKey] = useState(0) // Force re-fetch
  const [type, setType] = useState<'movie' | 'tv'>('movie')

  const fetchRandom = async () => {
    // Random page 1-50 to ensure high quality (popular items)
    // Or 1-500 for deep discovery. Let's go with 1-100 for a balance.
    const page = Math.floor(Math.random() * 100) + 1
    const { data } = await tmdb.get(`/discover/${type}`, {
      params: {
        page,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
        include_adult: false,
        with_original_language: 'en|ar|tr|ko|hi' // Focus on main languages users like
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: type }))
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['random-discovery', type, key],
    queryFn: fetchRandom,
    staleTime: 0 
  })

  const handleShuffle = () => {
    setKey(prev => prev + 1)
  }

  // Refetch when type changes
  useEffect(() => {
    handleShuffle()
  }, [type])

  return (
    <div className="min-h-screen pt-24 px-4 md:px-12 pb-12 w-full max-w-[2400px] mx-auto text-white">
      <Helmet>
        <title>{lang === 'ar' ? 'اكتشف عشوائي - سينما أونلاين' : 'Random Discovery - Cinema Online'}</title>
      </Helmet>

      <div className="flex flex-col items-center justify-center mb-12 space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 text-center">
          {lang === 'ar' ? 'اكتشف المجهول' : 'Discover the Unknown'}
        </h1>
        <p className="text-zinc-400 text-center max-w-lg">
          {lang === 'ar' 
            ? 'اضغط على زر الخلط لاستكشاف محتوى جديد من مكتبتنا الضخمة التي تضم أكثر من 20,000 عنوان'
            : 'Hit shuffle to explore new content from our massive library of 20,000+ titles'}
        </p>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
          <button 
            onClick={() => setType('movie')}
            className={`px-6 py-2 rounded-full transition-all font-medium ${type === 'movie' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'hover:bg-white/10 text-zinc-300'}`}
          >
            {lang === 'ar' ? 'أفلام' : 'Movies'}
          </button>
          <button 
            onClick={() => setType('tv')}
            className={`px-6 py-2 rounded-full transition-all font-medium ${type === 'tv' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/25' : 'hover:bg-white/10 text-zinc-300'}`}
          >
            {lang === 'ar' ? 'مسلسلات' : 'Series'}
          </button>
        </div>

        <button
          onClick={handleShuffle}
          className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/20 border border-white/20"
        >
          <Shuffle className={`w-6 h-6 transition-transform group-hover:rotate-180 ${isLoading ? 'animate-spin' : ''}`} />
          {lang === 'ar' ? 'خلط عشوائي' : 'Shuffle'}
        </button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 flex items-center justify-center">
           <PageLoader />
        </div>
      ) : (
        <motion.div 
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          {data?.map((item: any, idx: number) => (
             <MovieCard key={`${item.id}-${idx}`} movie={item} index={idx} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
