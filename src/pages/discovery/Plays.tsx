import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

const fetchPlays = async (query: string) => {
  const { data } = await tmdb.get('/search/movie', {
    params: {
      query,
      language: 'ar-EG',
      include_adult: false
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'movie', is_play: true }))
}

const fetchClassicPlays = async () => {
  // Using specific IDs or a better search query for classic plays if possible
  // For now, searching for "مسرحية" yields good results for Arabic plays
  return fetchPlays('مسرحية')
}

export const PlaysPage = () => {
  const { lang } = useLang()

  const adelImam = useQuery({ queryKey: ['plays-adel-imam'], queryFn: () => fetchPlays('مسرحية عادل امام') })
  const mohamedSobhy = useQuery({ queryKey: ['plays-mohamed-sobhy'], queryFn: () => fetchPlays('مسرحية محمد صبحي') })
  const samirGhanem = useQuery({ queryKey: ['plays-samir-ghanem'], queryFn: () => fetchPlays('مسرحية سمير غانم') })
  const classics = useQuery({ queryKey: ['plays-classics'], queryFn: () => fetchClassicPlays() })
  const gulf = useQuery({ queryKey: ['plays-gulf'], queryFn: () => fetchPlays('مسرحية طارق العلي') })

  const heroItems = classics.data?.slice(0, 10) || []

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'المسرحيات - سينما أونلاين' : 'Plays - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={classics.data || []} 
          title={lang === 'ar' ? 'مسرحيات كلاسيكية' : 'Classic Plays'} 
          link="/search?q=مسرحية"
        />
        
        <QuantumTrain 
          items={adelImam.data || []} 
          title={lang === 'ar' ? 'مسرحيات عادل إمام' : 'Adel Imam Plays'} 
          link="/search?q=مسرحية عادل امام"
        />

        <QuantumTrain 
          items={mohamedSobhy.data || []} 
          title={lang === 'ar' ? 'مسرحيات محمد صبحي' : 'Mohamed Sobhy Plays'} 
          link="/search?q=مسرحية محمد صبحي"
        />

        <QuantumTrain 
          items={samirGhanem.data || []} 
          title={lang === 'ar' ? 'مسرحيات سمير غانم' : 'Samir Ghanem Plays'} 
          link="/search?q=مسرحية سمير غانم"
        />

        <QuantumTrain 
          items={gulf.data || []} 
          title={lang === 'ar' ? 'مسرحيات خليجية' : 'Gulf Plays'} 
          link="/search?q=مسرحية طارق العلي"
        />
      </div>
    </div>
  )
}
