import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

type AnimeItem = {
  id: number
  title: string
  category: string
  image_url: string
  rating?: number
  year?: number
  created_at?: string
}

export const AnimePage = () => {
  const { lang } = useLang()

  const { data: animeList } = useQuery({
    queryKey: ['anime-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('anime')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      
      const dbItems = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.image_url,
        vote_average: item.rating || 9.0, 
        release_date: item.created_at?.split('T')[0] || '2024',
        media_type: 'anime',
        category: item.category
      }))

      if (dbItems.length > 0) return dbItems

      // Fetch from TMDB if Supabase is empty
      try {
        const tmdbRes = await tmdb.get('/discover/tv', {
          params: {
            with_genres: 16, // Animation
            with_origin_country: 'JP',
            sort_by: 'popularity.desc',
            'vote_count.gte': 100
          }
        })
        
        const tmdbItems = tmdbRes.data.results.map((item: any) => ({
            id: item.id,
            title: item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.first_air_date,
            media_type: 'tv',
            category: 'Anime' // Simplified category for TMDB results
        }))
        
        if (tmdbItems.length > 0) return tmdbItems
      } catch (e) {
        console.error('TMDB fetch failed', e)
      }

      // Mock Data Fallback
      return [
        { id: 101, title: 'Attack on Titan', poster_path: 'https://image.tmdb.org/t/p/w500/8C5gDxUyWy6jqArPP2jXDExQR5.jpg', vote_average: 9.8, media_type: 'anime', category: 'Action' },
        { id: 102, title: 'One Piece', poster_path: 'https://image.tmdb.org/t/p/w500/cMD9Ygz11yjJNZ1lFB5QQeHWDn3.jpg', vote_average: 9.5, media_type: 'anime', category: 'Adventure' },
        { id: 103, title: 'Demon Slayer', poster_path: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8bZJKSe160SJD9EsWP.jpg', vote_average: 9.6, media_type: 'anime', category: 'Action' },
        { id: 104, title: 'Jujutsu Kaisen', poster_path: 'https://image.tmdb.org/t/p/w500/hD8yEIdqBWEz8D6mowwWpOGlyB0.jpg', vote_average: 9.4, media_type: 'anime', category: 'Supernatural' },
        { id: 105, title: 'Death Note', poster_path: 'https://image.tmdb.org/t/p/w500/tCZe8v7K2clWbgG3a8c3K5w6w83.jpg', vote_average: 9.3, media_type: 'anime', category: 'Mystery' },
        { id: 106, title: 'Fullmetal Alchemist: Brotherhood', poster_path: 'https://image.tmdb.org/t/p/w500/5HPVUF7cvR486ssiv9ItnSwJqIY.jpg', vote_average: 9.7, media_type: 'anime', category: 'Adventure' },
        { id: 107, title: 'Naruto Shippuden', poster_path: 'https://image.tmdb.org/t/p/w500/zAYRe2bJxpWTVrwwmBc00VFkAf4.jpg', vote_average: 9.2, media_type: 'anime', category: 'Action' },
        { id: 108, title: 'Dragon Ball Z', poster_path: 'https://image.tmdb.org/t/p/w500/dD12tpT8S9x2Gv9j5Z9d1Z9j5Z9.jpg', vote_average: 9.1, media_type: 'anime', category: 'Action' },
        { id: 109, title: 'Hunter x Hunter', poster_path: 'https://image.tmdb.org/t/p/w500/ucQhJWp1osFvD7gB8b5G5.jpg', vote_average: 9.5, media_type: 'anime', category: 'Adventure' },
        { id: 110, title: 'Bleach', poster_path: 'https://image.tmdb.org/t/p/w500/2Eewgp7o5AU1XC4l2dB4pMTSHj9.jpg', vote_average: 9.0, media_type: 'anime', category: 'Action' },
        { id: 111, title: 'My Hero Academia', poster_path: 'https://image.tmdb.org/t/p/w500/ivOLM47yJt90P19RH1dQoYE6zN9.jpg', vote_average: 8.9, media_type: 'anime', category: 'Action' },
        { id: 112, title: 'Tokyo Ghoul', poster_path: 'https://image.tmdb.org/t/p/w500/gK125bh1V191g7754.jpg', vote_average: 8.8, media_type: 'anime', category: 'Horror' },
      ]
    }
  })

  // Group by category
  const categories = [...new Set(animeList?.map((a: any) => a.category).filter(Boolean))]
  const byCategory = (cat: string) => animeList?.filter((a: any) => a.category === cat) || []
  const latest = animeList?.slice(0, 15) || []
  const topRated = [...(animeList || [])].sort((a: any, b: any) => b.vote_average - a.vote_average).slice(0, 15)

  const heroItems = latest.slice(0, 10)

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'أنمي - سينما أونلاين' : 'Anime - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={latest} 
          title={lang === 'ar' ? 'أحدث الأنمي' : 'Latest Anime'} 
          link="/search?types=anime&sort=latest"
        />
        
        <QuantumTrain 
          items={topRated} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=anime&sort=top_rated"
        />

        {categories.map((cat: any) => (
          <QuantumTrain 
            key={cat as string}
            items={byCategory(cat as string)} 
            title={cat as string} 
            link={`/search?types=anime&genres=${encodeURIComponent(cat as string)}`}
          />
        ))}
      </div>
    </div>
  )
}
