import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'
import { QuantumNavbar } from './QuantumNavbar'
import { AuroraBackground } from '../effects/AuroraBackground'
import { Footer } from './Footer'
import { useLocation } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { QuranPlayerBar } from '../../context/QuranPlayerContext'
import { PwaInstallPrompt } from '../common/PwaInstallPrompt'

interface MainLayoutProps {
  children: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation()
  const { lang } = useLang()

  return (
    <div className={`min-h-screen font-dm selection:bg-lumen-gold selection:text-lumen-void ${lang === 'ar' ? 'font-cairo' : ''}`}>
      {/* THE LIVING ORGANISM CORE */}
      <AuroraBackground />

      <QuantumNavbar />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 pb-24 pt-0 w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto border-x border-lumen-muted/50 min-h-screen bg-lumen-void/60 backdrop-blur-sm transition-all duration-300 overflow-x-hidden"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer />
      <QuranPlayerBar />
      <PwaInstallPrompt />
    </div>
  )
}
