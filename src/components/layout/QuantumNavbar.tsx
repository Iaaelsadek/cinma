import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchBar } from '../common/SearchBar'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { Home, Film, Tv, Gamepad2, Cpu, Zap, BookOpen, User, LogOut, Search, Menu, X, Map, Drama, Archive } from 'lucide-react'


export const QuantumNavbar = () => {
  const { user } = useAuth()
  const { lang, toggle } = useLang()
  
  const navLinks = [
    { to: '/', label: lang === 'ar' ? 'الرئيسية' : 'Home', icon: Home, color: '#00ffcc' },
    { to: '/movies', label: lang === 'ar' ? 'أفلام' : 'Movies', icon: Film, color: '#00ccff' },
    { to: '/series', label: lang === 'ar' ? 'مسلسلات' : 'Series', icon: Tv, color: '#aa00ff' },
    { to: '/gaming', label: lang === 'ar' ? 'ألعاب' : 'Gaming', icon: Gamepad2, color: '#ff0055' },
    { to: '/anime', label: lang === 'ar' ? 'أنمي' : 'Anime', icon: Zap, color: '#ffcc00' },
  ]

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className={`fixed top-4 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled ? 'top-[6px]' : 'top-[15px]'
        }`}
      >
        <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full flex justify-center">
          <div className="relative w-fit">
            {/* Glass Container */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
            
            {/* Content */}
          <div className="relative flex items-center gap-6 px-6 py-1">
            
            {/* Logo */}
            <Link to="/" className="group flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-lg animate-spin-slow blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 font-black text-2xl text-white tracking-tighter">
                  C<span className="text-cyan-400">.</span>
                </div>
              </div>
              <span className={`hidden md:block font-black ${lang === 'ar' ? 'tracking-normal text-xl font-cairo' : 'tracking-[0.2em] text-sm'} text-white group-hover:text-cyan-400 transition-colors`}>
                {lang === 'ar' ? (
                  <>سينما <span className="text-cyan-400">أونلاين</span></>
                ) : (
                  <>CINMA <span className="text-cyan-400">ONLINE</span></>
                )}
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative px-4 py-1.5 rounded-full text-xs font-bold text-zinc-400 hover:text-white transition-colors group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <link.icon size={16} style={{ color: link.color }} />
                    {link.label}
                  </span>
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[50%] bg-white/10 opacity-0 group-hover:opacity-100"
                    layoutId="nav-pill"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    style={{ borderBottomLeftRadius: 9999, borderBottomRightRadius: 9999 }}
                  />
                </Link>
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

              <Link to="/sitemap">
                <button className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <Map size={20} />
                </button>
              </Link>

              {user ? (
                <Link to="/profile">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <User size={18} className="text-white" />
                    </div>
                  </div>
                </Link>
              ) : (
                <Link to="/login" className="hidden md:block">
                  <button className="px-5 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                    {lang === 'ar' ? 'دخول' : 'Login'}
                  </button>
                </Link>
              )}

              <button 
                className="md:hidden p-2 text-white"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
          </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-2 overflow-hidden bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10"
            >
              <div className="flex flex-col p-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <link.icon size={18} style={{ color: link.color }} />
                    <span className="font-bold">{link.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-[2400px] px-4 md:px-12 z-[90]"
          >
            <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,204,0.1)] mx-auto">
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
