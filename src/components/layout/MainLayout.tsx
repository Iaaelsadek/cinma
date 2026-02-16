import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { QuantumNavbar } from './QuantumNavbar'
import { LivingBackground } from '../effects/LivingBackground'
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

  return (
    <div className={`min-h-screen font-inter selection:bg-cyan-500 selection:text-black ${lang === 'ar' ? 'font-cairo' : ''}`}>
      {/* THE LIVING ORGANISM CORE */}
      <LivingBackground />

      <QuantumNavbar />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 pb-24 pt-0 max-w-[2400px] mx-auto border-x border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] min-h-screen bg-black/40 backdrop-blur-sm"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer />
      <QuranPlayerBar />
    </div>
  )
}
