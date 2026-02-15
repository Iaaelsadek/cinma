import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode, useState, useEffect } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useLocation } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { QuranPlayerBar } from '../../context/QuranPlayerContext'

interface MainLayoutProps {
  children: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation()
  const { lang } = useLang()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`min-h-screen bg-luxury-obsidian font-inter selection:bg-primary selection:text-white ${lang === 'ar' ? 'font-cairo' : ''}`}>
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-luxury-purple/10 blur-[100px] rounded-full animate-pulse-glow delay-700" />
      </div>

      <Navbar isScrolled={isScrolled} />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 pb-24"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer />
      <QuranPlayerBar />
    </div>
  )
}
