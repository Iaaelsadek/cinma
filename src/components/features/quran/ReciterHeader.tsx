import { motion } from 'framer-motion'
import { ReciterImage } from './ReciterImage'
import { useLang } from '../../../state/useLang'
import type { QuranReciter } from './ReciterList'

interface ReciterHeaderProps {
  reciter: QuranReciter
}

export const ReciterHeader = ({ reciter }: ReciterHeaderProps) => {
  const { lang } = useLang()
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative shrink-0 mb-3 rounded-3xl overflow-hidden bg-amber-950/20 border border-amber-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] h-[8vh] min-h-[64px] group"
    >
      {/* Background with Islamic Pattern & Blur */}
      <div className="absolute inset-0 z-0">
        <ReciterImage 
          src={reciter.image} 
          alt={reciter.name} 
          className="w-full h-full object-cover opacity-20 blur-md scale-110 group-hover:scale-100 transition-transform duration-1000"
          id={reciter.id}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-950 via-amber-950/60 to-transparent" />
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l10 10v10l-10 10-10-10V10z' fill='%23f59e0b' fill-opacity='0.2'/%3E%3C/svg%3E")` }} />
      </div>

      <div className="relative z-10 h-full flex items-end p-2">
        <div className="flex items-center gap-3 w-full">
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl shrink-0 bg-amber-900/20 relative group-hover:border-amber-500/60 transition-colors duration-500"
          >
            <ReciterImage 
              src={reciter.image} 
              alt={reciter.name} 
              className="w-full h-full object-cover"
              id={reciter.id}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-900/40 to-transparent" />
          </motion.div>
          
          <div className="flex-1 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-0.5">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm md:text-base font-bold text-white drop-shadow-2xl font-amiri tracking-tight"
              >
                {reciter.name}
              </motion.h1>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-1.5"
              >
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-widest border border-amber-500/20 backdrop-blur-md whitespace-nowrap">
                  {reciter.rewaya || (lang === 'ar' ? 'رواية حفص' : 'Hafs')}
                </span>
                {reciter.featured && (
                  <div className="flex items-center gap-1 text-yellow-500/80 text-[8px] font-bold whitespace-nowrap">
                    {lang === 'ar' ? 'معتمد' : 'Verified'}
                  </div>
                )}
              </motion.div>
            </div>
            
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-amber-200/60 text-[9px] md:text-[10px] font-amiri italic leading-none"
            >
              {lang === 'ar' 
                ? 'تلاوة عطرة خاشعة بجودة صوتية فائقة' 
                : 'Fragrant and humble recitation'}
            </motion.p>
          </div>
          
          {/* Visualizer Decoration */}
          <div className="hidden lg:flex items-end gap-1 h-8">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-amber-500/30 rounded-full"
                animate={{ height: [10, 40, 20, 35, 15] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
