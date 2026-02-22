import { Link, useNavigate } from 'react-router-dom'
import { PrefetchLink } from '../common/PrefetchLink'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { usePwa } from '../../context/PwaContext'
import { getContinueWatching } from '../../lib/supabase'
import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, User, Search, Menu, X, Clock, ChevronDown, BookOpen, History, Smile, Drama, Radio, ListVideo, Moon, Download, MapPin, Star, Mic, Loader2 } from 'lucide-react'


export const QuantumNavbar = memo(() => {
  const { user, loading, profile } = useAuth()
  const { lang, toggle } = useLang()
  const { isSupported, isInstalled, install } = usePwa()
  
  const leaveTimeout = useRef<any>(null)

  const handleMouseEnter = (label: string) => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current)
      leaveTimeout.current = null
    }
    setHoveredLink(label)
  }

  const handleMouseLeave = () => {
    leaveTimeout.current = setTimeout(() => {
      setHoveredLink(null)
      leaveTimeout.current = null
    }, 300)
  }

  const navLinks = useMemo(() => [
    { 
      to: '/', 
      label: lang === 'ar' ? 'الرئيسية' : 'Home', 
      icon: Home, 
      color: '#00ffcc',
      hasMega: false
    },
    { 
      to: '/top-watched', 
      label: lang === 'ar' ? 'الأكثر مشاهدة' : 'Top Watched', 
      icon: Zap, 
      color: '#ff4400',
      hasMega: true,
      subLinks: [
        { to: '/top-watched', label: lang === 'ar' ? 'الكل' : 'All Trending', icon: Zap },
        { to: '/movies/popular', label: lang === 'ar' ? 'أفلام رائجة' : 'Popular Movies', icon: Film },
        { to: '/series/popular', label: lang === 'ar' ? 'مسلسلات رائجة' : 'Popular Series', icon: Tv },
        { to: '/movies/top_rated', label: lang === 'ar' ? 'أعلى الأفلام تقييماً' : 'Top Rated Movies', icon: Star },
        { to: '/series/top_rated', label: lang === 'ar' ? 'أعلى المسلسلات تقييماً' : 'Top Rated Series', icon: Star }
      ]
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
        { to: '/search?types=tv&lang=ko', label: lang === 'ar' ? 'دراما كورية' : 'Korean Drama', icon: Film },
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
        { to: '/anime', label: lang === 'ar' ? 'أنمي' : 'Anime', icon: Gamepad2 },
        { to: '/search?types=tv&keywords=spacetoon', label: lang === 'ar' ? 'سبيستون' : 'Spacetoon', icon: Smile },
        { to: '/search?types=movie&genres=16', label: lang === 'ar' ? 'أفلام كرتون' : 'Animation', icon: Film }
      ]
    }
  ], [lang])

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

  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setQuery(text);
        // Automatically search or just fill input?
        // User asked to type in the box, so just fill it seems fine, or maybe auto-search.
        // Let's just fill it for now as per "write in the same box".
      };

      recognition.start();
    } else {
      alert(lang === 'ar' ? 'البحث الصوتي غير مدعوم' : 'Voice search not supported');
    }
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="w-full flex justify-center">
      <nav
        className={`transition-all duration-300 w-full ${
          scrolled ? 'bg-black/95 backdrop-blur-xl py-2 shadow-2xl border-x border-b border-white/10 rounded-b-2xl' : 'bg-gradient-to-b from-black/90 to-black/0 py-2'
        }`}
      >
        <div className="w-full mx-auto px-4 md:px-8 flex items-center justify-between transition-all duration-300 h-16">
            
            {/* Logo */}
            <PrefetchLink to="/" target="_self" className="group flex items-center gap-2 shrink-0">
              <div className="relative flex items-center justify-center">
                <div className="relative z-10 font-black text-3xl tracking-tighter uppercase group-hover:scale-105 transition-transform duration-300 flex items-center gap-1">
                  <span 
                    className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 text-glitch-sm"
                    data-text="Cinema"
                  >
                    Cinema
                  </span>
                  <span className="text-red-600 animate-pulse text-4xl mb-1 leading-[0] drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]">.</span>
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

            {/* Combined Nav & Actions Group for maximum separation */}
            <div className="flex items-center gap-4 flex-1 justify-between">
              {/* Desktop Nav - Hidden on smaller screens to prevent overlap */}
              <div className="hidden xl:flex items-center gap-3 mx-auto">
                {navLinks.map((link) => (
                  <div 
                    key={link.to} 
                    className="relative group h-full flex items-center"
                    onMouseEnter={() => handleMouseEnter(link.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <PrefetchLink
                      to={link.to}
                      target="_self"
                      className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 group-hover:text-white transition-all duration-300 relative"
                    >
                      <div className="relative p-1.5 rounded-xl group-hover:bg-white/5 transition-colors duration-300">
                        <link.icon size={18} style={{ color: link.color }} className="group-hover:scale-110 transition-transform duration-300" />
                        {link.hasMega && (
                          <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${hoveredLink === link.label ? 'opacity-100' : ''}`} />
                        )}
                      </div>
                      <span className="uppercase tracking-wider group-hover:tracking-widest transition-all duration-300">{link.label}</span>
                    </PrefetchLink>
                    
                    {/* Mega Menu Dropdown */}
        <AnimatePresence>
          {link.hasMega && hoveredLink === link.label && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-1/2 -translate-x-1/2 w-max z-50 pt-4"
              onMouseEnter={() => handleMouseEnter(link.label)}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-xl overflow-hidden p-6 backdrop-blur-sm min-w-[280px]"
              >
                 <div className="w-full flex flex-col gap-6">
                    {/* SubLinks Section */}
                    {link.subLinks && (
                      <div>
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                          {lang === 'ar' ? 'الأقسام' : 'Sections'}
                        </h3>
                        <ul className="grid grid-cols-1 gap-2">
                          {link.subLinks.map((sub, i) => (
                            <li key={`${sub.to}-${i}`}>
                              <PrefetchLink to={sub.to} target="_self" className="flex items-center gap-3 text-zinc-300 hover:text-cyan-400 transition-colors py-1 group/sub">
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
                              <PrefetchLink to={`${link.to}?cat=${cat.id.toLowerCase()}`} target="_self" className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors block py-1">
                                {lang === 'ar' ? cat.label.ar : cat.label.en}
                              </PrefetchLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Search */}
              <div className="hidden md:flex items-center gap-4 relative">
                <div className="relative group">
                   <input 
                    type="text" 
                    value={query || ''}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={isListening ? (lang === 'ar' ? 'تحدث الآن...' : 'Listening...') : (lang === 'ar' ? 'بحث...' : 'Search...')}
                    className="bg-zinc-900 border border-white/10 rounded-full py-2 pl-10 pr-10 text-sm text-zinc-300 w-36 lg:w-48 hover:bg-zinc-800 hover:border-cyan-500/30 transition-all focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                  />
                  <button 
                    onClick={handleSearch}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-cyan-400 transition-colors ${lang === 'ar' ? 'right-auto left-3' : 'left-3 right-auto'}`}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={startListening}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                  >
                    {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSupported && !isInstalled && (
                <button
                  onClick={install}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 rounded-full border border-lumen-gold/50 text-lumen-gold/90 hover:bg-lumen-gold/10 text-xs font-bold transition-colors"
                  title={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                >
                  <Download size={14} />
                  {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                </button>
              )}

              <button 
                onClick={toggle}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
              >
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>

              {user && continueCount > 0 && (
                <PrefetchLink to="/" target="_self" className="relative p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition-colors" title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'}>
                  <Clock size={20} />
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-cyan-500 text-[10px] font-black text-black flex items-center justify-center px-0.5">
                    {continueCount > 9 ? '9+' : continueCount}
                  </span>
                </PrefetchLink>
              )}

            {user || loading ? ( // Show user icon (or skeleton) if logged in OR loading to prevent flicker
                <PrefetchLink to={user ? "/profile" : "#"} target="_self">
                  <div className={`w-9 h-9 rounded-full p-[1.5px] ${loading ? 'bg-white/10 animate-pulse' : 'bg-gradient-to-tr from-purple-500 to-cyan-500'}`}>
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={18} className="text-white" />
                      )}
                    </div>
                  </div>
                </PrefetchLink>
              ) : (
            <>
              <PrefetchLink to="/login" target="_self" className="hidden md:block">
                <button className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform border border-white/10">
                  {lang === 'ar' ? 'دخول' : 'Login'}
                </button>
              </PrefetchLink>
              <PrefetchLink to="/login" target="_self" className="md:hidden">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:border-cyan-400/50 transition-colors">
                  <User size={16} className="text-zinc-400" />
                </div>
              </PrefetchLink>
            </>
          )}

              {/* Hamburger - Visible when Desktop Nav is hidden */}
              <button 
                className="xl:hidden p-1.5 text-white"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
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
              className="xl:hidden bg-black/95 backdrop-blur-md border-t border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-4 space-y-2">
                {navLinks.map((link) => (
                  <div key={link.to} className="flex flex-col">
                    <PrefetchLink
                      to={link.to}
                      target="_self"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                      <link.icon size={20} style={{ color: link.color }} />
                      <span className="font-bold text-lg">{link.label}</span>
                    </PrefetchLink>
                    {link.subLinks && (
                      <div className="flex flex-col gap-1 px-4 border-r border-white/5 mr-6 pr-4">
                        {link.subLinks.map((sub, i) => (
                          <PrefetchLink
                            key={`${sub.to}-${i}`}
                            to={sub.to}
                            target="_self"
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
    </div>
  )
})
