import { useLang } from '../../state/useLang'
import { PrefetchLink } from '../common/PrefetchLink'
import { Zap, Activity, Heart, ShieldCheck } from 'lucide-react'

export const Footer = () => {
  const { lang } = useLang()
  
  return (
    <footer className="relative z-10 glass-panel py-8 px-4 mt-12 overflow-hidden">
      {/* Artery Line Top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-800/50">
        {/* Circuit Pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(6,182,212,0.1) 50%)', backgroundSize: '20px 100%' }} />
        
        {/* Pulse Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full opacity-50 animate-pulse" />
        
        {/* Center Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
      </div>

      <div className="w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm relative z-20">
        
        {/* Column 1: Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Zap size={18} className="text-cyan-400" />
            </div>
            <h3 className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {lang === 'ar' ? 'أونلاين سينما' : 'ONLINE CINEMA'}
            </h3>
          </div>
          <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
            {lang === 'ar'
              ? 'منصة الترفيه الرقمي الأولى في الشرق الأوسط. تجربة مشاهدة سينمائية فائقة الجودة مع أحدث تقنيات العرض.'
              : 'The premier digital entertainment platform in the Middle East. Cinematic viewing experience with state-of-the-art streaming technology.'}
          </p>
        </div>

        {/* Column 2: Navigation */}
        <div className="space-y-4">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Activity size={14} className="text-purple-500" />
            {lang === 'ar' ? 'التصفح' : 'Navigation'}
          </h4>
          <nav className="flex flex-col gap-2 text-zinc-400">
            <PrefetchLink to="/" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'الرئيسية' : 'Home'}</PrefetchLink>
            <PrefetchLink to="/movies" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'أحدث الأفلام' : 'Latest Movies'}</PrefetchLink>
            <PrefetchLink to="/series" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'المسلسلات' : 'TV Series'}</PrefetchLink>
            <PrefetchLink to="/kids" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'عالم الأطفال' : 'Kids World'}</PrefetchLink>
          </nav>
        </div>

        {/* Column 3: Legal & Help */}
        <div className="space-y-4">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            {lang === 'ar' ? 'المساعدة' : 'Support'}
          </h4>
          <nav className="flex flex-col gap-2 text-zinc-400">
            <PrefetchLink to="/dmca" className="hover:text-cyan-400 transition-colors w-fit">DMCA</PrefetchLink>
            <PrefetchLink to="/terms" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}</PrefetchLink>
            <PrefetchLink to="/privacy" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</PrefetchLink>
            <PrefetchLink to="/contact" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</PrefetchLink>
          </nav>
        </div>

        {/* Column 4: Status */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-400">{lang === 'ar' ? 'حالة النظام' : 'System Status'}</span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-500">ONLINE</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>CDN</span>
                <span className="text-cyan-500">98ms</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 w-[92%]" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 text-center">
            &copy; {new Date().getFullYear()} Online Cinema. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
