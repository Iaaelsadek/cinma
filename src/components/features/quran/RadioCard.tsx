import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import { useLang } from '../../../state/useLang'

export const RadioCard = () => {
  const { lang } = useLang()
  
  return (
    <motion.button 
      whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(245,158,11,0.4)" }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        const width = 420
        const height = Math.max(320, Math.round((window.screen?.height || 700) * 0.5))
        const left = Math.max(0, Math.round(((window.screen?.width || 900) - width) / 2))
        const top = Math.max(0, Math.round(((window.screen?.height || 700) - height) / 2))

        const popup = window.open(
          '/quran/radio',
          'QuranRadio',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
        )

        if (popup) {
          try {
            popup.opener = null
            popup.focus()
          } catch {
            popup.focus()
          }
          return
        }

        window.location.href = '/quran/radio'
      }}
      className="group relative flex items-center gap-3 md:gap-4 px-4 py-2 md:px-7 md:py-3.5 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-500/40 text-amber-100 transition-all duration-500 shadow-[0_0_25px_rgba(245,158,11,0.2)] overflow-hidden"
    >
      {/* Shimmering Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 group-hover:bg-amber-500/30 group-hover:border-amber-300 transition-all duration-300">
        <Radio size={16} className="animate-pulse text-amber-400 md:hidden" />
        <Radio size={22} className="animate-pulse text-amber-400 hidden md:block" />
      </div>
      <div className="flex flex-col items-start relative z-10">
        <span className="text-base md:text-xl font-bold font-amiri leading-none mb-0.5 md:mb-1 text-white group-hover:text-amber-300 transition-colors">
          {lang === 'ar' ? 'إذاعة القرآن الكريم' : 'Quran Radio'}
        </span>
        <span className="text-[8px] md:text-[11px] text-amber-400/80 font-normal flex items-center gap-2">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 animate-ping" />
          {lang === 'ar' ? 'بث مباشر على مدار الساعة' : 'Live 24/7 Spiritual Broadcast'}
        </span>
      </div>
    </motion.button>
  )
}
