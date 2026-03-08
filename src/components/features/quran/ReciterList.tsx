import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Heart } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { ReciterImage } from './ReciterImage'
import { GlassInput } from '../../common/GlassInput'

export type QuranReciter = {
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

interface ReciterListProps {
  reciters: QuranReciter[]
  selectedReciter: QuranReciter | null
  onSelect: (reciter: QuranReciter) => void
  isLoading: boolean
}

export const ReciterList = ({ reciters, selectedReciter, onSelect, isLoading }: ReciterListProps) => {
  const { lang } = useLang()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)

  const filteredReciters = reciters.filter(r => {
    if (showFeaturedOnly && !r.featured) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.name.toLowerCase().includes(q) || (r.rewaya && r.rewaya.toLowerCase().includes(q))
  })

  return (
    <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col bg-amber-950/20 backdrop-blur-2xl border border-amber-500/10 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:h-full h-[350px]">
      <div className="p-4 border-b border-amber-500/10 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-amiri flex items-center gap-3 text-amber-400">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <User size={18} />
            </div>
            {lang === 'ar' ? 'القراء' : 'Reciters'}
            <span className="text-xs text-amber-600/60 font-sans">({filteredReciters.length})</span>
          </h2>
          <button
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${showFeaturedOnly ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500/5 text-amber-400 border border-amber-500/20 hover:bg-amber-500/10'}`}
          >
            {lang === 'ar' ? 'المفضلين' : 'Featured'}
          </button>
        </div>

        <GlassInput 
          placeholder={lang === 'ar' ? 'بحث عن قارئ...' : 'Search reciter...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="py-2.5"
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-amber-500/50 gap-4">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
                onClick={() => onSelect(reciter)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  selectedReciter?.id === reciter.id 
                    ? 'bg-amber-500/10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                    : 'hover:bg-amber-500/5 border border-transparent'
                }`}
              >
                {selectedReciter?.id === reciter.id && (
                  <motion.div 
                    layoutId="active-reciter"
                    className="absolute left-0 top-0 w-1 h-full bg-amber-500"
                  />
                )}
                
                <div className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all duration-500 shrink-0 ${
                  selectedReciter?.id === reciter.id ? 'border-amber-500 rotate-3 scale-110 shadow-lg' : 'border-amber-500/10 group-hover:border-amber-500/30'
                }`}>
                  <ReciterImage 
                    src={reciter.image} 
                    alt={reciter.name} 
                    className="w-full h-full object-cover"
                    id={reciter.id}
                  />
                  <div className="absolute inset-0 bg-amber-900/10 group-hover:bg-transparent transition-colors" />
                </div>
                
                <div className="flex-1 text-left overflow-hidden">
                  <h3 className={`font-bold font-amiri truncate text-sm ${selectedReciter?.id === reciter.id ? 'text-amber-400' : 'text-amber-100/70 group-hover:text-white'}`}>
                    {reciter.name}
                  </h3>
                  <p className={`text-[10px] font-sans truncate transition-colors ${selectedReciter?.id === reciter.id ? 'text-amber-500/60' : 'text-amber-900'}`}>
                    {reciter.rewaya || (lang === 'ar' ? 'رواية حفص عن عاصم' : 'Hafs an Asim')}
                  </p>
                </div>
                
                {reciter.featured && (
                  <Heart size={14} className={`shrink-0 transition-colors ${selectedReciter?.id === reciter.id ? 'text-amber-400 fill-amber-400' : 'text-amber-900 group-hover:text-amber-500'}`} />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-amber-900 gap-3">
            <Search size={32} strokeWidth={1} />
            <span className="text-sm font-amiri">{lang === 'ar' ? 'لم يتم العثور على القارئ' : 'Reciter not found'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
