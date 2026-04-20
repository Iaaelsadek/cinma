import { useParams } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SeoHead } from '../../components/common/SeoHead'
import { Calendar, MapPin, Star, User, Film, Tv, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { logger } from '../../lib/logger'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { useLang } from '../../state/useLang'
import { translateLocation } from '../../lib/countries'

type ActorDetails = {
  id: string
  slug: string
  name: string
  name_ar?: string
  name_en?: string
  biography: string
  birthday: string | null
  place_of_birth: string | null
  profile_url: string | null
  profile_path: string | null
  known_for_department: string
}

type ActorWork = {
  id: string
  slug: string
  title?: string
  name?: string
  title_ar?: string
  name_ar?: string
  title_en?: string
  name_en?: string
  title_original?: string
  name_original?: string
  poster_path?: string | null
  poster_url: string
  vote_average: number
  release_date?: string | null
  first_air_date?: string | null
  character_name?: string
  media_type: 'movie' | 'tv'
}

export const Actor = () => {
  const { slug } = useParams()
  const { lang } = useLang()
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  const [details, setDetails] = useState<ActorDetails | null>(null)
  const [works, setWorks] = useState<ActorWork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv'>('all')

  // Fetch actor details from our API
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(false)

    const fetchActor = async () => {
      if (!slug) return

      try {
        const response = await fetch(`/api/actors/${slug}`)

        if (!response.ok) {
          throw new Error('Actor not found')
        }

        const data = await response.json()

        if (mounted) {
          setDetails(data)
        }
      } catch (e: any) {
        // Silently fail
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchActor()
    return () => { mounted = false }
  }, [slug])

  // Fetch actor works from our API
  useEffect(() => {
    let mounted = true

    const fetchWorks = async () => {
      if (!slug) return

      try {
        const response = await fetch(`/api/actors/${slug}/works?limit=100`)

        if (!response.ok) {
          throw new Error('Failed to fetch works')
        }

        const data = await response.json()

        if (mounted) {
          setWorks(data.data || [])
        }
      } catch (e: any) {
        // Silently fail
      }
    }

    if (details) {
      fetchWorks()
    }

    return () => { mounted = false }
  }, [slug, details])

  const filteredWorks = useMemo(() => {
    if (activeTab === 'all') return works
    return works.filter(w => w.media_type === activeTab)
  }, [works, activeTab])

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={8} variant="video" /></div>
  if (error || !details) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Error loading actor profile</div>

  const profileImg = details.profile_url || null
  const displayName = lang === 'ar' ? (details.name_ar || details.name) : (details.name_en || details.name)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20">
      <SeoHead
        title={`${displayName} | Actor Profile`}
        description={details.biography || `Profile and works of ${displayName}`}
        image={profileImg || undefined}
      />

      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-[2400px] w-full px-4 md:px-12 pb-12 flex flex-col md:flex-row items-center md:items-end gap-8">
            {/* Profile Picture */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl shrink-0 bg-zinc-900"
            >
              {profileImg ? (
                <img src={profileImg} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
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
                {displayName}
              </motion.h1>

              {/* Show both names if different */}
              {details.name_ar && details.name_en && details.name_ar !== details.name_en && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {lang === 'ar' && details.name_en && (
                    <span className="text-lg md:text-2xl font-semibold text-zinc-400">
                      {details.name_en}
                    </span>
                  )}
                  {lang === 'en' && details.name_ar && (
                    <span className="text-lg md:text-2xl font-semibold text-zinc-400">
                      {details.name_ar}
                    </span>
                  )}
                </div>
              )}

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
                    <span className="line-clamp-1">{translateLocation(details.place_of_birth, lang)}</span>
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
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tab.id
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
              <MovieCard
                key={`${work.id}-${idx}`}
                movie={{
                  id: typeof work.id === 'string' ? parseInt(work.id) : work.id,
                  slug: work.slug,
                  title: work.title || work.name || '',
                  title_ar: work.title_ar || work.name_ar,
                  title_en: work.title_en || work.name_en,
                  original_title: work.title_original || work.name_original,
                  poster_path: work.poster_path || null,
                  vote_average: work.vote_average || 0,
                  release_date: work.release_date || work.first_air_date || null,
                  media_type: work.media_type // إضافة نوع المحتوى
                }}
                index={idx}
              />
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
              {lang === 'ar' && details.biography_ar
                ? details.biography_ar
                : details.biography || t('لا تتوفر سيرة ذاتية لهذا الممثل حالياً.', 'No biography available for this actor at the moment.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
