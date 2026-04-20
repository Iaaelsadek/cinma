import { useNavigate } from 'react-router-dom'
import { PrefetchLink } from '../common/PrefetchLink'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { getContinueWatching } from '../../lib/supabase'
import { useEffect, useState, useRef, useMemo, memo, Fragment } from 'react'
import { Home, Film, Tv, Gamepad2, Zap, User, Search, Menu, X, Clock, BookOpen, History, Smile, Drama, ListVideo, Moon, MapPin, Star, Mic, Loader2, Monitor, Smartphone, Apple, Terminal, Flame, Laugh, Skull, Rocket, Heart, Palette, Popcorn, Trophy, TrendingUp, Eye, Compass, Clapperboard, Ticket, ChevronDown } from 'lucide-react'


export const QuantumNavbar = memo(() => {
  const { user, loading, profile } = useAuth()
  const { lang, toggle } = useLang()

  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backdropTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (label: string) => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current)
      leaveTimeout.current = null
    }
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current)
    }
    if (backdropTimeout.current) {
      clearTimeout(backdropTimeout.current)
      backdropTimeout.current = null
    }
    enterTimeout.current = setTimeout(() => {
      setHoveredLink(label)
      enterTimeout.current = null
    }, 300)
  }

  const handleMouseLeave = () => {
    if (enterTimeout.current) {
      clearTimeout(enterTimeout.current)
      enterTimeout.current = null
    }
    leaveTimeout.current = setTimeout(() => {
      setHoveredLink(null)
      leaveTimeout.current = null
    }, 300)
  }

  const handleBackdropInteraction = () => {
    if (backdropTimeout.current) {
      clearTimeout(backdropTimeout.current)
    }
    backdropTimeout.current = setTimeout(() => {
      setHoveredLink(null)
      backdropTimeout.current = null
    }, 500)
  }

  const navLinks = useMemo(() => [
    {
      to: '/',
      label: lang === 'ar' ? 'الرئيسية' : 'Home',
      icon: Home,
      color: '#00ffcc'
    },
    {
      to: '/movies',
      label: lang === 'ar' ? 'أفلام' : 'Movies',
      icon: Film,
      color: '#00ccff'
    },
    {
      to: '/series',
      label: lang === 'ar' ? 'مسلسلات' : 'Series',
      icon: Tv,
      color: '#aa00ff'
    },
    {
      to: '/anime',
      label: lang === 'ar' ? 'أنمي' : 'Anime',
      icon: Zap,
      color: '#f59e0b'
    },
    {
      to: '/plays',
      label: lang === 'ar' ? 'مسرحيات' : 'Plays',
      icon: Drama,
      color: '#ef4444'
    },
    {
      to: '/software',
      label: lang === 'ar' ? 'برمجيات' : 'Software',
      icon: Monitor,
      color: '#10b981'
    },
    {
      to: '/quran',
      label: lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran',
      icon: BookOpen,
      color: '#ffd700'
    }
  ], [lang])

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
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
    <div className="w-full flex justify-center sticky top-0 z-[1000]">
      <nav
        className={`transition-all duration-300 w-full ${scrolled ? 'bg-black/95 backdrop-blur-xl py-2 shadow-2xl border-b border-white/10' : 'bg-gradient-to-b from-black/90 to-black/0 py-2'
          }`}
      >
        <div className="max-w-[2400px] mx-auto px-4 md:px-12 flex items-center justify-between transition-all duration-300 h-16">

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

          {/* Desktop Nav - Hidden on smaller screens to prevent overlap */}
          <div className="hidden xl:flex items-center gap-3">
            {/* Backdrop overlay when dropdown is open */}
            <AnimatePresence>
              {hoveredLink && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[999]"
                  onMouseEnter={handleBackdropInteraction}
                  onClick={handleBackdropInteraction}
                />
              )}
            </AnimatePresence>

            {navLinks.map((link) => (
              <div
                key={link.to}
                className="relative group h-full flex items-center z-[1000]"
                onMouseEnter={() => handleMouseEnter(link.label)}
                onMouseLeave={handleMouseLeave}
                onFocusCapture={() => handleMouseEnter(link.label)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    handleMouseLeave()
                  }
                }}
              >
                <PrefetchLink
                  to={link.to}
                  target="_self"
                  onClick={() => setHoveredLink(null)}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 hover:text-white transition-all duration-300 relative"
                >
                  <div className="relative p-1.5 rounded-xl hover:bg-white/5 transition-colors duration-300">
                    <link.icon size={18} style={{ color: link.color }} className="hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="uppercase tracking-wider hover:tracking-widest transition-all duration-300">
                    {link.label}
                  </span>
                </PrefetchLink>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center gap-4 relative">
              <div className="relative group">
                <input
                  id="navbar-search-desktop"
                  name="search"
                  type="text"
                  value={query || ''}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={isListening ? (lang === 'ar' ? 'تحدث الآن...' : 'Listening...') : (lang === 'ar' ? 'بحث...' : 'Search...')}
                  className="bg-zinc-900 border border-white/10 rounded-full py-2 pl-10 pr-10 text-sm text-zinc-300 w-36 lg:w-48 hover:bg-zinc-800 hover:border-cyan-500/30 transition-all focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  aria-label={lang === 'ar' ? 'بحث' : 'Search'}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-cyan-400 transition-colors ${lang === 'ar' ? 'right-auto left-3' : 'left-3 right-auto'}`}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={startListening}
                  aria-label={lang === 'ar' ? 'بحث صوتي' : 'Voice search'}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {user && continueCount > 0 && (
              <PrefetchLink to="/" target="_self" className="relative p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition-colors" title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'} aria-label={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'}>
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
                        width={36}
                        height={36}
                        style={{ aspectRatio: '1 / 1' }}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <User size={18} className="text-white" />
                    )}
                  </div>
                </div>
              </PrefetchLink>
            ) : (
              <PrefetchLink to="/login" target="_self" className="hidden md:block">
                <button className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform border border-white/10">
                  {lang === 'ar' ? 'دخول' : 'Login'}
                </button>
              </PrefetchLink>
            )}

            {/* Mobile Search Icon */}
            <button
              type="button"
              className="xl:hidden p-0.5 text-white"
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setMenuOpen(false);
              }}
              aria-label={showMobileSearch ? (lang === 'ar' ? 'إغلاق البحث' : 'Close search') : (lang === 'ar' ? 'فتح البحث' : 'Open search')}
              aria-expanded={showMobileSearch}
              aria-controls="mobile-search-panel"
            >
              <Search size={24} />
            </button>

            {/* Hamburger - Visible when Desktop Nav is hidden */}
            <button
              type="button"
              className="xl:hidden p-1.5 text-white"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setShowMobileSearch(false);
              }}
              aria-label={menuOpen ? (lang === 'ar' ? 'إغلاق القائمة' : 'Close menu') : (lang === 'ar' ? 'فتح القائمة' : 'Open menu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-panel"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {showMobileSearch && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileSearch(false)}
                className="xl:hidden fixed inset-0 top-[80px] z-30 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                id="mobile-search-panel"
                className="xl:hidden absolute top-full left-0 right-0 z-40 bg-black/95 border-b border-white/10 shadow-2xl"
              >
                <div className="p-4">
                  <div className="relative group">
                    <input
                      id="navbar-search-mobile"
                      name="search"
                      type="text"
                      value={query || ''}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch();
                          setShowMobileSearch(false);
                        }
                      }}
                      placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                      autoFocus
                      className="w-full bg-zinc-900 border border-white/10 rounded-full py-3 pl-10 pr-10 text-base text-zinc-300 hover:bg-zinc-800 hover:border-cyan-500/30 transition-all focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => { handleSearch(); setShowMobileSearch(false); }}
                      aria-label={lang === 'ar' ? 'تنفيذ البحث' : 'Run search'}
                      className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors ${lang === 'ar' ? 'left-4' : 'right-4'}`}
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              id="mobile-nav-panel"
              className="xl:hidden fixed inset-x-0 top-[80px] h-[calc(100vh-80px)] z-40 bg-black/95 backdrop-blur-md border-t border-white/10 overscroll-contain pb-32"
            >
              <div className="grid grid-cols-2 gap-3 p-4">
                {navLinks.map((link, i) => (
                  <Fragment key={link.to}>
                    <div className="flex flex-col col-span-1">
                      <PrefetchLink
                        to={link.to}
                        target="_self"
                        onClick={() => setMenuOpen(false)}
                        className="flex flex-col items-center justify-center gap-3 p-3 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 h-24 text-center"
                      >
                        <link.icon size={24} style={{ color: link.color }} />
                        <span className="font-bold text-sm">{link.label}</span>
                      </PrefetchLink>
                    </div>
                    {i === 0 && !user && (
                      <div className="col-span-1 flex flex-col">
                        <PrefetchLink
                          to="/login"
                          target="_self"
                          onClick={() => setMenuOpen(false)}
                          className="flex flex-col items-center justify-center gap-3 p-3 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 h-24 text-center"
                        >
                          <User size={24} className="text-white" />
                          <span className="font-bold text-sm">{lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</span>
                        </PrefetchLink>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  )
})
