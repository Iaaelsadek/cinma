import { useQuery } from '@tanstack/react-query'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { Moon } from 'lucide-react'
import { PageLoader } from '../../components/common/PageLoader'
import { getRamadanSeries } from '../../services/contentQueries'

export const RamadanPage = () => {
  const { lang } = useLang()

  // CRITICAL: Fetch Ramadan series from CockroachDB using contentQueries service
  const { data: ramadanResponse, isLoading, error } = useQuery({
    queryKey: ['ramadan-series'],
    queryFn: async () => {
      return await getRamadanSeries({ page: 1, limit: 100 })
    },
    staleTime: 1000 * 60 * 10 // 10 minutes
  })

  if (isLoading) return <PageLoader />

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {lang === 'ar' ? 'فشل في تحميل مسلسلات رمضان' : 'Failed to load Ramadan series'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  const ramadanSeries = ramadanResponse?.data || []

  // Split by year for better organization
  const currentYear = new Date().getFullYear()
  const recentSeries = ramadanSeries.filter(series => {
    const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 0
    return year >= currentYear - 2
  }).slice(0, 20)

  const classicSeries = ramadanSeries.filter(series => {
    const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : 0
    return year < currentYear - 2
  }).slice(0, 20)

  const heroItems = ramadanSeries.slice(0, 10)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'مسلسلات رمضان - فور سيما' : 'Ramadan Series - 4Cima'}</title>
      </Helmet>

      {/* Hero Section */}
      <section className="relative z-10 w-full mb-8">
          <QuantumHero items={heroItems} />
      </section>
      
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8 border-b border-amber-500/20 pb-6 px-2">
             <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Moon size={32} className="text-amber-400 fill-amber-400/20 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                  {lang === 'ar' ? 'مسلسلات رمضان' : 'Ramadan Series'}
                </h1>
                <p className="text-amber-200/60 text-sm mt-1 font-medium">
                  {lang === 'ar' ? 'أفضل المسلسلات العربية الرمضانية' : 'Best Arabic Ramadan Series'}
                </p>
             </div>
      </div>

      <div className="space-y-8 relative z-10">
        {ramadanSeries.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            {lang === 'ar' ? 'لا توجد مسلسلات رمضان متاحة' : 'No Ramadan series available'}
          </div>
        ) : (
          <>
            {recentSeries.length > 0 && (
              <QuantumTrain 
                items={recentSeries} 
                title={lang === 'ar' ? 'أحدث المسلسلات' : 'Latest Series'} 
                link="/search?types=tv&language=ar"
                icon={<Moon size={24} className="text-amber-400" />}
                color="gold"
              />
            )}

            <QuantumTrain 
              items={ramadanSeries.slice(0, 20)} 
              title={lang === 'ar' ? 'الأكثر شعبية' : 'Most Popular'} 
              link="/search?types=tv&language=ar"
              icon={<Moon size={24} className="text-amber-400" />}
              color="gold"
            />

            {classicSeries.length > 0 && (
              <QuantumTrain 
                items={classicSeries} 
                title={lang === 'ar' ? 'مسلسلات كلاسيكية' : 'Classic Series'} 
                link="/search?types=tv&language=ar"
                icon={<Moon size={24} className="text-amber-400" />}
                color="gold"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
