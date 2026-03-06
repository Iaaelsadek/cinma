import { useCategoryVideos } from '../../hooks/useFetchContent'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { Moon, BookOpen, History, ListVideo } from 'lucide-react'
import { PageLoader } from '../../components/common/PageLoader'

export const RamadanPage = () => {
  const { lang } = useLang()

  // Fetch Islamic Content from Supabase
  const quran = useCategoryVideos('quran', { limit: 20 })
  const prophets = useCategoryVideos('prophets', { limit: 20 })
  const fatwa = useCategoryVideos('fatwa', { limit: 20 })

  const isLoading = quran.isLoading || prophets.isLoading || fatwa.isLoading

  if (isLoading) return <PageLoader />

  // Hero items: Mix of content
  const heroItems = [
    ...(quran.data || []),
    ...(prophets.data || [])
  ].slice(0, 10)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'اسلاميات - سينما أونلاين' : 'Islamics - Cinema Online'}</title>
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
                  {lang === 'ar' ? 'واحة الإيمان' : 'Faith Oasis'}
                </h1>
                <p className="text-amber-200/60 text-sm mt-1 font-medium">
                  {lang === 'ar' ? 'القرآن الكريم، قصص الأنبياء، وفتاوى العلماء' : 'Quran, Prophets Stories, and Fatwas'}
                </p>
             </div>
      </div>

      <div className="space-y-8 relative z-10">
        <QuantumTrain 
          items={quran.data || []} 
          title={lang === 'ar' ? 'القرآن الكريم' : 'The Holy Quran'} 
          link="/search?category=quran"
          icon={<BookOpen size={24} className="text-amber-400" />}
          color="gold"
          type="video"
        />

        <QuantumTrain 
          items={prophets.data || []} 
          title={lang === 'ar' ? 'قصص الأنبياء' : 'Stories of Prophets'} 
          link="/search?category=prophets"
          icon={<History size={24} className="text-amber-400" />}
          color="gold"
          type="video"
        />

        <QuantumTrain 
          items={fatwa.data || []} 
          title={lang === 'ar' ? 'فتاوى وأحكام' : 'Fatwas & Rulings'} 
          link="/search?category=fatwa"
          icon={<ListVideo size={24} className="text-amber-400" />}
          color="gold"
          type="video"
        />
      </div>
    </div>
  )
}
