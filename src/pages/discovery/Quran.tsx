import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQuranPlayer } from '../../context/QuranPlayerContext'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { errorLogger } from '../../services/errorLogging'
import { Helmet } from 'react-helmet-async'
import { Search, Play, Pause, Volume2, User, Heart, Radio, BookOpen, Star, Filter, Grid, List, Download } from 'lucide-react'
import { SURAHS, NATURE_IMAGES } from '../../data/quran'
import { motion, AnimatePresence } from 'framer-motion'

type QuranReciter = {
  id: number
  name: string
  image: string | null
  rewaya: string | null
  server: string | null
  is_active?: boolean
  surah_list?: string | null
  featured?: boolean
  category?: string
}

const FEATURED_RECITERS = [
  "مشاري العفاسي",
  "Mishary Rashid Alafasy",
  "عبدالباسط عبدالصمد",
  "Abdul Basit",
  "عبدالرحمن السديس",
  "Abdul Rahman Al-Sudais",
  "ماهر المعيقلي",
  "Maher Al Muaiqly",
  "سعود الشريم",
  "Saud Al-Shuraim",
  "محمد صديق المنشاوي",
  "Muhammad Siddiq Al-Minshawi",
  "محمود خليل الحصري",
  "Mahmoud Khalil Al-Hussary",
  "أحمد العجمي",
  "Ahmed Al-Ajmi",
  "ياسر الدوسري",
  "Yasser Al-Dosari",
  "ناصر القطامي",
  "Nasser Al Qatami",
  "فارس عباد",
  "Fares Abbad",
  "إدريس أبكر",
  "Idris Abkar"
];

const RECITER_OVERRIDES: Record<string, string> = {
  "مشاري العفاسي": "https://server8.mp3quran.net/afs",
  "Mishary Rashid Alafasy": "https://server8.mp3quran.net/afs",
  "عبدالباسط عبدالصمد": "https://server7.mp3quran.net/basit",
  "Abdul Basit": "https://server7.mp3quran.net/basit",
  "محمد صديق المنشاوي": "https://server10.mp3quran.net/minsh",
  "Muhammad Siddiq Al-Minshawi": "https://server10.mp3quran.net/minsh",
  "ماهر المعيقلي": "https://server12.mp3quran.net/maher",
  "Maher Al Muaiqly": "https://server12.mp3quran.net/maher",
  "سعود الشريم": "https://server7.mp3quran.net/shur",
  "Saud Al-Shuraim": "https://server7.mp3quran.net/shur",
  "عبدالرحمن السديس": "https://server11.mp3quran.net/sds",
  "Abdul Rahman Al-Sudais": "https://server11.mp3quran.net/sds",
  "أحمد العجمي": "https://server10.mp3quran.net/ajm",
  "Ahmed Al-Ajmi": "https://server10.mp3quran.net/ajm",
  "ياسر الدوسري": "https://server11.mp3quran.net/yasser",
  "Yasser Al-Dosari": "https://server11.mp3quran.net/yasser",
  "ناصر القطامي": "https://server6.mp3quran.net/qtm",
  "Nasser Al Qatami": "https://server6.mp3quran.net/qtm",
  "فارس عباد": "https://server8.mp3quran.net/frs_a",
  "Fares Abbad": "https://server8.mp3quran.net/frs_a",
  "إدريس أبكر": "https://server6.mp3quran.net/abkr",
  "Idris Abkar": "https://server6.mp3quran.net/abkr",
  "محمود خليل الحصري": "https://server13.mp3quran.net/husr",
  "Mahmoud Khalil Al-Hussary": "https://server13.mp3quran.net/husr",
  "محمد محمود الطبلاوي": "https://server12.mp3quran.net/tblawi",
  "Mohamed Mahmoud Al-Tablawi": "https://server12.mp3quran.net/tblawi",
  "مصطفى إسماعيل": "https://server8.mp3quran.net/mustafa",
  "Mustafa Ismail": "https://server8.mp3quran.net/mustafa"
}

