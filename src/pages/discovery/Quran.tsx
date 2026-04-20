import { useState, useMemo, useEffect } from 'react'
import { SeoHead } from '../../components/common/SeoHead'
import { BookOpen, Grid, List } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLang } from '../../state/useLang'
import { SURAHS } from '../../data/quran'
import { advancedSearchMatch } from '../../lib/utils'
import { useReciters } from '../../hooks/useReciters'
import { useQuranAudio } from '../../hooks/useQuranAudio'
import { useSermons } from '../../hooks/useSermons'
import { useStories } from '../../hooks/useStories'
import { useSermonAudio } from '../../hooks/useSermonAudio'
import { useStoryAudio } from '../../hooks/useStoryAudio'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useQuranPlayerStore } from '../../state/useQuranPlayerStore'
import { GlassInput } from '../../components/common/GlassInput'
import { GlassButton } from '../../components/common/GlassButton'
import { ReciterList } from '../../components/features/quran/ReciterList'
import { ReciterHeader } from '../../components/features/quran/ReciterHeader'
import { SurahGrid } from '../../components/features/quran/SurahGrid'
import { RadioCard } from '../../components/features/quran/RadioCard'
import { ScholarList } from '../../components/features/quran/ScholarList'
import { ScholarHeader } from '../../components/features/quran/ScholarHeader'
import { SermonGrid } from '../../components/features/quran/SermonGrid'
import { NarratorList } from '../../components/features/quran/NarratorList'
import { NarratorHeader } from '../../components/features/quran/NarratorHeader'
import { StoryGrid } from '../../components/features/quran/StoryGrid'
import { groupSermonsByScholar } from '../../lib/sermon-utils'
import { groupStoriesByNarrator } from '../../lib/story-utils'
import type { Scholar, SermonCategory } from '../../types/quran-sermons'
import type { Narrator, StoryCategory } from '../../types/quran-stories'

