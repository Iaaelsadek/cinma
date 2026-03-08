import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Download, Monitor, Smartphone, Apple, Terminal, Star, Search, Shield, Cpu, Grid, Filter, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SOFTWARE_MOCK_ITEMS, type SoftwareRow } from '../../data/software'

// Static Fallback Images per Category
const FALLBACK_IMAGES = {
  pc: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1000&auto=format&fit=crop', // Computer Code / Setup
  android: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?q=80&w=1000&auto=format&fit=crop', // Android Robot
  apple: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop', // Apple MacBook
  terminal: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1000&auto=format&fit=crop', // Matrix / Terminal
  other: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop' // Chip / Tech
}

const SoftwareCard = ({ item }: { item: SoftwareRow }) => {
  const [imgError, setImgError] = useState(false)
  const fallback = FALLBACK_IMAGES[item.platform || 'other'] || FALLBACK_IMAGES.other

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="group relative bg-lumen-void/40 border border-white/5 rounded-xl overflow-hidden hover:border-lumen-gold/30 transition-colors"
    >
      <div className="aspect-square relative overflow-hidden bg-black/50">
        <img 
          src={imgError || !item.poster_url ? fallback : item.poster_url} 
          alt={item.title}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imgError ? 'opacity-50 grayscale' : ''}`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
        
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-white">{item.rating || 'N/A'}</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
           <h3 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h3>
           <div className="flex items-center gap-2 text-white/50 text-xs">
              <span className="bg-white/10 px-1.5 py-0.5 rounded uppercase">{item.version}</span>
              <span>{item.size}</span>
           </div>
        </div>
      </div>

      <div className="p-4 pt-2">
        <p className="text-white/60 text-sm line-clamp-2 mb-4 min-h-[2.5rem]">{item.description}</p>
        
        <div className="flex items-center gap-2">
           <a 
             href={item.download_url || '#'} 
             target="_blank"
             rel="noopener noreferrer"
             className="flex-1 bg-lumen-gold text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
           >
             <Download className="w-4 h-4" />
             Download
           </a>
        </div>
      </div>
    </motion.div>
  )
}

export const Software = () => {
  const { lang } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentCategory = searchParams.get('cat') || 'all'
  const [searchTerm, setSearchTerm] = useState('')

  const { data: allSoftware, isLoading } = useQuery({
    queryKey: ['software-all-grid'],
    queryFn: async () => {
      const { data } = await supabase.from('software').select('*').order('rating', { ascending: false })
      
      const dbItems = (data || []).map((item: any) => ({
        ...item,
        title: item.title,
        poster_url: item.poster_url,
        category: item.category,
        rating: item.rating,
        download_url: item.download_url,
        description: item.description || 'Powerful software tool.',
        version: item.version || 'Latest',
        size: item.size || 'N/A',
        platform: item.platform || 'pc'
      })) as SoftwareRow[]

      return [...dbItems, ...SOFTWARE_MOCK_ITEMS]
    },
    staleTime: 1000 * 60 * 60
  })

  const filteredSoftware = useMemo(() => {
    if (!allSoftware) return []
    let items = allSoftware
    
    if (currentCategory !== 'all') {
      items = items.filter(item => item.platform === currentCategory)
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(lower) || 
        item.description?.toLowerCase().includes(lower) ||
        item.category?.toLowerCase().includes(lower)
      )
    }

    return items
  }, [allSoftware, currentCategory, searchTerm])

  const categories = [
    { id: 'all', label: lang === 'ar' ? 'الكل' : 'All', icon: Grid },
    { id: 'pc', label: lang === 'ar' ? 'كمبيوتر' : 'PC', icon: Monitor },
    { id: 'android', label: lang === 'ar' ? 'أندرويد' : 'Android', icon: Smartphone },
    { id: 'apple', label: lang === 'ar' ? 'أبل' : 'Apple', icon: Apple },
    { id: 'terminal', label: lang === 'ar' ? 'تيرمينال' : 'Terminal', icon: Terminal },
  ]

  return (
    <div className="min-h-screen text-white pb-32 max-w-[2400px] mx-auto w-full font-cairo bg-[#050505]">
      <Helmet>
        <title>{lang === 'ar' ? 'البرمجيات - سينما أونلاين' : 'Software - Cinema Online'}</title>
      </Helmet>

      {/* HEADER */}
      <div className="relative w-full py-20 px-4 md:px-12 bg-gradient-to-b from-sky-900/20 to-[#050505] border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-6">
            <Terminal size={16} />
            <span className="text-sm font-bold uppercase tracking-wider">Software Repository</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            {lang === 'ar' ? 'متجر البرامج' : 'Software Hub'}
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            {lang === 'ar' 
              ? 'مجموعة مختارة من أفضل البرامج والأدوات لأنظمة التشغيل المختلفة. تحميل مباشر وآمن.' 
              : 'Curated collection of the best software and tools for various operating systems. Direct and secure downloads.'}
          </p>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="sticky top-20 z-40 bg-[#050505]/80 backdrop-blur-xl border-y border-white/5 py-4 px-4 md:px-12 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => {
              const isActive = currentCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSearchParams({ cat: cat.id })}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap
                    ${isActive 
                      ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20' 
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <cat.icon size={16} />
                  <span className="font-bold text-sm">{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
             <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث عن برنامج...' : 'Search software...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-sky-500/50 transition-colors"
             />
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          </div>
        </div>
      </div>

      {/* GRID CONTENT */}
      <div className="container mx-auto px-4 pb-24">
        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
             {[1,2,3,4,5,6,7,8,9,10].map(n => (
               <div key={n} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
             ))}
           </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence mode='popLayout'>
              {filteredSoftware.map((item) => (
                 <SoftwareCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
