import { useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLang } from '../../state/useLang'
import { useCategoryVideos, useClassicVideos } from '../../hooks/useFetchContent'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { VideoCard } from '../../components/features/media/VideoCard'
import {MovieCard} from '../../components/features/media/MovieCard'
import { supabase } from '../../lib/supabase'
import { tmdb } from '../../lib/tmdb'
import { Helmet } from 'react-helmet-async'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'

type AnimeRow = { id: number; title: string | null; category: string | null; image_url: string | null }
type QuranRow = { id: number; name: string | null; category: string | null; image: string | null; rewaya: string | null; server: string | null }

// Spacetoon Classics IDs (TMDB)
const SPACETOON_IDS = [
  30983,  // Detective Conan
  12609,  // Dragon Ball
  37854,  // One Piece
  46298,  // Hunter x Hunter
  17539,  // Captain Tsubasa
  32252,  // Romeo's Blue Skies
  44139,  // Remi
  21390,  // Grendizer
  2098,   // Digimon Adventure
  60572,  // Pokémon
  2846,   // Beyblade
  1535    // Yu-Gi-Oh!
]

export const CategoryPage = () => {
  const { category } = useParams()
  const location = useLocation()
  const { lang } = useLang()
  
  const key = useMemo(() => {
    if (location.pathname === '/kids') return 'kids'
    return (category || '').toLowerCase()
  }, [category, location.pathname])

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

  // --- KIDS QUERIES ---
  const kidsMovies = useQuery({
    queryKey: ['kids-movies'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/movies?sortBy=popularity&limit=20')
        if (response.ok) {
          const result = await response.json()
          // Filter for animation genre (16)
          return result.data
            .filter((item: any) => item.genres && item.genres.some((g: any) => g.id === 16 || g.name === 'Animation'))
            .map((item: any) => ({ 
              ...item, 
              media_type: 'movie',
              poster_path: item.poster_url || item.poster_path,
              backdrop_path: item.backdrop_url || item.backdrop_path
            }))
        }
      } catch (error: any) {
        console.error('Failed to fetch kids movies from CockroachDB:', error)
      }
      return []
    },
    enabled: isKids
  })

  const kidsTv = useQuery({
    queryKey: ['kids-tv'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/tv?sortBy=popularity&limit=20')
        if (response.ok) {
          const result = await response.json()
          // Filter for kids genre (10762)
          return result.data
            .filter((item: any) => item.genres && item.genres.some((g: any) => g.id === 10762 || g.name === 'Kids'))
            .map((item: any) => ({ 
              ...item, 
              media_type: 'tv',
              title: item.name,
              poster_path: item.poster_url || item.poster_path,
              backdrop_path: item.backdrop_url || item.backdrop_path
            }))
        }
      } catch (error: any) {
        console.error('Failed to fetch kids TV from CockroachDB:', error)
      }
      return []
    },
    enabled: isKids
  })

  const spacetoonQuery = useQuery({
    queryKey: ['kids-spacetoon'],
    queryFn: async () => {
       // DISABLED: TMDB API calls removed
       // Spacetoon content should be fetched from CockroachDB
       // For now, return empty array until proper implementation
       return []
    },
    enabled: false // Disable until proper CockroachDB implementation
  })

  const disneyQuery = useQuery({
    queryKey: ['kids-disney'],
    queryFn: async () => {
      const res = await fetch('/api/movies?keywords=disney&sort=popularity&limit=20')
      const movies = await res.json()
      return movies.map((item: any) => ({ ...item, media_type: 'movie' }))
    },
    enabled: isKids
  })

  const pixarQuery = useQuery({
    queryKey: ['kids-pixar'],
    queryFn: async () => {
      const res = await fetch('/api/movies?keywords=pixar&sort=popularity&limit=20')
      const movies = await res.json()
      return movies.map((item: any) => ({ ...item, media_type: 'movie' }))
    },
    enabled: isKids
  })
  
  // --- END KIDS QUERIES ---

  const classicQuery = useClassicVideos({ limit: 60, enabled: isClassics })
  const videoQuery = useCategoryVideos(key, { limit: 60, enabled: !isQuran && !isAnime && !isClassics && !isKids })

  const animeQuery = useQuery({
    queryKey: ['category-anime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime')
        .select('id,title,category,image_url')
        .order('id', { ascending: false })
        .limit(60)
      if (error) throw error
      const results = (data && data.length > 0) ? (data as AnimeRow[]) : [
        { id: 101, title: 'Attack on Titan', category: 'Action', image_url: 'https://image.tmdb.org/t/p/w500/8C5gDxV5b1bYy72FNUYGBO2LbAt.jpg' },
        { id: 102, title: 'One Piece', category: 'Adventure', image_url: 'https://image.tmdb.org/t/p/w500/cMD9Ygz11VJmK195pHeV4Crghgy.jpg' },
        { id: 103, title: 'Demon Slayer', category: 'Fantasy', image_url: 'https://image.tmdb.org/t/p/w500/nTvM4mhq82TQNnf3RFULl4UB26b.jpg' },
        { id: 104, title: 'Jujutsu Kaisen', category: 'Supernatural', image_url: 'https://image.tmdb.org/t/p/w500/h8jGnEsL5QZc32l621f3jXf5j5.jpg' },
        { id: 105, title: 'Naruto Shippuden', category: 'Action', image_url: 'https://image.tmdb.org/t/p/w500/zAYRe2bJxpWTVrwwmBc00VFkAf4.jpg' }
      ] as AnimeRow[]
      
      return results.map(a => ({ ...a, media_type: 'anime', poster_path: a.image_url })) as unknown as AnimeRow[]
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
      if (data && data.length > 0) return data as QuranRow[]
      // Mock Data
      return [
        { id: 1, name: 'Mishary Rashid Alafasy', category: 'Hafs', image: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg', rewaya: 'Hafs', server: 'https://server8.mp3quran.net/afs/' },
        { id: 2, name: 'Maher Al Muaiqly', category: 'Hafs', image: 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg', rewaya: 'Hafs', server: 'https://server12.mp3quran.net/maher/' }
      ] as QuranRow[]
    },
    enabled: isQuran
  })

  const filteredClassics = isClassics ? (classicQuery.data || []) : []
  const filteredVideos = (!isQuran && !isAnime && !isClassics && !isKids) ? (videoQuery.data || []) : []

  const query = isClassics ? { ...classicQuery, data: filteredClassics } : { ...videoQuery, data: filteredVideos }
  const items = (query.data || []).map((video) => ({
    ...video,
    thumbnail: video.thumbnail ?? undefined
  }))

  // Prepare Hero Items
  const heroItems = useMemo(() => {
    if (isQuran) return (quranQuery.data || []).slice(0, 5).map(r => ({ ...r, title: r.name, poster_path: r.image, backdrop_path: r.image, media_type: 'quran' }))
    if (isAnime) return (animeQuery.data || []).slice(0, 5).map(a => ({ ...a, poster_path: a.image_url, backdrop_path: a.image_url, media_type: 'anime' }))
    if (isKids) return (kidsMovies.data || []).slice(0, 5).map((m: any) => ({ ...m, media_type: 'movie' }))
    return items.slice(0, 5).map((i: any) => ({ ...i, poster_path: i.thumbnail || i.poster_path, backdrop_path: i.thumbnail || i.backdrop_path }))
  }, [isQuran, isAnime, isKids, quranQuery.data, animeQuery.data, kidsMovies.data, items])

  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}${location.pathname}` : ''
  const description = lang === 'ar'
    ? `استكشف محتوى ${title} بتجربة مشاهدة عربية فاخرة.`
    : `Explore ${title} with a luxury Arabic viewing experience.`

  return (
    <div className="min-h-screen bg-luxury-obsidian pb-8 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{`${title} | cinma.online`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <QuantumHero items={heroItems as any[]} />
      
      <div className="pt-4 relative z-10">
        {!isKids && (
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{title}</h1>
              <div className="mt-2 h-1 w-16 rounded-full bg-primary" />
            </div>
          </div>
        )}
        
        {isKids && (
           <div className="space-y-4">
              {/* Spacetoon - Show if has data (which it should now) */}
              {spacetoonQuery.data && spacetoonQuery.data.length > 0 && (
                <QuantumTrain 
                  items={spacetoonQuery.data} 
                  title={lang === 'ar' ? 'كوكب سبيستون' : 'Planet Spacetoon'} 
                  type="video"
                  color="purple"
                />
              )}

              {/* Kids Movies */}
              <QuantumTrain 
                items={kidsMovies.data || []} 
                title={lang === 'ar' ? 'أفلام كرتون' : 'Animation Movies'} 
                link="/search?types=movie&genres=16"
                color="blue"
              />

              {/* Kids TV */}
              <QuantumTrain 
                items={kidsTv.data || []} 
                title={lang === 'ar' ? 'مسلسلات كرتون' : 'Kids TV Shows'} 
                link="/search?types=tv&genres=10762"
                color="green"
              />

              {/* Disney */}
              <QuantumTrain 
                items={disneyQuery.data || []} 
                title={lang === 'ar' ? 'عالم ديزني' : 'Disney World'} 
                link="/search?types=movie&keywords=disney"
                color="cyan"
              />

              {/* Pixar */}
              <QuantumTrain 
                items={pixarQuery.data || []} 
                title={lang === 'ar' ? 'روائع بيكسار' : 'Pixar Masterpieces'} 
                link="/search?types=movie&keywords=pixar"
                color="gold"
              />
           </div>
        )}

      {query.isPending && !isQuran && !isAnime && !isKids ? (
        <SkeletonGrid count={12} variant="video" />
      ) : null}

      {isQuran && (
        quranQuery.isPending ? (
          <SkeletonGrid count={12} variant="video" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {(quranQuery.data || []).map((r, idx) => (
              <MovieCard 
                key={r.id} 
                movie={{
                  id: Number(r.id),
                  title: r.name || undefined,
                  poster_path: r.image,
                  media_type: 'quran',
                  category: r.rewaya || r.category || '',
                  vote_average: 0
                } as any} 
                index={idx} 
              />
            ))}
          </div>
        )
      )}
      {isAnime && (
        animeQuery.isPending ? (
          <SkeletonGrid count={12} variant="video" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {(animeQuery.data || []).map((a, idx) => (
              <MovieCard 
                key={a.id} 
                movie={{
                  id: Number(a.id),
                  title: a.title || undefined,
                  poster_path: a.image_url,
                  media_type: 'anime',
                  category: a.category || '',
                  vote_average: 0
                } as any} 
                index={idx} 
              />
            ))}
          </div>
        )
      )}
      {!isQuran && !isAnime && !isKids && !query.isPending ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {items.map((video, idx) => (
            <VideoCard key={video.id} video={video} index={idx} />
          ))}
        </div>
      ) : null}
      </div>
    </div>
  )
}