export const QuranPage = () => {
  const { lang } = useLang()
  const { playSurah, isCurrentTrack, isPlaying, currentTrack } = useQuranAudio()
  const { data: reciters = [], isLoading } = useReciters()
  const { toggle } = useQuranPlayerStore()
  
  // Tab state management with URL sync
  const [activeTab, setActiveTab] = useState<'reciters' | 'sermons' | 'stories'>(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'sermons' || tab === 'stories') return tab
    return 'reciters'
  })
  
  // Reciters tab state
  const [selectedReciter, setSelectedReciter] = useState<any | null>(null)
  const [surahSearch, setSurahSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'meccan' | 'medinan'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('') // Unified search for sidebar lists

  // Sermons tab state
  const { data: sermonsData = [], isLoading: sermonsLoading } = useSermons()
  const { playSermon, isCurrentSermon } = useSermonAudio()
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null)
  const [sermonSearch, setSermonSearch] = useState('')
  const debouncedSermonSearch = useDebouncedValue(sermonSearch, 300)
  const [sermonCategories, setSermonCategories] = useState<SermonCategory[]>([])
  const [sermonViewMode, setSermonViewMode] = useState<'grid' | 'list'>('grid')

  // Stories tab state
  const { data: storiesData = [], isLoading: storiesLoading } = useStories()
  const { playStory, isCurrentStory } = useStoryAudio()
  const [selectedNarrator, setSelectedNarrator] = useState<Narrator | null>(null)
  const [storySearch, setStorySearch] = useState('')
  const debouncedStorySearch = useDebouncedValue(storySearch, 300)
  const [storyCategories, setStoryCategories] = useState<StoryCategory[]>([])
  const [storyViewMode, setStoryViewMode] = useState<'grid' | 'list'>('grid')

  const [particles] = useState<any[]>(() => [...Array(20)].map((_, i) => ({
    id: i,
    x: Math.random() * 100 + '%',
    y: Math.random() * 100 + '%',
    targetY: Math.random() * -100 + 'px',
    duration: 5 + Math.random() * 10,
    delay: Math.random() * 10
  })))

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [activeTab])

  // Auto-select first featured reciter on load
  useEffect(() => {
    if (reciters.length > 0 && !selectedReciter && activeTab === 'reciters') {
      const featured = reciters.find((r: any) => r.featured)
      if (featured) {
        Promise.resolve().then(() => {
          setSelectedReciter(featured)
        })
      }
    }
  }, [reciters, selectedReciter, activeTab])

  // Group sermons by scholar
  const scholars = useMemo(() => {
    return groupSermonsByScholar(sermonsData)
  }, [sermonsData])

  // Auto-select first featured scholar
  useEffect(() => {
    if (scholars.length > 0 && !selectedScholar && activeTab === 'sermons') {
      const featured = scholars.find(s => s.featured)
      if (featured) {
        Promise.resolve().then(() => {
          setSelectedScholar(featured)
        })
      }
    }
  }, [scholars, selectedScholar, activeTab])

  // Group stories by narrator
  const narrators = useMemo(() => {
    return groupStoriesByNarrator(storiesData)
  }, [storiesData])

  // Auto-select first featured narrator
  useEffect(() => {
    if (narrators.length > 0 && !selectedNarrator && activeTab === 'stories') {
      const featured = narrators.find(n => n.featured)
      if (featured) {
        Promise.resolve().then(() => {
          setSelectedNarrator(featured)
        })
      }
    }
  }, [narrators, selectedNarrator, activeTab])

  // Filter sermons
  const filteredSermons = useMemo(() => {
    if (!selectedScholar) return []
    
    let filtered = selectedScholar.sermons
    
    if (sermonCategories.length > 0) {
      filtered = filtered.filter(s => sermonCategories.includes(s.category))
    }
    
    if (debouncedSermonSearch) {
      const q = debouncedSermonSearch.toLowerCase()
      filtered = filtered.filter(s => 
        s.title_ar.toLowerCase().includes(q) ||
        s.title_en.toLowerCase().includes(q)
      )
    }
    
    return filtered
  }, [selectedScholar, sermonCategories, debouncedSermonSearch])

  // Filter stories
  const filteredStories = useMemo(() => {
    if (!selectedNarrator) return []
    
    let filtered = selectedNarrator.stories
    
    if (storyCategories.length > 0) {
      filtered = filtered.filter(s => storyCategories.includes(s.category))
    }
    
    if (debouncedStorySearch) {
      const q = debouncedStorySearch.toLowerCase()
      filtered = filtered.filter(s => 
        s.title_ar.toLowerCase().includes(q) ||
        s.title_en.toLowerCase().includes(q)
      )
    }
    
    return filtered
  }, [selectedNarrator, storyCategories, debouncedStorySearch])

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
      const available = selectedReciter.surah_list.split(',').map((s: string) => parseInt(s.trim()))
      filtered = filtered.filter(s => available.includes(s.id))
    }
    
    return filtered
  }, [filterType, surahSearch, selectedReciter])

  const handlePlaySurah = (id: number, name: string) => {
    if (selectedReciter) {
      // Check if this surah is currently playing
      if (isCurrentTrack(selectedReciter.id, id) && isPlaying) {
        // If playing, pause it
        toggle()
      } else {
        // Otherwise, play it
        playSurah(selectedReciter, id, name)
      }
    }
  }

  const handleAddSurahToQueue = async (surah: any) => {
    if (selectedReciter) {
      const track = {
        id: `${selectedReciter.id}-${surah.id}`,
        title: lang === 'ar' ? surah.name : surah.englishName,
        reciter: lang === 'ar' ? selectedReciter.name_ar : selectedReciter.name_en,
        url: `${selectedReciter.server}/${surah.id.toString().padStart(3, '0')}.mp3`,
        image: selectedReciter.photo || undefined,
        type: 'recitation' as const
      }
      
      // Add to queue using store
      const { useQuranPlayerStore } = await import('../../state/useQuranPlayerStore')
      const store = useQuranPlayerStore.getState()
      store.addToQueue(track)
      
      // Open queue if not already open
      if (!store.showQueue) {
        store.toggleQueue()
      }
      
      // Show toast notification with fixed ID to prevent stacking
      const { toast } = await import('sonner')
      toast.success(
        lang === 'ar' 
          ? `تمت إضافة ${surah.name} لقائمة الانتظار`
          : `${surah.englishName} added to queue`,
        { id: 'queue-add-notification' }
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30 pb-32">
      <SeoHead
        title={lang === 'ar' ? 'القرآن الكريم - استماع وتلاوة' : 'Quran - Listen and Recitation'}
        description={lang === 'ar' 
          ? 'استمع إلى القرآن الكريم بأصوات نخبة من القراء. تلاوات خاشعة بجودة عالية.'
          : 'Listen to the Holy Quran with the voices of elite reciters. High quality recitations.'}
        type="website"
      />

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
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-green-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] bg-teal-600/5 rounded-full blur-[150px] animate-pulse-slow delay-2000" />
        
        {/* Floating Particles/Stars for Spiritual Vibe */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute w-1 h-1 bg-emerald-400/20 rounded-full"
              initial={{ 
                x: p.x, 
                y: p.y,
                opacity: 0 
              }}
              animate={{ 
                y: [null, p.targetY],
                opacity: [0, 0.5, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{ 
                duration: p.duration, 
                repeat: Infinity,
                delay: p.delay
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
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
            style={{ top: '-2mm' }}
          />
          
          {/* Page Title with Islamic Styling and Radio Card */}
          <div className="w-full max-w-7xl mx-auto px-4 relative z-[100]" style={{ marginTop: '2mm' }}>
            <div className="flex items-center justify-between gap-4">
              {/* Left: Radio Card */}
              <div className="hidden lg:block w-[200px]">
                <RadioCard />
              </div>
              
              {/* Center: Title and Verse */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex-1 text-center mb-2 md:mb-4"
              >
                <h1 
                  className="text-xl md:text-3xl font-bold font-cairo text-amber-300 mb-1 md:mb-2 tracking-wide relative z-[101]"
                  style={{ 
                    textShadow: '0 0 30px rgba(252, 211, 77, 0.8), 0 0 60px rgba(251, 191, 36, 0.5), 0 0 90px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  {lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'}
                </h1>
                <div className="flex items-center justify-center gap-4 mb-2 md:mb-4 relative z-[101]">
                  <div className="h-px w-8 md:w-24 bg-gradient-to-r from-transparent to-amber-500/50" />
                  <BookOpen 
                    className="text-amber-400" 
                    size={20} 
                    style={{ 
                      filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6)) drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))'
                    }}
                  />
                  <div className="h-px w-8 md:w-24 bg-gradient-to-l from-transparent to-amber-500/50" />
                </div>
                <p className="text-white/80 text-[10px] md:text-sm font-amiri max-w-2xl mx-auto italic leading-relaxed">
                  {lang === 'ar' ? '«الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»' : 'Verily, in the remembrance of Allah do hearts find rest'}
                </p>
              </motion.div>
              
              {/* Right spacer for balance */}
              <div className="hidden lg:block w-[200px]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 lg:h-[calc(100vh-320px)] min-h-0">
          
          {/* Sidebar Container with Tabs */}
          <div className="w-full lg:w-[179px] xl:w-[202px] shrink-0 flex flex-col gap-3">
            {/* Tabs at top of sidebar - Horizontal */}
            <div className="flex gap-1 bg-amber-950/20 backdrop-blur-2xl border border-amber-500/10 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab('reciters')}
                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'reciters'
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-transparent text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {lang === 'ar' ? 'القراء' : 'Reciters'}
              </button>
              <button
                onClick={() => setActiveTab('sermons')}
                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'sermons'
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-transparent text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {lang === 'ar' ? 'الخطب' : 'Sermons'}
              </button>
              <button
                onClick={() => setActiveTab('stories')}
                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'stories'
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-transparent text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {lang === 'ar' ? 'القصص' : 'Stories'}
              </button>
            </div>

            {/* Sidebar Content Based on Active Tab */}
            {activeTab === 'reciters' && (
              <ReciterList 
                reciters={reciters.filter(r => {
                  if (!searchQuery) return true
                  const q = searchQuery.toLowerCase()
                  return r.name.toLowerCase().includes(q) || (r.rewaya && r.rewaya.toLowerCase().includes(q))
                })} 
                selectedReciter={selectedReciter} 
                onSelect={setSelectedReciter}
                isLoading={isLoading}
              />
            )}
            
            {activeTab === 'sermons' && (
              <ScholarList
                scholars={scholars.filter(s => {
                  if (!searchQuery) return true
                  const q = searchQuery.toLowerCase()
                  return s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)
                })}
                selectedScholar={selectedScholar}
                onSelect={setSelectedScholar}
                isLoading={sermonsLoading}
              />
            )}
            
            {activeTab === 'stories' && (
              <NarratorList
                narrators={narrators.filter(n => {
                  if (!searchQuery) return true
                  const q = searchQuery.toLowerCase()
                  return n.name_ar.toLowerCase().includes(q) || n.name_en.toLowerCase().includes(q)
                })}
                selectedNarrator={selectedNarrator}
                onSelect={setSelectedNarrator}
                isLoading={storiesLoading}
              />
            )}
          </div>

          {/* Main Content: Radio + Surahs Grid */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
            {/* Content Area */}
            {activeTab === 'reciters' && selectedReciter ? (
              <div className="flex flex-col h-full">
                {/* Combined Search Row */}
                <div className="shrink-0 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sidebar Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput 
                        placeholder={lang === 'ar' ? 'بحث عن قارئ...' : 'Search reciter...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                    
                    {/* Surah Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput
                        placeholder={lang === 'ar' ? 'بحث عن سورة (اسم، رقم، إنجليزية)...' : 'Search Surah (Name, Number, English)...'}
                        value={surahSearch}
                        onChange={(e) => setSurahSearch(e.target.value)}
                      />
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
                      <GlassButton
                        size="sm"
                        active={filterType === 'all'}
                        onClick={() => setFilterType('all')}
                        className="rounded-lg"
                      >
                        {lang === 'ar' ? 'الكل' : 'All'}
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        active={filterType === 'meccan'}
                        onClick={() => setFilterType('meccan')}
                        className="rounded-lg"
                      >
                        {lang === 'ar' ? 'مكية' : 'Meccan'}
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        active={filterType === 'medinan'}
                        onClick={() => setFilterType('medinan')}
                        className="rounded-lg"
                      >
                        {lang === 'ar' ? 'مدنية' : 'Medinan'}
                      </GlassButton>
                    </div>
                    
                    {/* View Mode */}
                    <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
                      <GlassButton
                        size="icon"
                        active={viewMode === 'grid'}
                        onClick={() => setViewMode('grid')}
                        title="Grid View"
                      >
                        <Grid size={16} />
                      </GlassButton>
                      <GlassButton
                        size="icon"
                        active={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                        title="List View"
                      >
                        <List size={16} />
                      </GlassButton>
                    </div>
                    
                    {/* Radio Card for mobile/tablet */}
                    <div className="lg:hidden shrink-0">
                      <RadioCard />
                    </div>
                  </div>
                </div>

                {/* Surahs Grid/List (Spiritual & Animated) */}
                <SurahGrid
                  filteredSurahs={filteredSurahs}
                  selectedReciter={selectedReciter}
                  viewMode={viewMode}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  onPlaySurah={handlePlaySurah}
                  onAddToQueue={handleAddSurahToQueue}
                />
              </div>
            ) : activeTab === 'sermons' && selectedScholar ? (
              <div className="flex flex-col h-full">
                {/* Combined Search Row */}
                <div className="shrink-0 mb-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sidebar Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput 
                        placeholder={lang === 'ar' ? 'بحث عن عالم...' : 'Search scholar...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                    
                    {/* Sermon Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput
                        placeholder={lang === 'ar' ? 'بحث عن خطبة...' : 'Search sermon...'}
                        value={sermonSearch}
                        onChange={(e) => setSermonSearch(e.target.value)}
                      />
                    </div>
                    
                    {/* View Mode */}
                    <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
                      <GlassButton
                        size="icon"
                        active={sermonViewMode === 'grid'}
                        onClick={() => setSermonViewMode('grid')}
                        title="Grid View"
                      >
                        <Grid size={16} />
                      </GlassButton>
                      <GlassButton
                        size="icon"
                        active={sermonViewMode === 'list'}
                        onClick={() => setSermonViewMode('list')}
                        title="List View"
                      >
                        <List size={16} />
                      </GlassButton>
                    </div>
                    
                    {/* Radio Card for mobile/tablet */}
                    <div className="lg:hidden shrink-0">
                      <RadioCard />
                    </div>
                  </div>
                  
                  {/* Category Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <GlassButton
                      size="sm"
                      active={sermonCategories.length === 0}
                      onClick={() => setSermonCategories([])}
                      className="rounded-lg"
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </GlassButton>
                    
                    {[
                      { value: 'friday-khutbah' as SermonCategory, label: { ar: 'خطبة الجمعة', en: 'Friday Khutbah' } },
                      { value: 'ramadan' as SermonCategory, label: { ar: 'رمضان', en: 'Ramadan' } },
                      { value: 'hajj' as SermonCategory, label: { ar: 'الحج', en: 'Hajj' } },
                      { value: 'eid' as SermonCategory, label: { ar: 'العيد', en: 'Eid' } },
                      { value: 'general-guidance' as SermonCategory, label: { ar: 'إرشاد عام', en: 'General' } },
                      { value: 'youth' as SermonCategory, label: { ar: 'الشباب', en: 'Youth' } },
                      { value: 'family' as SermonCategory, label: { ar: 'الأسرة', en: 'Family' } },
                      { value: 'tafsir' as SermonCategory, label: { ar: 'تفسير', en: 'Tafsir' } }
                    ].map(({ value, label }) => (
                      <GlassButton
                        key={value}
                        size="sm"
                        active={sermonCategories.includes(value)}
                        onClick={() => {
                          if (sermonCategories.includes(value)) {
                            setSermonCategories(sermonCategories.filter(c => c !== value))
                          } else {
                            setSermonCategories([...sermonCategories, value])
                          }
                        }}
                        className="rounded-lg"
                      >
                        {lang === 'ar' ? label.ar : label.en}
                      </GlassButton>
                    ))}
                  </div>
                </div>

                {/* Sermons Grid */}
                <SermonGrid
                  sermons={filteredSermons}
                  selectedScholar={selectedScholar}
                  viewMode={sermonViewMode}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  onPlaySermon={playSermon}
                />
              </div>
            ) : activeTab === 'stories' && selectedNarrator ? (
              <div className="flex flex-col h-full">
                {/* Combined Search Row */}
                <div className="shrink-0 mb-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sidebar Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput 
                        placeholder={lang === 'ar' ? 'بحث عن راوي...' : 'Search narrator...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="py-2.5"
                      />
                    </div>
                    
                    {/* Story Search */}
                    <div className="flex-1 min-w-[200px] max-w-[300px]">
                      <GlassInput
                        placeholder={lang === 'ar' ? 'بحث عن قصة...' : 'Search story...'}
                        value={storySearch}
                        onChange={(e) => setStorySearch(e.target.value)}
                      />
                    </div>
                    
                    {/* View Mode */}
                    <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
                      <GlassButton
                        size="icon"
                        active={storyViewMode === 'grid'}
                        onClick={() => setStoryViewMode('grid')}
                        title="Grid View"
                      >
                        <Grid size={16} />
                      </GlassButton>
                      <GlassButton
                        size="icon"
                        active={storyViewMode === 'list'}
                        onClick={() => setStoryViewMode('list')}
                        title="List View"
                      >
                        <List size={16} />
                      </GlassButton>
                    </div>
                    
                    {/* Radio Card for mobile/tablet */}
                    <div className="lg:hidden shrink-0">
                      <RadioCard />
                    </div>
                  </div>
                  
                  {/* Category Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <GlassButton
                      size="sm"
                      active={storyCategories.length === 0}
                      onClick={() => setStoryCategories([])}
                      className="rounded-lg"
                    >
                      {lang === 'ar' ? 'الكل' : 'All'}
                    </GlassButton>
                    
                    {[
                      { value: 'prophets' as StoryCategory, label: { ar: 'الأنبياء', en: 'Prophets' } },
                      { value: 'companions' as StoryCategory, label: { ar: 'الصحابة', en: 'Companions' } },
                      { value: 'quranic-stories' as StoryCategory, label: { ar: 'قصص قرآنية', en: 'Quranic' } },
                      { value: 'historical-events' as StoryCategory, label: { ar: 'أحداث تاريخية', en: 'Historical' } },
                      { value: 'moral-lessons' as StoryCategory, label: { ar: 'دروس أخلاقية', en: 'Moral Lessons' } },
                      { value: 'miracles' as StoryCategory, label: { ar: 'المعجزات', en: 'Miracles' } },
                      { value: 'battles' as StoryCategory, label: { ar: 'الغزوات', en: 'Battles' } },
                      { value: 'women-in-islam' as StoryCategory, label: { ar: 'نساء في الإسلام', en: 'Women' } }
                    ].map(({ value, label }) => (
                      <GlassButton
                        key={value}
                        size="sm"
                        active={storyCategories.includes(value)}
                        onClick={() => {
                          if (storyCategories.includes(value)) {
                            setStoryCategories(storyCategories.filter(c => c !== value))
                          } else {
                            setStoryCategories([...storyCategories, value])
                          }
                        }}
                        className="rounded-lg"
                      >
                        {lang === 'ar' ? label.ar : label.en}
                      </GlassButton>
                    ))}
                  </div>
                </div>

                {/* Stories Grid */}
                <StoryGrid
                  stories={filteredStories}
                  selectedNarrator={selectedNarrator}
                  viewMode={storyViewMode}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  onPlayStory={playStory}
                />
              </div>
            ) : (
              // Empty State
              <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-zinc-500 p-8 border border-white/5 rounded-2xl bg-[#0a0a0a]/30">
                <div className="w-20 h-20 rounded-full bg-emerald-900/10 flex items-center justify-center mb-4 animate-pulse">
                  <BookOpen size={40} className="text-emerald-500/50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {activeTab === 'reciters' && (lang === 'ar' ? 'اختر قارئاً للبدء' : 'Select a Reciter to Start')}
                  {activeTab === 'sermons' && (lang === 'ar' ? 'اختر عالماً للبدء' : 'Select a Scholar to Start')}
                  {activeTab === 'stories' && (lang === 'ar' ? 'اختر راوياً للبدء' : 'Select a Narrator to Start')}
                </h3>
                <p className="max-w-md mx-auto text-sm">
                  {activeTab === 'reciters' && (lang === 'ar' 
                    ? 'استمع إلى القرآن الكريم بأصوات نخبة من القراء. اختر قارئاً من القائمة الجانبية لعرض السور.' 
                    : 'Listen to the Holy Quran recited by elite reciters. Select a reciter from the sidebar to view Surahs.')}
                  {activeTab === 'sermons' && (lang === 'ar'
                    ? 'استمع إلى الخطب الإسلامية من علماء مميزين. اختر عالماً من القائمة الجانبية لعرض الخطب.'
                    : 'Listen to Islamic sermons from distinguished scholars. Select a scholar from the sidebar to view sermons.')}
                  {activeTab === 'stories' && (lang === 'ar'
                    ? 'استمع إلى القصص الإسلامية من رواة مميزين. اختر راوياً من القائمة الجانبية لعرض القصص.'
                    : 'Listen to Islamic stories from distinguished narrators. Select a narrator from the sidebar to view stories.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
