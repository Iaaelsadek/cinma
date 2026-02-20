import { useLang } from '../../state/useLang'
import { PrefetchLink } from '../common/PrefetchLink'
import { Zap, Activity, Heart, ShieldCheck, Lock, BadgeCheck, Server } from 'lucide-react'

export const Footer = () => {
  const { lang } = useLang()
  
  return (
    <footer className="relative z-10 glass-panel py-8 px-4 mt-12 overflow-hidden border-t border-white/5">
      {/* Artery Line Top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-800/50">
        {/* Circuit Pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(6,182,212,0.1) 50%)', backgroundSize: '20px 100%' }} />
        
        {/* Pulse Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full opacity-50 animate-pulse" />
        
        {/* Center Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
      </div>

      <div className="w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-sm relative z-20 mb-12">
        
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
            <PrefetchLink to="/terms" className="hover:text-cyan-400 transition-colors w-fit">DMCA</PrefetchLink>
            <PrefetchLink to="/terms" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}</PrefetchLink>
            <PrefetchLink to="/privacy" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</PrefetchLink>
            <PrefetchLink to="/request" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</PrefetchLink>
          </nav>
        </div>

        {/* Column 4: Status */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                <Server size={12} />
                {lang === 'ar' ? 'حالة النظام' : 'System Status'}
              </span>
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
                <span>Latency</span>
                <span className="text-cyan-500 font-mono">24ms</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 w-[98%] shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Unified Trust & Security Strip */}
      <div className="w-full border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-30">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        
        <div className="w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            
            {/* Badge 1: SSL Encryption */}
            <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <Lock size={24} className="text-emerald-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{lang === 'ar' ? 'أمان' : 'SECURITY'}</span>
                <span className="text-sm font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors">{lang === 'ar' ? 'تشفير SSL 256-bit' : '256-bit SSL Encryption'}</span>
              </div>
            </div>

            {/* Badge 2: Protection */}
            <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-center">
              <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                <ShieldCheck size={24} className="text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{lang === 'ar' ? 'حماية' : 'PROTECTION'}</span>
                <span className="text-sm font-bold text-zinc-300 group-hover:text-blue-400 transition-colors">{lang === 'ar' ? 'منصة آمنة 100%' : '100% Secure Platform'}</span>
              </div>
            </div>

            {/* Badge 3: Official Verification */}
            <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-center">
              <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <BadgeCheck size={24} className="text-purple-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{lang === 'ar' ? 'موثوق' : 'VERIFIED'}</span>
                <span className="text-sm font-bold text-zinc-300 group-hover:text-purple-400 transition-colors">{lang === 'ar' ? 'شريك رسمي معتمد' : 'Official Verified Partner'}</span>
              </div>
            </div>

            {/* Badge 4: Performance */}
            <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-center">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <Zap size={24} className="text-amber-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{lang === 'ar' ? 'سرعة' : 'PERFORMANCE'}</span>
                <span className="text-sm font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">{lang === 'ar' ? 'خوادم فائقة السرعة' : 'Lightning Fast Servers'}</span>
              </div>
            </div>

          </div>
          
          {/* Footer Copyright Line */}
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-zinc-600">
             <p>&copy; {new Date().getFullYear()} {lang === 'ar' ? 'أونلاين سينما. جميع الحقوق محفوظة.' : 'Online Cinema. All rights reserved.'}</p>
             <div className="flex items-center gap-4 opacity-50">
               <span>Server ID: DXB-01</span>
               <span>•</span>
               <span>v2.4.0 (Stable)</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
