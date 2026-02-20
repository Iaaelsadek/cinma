import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQuranPlayer } from '../../context/QuranPlayerContext'
import { Link } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { errorLogger } from '../../services/errorLogging'
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
      
      if (error) {
        errorLogger.logError({
          message: 'Error fetching Quran reciters',
          severity: 'medium',
          category: 'database',
          context: { error }
        })
        return []
      }
        
      const dbItems = (data || []).map((item: any) => ({
        ...item,
        media_type: 'quran',
        title: item.name,
        poster_path: item.image,
        backdrop_path: item.image, // Ideally we'd have a nice background, but this works
        vote_average: 10,
        overview: item.rewaya
      })) as QuranRow[]

      if (dbItems.length > 0) return dbItems

      // Mock Data if DB is empty
      return [
        { id: 1, name: 'مشاري راشد العفاسي', title: 'مشاري راشد العفاسي', poster_path: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg', vote_average: 10, media_type: 'quran', overview: 'حفص عن عاصم', rewaya: 'حفص عن عاصم' },
        { id: 2, name: 'ماهر المعيقلي', title: 'ماهر المعيقلي', poster_path: 'https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg', vote_average: 10, media_type: 'quran', overview: 'حفص عن عاصم', rewaya: 'حفص عن عاصم' },
        { id: 3, name: 'عبدالرحمن السديس', title: 'عبدالرحمن السديس', poster_path: 'https://static.surahquran.com/images/reciters/1.jpg', vote_average: 10, media_type: 'quran', overview: 'حفص عن عاصم', rewaya: 'حفص عن عاصم' },
        { id: 4, name: 'ياسر الدوسري', title: 'ياسر الدوسري', poster_path: 'https://static.surahquran.com/images/reciters/2.jpg', vote_average: 10, media_type: 'quran', overview: 'حفص عن عاصم', rewaya: 'حفص عن عاصم' },
        { id: 5, name: 'سعد الغامدي', title: 'سعد الغامدي', poster_path: 'https://static.surahquran.com/images/reciters/4.jpg', vote_average: 10, media_type: 'quran', overview: 'حفص عن عاصم', rewaya: 'حفص عن عاصم' },
      ]
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
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'القرآن الكريم - سينما أونلاين' : 'Quran - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
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