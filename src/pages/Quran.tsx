import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useLang } from '../state/useLang'
import { supabase } from '../lib/supabase'
import { Helmet } from 'react-helmet-async'
import { Search, BookOpen, User } from 'lucide-react'
import { SkeletonGrid } from '../components/common/Skeletons'

type QuranRow = {
  id: number
  name: string | null
  image: string | null
  rewaya: string | null
  server: string | null
  category: string | null
}

export const QuranPage = () => {
  const { lang } = useLang()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: reciters, isPending } = useQuery({
    queryKey: ['quran-reciters-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('*')
        .eq('is_active', true)
        
      if (error) throw error
      
      const famousNames = [
        'مشاري راشد العفاسي',
        'عبدالرحمن السديس',
        'ماهر المعيقلي',
        'سعود الشريم',
        'أحمد بن علي العجمي',
        'سعد الغامدي',
        'ياسر الدوسري',
        'فارس عباد',
        'ناصر القطامي',
        'عبدالباسط عبدالصمد',
        'محمد صديق المنشاوي',
        'محمود خليل الحصري',
        'أبو بكر الشاطري',
        'هاني الرفاعي',
        'خالد الجليل',
        'علي جابر',
        'محمد أيوب',
        'عبدالله بصفر',
        'صلاح بو خاطر',
        'أحمد العجمي'
      ]

      const sortedData = (data as QuranRow[]).sort((a, b) => {
        const aIndex = famousNames.findIndex(name => a.name?.includes(name))
        const bIndex = famousNames.findIndex(name => b.name?.includes(name))
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        
        return (a.name || '').localeCompare(b.name || '')
      })

      return sortedData
    }
  })

  const categories = useMemo(() => {
    if (!reciters) return []
    const cats = new Set(reciters.map(r => r.rewaya || r.category).filter(Boolean))
    return Array.from(cats)
  }, [reciters])

  const filteredReciters = useMemo(() => {
    if (!reciters) return []
    let result = reciters
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r => 
        (r.name?.toLowerCase().includes(q)) || 
        (r.rewaya?.toLowerCase().includes(q))
      )
    }
    if (selectedCategory) {
      result = result.filter(r => (r.rewaya === selectedCategory) || (r.category === selectedCategory))
    }
    return result
  }, [reciters, search, selectedCategory])

  const buildUrl = (server: string | null) => {
    if (!server) return null
    const safe = server.endsWith('/') ? server : `${server}/`
    return `${safe}001.mp3` // Default to Al-Fatiha for demo, ideally we list surahs
  }

  const handlePlay = (reciter: QuranRow) => {
    const url = buildUrl(reciter.server)
    if (!url) return

    if (currentTrack?.id === reciter.id) {
      toggle()
    } else {
      playTrack({
        id: reciter.id,
        title: lang === 'ar' ? 'سورة الفاتحة' : 'Al-Fatiha',
        reciter: reciter.name || (lang === 'ar' ? 'قارئ' : 'Reciter'),
        url,
        image: reciter.image
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'القرآن الكريم | Cinema Online' : 'Noble Quran | Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[400px] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <BookOpen className="mb-6 h-16 w-16 text-primary opacity-80" />
          <h1 className="mb-4 text-4xl md:text-6xl font-black text-white drop-shadow-2xl">
            {lang === 'ar' ? 'القرآن الكريم' : 'The Noble Quran'}
          </h1>
          <p className="max-w-2xl text-lg text-zinc-300 md:text-xl">
            {lang === 'ar' 
              ? 'استمع إلى تلاوات خاشعة بأصوات أشهر القراء في العالم الإسلامي بجودة عالية.'
              : 'Listen to humble recitations by the most famous reciters in the Islamic world in high quality.'}
          </p>
          
          {/* Search Bar */}
          <div className="mt-8 w-full max-w-xl relative">
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن قارئ أو رواية...' : 'Search for a reciter or rewaya...'}
              className="w-full rounded-full border border-white/10 bg-white/10 py-4 pr-12 pl-6 text-white placeholder-zinc-400 backdrop-blur-md transition focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      </div>

      {/* Categories / Rewayat */}
      <div className="sticky top-16 z-30 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
              !selectedCategory 
                ? 'border-primary bg-primary/20 text-primary' 
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'All'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedCategory === cat
                  ? 'border-primary bg-primary/20 text-primary' 
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reciters Grid */}
      <div className="mx-auto max-w-[1920px] px-4 md:px-8 py-12">
        {isPending ? (
          <SkeletonGrid count={24} variant="video" />
        ) : filteredReciters.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {filteredReciters.map((reciter) => {
              return (
                <Link
                  key={reciter.id} 
                  to={`/quran/reciter/${reciter.id}`}
                  className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-primary/20 text-center"
                >
                  {/* Image / Avatar */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40 shadow-lg">
                    {reciter.image ? (
                      <img src={reciter.image} alt={reciter.name || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-lg font-bold text-zinc-500">
                        {(reciter.name || '?').charAt(0)}
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 w-full">
                    <h3 className="truncate text-sm font-bold text-white group-hover:text-primary transition-colors">
                      {reciter.name}
                    </h3>
                    <p className="truncate text-[10px] text-zinc-400 mt-0.5">
                      {reciter.rewaya || reciter.category || (lang === 'ar' ? 'قارئ' : 'Reciter')}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-white/5 p-6">
              <Search className="h-10 w-10 text-zinc-500" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {lang === 'ar' ? 'لم يتم العثور على نتائج' : 'No reciters found'}
            </h3>
            <p className="mt-2 text-zinc-400">
              {lang === 'ar' ? 'جرب البحث باسم قارئ آخر أو تغيير التصنيف.' : 'Try searching for another reciter or changing the category.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
