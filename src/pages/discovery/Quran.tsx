import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQuranPlayer } from '../../context/QuranPlayerContext'
import { Link } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { Helmet } from 'react-helmet-async'
import { Search, BookOpen, User } from 'lucide-react'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'

type QuranRow = {
  id: number
  name: string | null
  image: string | null
  rewaya: string | null
  server: string | null
  category: string | null
  // Compatible with Quantum components
  media_type?: string
  title?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
}

export const QuranPage = () => {
  const { lang } = useLang()
  
  const { data: reciters } = useQuery({
    queryKey: ['quran-reciters-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('*')
        .eq('is_active', true)
        
      if (error) throw error
      
      return (data || []).map((item: any) => ({
        ...item,
        media_type: 'quran',
        title: item.name,
        poster_path: item.image,
        backdrop_path: item.image, // Ideally we'd have a nice background, but this works
        vote_average: 10,
        overview: item.rewaya
      })) as QuranRow[]
    }
  })

  // Grouping
  const famousNames = [
    'مشاري راشد العفاسي', 'عبدالرحمن السديس', 'ماهر المعيقلي', 
    'سعود الشريم', 'أحمد بن علي العجمي', 'سعد الغامدي', 'ياسر الدوسري'
  ]

  const famous = useMemo(() => 
    reciters?.filter(r => famousNames.some(n => r.name?.includes(n))) || [], 
  [reciters])

  const hafs = useMemo(() => 
    reciters?.filter(r => r.rewaya?.includes('حفص')) || [], 
  [reciters])

  const warsh = useMemo(() => 
    reciters?.filter(r => r.rewaya?.includes('ورش')) || [], 
  [reciters])

  const others = useMemo(() => 
    reciters?.filter(r => !r.rewaya?.includes('حفص') && !r.rewaya?.includes('ورش')) || [], 
  [reciters])

  // Hero items - pick 5 from famous or just random nice ones
  const heroItems = famous.length > 0 ? famous.slice(0, 5) : (reciters?.slice(0, 5) || [])

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'القرآن الكريم - سينما أونلاين' : 'Quran - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={famous} 
          title={lang === 'ar' ? 'أشهر القراء' : 'Famous Reciters'} 
          link="/search?types=quran&keywords=famous"
        />

        <QuantumTrain 
          items={hafs} 
          title={lang === 'ar' ? 'رواية حفص عن عاصم' : 'Rewaya Hafs'} 
          link="/search?types=quran&keywords=hafs"
        />

        <QuantumTrain 
          items={warsh} 
          title={lang === 'ar' ? 'رواية ورش عن نافع' : 'Rewaya Warsh'} 
          link="/search?types=quran&keywords=warsh"
        />

        <QuantumTrain 
          items={others} 
          title={lang === 'ar' ? 'روايات أخرى' : 'Other Rewayat'} 
          link="/search?types=quran&keywords=other"
        />
      </div>
    </div>
  )
}