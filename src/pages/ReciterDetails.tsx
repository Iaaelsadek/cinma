
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useLang } from '../state/useLang'
import { useQuranPlayer } from '../context/QuranPlayerContext'
import { SURAHS } from '../lib/quran_meta'
import { Play, Share2, ArrowLeft, ArrowRight, Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'

type Reciter = {
  id: number
  name: string
  rewaya: string
  server: string
  image: string | null
  surah_list: string | null
}

export const ReciterDetails = () => {
  const { id } = useParams()
  const { lang } = useLang()
  const { playTrack, currentTrack, isPlaying, toggle } = useQuranPlayer()

  const { data: reciter, isLoading } = useQuery<Reciter>({
    queryKey: ['reciter', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!reciter) return null

  const availableSurahs = reciter.surah_list
    ? reciter.surah_list.split(',').map(Number)
    : []

  // Filter global SURAHS list to only include available ones
  const reciterSurahs = SURAHS.filter(s => availableSurahs.includes(s.id))

  const buildUrl = (server: string, surahId: number) => {
    const padded = surahId.toString().padStart(3, '0')
    const safeServer = server.endsWith('/') ? server : `${server}/`
    return `${safeServer}${padded}.mp3`
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-32 text-zinc-100 pt-20">
      <Helmet>
        <title>{reciter.name} | {lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online'}</title>
      </Helmet>

      {/* Header */}
      <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-[#050505]/80 to-[#050505]" />
        
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-8 left-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
        >
          {lang === 'ar' ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
        </Link>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-emerald-500/30 shadow-2xl shadow-emerald-500/20"
          >
            {reciter.image ? (
              <img src={reciter.image} alt={reciter.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-4xl font-bold text-zinc-600">
                {reciter.name.charAt(0)}
              </div>
            )}
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2"
          >
            {reciter.name}
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-emerald-400 font-medium"
          >
            {reciter.rewaya}
          </motion.p>
        </div>
      </div>

      {/* Surah List */}
      <div className="px-4 md:px-8 lg:px-12 max-w-7xl mx-auto -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reciterSurahs.map((surah, idx) => {
            const isCurrent = currentTrack?.id === `${reciter.id}-${surah.id}`
            
            return (
              <motion.div
                key={surah.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:scale-[1.02] ${
                  isCurrent 
                    ? 'border-emerald-500/50 bg-emerald-500/10' 
                    : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      isCurrent ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-400'
                    }`}>
                      {surah.id}
                    </div>
                    <div>
                      <h3 className={`font-bold ${isCurrent ? 'text-emerald-400' : 'text-zinc-200'}`}>
                        {lang === 'ar' ? `سورة ${surah.ar}` : surah.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {reciter.rewaya}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isCurrent) {
                        toggle()
                      } else {
                        playTrack({
                          id: `${reciter.id}-${surah.id}`,
                          title: lang === 'ar' ? `سورة ${surah.ar}` : surah.name,
                          reciter: reciter.name,
                          url: buildUrl(reciter.server, surah.id),
                          image: reciter.image
                        })
                      }
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      isCurrent 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-white/10 text-white hover:bg-emerald-500 hover:text-white'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" />
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
