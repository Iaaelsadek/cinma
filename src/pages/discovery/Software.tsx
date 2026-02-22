import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Download, Monitor, Smartphone, Apple, Terminal, Star, Search, Shield, Cpu } from 'lucide-react'

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
}

export const Software = () => {
  const { lang } = useLang()

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
        description: item.description || 'Powerful software tool for professionals.',
        version: item.version || 'Latest',
        size: item.size || 'N/A'
      })) as SoftwareRow[]

      if (dbItems.length > 0) return dbItems

      // Mock Data if DB empty
      return [
        { id: 201, title: 'Visual Studio Code', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/2048px-Visual_Studio_Code_1.35_icon.svg.png', rating: 9.9, category: 'Development', description: 'Code editing. Redefined.', version: '1.86.0', size: '120 MB' },
        { id: 202, title: 'Adobe Photoshop', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1200px-Adobe_Photoshop_CC_icon.svg.png', rating: 9.5, category: 'Design', description: 'Reimagine reality with Photoshop.', version: '2024', size: '4 GB' },
        { id: 203, title: 'Google Chrome', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg', rating: 9.0, category: 'Browser', description: 'The browser built by Google.', version: '122.0', size: '90 MB' },
        { id: 204, title: 'VLC Media Player', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg', rating: 9.2, category: 'Multimedia', description: 'The best open source media player.', version: '3.0.20', size: '40 MB' },
        { id: 205, title: 'Discord', poster_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', rating: 9.4, category: 'Communication', description: 'Your place to talk and hang out.', version: 'Stable', size: '85 MB' },
        { id: 206, title: 'Spotify', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png', rating: 9.3, category: 'Music', description: 'Music for everyone.', version: 'Latest', size: '60 MB' },
        { id: 207, title: 'Blender', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Blender_logo_no_text.svg/2503px-Blender_logo_no_text.svg.png', rating: 9.7, category: '3D Design', description: 'Free and open source 3D creation suite.', version: '4.0', size: '300 MB' },
        { id: 208, title: 'Figma', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/1667px-Figma-logo.svg.png', rating: 9.6, category: 'Design', description: 'The collaborative interface design tool.', version: 'Web/Desktop', size: '100 MB' },
      ]
    },
    staleTime: 1000 * 60 * 60
  })

  // Group by Category or just show Grid
  const categories = useMemo(() => {
    if (!allSoftware) return []
    const cats = Array.from(new Set(allSoftware.map(s => s.category || 'Other')))
    return cats.sort()
  }, [allSoftware])

  return (
    <div className="min-h-screen text-white pb-32 max-w-[2400px] mx-auto w-full font-cairo bg-[#050505]">
      <Helmet>
        <title>{lang === 'ar' ? 'البرمجيات - سينما أونلاين' : 'Software - Cinema Online'}</title>
      </Helmet>

      {/* HEADER */}
      <div className="relative w-full py-20 px-4 md:px-12 bg-gradient-to-b from-blue-900/20 to-[#050505] border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-6">
            <Terminal size={16} />
            <span className="text-sm font-bold uppercase tracking-wider">Software Repository</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            {lang === 'ar' ? 'متجر البرامج' : 'Software Hub'}
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            {lang === 'ar' 
              ? 'مجموعة مختارة من أفضل البرامج والأدوات لأنظمة ويندوز، ماك، وأندرويد. تحميل مباشر وآمن.' 
              : 'Curated collection of the best software and tools for Windows, Mac, and Android. Direct and secure downloads.'}
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS (Placeholder for now) */}
      <div className="sticky top-20 z-40 bg-[#050505]/80 backdrop-blur-xl border-y border-white/5 py-4 px-4 md:px-12 mb-8">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <div className="relative w-full">
             <input 
                type="text" 
                placeholder={lang === 'ar' ? 'ابحث عن برنامج...' : 'Search software...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
             />
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          </div>
        </div>
      </div>

      {/* GRID CONTENT */}
      <div className="px-4 md:px-12">
        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1,2,3,4,5,6,7,8].map(n => (
               <div key={n} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
             ))}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allSoftware?.map((item) => (
              <div 
                key={item.id} 
                className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 hover:bg-[#0f0f0f] transition-all duration-300 flex flex-col"
              >
                {/* Header: Icon & Rating */}
                <div className="flex items-start justify-between mb-6">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/50">
                     {item.poster_url ? (
                       <img src={item.poster_url} alt={item.title} className="w-full h-full object-contain" />
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
                <div className="flex-1 mb-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed mb-3">
                    {item.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                      {item.category}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                      v{item.version}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <a 
                  href={item.download_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 group-hover:shadow-blue-600/20 group-hover:translate-y-[-2px]"
                >
                  <Download size={18} />
                  {lang === 'ar' ? 'تحميل' : 'Download'}
                </a>
                
                {/* Decorative Glow */}
                <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