const ReciterImage = ({ src, alt, className, id }: { src: string | null, alt: string, className?: string, id: number }) => {
  const [error, setError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)
  
  // Deterministic fallback based on ID or Name
  const safeId = typeof id === 'number' ? id : 0
  const fallbackIndex = safeId % NATURE_IMAGES.length
  const fallbackSrc = NATURE_IMAGES[fallbackIndex] || NATURE_IMAGES[0]
  
  // If primary source fails or is missing, try fallback
  // If fallback also fails, show gradient
  if (fallbackError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-emerald-900 to-teal-900 ${className}`}>
        <User className="text-emerald-500/50 w-1/2 h-1/2" />
      </div>
    )
  }

  const finalSrc = (error || !src) ? fallbackSrc : src

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className}
      onError={() => {
        if (!error && src) {
          setError(true)
        } else {
          setFallbackError(true)
        }
      }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}

export const QuranPage = () => {
  const { lang } = useLang()
  const { playTrack, currentTrack, isPlaying, toggle } = useQuranPlayer()
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [surahSearch, setSurahSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'meccan' | 'medinan'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)

  const { data: reciters, isLoading } = useQuery({
    queryKey: ['quran-reciters-list'],
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
      
      const list = data as QuranReciter[]
      
      // Sort: Featured first, then Alphabetical
      return list.sort((a, b) => {
        // Find index in FEATURED_RECITERS (use -1 if not found)
        const aIndex = FEATURED_RECITERS.findIndex(f => a.name.includes(f))
        const bIndex = FEATURED_RECITERS.findIndex(f => b.name.includes(f))
        
        // Both are featured -> sort by order in FEATURED_RECITERS
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        
        // Only A is featured -> A comes first
        if (aIndex !== -1) return -1
        
        // Only B is featured -> B comes first
        if (bIndex !== -1) return 1
        
        // Neither is featured -> Alphabetical
        return a.name.localeCompare(b.name, 'ar')
      })
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  })

  const filteredReciters = useMemo(() => {
    if (!reciters) return []
    let filtered = reciters
    
    if (showFeaturedOnly) {
      filtered = filtered.filter(r => r.featured)
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(q) || 
        (r.rewaya && r.rewaya.toLowerCase().includes(q))
      )
    }
    
    return filtered
  }, [reciters, searchQuery, showFeaturedOnly])

  const filteredSurahs = useMemo(() => {
    let filtered = SURAHS
    
    if (filterType !== 'all') {
      filtered = filtered.filter(s => 
        filterType === 'meccan' ? s.type === 'Meccan' : s.type === 'Medinan'
      )
    }
    
    if (surahSearch) {
      const q = surahSearch.toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.englishName.toLowerCase().includes(q) ||
        s.id.toString().includes(q)
      )
    }
    
    if (selectedReciter?.surah_list) {
      const available = selectedReciter.surah_list.split(',').map(s => parseInt(s.trim()))
      filtered = filtered.filter(s => available.includes(s.id))
    }
    
    return filtered
  }, [filterType, surahSearch, selectedReciter])

  // Auto-select first featured reciter on load
  useEffect(() => {
    if (reciters && reciters.length > 0 && !selectedReciter) {
      const featured = reciters.find(r => r.featured)
      if (featured) {
        setSelectedReciter(featured)
      }
    }
  }, [reciters, selectedReciter])

  const handlePlaySurah = (surahId: number, surahName: string) => {
    if (!selectedReciter) return

    // Get reliable server URL (use override if available)
    let serverUrl = RECITER_OVERRIDES[selectedReciter.name] || selectedReciter.server?.trim() || ''

    // Clean server URL (remove trailing slash if present) and ensure HTTPS
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1)
    }
    if (serverUrl.startsWith('http:')) {
      serverUrl = serverUrl.replace('http:', 'https:')
    }
    
    if (!serverUrl) {
      console.error("No server URL found for reciter:", selectedReciter.name)
      return
    }

    // Pad ID with zeros (001, 002, ..., 114)
    const paddedId = surahId.toString().padStart(3, '0')
    const url = `${serverUrl}/${paddedId}.mp3`

    // Ensure image is HTTPS
    let imageUrl = selectedReciter.image
    if (imageUrl && imageUrl.startsWith('http:')) {
      imageUrl = imageUrl.replace('http:', 'https:')
    }

    playTrack({
      id: `${selectedReciter.id}-${surahId}`,
      title: surahName,
      reciter: selectedReciter.name,
      url,
      image: imageUrl
    })
  }

  const isCurrentTrack = (reciterId: number, surahId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `${reciterId}-${surahId}`
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30 pb-32">
      <Helmet>
        <title>{lang === 'ar' ? 'القرآن الكريم | سينما أونلاين' : 'Quran | Cinema Online'}</title>
      </Helmet>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-teal-900/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow delay-2000" />
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col h-[calc(100vh-100px)]">
        
        {/* Header Section - Spiritual & Compact */}
        <div className="flex flex-col items-center justify-center mb-6 shrink-0 relative">
          {/* Page Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold font-amiri text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mb-2 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              {lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base">
              {lang === 'ar' ? 'استمع إلى القرآن الكريم بأصوات نخبة من القراء' : 'Listen to the Holy Quran by elite reciters'}
            </p>
          </div>
          
          <button 
            onClick={() => window.open('/quran/radio', 'QuranRadio', 'width=320,height=450,menubar=no,toolbar=no,location=no,status=no')}
            className="group relative flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 text-emerald-300 hover:text-white hover:border-emerald-400 hover:bg-emerald-800/40 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 animate-pulse-slow group-hover:animate-none" />
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/30 group-hover:border-emerald-400 transition-colors">
              <Radio size={24} className="animate-pulse group-hover:animate-none" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xl md:text-2xl font-bold font-amiri leading-none mb-1">
                {lang === 'ar' ? 'إذاعة القرآن الكريم' : 'Quran Radio'}
              </span>
              <span className="text-xs md:text-sm text-emerald-400/70 font-normal">
                {lang === 'ar' ? 'بث مباشر 24 ساعة' : 'Live 24/7 Broadcast'}
              </span>
            </div>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Sidebar: Reciters List */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden h-full shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                <User size={18} />
                {lang === 'ar' ? 'القراء' : 'Reciters'}
                <span className="text-xs text-zinc-500">({filteredReciters.length})</span>
              </h2>
              <button
                onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showFeaturedOnly ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-emerald-500/30'}`}
              >
                <Star size={12} className={showFeaturedOnly ? 'fill-emerald-400' : ''} />
                {lang === 'ar' ? 'مميز' : 'Featured'}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث عن قارئ...' : 'Search reciter...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : filteredReciters.length > 0 ? (
              filteredReciters.map((reciter) => (
                <button
                  key={reciter.id}
                  onClick={() => setSelectedReciter(reciter)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group ${
                    selectedReciter?.id === reciter.id 
                      ? 'bg-emerald-900/20 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 ${
                    selectedReciter?.id === reciter.id ? 'border-emerald-500' : 'border-zinc-700 group-hover:border-zinc-500'
                  }`}>
                    <ReciterImage 
                      src={reciter.image} 
                      alt={reciter.name} 
                      className="w-full h-full object-cover"
                      id={reciter.id}
                    />
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <h3 className={`font-bold truncate text-sm ${selectedReciter?.id === reciter.id ? 'text-emerald-400' : 'text-zinc-300 group-hover:text-white'}`}>
                      {reciter.name}
                    </h3>
                    {reciter.rewaya && (
                      <p className="text-[10px] text-zinc-500 truncate">{reciter.rewaya}</p>
                    )}
                  </div>
                  {reciter.featured && (
                    <Heart size={12} className="text-emerald-500 fill-emerald-500/20 shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {lang === 'ar' ? 'لا يوجد قراء' : 'No reciters found'}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Surahs Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {selectedReciter ? (
            <div className="flex flex-col h-full">
              {/* Reciter Header (Compact) */}
              <div className="relative shrink-0 mb-4 rounded-2xl overflow-hidden bg-zinc-900/50 border border-white/5 shadow-2xl h-[20vh] min-h-[160px] group">
                {/* Background Image with Blur */}
                <div className="absolute inset-0 z-0">
                  <ReciterImage 
                    src={selectedReciter.image} 
                    alt={selectedReciter.name} 
                    className="w-full h-full object-cover opacity-40 blur-sm scale-110 group-hover:scale-100 transition-transform duration-700"
                    id={selectedReciter.id}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/80 to-transparent" />
                </div>

                <div className="relative z-10 h-full flex items-end p-6">
                  <div className="flex items-end gap-5 w-full">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shrink-0 bg-zinc-800">
                      <ReciterImage 
                        src={selectedReciter.image} 
                        alt={selectedReciter.name} 
                        className="w-full h-full object-cover"
                        id={selectedReciter.id}
                      />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                          {selectedReciter.rewaya || 'Reciter'}
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 drop-shadow-lg leading-tight">
                        {selectedReciter.name}
                      </h1>
                      <p className="text-zinc-400 text-xs md:text-sm line-clamp-1">
                        {lang === 'ar' 
                          ? 'استمع إلى التلاوة الكاملة بجودة عالية' 
                          : 'Listen to full recitation in high quality'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="shrink-0 mb-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'بحث في السور...' : 'Search surahs...'}
                      value={surahSearch}
                      onChange={(e) => setSurahSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setFilterType('meccan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'meccan' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {lang === 'ar' ? 'مكية' : 'Meccan'}
                    </button>
                    <button
                      onClick={() => setFilterType('medinan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'medinan' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {lang === 'ar' ? 'مدنية' : 'Medinan'}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                      title="Grid View"
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                      title="List View"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{filteredSurahs.length} {lang === 'ar' ? 'سورة' : 'Surahs'}</span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} />
                    114 {lang === 'ar' ? 'سورة في القرآن الكريم' : 'Surahs in the Quran'}
                  </span>
                </div>
              </div>

              {/* Surahs Grid/List (Scrollable) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-2'}>
                  {filteredSurahs.map((surah) => {
                    const active = isCurrentTrack(selectedReciter.id, surah.id)
                    return (
                      <button
                        key={surah.id}
                        onClick={() => handlePlaySurah(surah.id, surah.name)}
                        className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group overflow-hidden ${
                          active 
                            ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                            : 'bg-[#0a0a0a] border-white/5 hover:border-emerald-500/30 hover:bg-[#0f0f0f]'
                        }`}
                      >
                        {/* Number Badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border transition-colors shrink-0 ${
                          active 
                            ? 'bg-emerald-500 text-black border-emerald-400' 
                            : 'bg-white/5 text-zinc-500 border-white/5 group-hover:text-emerald-400 group-hover:border-emerald-500/30'
                        }`}>
                          {surah.id}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-right min-w-0">
                          <h4 className={`text-base font-bold font-amiri truncate ${active ? 'text-emerald-400' : 'text-zinc-200 group-hover:text-white'}`}>
                            سورة {surah.name}
                          </h4>
                          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors block truncate">
                            {surah.englishName} • {surah.ayahs} {lang === 'ar' ? 'آية' : 'Verses'}
                          </span>
                        </div>

                        {/* Play Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                           active ? 'bg-emerald-500 text-black scale-100' : 'bg-white/5 text-zinc-500 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
                        }`}>
                          {active && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
              <div className="w-20 h-20 rounded-full bg-emerald-900/10 flex items-center justify-center mb-4 animate-pulse">
                <Volume2 size={40} className="text-emerald-500/50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {lang === 'ar' ? 'اختر قارئاً للبدء' : 'Select a Reciter to Start'}
              </h3>
              <p className="max-w-md mx-auto text-sm">
                {lang === 'ar' 
                  ? 'استمع إلى القرآن الكريم بأصوات نخبة من القراء. اختر قارئاً من القائمة الجانبية لعرض السور.' 
                  : 'Listen to the Holy Quran recited by elite reciters. Select a reciter from the sidebar to view Surahs.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}
