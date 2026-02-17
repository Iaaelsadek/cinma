import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { getContinueWatching } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, User, Search, Menu, X, Clock, ChevronDown } from 'lucide-react'


export const QuantumNavbar = () => {
  const { user } = useAuth()
  const { lang, toggle } = useLang()
  
  const navLinks = [
    { 
      to: '/', 
      label: lang === 'ar' ? 'الرئيسية' : 'Home', 
      icon: Home, 
      color: '#00ffcc',
      hasMega: false
    },
    { 
      to: '/movies', 
      label: lang === 'ar' ? 'أفلام' : 'Movies', 
      icon: Film, 
      color: '#00ccff',
      hasMega: true,
      categories: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation']
    },
    { 
      to: '/series', 
      label: lang === 'ar' ? 'مسلسلات' : 'Series', 
      icon: Tv, 
      color: '#aa00ff',
      hasMega: true,
      categories: ['Drama', 'Comedy', 'Action', 'Crime', 'Mystery', 'Sci-Fi']
    },
    { 
      to: '/gaming', 
      label: lang === 'ar' ? 'ألعاب' : 'Gaming', 
      icon: Gamepad2, 
      color: '#ff0055',
      hasMega: true,
      categories: ['Action', 'Adventure', 'RPG', 'Strategy', 'Shooter']
    },
    { 
      to: '/anime', 
      label: lang === 'ar' ? 'أنمي' : 'Anime', 
      icon: Zap, 
      color: '#ffcc00',
      hasMega: true,
      categories: ['Shonen', 'Seinen', 'Shojo', 'Mecha', 'Slice of Life']
    },
  ]

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const cwQuery = useQuery({
    queryKey: ['continue-count', user?.id],
    queryFn: () => getContinueWatching(user!.id),
    enabled: !!user
  })
  const continueCount = cwQuery.data?.length ?? 0

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b border-white/5 ${
          scrolled ? 'bg-black/95 backdrop-blur-xl py-2 shadow-2xl' : 'bg-gradient-to-b from-black/90 to-black/0 py-4'
        }`}
        onMouseLeave={() => setHoveredLink(null)}
      >
        <div className="max-w-[2400px] mx-auto px-4 md:px-12 flex items-center justify-between">
            
            {/* Logo */}
            <Link to="/" className="group flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-lg animate-pulse blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 font-black text-2xl text-white tracking-tighter">
                  C<span className="text-cyan-400">.</span>
                </div>
              </div>
              <span className={`hidden md:block font-black ${lang === 'ar' ? 'tracking-normal text-lg font-cairo' : 'tracking-[0.2em] text-sm'} text-white group-hover:text-cyan-400 transition-colors`}>
                {lang === 'ar' ? (
                  <>سينما <span className="text-cyan-400">أونلاين</span></>
                ) : (
                  <>CINMA <span className="text-cyan-400">ONLINE</span></>
                )}
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div 
                  key={link.to} 
                  className="relative group"
                  onMouseEnter={() => setHoveredLink(link.label)}
                >
                  <Link
                    to={link.to}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    <link.icon size={16} style={{ color: link.color }} />
                    {link.label}
                    {link.hasMega && <ChevronDown size={14} className={`transition-transform duration-200 ${hoveredLink === link.label ? 'rotate-180' : ''}`} />}
                  </Link>
                  
                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {link.hasMega && hoveredLink === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[600px] z-50 pointer-events-none group-hover:pointer-events-auto"
                      >
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 grid grid-cols-3 gap-6 backdrop-blur-3xl">
                           <div className="col-span-1">
                              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <link.icon size={18} style={{ color: link.color }} />
                                {lang === 'ar' ? 'التصنيفات' : 'Categories'}
                              </h3>
                              <ul className="space-y-2">
                                {link.categories?.map(cat => (
                                  <li key={cat}>
                                    <Link to={`${link.to}?cat=${cat.toLowerCase()}`} className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors block">
                                      {cat}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                           </div>
                           <div className="col-span-2 bg-white/5 rounded-xl p-4">
                              <h3 className="text-white font-bold mb-4">{lang === 'ar' ? 'مميز' : 'Featured'}</h3>
                              <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center border border-white/5">
                                <span className="text-zinc-500 text-xs">Featured Content Preview</span>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <Search size={20} />
              </button>

              <button
                onClick={toggle}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
              >
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>

              {user && continueCount > 0 && (
                <Link to="/" className="relative p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition-colors" title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'}>
                  <Clock size={20} />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-cyan-500 text-[10px] font-black text-black flex items-center justify-center px-1">
                    {continueCount > 9 ? '9+' : continueCount}
                  </span>
                </Link>
              )}

              {user ? (
                <Link to="/profile">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                      {useAuth.getState().profile?.avatar_url ? (
                        <img 
                          src={useAuth.getState().profile!.avatar_url!} 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={18} className="text-white" />
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <Link to="/login" className="hidden md:block">
                  <button className="px-5 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform border border-white/10">
                    {lang === 'ar' ? 'دخول' : 'Login'}
                  </button>
                </Link>
              )}

              <button 
                className="lg:hidden p-2 text-white"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <link.icon size={20} style={{ color: link.color }} />
                    <span className="font-bold text-lg">{link.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-[2400px] px-4 md:px-12 z-[90]"
          >
            <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,204,0.1)] mx-auto bg-black/90">
              <SearchBar 
                placeholder={lang === 'ar' ? 'ابحث عن فيلمك المفضل...' : 'Initialize search protocol...'}
                className="w-full bg-transparent border-none text-3xl font-light text-white placeholder:text-white/20 focus:ring-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
