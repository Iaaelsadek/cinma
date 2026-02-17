import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

export const Gaming = () => {
  const { lang } = useLang()

  const { data: games } = useQuery({
    queryKey: ['games-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .order('rating', { ascending: false })
        .limit(100)
      
      const dbItems = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.poster_url,
        backdrop_path: item.poster_url, 
        vote_average: item.rating || 0,
        release_date: item.year ? `${item.year}-01-01` : '2024',
        media_type: 'game',
        category: (item.category || '').toLowerCase()
      }))

      if (dbItems.length > 0) return dbItems

      // Mock Data
      return [
        { id: 301, title: 'Grand Theft Auto V', poster_path: 'https://media.rawg.io/media/games/456/456dea5e127e3d780e3f7907eb152840.jpg', vote_average: 9.5, category: 'pc console', media_type: 'game' },
        { id: 302, title: 'Elden Ring', poster_path: 'https://media.rawg.io/media/games/b4a/b4ac80ed975f54b93b1a98019b84675e.jpg', vote_average: 9.6, category: 'pc console ps xbox', media_type: 'game' },
        { id: 303, title: 'The Witcher 3: Wild Hunt', poster_path: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg', vote_average: 9.7, category: 'pc console', media_type: 'game' },
        { id: 304, title: 'Minecraft', poster_path: 'https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4847a2b.jpg', vote_average: 9.0, category: 'pc mobile console', media_type: 'game' },
        { id: 305, title: 'Red Dead Redemption 2', poster_path: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg', vote_average: 9.8, category: 'console pc', media_type: 'game' },
        { id: 306, title: 'God of War', poster_path: 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg', vote_average: 9.6, category: 'pc console ps', media_type: 'game' },
        { id: 307, title: 'PUBG Mobile', poster_path: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/PlayerUnknown%27s_Battlegrounds_Mobile_Icon.jpg/220px-PlayerUnknown%27s_Battlegrounds_Mobile_Icon.jpg', vote_average: 8.5, category: 'mobile android ios', media_type: 'game' },
        { id: 308, title: 'Call of Duty: Mobile', poster_path: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Call_of_Duty_Mobile_Logo.png/220px-Call_of_Duty_Mobile_Logo.png', vote_average: 8.8, category: 'mobile android ios', media_type: 'game' },
        { id: 309, title: 'Valorant', poster_path: 'https://media.rawg.io/media/games/b11/b115b2bc6a595966d909adc52097056a.jpg', vote_average: 8.7, category: 'pc', media_type: 'game' },
        { id: 310, title: 'Cyberpunk 2077', poster_path: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab471283efa0c.jpg', vote_average: 8.6, category: 'pc console', media_type: 'game' },
      ]
    }
  })

  const topRated = games?.slice(0, 15) || []
  const pcGames = games?.filter(g => g.category.includes('pc')) || []
  const consoleGames = games?.filter(g => g.category.includes('console') || g.category.includes('ps') || g.category.includes('xbox')) || []
  const mobileGames = games?.filter(g => g.category.includes('mobile') || g.category.includes('android') || g.category.includes('ios')) || []
  
  // Hero items - take top 5 rated
  const heroItems = topRated.slice(0, 5)

  return (
    <div className="min-h-screen text-white pb-24 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الألعاب - سينما أونلاين' : 'Gaming - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10 px-4 md:px-0">
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
