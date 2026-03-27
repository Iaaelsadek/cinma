import { useState, useMemo, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLang } from '../../state/useLang'
import { SURAHS } from '../../data/quran'
import { advancedSearchMatch } from '../../lib/utils'
import { useReciters } from '../../hooks/useReciters'
import { useQuranAudio } from '../../hooks/useQuranAudio'
import {ReciterList} from '../../components/features/quran/ReciterList'
import { ReciterHeader } from '../../components/features/quran/ReciterHeader'
import { FilterBar } from '../../components/features/quran/FilterBar'
import { SurahGrid } from '../../components/features/quran/SurahGrid'
import { RadioCard } from '../../components/features/quran/RadioCard'

export const QuranPage = () => {
  const { lang } = useLang()
  const { playSurah, isCurrentTrack, isPlaying, currentTrack } = useQuranAudio()
  
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter | null>(null)
  const [surahSearch, setSurahSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'meccan' | 'medinan'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: reciters = [], isLoading } = useReciters()

  // Auto-select first featured reciter on load
  useEffect(() => {
    if (reciters.length > 0 && !selectedReciter) {
      const featured = reciters.find(r => r.featured)
      if (featured) {
        setSelectedReciter(featured)
      }
    }
  }, [reciters, selectedReciter])

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

  const handlePlaySurah = (id: number, name: string) => {
    if (selectedReciter) {
      playSurah(selectedReciter, id, name)
    }
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-amber-500/30 pb-32">
      <Helmet>
        <title>{lang === 'ar' ? 'القرآن الكريم | سينما أونلاين' : 'Quran | Cinema Online'}</title>
      </Helmet>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Deep Islamic Background with Patterns */}
        <div className="absolute inset-0 bg-[#0d0902] opacity-60" />
        
        {/* Animated Islamic Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 15v15l-15 15-15-15V15z' fill='%23f59e0b' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
               backgroundSize: '80px 80px'
             }} 
        />

        {/* Spiritual Glows */}
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-amber-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-yellow-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-orange-600/5 rounded-full blur-[150px] animate-pulse-slow delay-2000" />
        
        {/* Floating Particles/Stars for Spiritual Vibe */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-400/20 rounded-full"
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

        <div className="relative z-10 max-w-[2400px] mx-auto p-3 md:p-6 lg:p-8 flex flex-col min-h-screen">
        
        {/* Header Section - Spiritual & Compact */}
        <div className="flex flex-col items-center justify-center mb-2 md:mb-4 shrink-0 relative">
          {/* Islamic Geometric Frame Decoration */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
            style={{ top: '-2mm' }}
          />
          
          {/* Page Title with Islamic Styling */}
          <div className="text-center mb-2 md:mb-4 relative z-[100]" style={{ marginTop: '2mm' }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-xl md:text-3xl font-bold font-cairo text-amber-500 mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] tracking-wide relative z-[101]">
                {lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'}
              </h1>
              <div className="flex items-center justify-center gap-4 mb-2 md:mb-4 relative z-[101]">
                <div className="h-px w-8 md:w-24 bg-gradient-to-r from-transparent to-amber-500/50" />
                <BookOpen className="text-amber-500/70" size={20} />
                <div className="h-px w-8 md:w-24 bg-gradient-to-l from-transparent to-amber-500/50" />
              </div>
              <p className="text-amber-100/60 text-[10px] md:text-sm font-amiri max-w-2xl mx-auto italic leading-relaxed">
                {lang === 'ar' ? '«الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»' : 'Verily, in the remembrance of Allah do hearts find rest'}
              </p>
            </motion.div>
          </div>
          
          <RadioCard />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 lg:h-[calc(100vh-320px)] min-h-0">
          
          {/* Sidebar: Reciters List */}
          <ReciterList 
            reciters={reciters} 
            selectedReciter={selectedReciter} 
            onSelect={setSelectedReciter}
            isLoading={isLoading}
          />

          {/* Main Content: Surahs Grid */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {selectedReciter ? (
              <div className="flex flex-col h-full">
                {/* Reciter Header (Spiritual) */}
                <ReciterHeader reciter={selectedReciter} />

                {/* Filters & Search (Modern & Glassy) */}
                <FilterBar
                  surahSearch={surahSearch}
                  setSurahSearch={setSurahSearch}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  filteredCount={filteredSurahs.length}
                />

                {/* Surahs Grid/List (Spiritual & Animated) */}
                <SurahGrid
                  filteredSurahs={filteredSurahs}
                  selectedReciter={selectedReciter}
                  viewMode={viewMode}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  onPlaySurah={handlePlaySurah}
                />
              </div>
            ) : (
              // Empty State
              <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
                <div className="w-20 h-20 rounded-full bg-amber-900/10 flex items-center justify-center mb-4 animate-pulse">
                  <BookOpen size={40} className="text-amber-500/50" />
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
