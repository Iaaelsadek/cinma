import { useQuery } from '@tanstack/react-query'
import { getTrendingGamesDB } from '../../lib/db'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

export const Gaming = () => {
  const { lang } = useLang()

  const { data: games } = useQuery({
    queryKey: ['games-all'],
    queryFn: async () => {
      const dbItems = await getTrendingGamesDB(100)
      
      return dbItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.poster_url,
        backdrop_path: item.backdrop_url || item.poster_url, 
        vote_average: item.rating || 0,
        release_date: item.release_date || '2024-01-01',
        media_type: 'game',
        category: (item.category || '').toLowerCase()
      }))
    }
  })

  const topRated = games?.slice(0, 15) || []
  const pcGames = games?.filter(g => g.category.includes('pc')) || []
  const consoleGames = games?.filter(g => g.category.includes('console') || g.category.includes('ps') || g.category.includes('xbox')) || []
  const mobileGames = games?.filter(g => g.category.includes('mobile') || g.category.includes('android') || g.category.includes('ios')) || []
  
  // Hero items - take top 5 rated
  const heroItems = topRated.slice(0, 5)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الألعاب - سينما أونلاين' : 'Gaming - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        <QuantumTrain 
          items={topRated}  
          title={lang === 'ar' ? 'أعلى الألعاب تقييماً' : 'Top Rated Games'} 
          link="/search?types=game&sort=top_rated"
        />
        
        <QuantumTrain 
          items={pcGames} 
          title={lang === 'ar' ? 'ألعاب الكمبيوتر' : 'PC Games'} 
          link="/search?types=game&keywords=pc"
        />

        <QuantumTrain 
          items={consoleGames} 
          title={lang === 'ar' ? 'ألعاب الكونسول' : 'Console Games'} 
          link="/search?types=game&keywords=console"
        />

        <QuantumTrain 
          items={mobileGames} 
          title={lang === 'ar' ? 'ألعاب الموبايل' : 'Mobile Games'} 
          link="/search?types=game&keywords=mobile"
        />
      </div>
    </div>
  )
}
