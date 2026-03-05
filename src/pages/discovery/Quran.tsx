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
import { advancedSearchMatch } from '../../lib/utils'

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
      filtered = filtered.filter(r => 
        advancedSearchMatch(r.name, searchQuery) || 
        (r.rewaya && advancedSearchMatch(r.rewaya, searchQuery))
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
      filtered = filtered.filter(s => 
        advancedSearchMatch(s.name, surahSearch) || 
        advancedSearchMatch(s.englishName, surahSearch) ||
        s.id.toString().includes(surahSearch)
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
        {/* Deep Islamic Background with Patterns */}
        <div className="absolute inset-0 bg-[#020d0a] opacity-60" />
        
        {/* Animated Islamic Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 15v15l-15 15-15-15V15z' fill='%2310b981' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
               backgroundSize: '80px 80px'
             }} 
        />

        {/* Spiritual Glows */}
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-teal-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-cyan-600/5 rounded-full blur-[150px] animate-pulse-slow delay-2000" />
        
        {/* Floating Particles/Stars for Spiritual Vibe */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400/20 rounded-full"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: Math.random() * 100 + '%',
                opacity: 0 
              }}
              animate={{ 
                y: [null, Math.random() * -100 + 'px'],
                opacity: [0, 0.5, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity,
                delay: Math.random() * 10
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-[2400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col h-[calc(100vh-100px)]">
        
        {/* Header Section - Spiritual & Compact */}
        <div className="flex flex-col items-center justify-center mb-10 shrink-0 relative">
          {/* Islamic Geometric Frame Decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="absolute top-1/2 left-0 w-12 h-12 -translate-y-1/2 opacity-20 hidden md:block" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z' fill='%2310b981'/%3E%3C/svg%3E")` }} />
          <div className="absolute top-1/2 right-0 w-12 h-12 -translate-y-1/2 opacity-20 hidden md:block" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z' fill='%2310b981'/%3E%3C/svg%3E")` }} />
          
          {/* Page Title with Islamic Styling */}
          <div className="text-center mb-8 relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold font-amiri text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-400 to-teal-600 mb-4 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] tracking-wide">
                {lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'}
              </h1>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-emerald-500/50" />
                <BookOpen className="text-emerald-500/70" size={24} />
                <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-emerald-500/50" />
              </div>
              <p className="text-emerald-200/60 text-base md:text-lg font-amiri max-w-2xl mx-auto italic">
                {lang === 'ar' ? '«الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»' : 'Verily, in the remembrance of Allah do hearts find rest'}
              </p>
            </motion.div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.open('/quran/radio', 'QuranRadio', 'width=320,height=450,menubar=no,toolbar=no,location=no,status=no')}
            className="group relative flex items-center gap-6 px-10 py-5 rounded-[2rem] bg-gradient-to-br from-emerald-900/60 to-teal-900/60 border border-emerald-500/40 text-emerald-100 transition-all duration-500 shadow-[0_0_25px_rgba(16,185,129,0.2)] overflow-hidden"
          >
            {/* Shimmering Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 group-hover:bg-emerald-500/30 group-hover:border-emerald-300 transition-all duration-300">
              <Radio size={28} className="animate-pulse text-emerald-400" />
            </div>
            <div className="flex flex-col items-start relative z-10">
              <span className="text-2xl md:text-3xl font-bold font-amiri leading-none mb-1 text-white group-hover:text-emerald-300 transition-colors">
                {lang === 'ar' ? 'إذاعة القرآن الكريم' : 'Quran Radio'}
              </span>
              <span className="text-xs md:text-sm text-emerald-400/80 font-normal flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {lang === 'ar' ? 'بث مباشر على مدار الساعة' : 'Live 24/7 Spiritual Broadcast'}
              </span>
            </div>
          </motion.button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Sidebar: Reciters List */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col bg-emerald-950/20 backdrop-blur-2xl border border-emerald-500/10 rounded-3xl overflow-hidden h-full shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="p-5 border-b border-emerald-500/10 bg-gradient-to-b from-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold font-amiri flex items-center gap-3 text-emerald-400">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <User size={18} />
                </div>
                {lang === 'ar' ? 'القراء' : 'Reciters'}
                <span className="text-xs text-emerald-600/60 font-sans">({filteredReciters.length})</span>
              </h2>
              <button
                onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${showFeaturedOnly ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'}`}
              >
                <Star size={12} className={showFeaturedOnly ? 'fill-black' : 'fill-none'} />
                {lang === 'ar' ? 'المفضلين' : 'Featured'}
              </button>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث عن قارئ...' : 'Search reciter...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-emerald-950/40 border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-emerald-800"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-emerald-500/50 gap-4">
                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : filteredReciters.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredReciters.map((reciter, idx) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={reciter.id}
                    onClick={() => setSelectedReciter(reciter)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                      selectedReciter?.id === reciter.id 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                        : 'hover:bg-emerald-500/5 border border-transparent'
                    }`}
                  >
                    {selectedReciter?.id === reciter.id && (
                      <motion.div 
                        layoutId="active-reciter"
                        className="absolute left-0 top-0 w-1 h-full bg-emerald-500"
                      />
                    )}
                    
                    <div className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all duration-500 shrink-0 ${
                      selectedReciter?.id === reciter.id ? 'border-emerald-500 rotate-3 scale-110 shadow-lg' : 'border-emerald-500/10 group-hover:border-emerald-500/30'
                    }`}>
                      <ReciterImage 
                        src={reciter.image} 
                        alt={reciter.name} 
                        className="w-full h-full object-cover"
                        id={reciter.id}
                      />
                      <div className="absolute inset-0 bg-emerald-900/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    
                    <div className="flex-1 text-left overflow-hidden">
                      <h3 className={`font-bold font-amiri truncate text-base ${selectedReciter?.id === reciter.id ? 'text-emerald-400' : 'text-emerald-100/70 group-hover:text-white'}`}>
                        {reciter.name}
                      </h3>
                      <p className={`text-[10px] font-sans truncate transition-colors ${selectedReciter?.id === reciter.id ? 'text-emerald-500/60' : 'text-emerald-900'}`}>
                        {reciter.rewaya || (lang === 'ar' ? 'رواية حفص عن عاصم' : 'Hafs an Asim')}
                      </p>
                    </div>
                    
                    {reciter.featured && (
                      <Heart size={14} className={`shrink-0 transition-colors ${selectedReciter?.id === reciter.id ? 'text-emerald-400 fill-emerald-400' : 'text-emerald-900 group-hover:text-emerald-500'}`} />
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-emerald-900 gap-3">
                <Search size={32} strokeWidth={1} />
                <span className="text-sm font-amiri">{lang === 'ar' ? 'لم يتم العثور على القارئ' : 'Reciter not found'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Surahs Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {selectedReciter ? (
            <div className="flex flex-col h-full">
              {/* Reciter Header (Spiritual) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative shrink-0 mb-6 rounded-3xl overflow-hidden bg-emerald-950/20 border border-emerald-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] h-[25vh] min-h-[180px] group"
              >
                {/* Background with Islamic Pattern & Blur */}
                <div className="absolute inset-0 z-0">
                  <ReciterImage 
                    src={selectedReciter.image} 
                    alt={selectedReciter.name} 
                    className="w-full h-full object-cover opacity-20 blur-md scale-110 group-hover:scale-100 transition-transform duration-1000"
                    id={selectedReciter.id}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent" />
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l10 10v10l-10 10-10-10V10z' fill='%2310b981' fill-opacity='0.2'/%3E%3C/svg%3E")` }} />
                </div>

                <div className="relative z-10 h-full flex items-end p-8">
                  <div className="flex items-center gap-8 w-full">
                    <motion.div 
                      whileHover={{ rotate: 5, scale: 1.05 }}
                      className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl shrink-0 bg-emerald-900/20 relative group-hover:border-emerald-500/60 transition-colors duration-500"
                    >
                      <ReciterImage 
                        src={selectedReciter.image} 
                        alt={selectedReciter.name} 
                        className="w-full h-full object-cover"
                        id={selectedReciter.id}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent" />
                    </motion.div>
                    
                    <div className="flex-1">
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 mb-2"
                      >
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 backdrop-blur-md">
                          {selectedReciter.rewaya || (lang === 'ar' ? 'رواية حفص عن عاصم' : 'Hafs an Asim')}
                        </span>
                        {selectedReciter.featured && (
                          <div className="flex items-center gap-1 text-yellow-500/80 text-[10px] font-bold">
                            <Star size={12} fill="currentColor" />
                            {lang === 'ar' ? 'قارئ معتمد' : 'Verified Reciter'}
                          </div>
                        )}
                      </motion.div>
                      
                      <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl font-amiri tracking-tight"
                      >
                        {selectedReciter.name}
                      </motion.h1>
                      
                      <motion.p 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-emerald-200/50 text-sm md:text-base font-amiri italic"
                      >
                        {lang === 'ar' 
                          ? 'تلاوة عطرة خاشعة بجودة صوتية فائقة' 
                          : 'Fragrant and humble recitation in superior audio quality'}
                      </motion.p>
                    </div>
                    
                    {/* Visualizer Decoration */}
                    <div className="hidden lg:flex items-end gap-1 h-12">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-emerald-500/30 rounded-full"
                          animate={{ height: [10, 40, 20, 35, 15] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Filters & Search (Modern & Glassy) */}
              <div className="shrink-0 mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[280px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 group-focus-within:text-emerald-400 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder={lang === 'ar' ? 'بحث عن سورة (اسم، رقم، إنجليزية)...' : 'Search Surah (Name, Number, English)...'}
                      value={surahSearch}
                      onChange={(e) => setSurahSearch(e.target.value)}
                      className="w-full bg-emerald-950/40 border border-emerald-500/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder:text-emerald-800 backdrop-blur-md"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/10 rounded-2xl p-1.5 backdrop-blur-md">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${filterType === 'all' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-500/60 hover:text-emerald-300'}`}
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setFilterType('meccan')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${filterType === 'meccan' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-500/60 hover:text-emerald-300'}`}
                    >
                      {lang === 'ar' ? 'مكية' : 'Meccan'}
                    </button>
                    <button
                      onClick={() => setFilterType('medinan')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${filterType === 'medinan' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-500/60 hover:text-emerald-300'}`}
                    >
                      {lang === 'ar' ? 'مدنية' : 'Medinan'}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/10 rounded-2xl p-1.5 backdrop-blur-md">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-500/60 hover:text-emerald-300'}`}
                      title="Grid View"
                    >
                      <Grid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-emerald-500 text-black shadow-lg' : 'text-emerald-500/60 hover:text-emerald-300'}`}
                      title="List View"
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-emerald-700/60 font-amiri px-1">
                  <span className="flex items-center gap-2">
                    <Filter size={12} />
                    {filteredSurahs.length} {lang === 'ar' ? 'سورة مباركة' : 'Blessed Surahs'}
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen size={12} />
                    {lang === 'ar' ? '١١٤ سورة في المصحف الشريف' : '114 Surahs in the Holy Quran'}
                  </span>
                </div>
              </div>

              {/* Surahs Grid/List (Spiritual & Animated) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                <motion.div 
                  layout
                  className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5' : 'space-y-3'}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredSurahs.map((surah, idx) => {
                      const active = isCurrentTrack(selectedReciter.id, surah.id)
                      return (
                        <motion.button
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.01 }}
                          key={surah.id}
                          onClick={() => handlePlaySurah(surah.id, surah.name)}
                          className={`relative flex items-center gap-4 p-4 rounded-3xl border transition-all duration-500 group overflow-hidden ${
                            active 
                              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)] scale-[1.02]' 
                              : 'bg-emerald-950/10 border-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Islamic Geometric Pattern Background for each card */}
                          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l5 15h15l-12 9 5 16-13-10-13 10 5-16-12-9h15z' fill='%2310b981'/%3E%3C/svg%3E")` }} />
                          
                          {/* Number Badge (Modern Islamic Style) */}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border-2 transition-all duration-500 shrink-0 relative ${
                            active 
                              ? 'bg-emerald-500 text-black border-emerald-400 rotate-[360deg]' 
                              : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 group-hover:rotate-12'
                          }`}>
                            <span className="relative z-10">{surah.id}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 text-right min-w-0 relative z-10">
                            <h4 className={`text-xl font-bold font-amiri truncate mb-0.5 ${active ? 'text-emerald-400' : 'text-emerald-50/90 group-hover:text-white'}`}>
                              سورة {surah.name}
                            </h4>
                            <div className="flex items-center justify-end gap-2">
                              <span className={`text-[10px] font-sans transition-colors ${active ? 'text-emerald-500/60' : 'text-emerald-900 group-hover:text-emerald-600'}`}>
                                {surah.englishName}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-emerald-900/40" />
                              <span className={`text-[10px] font-sans transition-colors ${active ? 'text-emerald-500/60' : 'text-emerald-900 group-hover:text-emerald-600'}`}>
                                {surah.ayahs} {lang === 'ar' ? 'آية' : 'Ayahs'}
                              </span>
                            </div>
                          </div>

                          {/* Play/Pause Animation */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 relative z-10 ${
                             active ? 'bg-emerald-500 text-black scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/10 text-emerald-500 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 group-hover:bg-emerald-500/20'
                          }`}>
                            {active && isPlaying ? (
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                                <Pause size={18} fill="currentColor" />
                              </motion.div>
                            ) : (
                              <Play size={18} fill="currentColor" className="ml-0.5" />
                            )}
                          </div>
                          
                          {/* Type Indicator (Meccan/Medinan) Dot */}
                          <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${surah.type === 'Meccan' ? 'bg-amber-500/40' : 'bg-emerald-500/40'}`} title={surah.type} />
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>
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
