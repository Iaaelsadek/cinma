import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Download, Monitor, Smartphone, Apple, Terminal, Star, Search, Shield, Cpu, Grid, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type SoftwareRow = {
  id: number
  title: string
  poster_url?: string | null
  rating?: number | null
  year?: number | null
  category?: string | null
  download_url?: string | null
  description?: string
  version?: string
  size?: string
  platform?: 'pc' | 'android' | 'apple' | 'terminal' | 'other'
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

      // Mock Data
      const mockItems: SoftwareRow[] = [
        // PC
        { id: 201, title: 'Visual Studio Code', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png', rating: 9.9, category: 'Development', description: 'Code editing. Redefined.', version: '1.86.0', size: '120 MB', platform: 'pc' },
        { id: 202, title: 'Adobe Photoshop', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', rating: 9.5, category: 'Design', description: 'Reimagine reality with Photoshop.', version: '2024', size: '4 GB', platform: 'pc' },
        { id: 203, title: 'Google Chrome', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg', rating: 9.0, category: 'Browser', description: 'The browser built by Google.', version: '122.0', size: '90 MB', platform: 'pc' },
        { id: 204, title: 'VLC Media Player', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg', rating: 9.2, category: 'Multimedia', description: 'The best open source media player.', version: '3.0.20', size: '40 MB', platform: 'pc' },
        { id: 205, title: 'Discord', poster_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', rating: 9.4, category: 'Communication', description: 'Your place to talk and hang out.', version: 'Stable', size: '85 MB', platform: 'pc' },
        
        // Android
        { id: 301, title: 'Termux', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Termux_Logo.png/800px-Termux_Logo.png', rating: 9.8, category: 'Terminal', description: 'Powerful terminal emulation for Android.', version: '0.118', size: '90 MB', platform: 'android' },
        { id: 302, title: 'MX Player', poster_url: 'https://play-lh.googleusercontent.com/e3oZddH3M9kC8kX5A9g1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1', rating: 9.4, category: 'Multimedia', description: 'Powerful video player.', version: 'Latest', size: '50 MB', platform: 'android' },
        { id: 303, title: 'F-Droid', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/F-Droid_Logo_2017.svg/2048px-F-Droid_Logo_2017.svg.png', rating: 9.6, category: 'Store', description: 'FOSS app repository for Android.', version: '1.19', size: '15 MB', platform: 'android' },
        
        // Apple
        { id: 401, title: 'Xcode', poster_url: 'https://developer.apple.com/assets/elements/icons/xcode/xcode-128x128_2x.png', rating: 9.7, category: 'Development', description: 'Everything you need to create great apps.', version: '15.2', size: '10 GB', platform: 'apple' },
        { id: 402, title: 'Final Cut Pro', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Final_Cut_Pro_X.png/800px-Final_Cut_Pro_X.png', rating: 9.5, category: 'Video Editing', description: 'Professional video editing for Mac.', version: '10.7', size: '4 GB', platform: 'apple' },
        { id: 403, title: 'IINA', poster_url: 'https://iina.io/images/iina-icon.png', rating: 9.6, category: 'Multimedia', description: 'The modern video player for macOS.', version: '1.3.3', size: '60 MB', platform: 'apple' },
        
        // Terminal
        { id: 501, title: 'Oh My Zsh', poster_url: 'https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/docs/public/favicon.ico', rating: 9.9, category: 'Shell', description: 'Unleash your terminal like never before.', version: 'Latest', size: 'N/A', platform: 'terminal' },
        { id: 502, title: 'Docker', poster_url: 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png', rating: 9.8, category: 'DevOps', description: 'OS-level virtualization.', version: '25.0', size: '500 MB', platform: 'terminal' },
        { id: 503, title: 'Neovim', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Neovim-mark.svg/1200px-Neovim-mark.svg.png', rating: 9.9, category: 'Editor', description: 'Hyperextensible Vim-based text editor.', version: '0.9.5', size: '10 MB', platform: 'terminal' },
      ]

      return [...dbItems, ...mockItems]
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
          
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
      <div className="px-4 md:px-12 max-w-7xl mx-auto">
        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1,2,3,4,5,6,7,8].map(n => (
               <div key={n} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
             ))}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode='popLayout'>
              {filteredSoftware.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id} 
                  className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-sky-500/30 hover:bg-[#0f0f0f] transition-all duration-300 flex flex-col"
                >
                  <Link to={`/software/${item.id}`} className="block flex-1">
                    {/* Header: Icon & Rating */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/50 overflow-hidden">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt={item.title} className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <Cpu />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg text-yellow-500 text-xs font-bold">
                        <Star size={12} fill="currentColor" />
                        {item.rating}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">{item.title}</h3>
                      <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed mb-3">
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-zinc-400 border border-white/5 capitalize">
                          {item.platform}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                          v{item.version}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Action */}
                  <a 
                    href={item.download_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-900/20 group-hover:shadow-sky-600/20 group-hover:translate-y-[-2px]"
                  >
                    <Download size={18} />
                    {lang === 'ar' ? 'تحميل' : 'Download'}
                  </a>
                  
                  {/* Decorative Glow */}
                  <div className="absolute inset-0 bg-sky-500/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && filteredSoftware.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
             <Filter className="mx-auto mb-4 opacity-50" size={48} />
             <p className="text-lg">No software found in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
