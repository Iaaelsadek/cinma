import {useParams} from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { tmdb } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SeoHead } from '../../components/common/SeoHead'
import {Calendar, MapPin, Star, User, Film, Tv, Info} from 'lucide-react'
import { motion } from 'framer-motion'
import { resolveSlug } from '../../lib/slugResolver'
import { logger } from '../../lib/logger'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { useLang } from '../../state/useLang'

type ActorDetails = {
  id: number
  name: string
  biography: string
  birthday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
  combined_credits?: {
    cast: any[]
  }
  images?: {
    profiles: any[]
  }
}

import { getActorByIdDB } from '../../lib/db'

export const Actor = () => {
  const { slug } = useParams()
  const { lang } = useLang()
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  
  const [details, setDetails] = useState<ActorDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all')
  const [actorId, setActorId] = useState<number | null>(null)

  useEffect(() => {
    const resolve = async () => {
      if (!slug) return
      
      try {
        // 1. Try DB first
        const local = await getActorByIdDB(slug)
        if (local?.tmdb_id) {
          setActorId(Number(local.tmdb_id))
          return
        }

        // 2. Fallback to resolver
        const contentId = await resolveSlug(slug, 'actor');
        setActorId(contentId);
      } catch (error) {
        logger.error('Error resolving slug for actor:', error);
        setActorId(null);
      }
    };

    resolve();
  }, [slug]);

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(false)
    
    const fetchActor = async () => {
      if (!actorId) return;
      try {
        const { data } = await tmdb.get(`/person/${actorId}`, {
          params: { append_to_response: 'combined_credits,images' }
        })
        if (mounted) setDetails(data)
      } catch (e) {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchActor()
    return () => { mounted = false }
  }, [actorId])

  const works = useMemo(() => {
    if (!details?.combined_credits?.cast) return []
    
    // Filter and sort by popularity/date
    return details.combined_credits.cast
      .filter(w => w.poster_path) // Only with posters
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Unique
  }, [details])

  const filteredWorks = useMemo(() => {
    if (activeTab === 'all') return works
    return works.filter(w => w.media_type === activeTab)
  }, [works, activeTab])

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={8} variant="video" /></div>
  if (error || !details) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Error loading actor profile</div>

  const profileImg = details.profile_path ? `https://image.tmdb.org/t/p/h632${details.profile_path}` : null
  const bgImg = details.combined_credits?.cast?.[0]?.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${details.combined_credits.cast[0].backdrop_path}` 
    : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20">
      <SeoHead 
        title={`${details.name} | Actor Profile`}
        description={details.biography || `Profile and works of ${details.name}`}
        image={profileImg || undefined}
      />

      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[60vh] overflow-hidden">
        {bgImg && (
          <>
            <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />
          </>
        )}
        
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-[2400px] w-full px-4 md:px-12 pb-12 flex flex-col md:flex-row items-center md:items-end gap-8">
            {/* Profile Picture */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 bg-zinc-900"
            >
              {profileImg ? (
                <img src={profileImg} alt={details.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User size={64} className="text-zinc-700" /></div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-right space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-7xl font-black tracking-tight"
              >
                {details.name}
              </motion.h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-400">
                {details.birthday && (
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <Calendar size={16} className="text-primary" />
                    <span>{details.birthday}</span>
                  </div>
                )}
                {details.place_of_birth && (
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <MapPin size={16} className="text-primary" />
                    <span className="line-clamp-1">{details.place_of_birth}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <Star size={16} className="text-[#f5c518] fill-[#f5c518]" />
                  <span>{t('ممثل', 'Actor')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[2400px] px-4 md:px-12 mt-12 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
        {/* Left Column: Works */}
        <div className="space-y-12">
          {/* Tabs */}
          <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/10">
            {[
              { id: 'all', label: t('الكل', 'All'), icon: Film },
              { id: 'movie', label: t('أفلام', 'Movies'), icon: Film },
              { id: 'tv', label: t('مسلسلات', 'TV Shows'), icon: Tv },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {filteredWorks.slice(0, 24).map((work, idx) => (
              <MovieCard key={`${work.id}-${idx}`} movie={work} index={idx} />
            ))}
          </div>

          {filteredWorks.length === 0 && (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-zinc-500 font-bold">{t('لا توجد أعمال لعرضها', 'No works found to display')}</p>
            </div>
          )}
        </div>

        {/* Right Column: Sidebar Info */}
        <div className="space-y-8">
          {/* Biography */}
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary"><Info size={20} /></div>
              <h3 className="text-xl font-black">{t('عن الممثل', 'Biography')}</h3>
            </div>
            <p className="text-zinc-400 leading-relaxed text-sm whitespace-pre-wrap">
              {details.biography || t('لا تتوفر سيرة ذاتية لهذا الممثل حالياً.', 'No biography available for this actor at the moment.')}
            </p>
          </div>

          {/* Photos Gallery */}
          {details.images?.profiles && details.images.profiles.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 text-primary"><ImageIcon size={20} /></div>
                <h3 className="text-xl font-black">{t('صور الممثل', 'Photos')}</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {details.images.profiles.slice(0, 9).map((img, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
                    <img 
                      src={`https://image.tmdb.org/t/p/w185${img.file_path}`} 
                      alt="" 
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
