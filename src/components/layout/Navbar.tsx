import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { Menu, X, User, LogOut, LayoutDashboard, Download, Home, Film, Tv, Gamepad2, Cpu, Zap, BookOpen, Smile } from 'lucide-react'

// Add this install hook
const useInstallPrompt = () => {
  const [prompt, setPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = () => {
    if (!prompt) return
    prompt.prompt()
    prompt.userChoice.then((choice: any) => {
      if (choice.outcome === 'accepted') {
        setPrompt(null)
      }
    })
  }

  return { prompt, install }
}

export const Navbar = ({ isScrolled }: { isScrolled?: boolean }) => {
  const { user, loading } = useAuth()
  const { lang, toggle } = useLang()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const { prompt, install } = useInstallPrompt() // Use the hook
  const [searchResults, setSearchResults] = useState<{
    movies: Array<{ id: number; title: string; poster_path: string | null }>
    series: Array<{ id: number; title: string; poster_path: string | null }>
    games: Array<{ id: number; title: string; poster_url: string | null; category: string | null }>
    software: Array<{ id: number; title: string; poster_url: string | null; category: string | null }>
    anime: Array<{ id: number; title: string; image_url: string | null; category: string | null }>
    reciters: Array<{ id: number; name: string; image: string | null; rewaya: string | null }>
  }>({
    movies: [],
    series: [],
    games: [],
    software: [],
    anime: [],
    reciters: []
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (loading) return
      if (!user) {
        setIsAdmin(false)
        return
      }
      const p = await getProfile(user.id)
      if (!cancelled) setIsAdmin(p?.role === 'admin')
    })()
    return () => { cancelled = true }
  }, [user, loading])

  useEffect(() => {
    let cancelled = false
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults({
        movies: [],
        series: [],
        games: [],
        software: [],
        anime: [],
        reciters: []
      })
      return
    }
    ;(async () => {
      setSearchLoading(true)
      const like = `%${q}%`
      const [movies, series, games, software, anime, reciters] = await Promise.all([
        supabase.from('movies').select('id,title,poster_path').ilike('title', like).limit(5),
        supabase.from('tv_series').select('id,title,poster_path').ilike('title', like).limit(5),
        supabase.from('games').select('id,title,poster_url,category').ilike('title', like).limit(5),
        supabase.from('software').select('id,title,poster_url,category').ilike('title', like).limit(5),
        supabase.from('anime').select('id,title,image_url,category').ilike('title', like).limit(5),
        supabase.from('quran_reciters').select('id,name,image,rewaya').ilike('name', like).limit(5)
      ])
      if (cancelled) return
      setSearchResults({
        movies: (movies.data as any[]) || [],
        series: (series.data as any[]) || [],
        games: (games.data as any[]) || [],
        software: (software.data as any[]) || [],
        anime: (anime.data as any[]) || [],
        reciters: (reciters.data as any[]) || []
      })
      setSearchLoading(false)
    })()
    return () => { cancelled = true }
  }, [searchQuery])

  const hasResults = useMemo(() => {
    return (
      searchResults.movies.length ||
      searchResults.series.length ||
      searchResults.games.length ||
      searchResults.software.length ||
      searchResults.anime.length ||
      searchResults.reciters.length
    )
  }, [searchResults])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const navLinks = [
    { to: '/', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { to: '/movies', label: lang === 'ar' ? 'الأفلام' : 'Movies' },
    { to: '/series', label: lang === 'ar' ? 'المسلسلات' : 'Series' },
    { to: '/gaming', label: lang === 'ar' ? 'الألعاب' : 'Gaming' },
    { to: '/software', label: lang === 'ar' ? 'البرمجيات' : 'Software' },
    { to: '/anime', label: lang === 'ar' ? 'الأنمي' : 'Anime' },
    { to: '/quran', label: lang === 'ar' ? 'القرآن' : 'Quran' },
    { to: '/kids', label: lang === 'ar' ? 'الأطفال' : 'Kids' }
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 md:px-8 py-3 ${
        isScrolled ? 'bg-black/80 border-b border-white/10 backdrop-blur-xl shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto grid max-w-[1920px] grid-cols-[auto_1fr_auto] items-center gap-6 h-16">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-neon-blue">
            {lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online'}
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:text-white"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-primary transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex justify-center">
          <div className="relative w-full max-w-xl">
            <SearchBar
              placeholder={lang === 'ar' ? 'ابحث عن فيلم، مسلسل، لعبة...' : 'Search movies, series, games...'}
              size="lg"
              className="w-full rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm font-semibold placeholder:text-zinc-500 focus:border-primary focus:ring-2 focus:ring-primary/40"
              onQueryChange={setSearchQuery}
            />
            {(searchQuery.trim().length > 1 && (hasResults || searchLoading)) && (
              <div className="absolute left-0 right-0 top-full mt-3 glass-card p-4">
                {searchLoading && (
                  <div className="text-xs font-semibold text-zinc-400">
                    {lang === 'ar' ? 'جارٍ البحث...' : 'Searching...'}
                  </div>
                )}
                {!searchLoading && !hasResults && (
                  <div className="text-xs font-semibold text-zinc-400">
                    {lang === 'ar' ? 'لا توجد نتائج بعد' : 'No results yet'}
                  </div>
                )}
                {!searchLoading && hasResults && (
                  <div className="grid gap-4">
                    {searchResults.movies.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'أفلام' : 'Movies'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.movies.map((m) => (
                            <Link key={`movie-${m.id}`} to={`/movie/${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                              <div className="h-10 w-7 overflow-hidden rounded-md bg-white/10">
                                {m.poster_path && <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} alt={m.title} className="h-full w-full object-cover" />}
                              </div>
                              <span className="line-clamp-1">{m.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.series.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'مسلسلات' : 'Series'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.series.map((m) => (
                            <Link key={`series-${m.id}`} to={`/series/${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                              <div className="h-10 w-7 overflow-hidden rounded-md bg-white/10">
                                {m.poster_path && <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} alt={m.title} className="h-full w-full object-cover" />}
                              </div>
                              <span className="line-clamp-1">{m.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.games.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'ألعاب' : 'Games'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.games.map((m) => (
                            <Link key={`game-${m.id}`} to={`/game/${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-white/10">
                                {m.poster_url && <img src={m.poster_url} alt={m.title} className="h-full w-full object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1">{m.title}</div>
                                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{m.category || ''}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.software.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'برمجيات' : 'Software'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.software.map((m) => (
                            <Link key={`software-${m.id}`} to={`/software/${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-white/10">
                                {m.poster_url && <img src={m.poster_url} alt={m.title} className="h-full w-full object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1">{m.title}</div>
                                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{m.category || ''}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.anime.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'أنمي' : 'Anime'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.anime.map((m) => (
                            <div key={`anime-${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white">
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-white/10">
                                {m.image_url && <img src={m.image_url} alt={m.title} className="h-full w-full object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1">{m.title}</div>
                                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{m.category || ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchResults.reciters.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {lang === 'ar' ? 'قرّاء القرآن' : 'Quran Reciters'}
                        </div>
                        <div className="grid gap-2">
                          {searchResults.reciters.map((m) => (
                            <div key={`reciter-${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm font-semibold text-white">
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-white/10">
                                {m.image && <img src={m.image} alt={m.name} className="h-full w-full object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <div className="line-clamp-1">{m.name}</div>
                                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{m.rewaya || ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Link to={`/search?q=${encodeURIComponent(searchQuery.trim())}`} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/20">
                      {lang === 'ar' ? 'عرض كل النتائج' : 'View all results'}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => toggle()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-[11px] font-bold text-zinc-300 transition-all hover:bg-white/20 hover:border-white/20 active:scale-95"
            >
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-1.5 pr-4 transition-all hover:bg-white/20 hover:border-white/20">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-neon-blue p-[1px]">
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#050505]">
                      <User size={14} className="text-white" />
                    </div>
                  </div>
                  <span className="hidden text-sm font-bold text-white xl:block">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
                {/* Dropdown Menu - Simplified for brevity */}
                <div className="absolute right-0 top-full mt-2 w-56 origin-top-right scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <div className="glass-card p-2">
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-primary/10 hover:text-primary">
                        <LayoutDashboard size={18} />
                        {lang === 'ar' ? 'لوحة الإدارة' : 'Dashboard'}
                      </Link>
                    )}
                    <Link to="/profile" className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                      <User size={18} />
                      {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
                    </Link>
                    <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
                      <LogOut size={18} />
                      {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-neon-emerald transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
              >
                {lang === 'ar' ? 'دخول' : 'Sign In'}
              </Link>
            )}

            <button 
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Desktop Install Button - Only shows if PWA is installable */}
            {prompt && (
              <button
                onClick={install}
                className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                title={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-2xl lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#050505] border-l border-white/10 p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                  {lang === 'ar' ? 'خريطة الموقع' : 'Sitemap'}
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 w-10 rounded-xl bg-white/5 text-white flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mb-5">
                <SearchBar
                  placeholder={lang === 'ar' ? 'ابحث بسرعة...' : 'Quick search...'}
                  size="lg"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold placeholder:text-zinc-500 focus:border-primary focus:ring-2 focus:ring-primary/40"
                  aria-label={lang === 'ar' ? 'بحث سريع' : 'Quick search'}
                />
              </div>
              <nav className="grid gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    {link.icon && <link.icon size={20} className="text-primary" />}
                    {link.label}
                  </Link>
                ))}
                
                {prompt && (
                  <button
                    onClick={() => {
                      install()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-3 rounded-xl bg-primary/20 px-4 py-3 text-base font-bold text-primary hover:bg-primary/30 mt-4"
                  >
                    <Download size={20} />
                    {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                  </button>
                )}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
