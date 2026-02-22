import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { Moon } from 'lucide-react'
import { PageLoader } from '../../components/common/PageLoader'

// Fetch Arabic TV shows for a specific year (simulating Ramadan content)
const fetchRamadanSeries = async (year: number) => {
  // Ramadan roughly shifts back 11 days each year.
  // 2026: Feb-Mar
  // 2025: Feb-Mar
  // 2024: Mar-Apr
  // 2023: Mar-Apr
  // We'll just fetch popular Arabic shows from that year to be safe and inclusive.
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'ar',
      first_air_date_year: year,
      sort_by: 'popularity.desc',
      'vote_count.gte': 0 // Include everything to reach "20000" potential
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

// Fetch highly rated Arabic shows (Classics)
const fetchClassicRamadan = async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: {
        with_original_language: 'ar',
        'first_air_date.lte': '2015-12-31',
        sort_by: 'vote_average.desc',
        'vote_count.gte': 20
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

// Fetch trending Arabic shows (Current "Ramadan" vibe)
const fetchTrendingRamadan = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'ar',
      sort_by: 'popularity.desc'
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

export const RamadanPage = () => {
  const { lang } = useLang()

  // Pre-fetch multiple years to simulate a large library
  const ramadan2026 = useQuery({ queryKey: ['ramadan-2026'], queryFn: () => fetchRamadanSeries(2026) })
  const ramadan2025 = useQuery({ queryKey: ['ramadan-2025'], queryFn: () => fetchRamadanSeries(2025) })
  const ramadan2024 = useQuery({ queryKey: ['ramadan-2024'], queryFn: () => fetchRamadanSeries(2024) })
  const ramadan2023 = useQuery({ queryKey: ['ramadan-2023'], queryFn: () => fetchRamadanSeries(2023) })
  const classics = useQuery({ queryKey: ['ramadan-classics'], queryFn: fetchClassicRamadan })
  const trending = useQuery({ queryKey: ['ramadan-trending'], queryFn: fetchTrendingRamadan })

  const isLoading = ramadan2025.isLoading || ramadan2024.isLoading || classics.isLoading

  if (isLoading) return <PageLoader />

  // Hero items: Mix of trending and latest
  const heroItems = [
      ...(ramadan2025.data || []),
      ...(ramadan2024.data || []),
      ...(trending.data || [])
  ].slice(0, 15)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'رمضانيات - سينما أونلاين' : 'Ramadan - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-3 border-b border-amber-500/20 pb-2">
             <div className="p-1.5 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Moon size={28} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
             </div>
             <div>
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                  {lang === 'ar' ? 'الخيمة الرمضانية' : 'Ramadan Tent'}
                </h1>
                <p className="text-amber-200/60 text-sm mt-1">
                  {lang === 'ar' ? 'أقوى المسلسلات والبرامج الرمضانية في مكان واحد' : 'The best Ramadan series and shows in one place'}
                </p>
             </div>
        </div>

        <QuantumTrain 
          items={ramadan2025.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2025' : 'Ramadan 2025 Series'} 
          link="/search?types=tv&year=2025&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2024.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2024' : 'Ramadan 2024 Series'} 
          link="/search?types=tv&year=2024&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2023.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2023' : 'Ramadan 2023 Series'} 
          link="/search?types=tv&year=2023&lang=ar"
        />
        
        <QuantumTrain 
          items={ramadan2026.data || []} 
          title={lang === 'ar' ? 'مرتقب في رمضان 2026' : 'Coming in Ramadan 2026'} 
          link="/search?types=tv&year=2026&lang=ar"
        />

        <QuantumTrain 
          items={classics.data || []} 
          title={lang === 'ar' ? 'كلاسيكيات رمضان' : 'Ramadan Classics'} 
          link="/search?types=tv&lang=ar&sort=vote_average.desc"
        />

      </div>
    </div>
  )
}
