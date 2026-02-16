import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLang } from '../../state/useLang'
import { useCategoryVideos, useClassicVideos } from '../../hooks/useFetchContent'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { VideoCard } from '../../components/features/media/VideoCard'
import { supabase } from '../../lib/supabase'
import { Helmet } from 'react-helmet-async'
import { BookOpen, Heart, Shield, Smile, Sparkles, Sun } from 'lucide-react'
import { useQuranPlayer } from '../../context/QuranPlayerContext'
import { QuantumHero } from '../../components/features/hero/QuantumHero'

type AnimeRow = { id: number; title: string | null; category: string | null; image_url: string | null }
type QuranRow = { id: number; name: string | null; category: string | null; image: string | null; rewaya: string | null; server: string | null }

export const CategoryPage = () => {
  const { category } = useParams()
  const { lang } = useLang()
  const { playTrack } = useQuranPlayer()
  const key = (category || '').toLowerCase()
  const isQuran = key === 'quran'
  const isAnime = key === 'anime'
  const isClassics = key === 'classics'
  const isKids = key === 'kids'

  const title = useMemo(() => {
    const dict: Record<string, string> = {
      gaming: lang === 'ar' ? 'منطقة الألعاب' : 'Gaming Zone',
      programming: lang === 'ar' ? 'عالم التقنية والبرمجة' : 'Programming & Tech',
      classics: lang === 'ar' ? 'الكلاسيكيات' : 'Classics',
      trending: lang === 'ar' ? 'الرائج الآن' : 'Trending',
      movie: lang === 'ar' ? 'أحدث الأفلام' : 'Latest Movies',
      series: lang === 'ar' ? 'المسلسلات' : 'TV Series',
      play: lang === 'ar' ? 'مسرحيات كاملة' : 'Plays',
      kids: lang === 'ar' ? 'ركن الأطفال' : 'Kids Corner',
      anime: lang === 'ar' ? 'عالم الأنمي' : 'Anime Hub',
      quran: lang === 'ar' ? 'رحاب القرآن' : 'Quran Hub'
    }
    return dict[key] || (lang === 'ar' ? 'التصنيف' : 'Category')
  }, [key, lang])

  const classicQuery = useClassicVideos({ limit: 60, enabled: isClassics })
  const videoQuery = useCategoryVideos(key, { limit: 60, enabled: !isQuran && !isAnime && !isClassics })

  const animeQuery = useQuery({
    queryKey: ['category-anime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime')
        .select('id,title,category,image_url')
        .order('id', { ascending: false })
        .limit(60)
      if (error) throw error
      return data as AnimeRow[]
    },
    enabled: isAnime
  })

  const quranQuery = useQuery({
    queryKey: ['category-quran'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('id,name,image,rewaya,category,server')
        .order('id', { ascending: false })
        .limit(60)
      if (error) throw error
      return data as QuranRow[]
    },
    enabled: isQuran
  })

  const query = isClassics ? classicQuery : videoQuery
  const items = (query.data || []).map((video) => ({
    ...video,
    thumbnail: video.thumbnail ?? undefined
  }))
  const kidsItems = items.filter((v) => /عمر|سندس|omar|sondos/i.test(v.title || ''))
  
  // Mock Data for Kids if empty
  const mockKidsData = [
    {
      id: 9001,
      title: lang === 'ar' ? 'عمر وسندس - الحلقة 1: الصدق' : 'Omar & Sondos - Ep 1: Honesty',
      overview: lang === 'ar' ? 'تعلم عمر وسندس أهمية قول الصدق في جميع الأوقات.' : 'Omar and Sondos learn the importance of telling the truth.',
      poster_path: '/kids/omar-sondos-1.jpg',
      backdrop_path: '/kids/omar-sondos-bg-1.jpg',
      vote_average: 9.5,
      release_date: '2024-01-01',
      media_type: 'video'
    },
    // ... (keep mock data or simplify)
  ]
  // Reuse existing mock data logic or just use items
  const omarSondos = kidsItems.length ? kidsItems : mockKidsData

  // Prepare Hero Items
  const heroItems = useMemo(() => {
    if (isKids) return omarSondos.slice(0, 5)
    if (isQuran) return (quranQuery.data || []).slice(0, 5).map(r => ({ ...r, title: r.name, poster_path: r.image, backdrop_path: r.image, media_type: 'quran' }))
    if (isAnime) return (animeQuery.data || []).slice(0, 5).map(a => ({ ...a, poster_path: a.image_url, backdrop_path: a.image_url, media_type: 'anime' }))
    return items.slice(0, 5).map((i: any) => ({ ...i, poster_path: i.thumbnail || i.poster_path, backdrop_path: i.thumbnail || i.backdrop_path }))
  }, [isKids, isQuran, isAnime, omarSondos, quranQuery.data, animeQuery.data, items])

  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const description = lang === 'ar'
    ? `استكشف محتوى ${title} بتجربة مشاهدة عربية فاخرة.`
    : `Explore ${title} with a luxury Arabic viewing experience.`
  const buildUrl = (server: string | null) => {
    if (!server) return null
    const safe = server.endsWith('/') ? server : `${server}/`
    return `${safe}001.mp3`
  }

  return (
    <div className="min-h-screen bg-luxury-obsidian pb-12">
      <Helmet>
        <title>{`${title} | cinma.online`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems as any[]} />
      
      <div className="px-4 lg:px-12 -mt-20 relative z-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{title}</h1>
            <div className="mt-2 h-1 w-16 rounded-full bg-primary" />
          </div>
        </div>
        
        {isKids && (
          <div className="space-y-12">
             {/* Replaced old static hero with QuantumHero above, but keeping the chips/features */}
            <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] mb-12">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  {lang === 'ar' ? 'مغامرات عمر وسندس' : 'Omar & Sondos Adventures'}
                </h2>
                <p className="text-sm md:text-base text-zinc-300 max-w-2xl">
                  {lang === 'ar'
                    ? 'عالم مليء بالمرح والقيم الإيجابية والقصص الهادفة للأطفال.'
                    : 'A joyful world filled with positive values and meaningful stories for kids.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: lang === 'ar' ? 'آمن للأطفال' : 'Kids Safe', icon: Shield, tone: 'from-emerald-400/20 to-emerald-500/10' },
                    { label: lang === 'ar' ? 'تعليمي' : 'Educational', icon: BookOpen, tone: 'from-sky-400/20 to-sky-500/10' },
                    { label: lang === 'ar' ? 'مرح يومي' : 'Daily Fun', icon: Smile, tone: 'from-pink-400/20 to-pink-500/10' }
                  ].map((chip) => (
                    <div key={chip.label} className={`flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r ${chip.tone} px-4 py-2 text-xs font-bold text-white`}>
                      <chip.icon size={14} />
                      {chip.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: lang === 'ar' ? 'قصص الأنبياء' : 'Prophets Stories', icon: BookOpen, color: 'from-amber-400/30 to-orange-500/10' },
                  { label: lang === 'ar' ? 'قيم اجتماعية' : 'Social Values', icon: Heart, color: 'from-rose-400/30 to-pink-500/10' },
                  { label: lang === 'ar' ? 'تحديات ممتعة' : 'Fun Challenges', icon: Sparkles, color: 'from-indigo-400/30 to-purple-500/10' },
                  { label: lang === 'ar' ? 'أصدقاء جدد' : 'New Friends', icon: Smile, color: 'from-emerald-400/30 to-teal-500/10' },
                  { label: lang === 'ar' ? 'أمان رقمي' : 'Digital Safety', icon: Shield, color: 'from-sky-400/30 to-cyan-500/10' },
                  { label: lang === 'ar' ? 'طاقة إيجابية' : 'Positive Energy', icon: Sun, color: 'from-yellow-400/30 to-amber-500/10' }
                ].map((tile) => (
                  <div key={tile.label} className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br ${tile.color} p-5 text-center`}>
                    <tile.icon className="h-10 w-10 text-white" />
                    <span className="text-sm font-bold text-white">{tile.label}</span>
                  </div>
                ))}
              </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-white">{lang === 'ar' ? 'حلقات عمر وسندس' : 'Omar & Sondos Episodes'}</h3>
              <span className="text-xs font-bold text-zinc-400">{lang === 'ar' ? 'مختارات خاصة للأطفال' : 'Curated for kids'}</span>
            </div>
            {query.isPending ? (
              <SkeletonGrid count={8} variant="video" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {omarSondos.slice(0, 8).map((video, idx) => (
                  <VideoCard key={video.id} video={video} index={idx} />
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h4 className="text-lg font-bold text-white">{lang === 'ar' ? 'قصص إسلامية ملهمة' : 'Inspiring Islamic Stories'}</h4>
              <p className="mt-2 text-sm text-zinc-400">
                {lang === 'ar'
                  ? 'رحلة ممتعة مع قصص الأنبياء والقيم الأخلاقية بلغة مبسطة للأطفال.'
                  : 'A delightful journey through prophetic stories and values in kid-friendly language.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[lang === 'ar' ? 'الصبر' : 'Patience', lang === 'ar' ? 'الصدق' : 'Honesty', lang === 'ar' ? 'الإحسان' : 'Kindness'].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white">{tag}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h4 className="text-lg font-bold text-white">{lang === 'ar' ? 'قيم اجتماعية إيجابية' : 'Positive Social Values'}</h4>
              <p className="mt-2 text-sm text-zinc-400">
                {lang === 'ar'
                  ? 'محتوى يشجع على التعاون، احترام الآخرين، وتنمية الذكاء العاطفي.'
                  : 'Content that encourages teamwork, respect, and emotional intelligence.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[lang === 'ar' ? 'التعاون' : 'Teamwork', lang === 'ar' ? 'الاحترام' : 'Respect', lang === 'ar' ? 'التعاطف' : 'Empathy'].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white">{tag}</span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
      {query.isPending && !isQuran && !isAnime ? (
        <SkeletonGrid count={12} variant="video" />
      ) : null}
      {isQuran && (
        quranQuery.isPending ? (
          <SkeletonGrid count={12} variant="video" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(quranQuery.data || []).map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  const url = buildUrl(r.server)
                  if (!url) return
                  playTrack({
                    id: r.id,
                    title: lang === 'ar' ? 'سورة الفاتحة' : 'Al-Fatiha',
                    reciter: r.name || (lang === 'ar' ? 'قارئ' : 'Reciter'),
                    url,
                    image: r.image
                  })
                }}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary/40 hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-black/40">
                    {r.image ? (
                      <img src={r.image} alt={r.name || ''} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                        {(r.name || '—').slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{r.name || '—'}</div>
                    <div className="text-xs text-zinc-500">{r.rewaya || r.category || (lang === 'ar' ? 'تلاوات مختارة' : 'Selected Recitations')}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}
      {isAnime && (
        animeQuery.isPending ? (
          <SkeletonGrid count={12} variant="video" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(animeQuery.data || []).map((a) => (
              <div key={a.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-primary/40">
                <div className="aspect-[3/4] w-full bg-zinc-900">
                  {a.image_url ? (
                      <img src={a.image_url} alt={a.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                      {(a.title || 'ANIME').slice(0, 6)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="truncate text-sm font-bold text-white">{a.title || '—'}</div>
                  <div className="text-xs text-zinc-500">{a.category || (lang === 'ar' ? 'أنمي مختار' : 'Curated Anime')}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      {!isQuran && !isAnime && !isKids && !query.isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((video, idx) => (
            <VideoCard key={video.id} video={video} index={idx} />
          ))}
        </div>
      ) : null}
      </div>
    </div>
  )
}
