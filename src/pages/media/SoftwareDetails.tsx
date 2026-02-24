import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, Link } from 'react-router-dom'
import { Download, Star, ArrowLeft, Monitor, Smartphone, Apple, Terminal, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { incrementClicks, supabase } from '../../lib/supabase'
import { useLang } from '../../state/useLang'

type SoftwareRow = {
  id: number
  title: string
  poster_url?: string | null
  backdrop_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  version?: string | null
  description?: string | null
  category?: string | null
  download_url?: string | null
  size?: string | null
  platform?: 'pc' | 'android' | 'apple' | 'terminal' | 'other'
}

export const SoftwareDetails = () => {
  const { id } = useParams()
  const { lang } = useLang()
  const [row, setRow] = useState<SoftwareRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) return
      setLoading(true)

      // Try fetching from DB first
      const { data } = await supabase.from('software').select('*').eq('id', Number(id)).maybeSingle()
      
      if (!cancelled) {
        if (data) {
          setRow(data as SoftwareRow)
        } else {
          // Fallback to Mock Data
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
          
          const found = mockItems.find(i => i.id === Number(id))
          setRow(found || null)
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Cpu size={48} className="opacity-50" />
        <p>{lang === 'ar' ? 'البرنامج غير موجود' : 'Software not found'}</p>
        <Link to="/software" className="text-sky-500 hover:underline">
          {lang === 'ar' ? 'العودة للمتجر' : 'Return to Store'}
        </Link>
      </div>
    )
  }

  const title = row.title || (lang === 'ar' ? 'برنامج' : 'Software')
  const rating = typeof row.rating === 'number' ? row.rating : 0
  const version = row.version || row.year || row.release_year || 'Latest'
  const platform = row.platform || row.category || 'PC'
  const description = row.description || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description available')
  const poster = row.poster_url || ''
  const backdrop = row.backdrop_url || row.poster_url || ''
  const downloadUrl = row.download_url || '#'
  const size = row.size || 'N/A'

  return (
    <div className="min-h-screen bg-[#050505] pb-12 text-zinc-100 font-cairo">
      <Helmet>
        <title>{`${title} | ${lang === 'ar' ? 'برامج' : 'Software'}`}</title>
      </Helmet>

      {/* Hero Background */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] z-10" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-10 mix-blend-overlay" />
        
        {backdrop ? (
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 1.5 }}
            src={backdrop}
            alt="Backdrop"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sky-900/20 to-purple-900/20" />
        )}
        
        {/* Back Button */}
        <div className="absolute top-6 left-6 z-50">
           <Link to="/software" className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
             <ArrowLeft size={18} />
             <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
           </Link>
        </div>
      </div>

      <div className="relative z-20 px-4 md:px-12 max-w-7xl mx-auto -mt-32">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          
          {/* Poster Column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#111]"
            >
              {poster ? (
                <img src={poster} alt={title} className="h-full w-full object-contain p-4" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <Cpu size={64} className="text-zinc-700" />
                </div>
              )}
            </motion.div>
            
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-4 font-bold text-white hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/20 hover:translate-y-[-2px]"
            >
              <Download size={20} />
              {lang === 'ar' ? 'تحميل البرنامج' : 'Download Now'}
            </a>
          </div>

          {/* Details Column */}
          <div className="pt-4 md:pt-32">
            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
            >
               {/* Meta Badges */}
               <div className="flex flex-wrap items-center gap-3 mb-4">
                 <div className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-bold flex items-center gap-1">
                   <Star size={14} fill="currentColor" />
                   {rating}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm">
                   v{version}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm uppercase">
                   {size}
                 </div>
                 <div className="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-bold uppercase">
                   {platform}
                 </div>
               </div>

               <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                 {title}
               </h1>

               <div className="prose prose-invert prose-lg max-w-none text-zinc-400 mb-8">
                 <p>{description}</p>
               </div>
               
               {/* Additional Info / Specs Placeholder */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-8">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-zinc-500 text-sm mb-1 uppercase tracking-wider">Category</h3>
                    <p className="font-semibold text-white">{row.category || 'Utility'}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-zinc-500 text-sm mb-1 uppercase tracking-wider">License</h3>
                    <p className="font-semibold text-white">Free / Open Source</p>
                  </div>
               </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
