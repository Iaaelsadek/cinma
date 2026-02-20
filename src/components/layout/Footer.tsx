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
            <PrefetchLink to="/dmca" className="hover:text-cyan-400 transition-colors w-fit">DMCA</PrefetchLink>
            <PrefetchLink to="/terms" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}</PrefetchLink>
            <PrefetchLink to="/privacy" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</PrefetchLink>
            <PrefetchLink to="/contact" className="hover:text-cyan-400 transition-colors w-fit">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</PrefetchLink>
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
          <p className="text-[10px] text-zinc-600 text-center">
            &copy; {new Date().getFullYear()} Online Cinema. All rights reserved.
          </p>
        </div>

      </div>

      {/* Trust & Security Badges */}
      <div className="w-full border-t border-white/5 py-6 bg-black/20 backdrop-blur-md">
        <div className="w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6">
          
          <div className="flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5">
              <Lock size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">SSL Secure Connection</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400">100% Protected</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-zinc-500 text-xs">
             <span className="flex items-center gap-1.5">
               <BadgeCheck size={14} className="text-purple-500" />
               Official Partner
             </span>
             <span className="h-3 w-[1px] bg-zinc-700" />
             <span>DMCA Compliant</span>
             <span className="h-3 w-[1px] bg-zinc-700" />
             <span>256-bit Encryption</span>
          </div>

        </div>
      </div>

      {/* Trust Badges Section */}
      <div className="relative z-20 border-t border-white/5 pt-8 w-[96%] md:w-[95%] xl:w-[90%] mx-auto">
        <div className="flex flex-wrap justify-center md:justify-between items-center gap-6 opacity-90">
            
            {/* Badge 1: SSL */}
            <div className="flex items-center gap-3 group cursor-default">
                <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Lock size={20} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{lang === 'ar' ? 'أمان' : 'Security'}</span>
                    <span className="text-xs font-bold text-emerald-400">{lang === 'ar' ? 'تشفير SSL 256-bit' : '256-bit SSL Encrypted'}</span>
                </div>
            </div>

            {/* Badge 2: Secure */}
             <div className="flex items-center gap-3 group cursor-default">
                <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <ShieldCheck size={20} className="text-emerald-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{lang === 'ar' ? 'حماية' : 'Protection'}</span>
                    <span className="text-xs font-bold text-emerald-400">{lang === 'ar' ? 'آمن 100%' : '100% Secure Platform'}</span>
                </div>
            </div>
            
             {/* Badge 3: Verified */}
             <div className="flex items-center gap-3 group cursor-default">
                <div className="p-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                    <BadgeCheck size={20} className="text-cyan-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{lang === 'ar' ? 'موثوق' : 'Verified'}</span>
                    <span className="text-xs font-bold text-cyan-400">{lang === 'ar' ? 'منصة رسمية' : 'Official Platform'}</span>
                </div>
            </div>

             {/* Badge 4: Clean */}
             <div className="hidden md:flex items-center gap-3 group cursor-default">
                <div className="p-2.5 rounded-full bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/40 transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                    <Zap size={20} className="text-purple-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{lang === 'ar' ? 'سرعة' : 'Speed'}</span>
                    <span className="text-xs font-bold text-purple-400">{lang === 'ar' ? 'خوادم فائقة السرعة' : 'Lightning Fast Servers'}</span>
                </div>
            </div>
        </div>
      </div>
    </footer>
  )
}
