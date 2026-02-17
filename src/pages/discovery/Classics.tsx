import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { useCategoryVideos } from '../../hooks/useFetchContent'

const fetchClassics = async (yearLimit: number, sort: string = 'popularity.desc') => {
  const { data } = await tmdb.get('/discover/movie', {
    params: {
      'primary_release_date.lte': `${yearLimit}-12-31`,
      sort_by: sort,
      'vote_count.gte': 100
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchByGenre = async (genreId: number) => {
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_genres: genreId,
        'primary_release_date.lte': '1990-12-31',
        sort_by: 'popularity.desc'
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }

export const ClassicsPage = () => {
  const { lang } = useLang()

  // YouTube/Archive Content
  const { data: ytClassics } = useCategoryVideos('classic', { limit: 20 })
  const ytClassicsMapped = (ytClassics || []).map(item => ({
    id: item.id,
    title: item.title,
    overview: item.description,
    backdrop_path: item.thumbnail,
    poster_path: item.thumbnail,
    release_date: item.created_at,
    vote_average: 9.0,
    media_type: 'video'
  }))

  const goldenAge = useQuery({ queryKey: ['classics-golden'], queryFn: () => fetchClassics(1970) })
  const eighties = useQuery({ queryKey: ['classics-80s'], queryFn: () => fetchClassics(1989) })
  const nineties = useQuery({ queryKey: ['classics-90s'], queryFn: () => fetchClassics(1999) })
  
  const classicAction = useQuery({ queryKey: ['classics-action'], queryFn: () => fetchByGenre(28) })
  const classicRomance = useQuery({ queryKey: ['classics-romance'], queryFn: () => fetchByGenre(10749) })

  const heroItems = ytClassicsMapped.length > 0 ? ytClassicsMapped.slice(0, 10) : (goldenAge.data?.slice(0, 10) || [])

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'كلاسيكيات - سينما أونلاين' : 'Classics - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        {ytClassicsMapped.length > 0 && (
          <QuantumTrain 
            items={ytClassicsMapped} 
            title={lang === 'ar' ? 'أفلام كلاسيكية (يوتيوب)' : 'Classic Movies (YouTube)'} 
            type="video"
          />
        )}

        <QuantumTrain 
          items={goldenAge.data || []} 
          title={lang === 'ar' ? 'العصر الذهبي (قبل 1970)' : 'Golden Age (Pre-1970)'} 
          link="/search?types=movie&yto=1970"
        />
        
        <QuantumTrain 
          items={eighties.data || []} 
          title={lang === 'ar' ? 'كلاسيكيات الثمانينات' : '80s Classics'} 
          link="/search?types=movie&yfrom=1980&yto=1989"
        />

        <QuantumTrain 
          items={nineties.data || []} 
          title={lang === 'ar' ? 'نوستالجيا التسعينات' : '90s Nostalgia'} 
          link="/search?types=movie&yfrom=1990&yto=1999"
        />

        <QuantumTrain 
          items={classicAction.data || []} 
          title={lang === 'ar' ? 'أكشن كلاسيكي' : 'Classic Action'} 
          link="/search?types=movie&genres=28&yto=1990"
        />

        <QuantumTrain 
          items={classicRomance.data || []} 
          title={lang === 'ar' ? 'رومانسية الزمن الجميل' : 'Classic Romance'} 
          link="/search?types=movie&genres=10749&yto=1990"
        />
      </div>
    </div>
  )
}
