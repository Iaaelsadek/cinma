import { Link } from 'react-router-dom'
import { PrefetchLink } from '../common/PrefetchLink'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { usePwa } from '../../context/PwaContext'
import { getContinueWatching } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, User, Search, Menu, X, Clock, ChevronDown, BookOpen, History, Smile, Drama, Radio, ListVideo, Moon, Download, MapPin } from 'lucide-react'


export const QuantumNavbar = () => {
  const { user } = useAuth()
  const { lang, toggle } = useLang()
  const { isSupported, isInstalled, install } = usePwa()
  
  const navLinks = [
    { 
      to: '/', 
      label: lang === 'ar' ? 'الرئيسية' : 'Home', 
      icon: Home, 
      color: '#00ffcc',
      hasMega: false
    },
    { 
      to: '/ramadan', 
      label: lang === 'ar' ? 'رمضانيات' : 'Ramadan', 
      icon: Moon, 
      color: '#ffd700',
      hasMega: true,
      subLinks: [
        { to: '/quran', label: lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran', icon: BookOpen },
        { to: '/search?types=tv&keywords=ramadan', label: lang === 'ar' ? 'مسلسلات رمضان' : 'Ramadan Series', icon: Tv },
        { to: '/search?types=tv&lang=ar', label: lang === 'ar' ? 'برامج دينية' : 'Religious Shows', icon: BookOpen }
      ]
    },
    { 
      to: '/plays', 
      label: lang === 'ar' ? 'مسرحيات' : 'Plays', 
      icon: Drama, 
      color: '#ef4444',
      hasMega: true,
      subLinks: [
        { to: '/plays/adel-imam', label: lang === 'ar' ? 'عادل إمام' : 'Adel Imam', icon: Smile },
        { to: '/plays/masrah-masr', label: lang === 'ar' ? 'مسرح مصر' : 'Masrah Masr', icon: User },
        { to: '/plays/classics', label: lang === 'ar' ? 'كلاسيكيات' : 'Classics', icon: Radio },
        { to: '/plays/gulf', label: lang === 'ar' ? 'خليجي' : 'Gulf Plays', icon: MapPin }
      ]
    },
    { 
      to: '/series', 
      label: lang === 'ar' ? 'مسلسلات' : 'Series', 
      icon: Tv, 
      color: '#aa00ff',
      hasMega: true,
      featuredImage: 'https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiTFSxTTlxI.jpg',
      subLinks: [
        { to: '/search?types=tv&lang=tr', label: lang === 'ar' ? 'تركي (مدبلج/مترجم)' : 'Turkish', icon: Film },
        { to: '/search?types=tv&lang=ar', label: lang === 'ar' ? 'عربي (مصري/شامي)' : 'Arabic', icon: Tv },
        { to: '/search?types=tv&lang=en', label: lang === 'ar' ? 'أجنبي' : 'Foreign', icon: Zap },
      ],
      categories: [
        { id: 'Drama', label: { en: 'Drama', ar: 'دراما' } },
        { id: 'Comedy', label: { en: 'Comedy', ar: 'كوميديا' } },
        { id: 'Action', label: { en: 'Action', ar: 'أكشن' } },
        { id: 'Romance', label: { en: 'Romance', ar: 'رومانسي' } },
      ]
    },
    { 
      to: '/movies', 
      label: lang === 'ar' ? 'أفلام' : 'Movies', 
      icon: Film, 
      color: '#00ccff',
      hasMega: true,
      featuredImage: 'https://image.tmdb.org/t/p/w1280/pwsD91G2R6r8keDrx6u7hOEZhXp.jpg',
      subLinks: [
        { to: '/search?types=movie&lang=ar', label: lang === 'ar' ? 'عربي' : 'Arabic', icon: Film },
        { to: '/search?types=movie&lang=en&genres=28,878,27', label: lang === 'ar' ? 'أجنبي (أكشن/رعب)' : 'Foreign (Action/Horror)', icon: Zap },
        { to: '/search?types=movie&lang=hi', label: lang === 'ar' ? 'هندي' : 'Indian', icon: Smile },
        { to: '/classics', label: lang === 'ar' ? 'كلاسيكيات' : 'Classics', icon: Radio },
        { to: '/summaries', label: lang === 'ar' ? 'ملخصات' : 'Summaries', icon: ListVideo },
      ],
      categories: [
        { id: 'Action', label: { en: 'Action', ar: 'أكشن' } },
        { id: 'Comedy', label: { en: 'Comedy', ar: 'كوميديا' } },
        { id: 'Horror', label: { en: 'Horror', ar: 'رعب' } },
        { id: 'Sci-Fi', label: { en: 'Sci-Fi', ar: 'خيال علمي' } }
      ]
    },
    { 
      to: '/kids', 
      label: lang === 'ar' ? 'أطفال' : 'Kids', 
      icon: Smile, 
      color: '#ffcc00',
      hasMega: true,
      subLinks: [
        { to: '/search?types=movie&genres=16', label: lang === 'ar' ? 'ديزني' : 'Disney', icon: Zap },
        { to: '/anime', label: lang === 'ar' ? 'أنمي' : 'Anime', icon: Gamepad2 }
      ]
    }
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
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled ? 'bg-black/95 backdrop-blur-xl py-2 shadow-2xl' : 'bg-gradient-to-b from-black/90 to-black/0 py-4'
        }`}
        onMouseLeave={() => setHoveredLink(null)}
      >
        <div className="w-full px-4 md:px-12 flex items-center justify-between transition-all duration-300">
            
            {/* Logo */}
            <PrefetchLink to="/" className="group flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="relative z-10 font-black text-3xl tracking-tighter uppercase group-hover:scale-105 transition-transform duration-300 flex items-center gap-1">
                  <span 
                    className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 text-glitch-sm"
                    data-text="Cinema"
                  >
                    Cinema
                  </span>
                  <span className="text-red-600 animate-pulse text-4xl mb-2 leading-[0] drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]">.</span>
                  <div className="flex" dir="ltr">
                    <span className="text-cyan-400 animate-neon-flicker-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      On
                    </span>
                    <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                      li
                    </span>
                    <span className="text-cyan-400 animate-neon-flicker-cyan-alt drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                      n
                    </span>
                    <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                      e
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
              </div>
            </PrefetchLink>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div 
                  key={link.to} 
                  className="relative group"
                  onMouseEnter={() => setHoveredLink(link.label)}
                >
                  <PrefetchLink
                    to={link.to}
                    className="flex items-center gap-1 px-2.5 py-3 text-lg font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    <link.icon size={21} style={{ color: link.color }} />
                    {link.label}
                    {link.hasMega && <ChevronDown size={17} className={`transition-transform duration-200 ${hoveredLink === link.label ? 'rotate-180' : ''}`} />}
                  </PrefetchLink>
                  
                  {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {link.hasMega && hoveredLink === link.label && (
          <div
            className="fixed top-[70px] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 pointer-events-none group-hover:pointer-events-auto px-4"
          >
            <div className="bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-xl overflow-hidden p-6 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
               <div className="w-full flex flex-col gap-6">
                  {/* SubLinks Section */}
                  {link.subLinks && (
                    <div>
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                        {lang === 'ar' ? 'الأقسام' : 'Sections'}
                      </h3>
                      <ul className="grid grid-cols-1 gap-2">
                        {link.subLinks.map(sub => (
                          <li key={sub.to}>
                            <PrefetchLink to={sub.to} className="flex items-center gap-3 text-zinc-300 hover:text-cyan-400 transition-colors py-1 group/sub">
                              {sub.icon && <sub.icon size={18} className="text-zinc-500 group-hover/sub:text-cyan-400 transition-colors" />}
                              <span className="font-medium">{sub.label}</span>
                            </PrefetchLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Categories Section */}
                  {link.categories && (
                    <div>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <link.icon size={18} style={{ color: link.color }} />
                        {lang === 'ar' ? 'التصنيفات' : 'Categories'}
                      </h3>
                      <ul className="grid grid-cols-2 gap-2">
                        {link.categories.map(cat => (
                          <li key={cat.id}>
                            <PrefetchLink to={`${link.to}?cat=${cat.id.toLowerCase()}`} className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors block py-1">
                              {lang === 'ar' ? cat.label.ar : cat.label.en}
                            </PrefetchLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <Search size={25} />
              </button>

              {isSupported && !isInstalled && (
                <button
                  onClick={install}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 rounded-full border border-lumen-gold/50 text-lumen-gold/90 hover:bg-lumen-gold/10 text-base font-bold transition-colors"
                  title={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                >
                  <Download size={19} />
                  {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                </button>
              )}

              <button 
                onClick={toggle}
                className="w-[48px] h-[48px] rounded-full border border-white/10 flex items-center justify-center text-[13px] font-black hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
              >
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>

              {user && continueCount > 0 && (
                <PrefetchLink to="/" className="relative p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition-colors" title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'}>
                  <Clock size={25} />
                  <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] rounded-full bg-cyan-500 text-[13px] font-black text-black flex items-center justify-center px-1">
                    {continueCount > 9 ? '9+' : continueCount}
                  </span>
                </PrefetchLink>
              )}

              {user ? (
                <PrefetchLink to="/profile">
                  <div className="w-[48px] h-[48px] rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                      {useAuth.getState().profile?.avatar_url ? (
                        <img 
                          src={useAuth.getState().profile!.avatar_url!} 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={23} className="text-white" />
                      )}
                    </div>
                  </div>
                </PrefetchLink>
              ) : (
                <PrefetchLink to="/login" className="hidden md:block">
                  <button className="px-6 py-3 rounded-full bg-white text-black text-base font-black uppercase tracking-widest hover:scale-105 transition-transform border border-white/10">
                    {lang === 'ar' ? 'دخول' : 'Login'}
                  </button>
                </PrefetchLink>
              )}

              <button 
                className="lg:hidden p-1.5 text-white"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={30} /> : <Menu size={30} />}
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
              className="lg:hidden bg-black/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-4 space-y-2">
                {navLinks.map((link) => (
                  <div key={link.to} className="flex flex-col">
                    <PrefetchLink
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                      <link.icon size={20} style={{ color: link.color }} />
                      <span className="font-bold text-lg">{link.label}</span>
                    </PrefetchLink>
                    {link.subLinks && (
                      <div className="flex flex-col gap-1 px-4 border-r border-white/5 mr-6 pr-4">
                        {link.subLinks.map(sub => (
                          <PrefetchLink
                            key={sub.to}
                            to={sub.to}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                          >
                            {sub.icon && <sub.icon size={18} />}
                            <span className="font-medium">{sub.label}</span>
                          </PrefetchLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isSupported && !isInstalled && (
                  <button
                    onClick={() => { install(); setMenuOpen(false); }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-lumen-gold/40 bg-lumen-gold/5 text-lumen-gold hover:bg-lumen-gold/10 transition-colors mt-2 w-full"
                  >
                    <Download size={20} />
                    <span className="font-bold text-lg">{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 z-[89] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-0 right-0 mx-auto w-full max-w-3xl px-4 z-[90]"
            >
              <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,204,0.1)] bg-black/90">
                <SearchBar 
                  placeholder={lang === 'ar' ? 'ابحث عن فيلمك المفضل...' : 'Initialize search protocol...'}
                  className="w-full bg-transparent border-none text-xl font-light text-white placeholder:text-white/20 focus:ring-0"
                  autoFocus
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
