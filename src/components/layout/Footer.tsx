import { useLang } from '../../state/useLang'
import { PrefetchLink } from '../common/PrefetchLink'

export const Footer = () => {
  const { lang } = useLang()
  return (
    <footer className="relative z-10 glass-panel py-12 px-6 mt-20">
      <div className="w-[96%] md:w-[95%] xl:w-[90%] max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
        <div className="space-y-4 col-span-2 md:col-span-1">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-luxury-purple bg-clip-text text-transparent">
            {lang === 'ar' ? 'أونلاين سينما' : 'Online Cinema'}
          </h3>
          <p className="text-zinc-500 text-sm leading-relaxed">
            {lang === 'ar'
              ? 'تجربة مشاهدة حديثة بواجهة عربية متكاملة.'
              : 'A modern streaming experience with full Arabic support.'}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">{lang === 'ar' ? 'التصفح' : 'Browse'}</h4>
          <nav className="grid gap-2 text-sm text-zinc-300">
            <PrefetchLink to="/" className="hover:text-white transition-colors">{lang === 'ar' ? 'الرئيسية' : 'Home'}</PrefetchLink>
            <PrefetchLink to="/movies" className="hover:text-white transition-colors">{lang === 'ar' ? 'أفلام' : 'Movies'}</PrefetchLink>
            <PrefetchLink to="/series" className="hover:text-white transition-colors">{lang === 'ar' ? 'مسلسلات' : 'Series'}</PrefetchLink>
            <PrefetchLink to="/search?q=%D9%85%D8%B3%D8%B1%D8%AD%D9%8A%D8%A9" className="hover:text-white transition-colors">{lang === 'ar' ? 'الكلاسيكيات (مسرحيات)' : 'Classics (Plays)'}</PrefetchLink>
          </nav>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">{lang === 'ar' ? 'الأقسام' : 'Sections'}</h4>
          <nav className="grid gap-2 text-sm text-zinc-300">
            <PrefetchLink to="/gaming" className="hover:text-white transition-colors">{lang === 'ar' ? 'الألعاب' : 'Gaming'}</PrefetchLink>
            <PrefetchLink to="/software" className="hover:text-white transition-colors">{lang === 'ar' ? 'البرمجيات' : 'Software'}</PrefetchLink>
            <PrefetchLink to="/anime" className="hover:text-white transition-colors">{lang === 'ar' ? 'الأنمي' : 'Anime'}</PrefetchLink>
            <PrefetchLink to="/quran" className="hover:text-white transition-colors">{lang === 'ar' ? 'القرآن' : 'Quran'}</PrefetchLink>
            <PrefetchLink to="/kids" className="hover:text-white transition-colors">{lang === 'ar' ? 'ركن الأطفال' : 'Kids Corner'}</PrefetchLink>
          </nav>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">{lang === 'ar' ? 'الحساب' : 'Account'}</h4>
          <nav className="grid gap-2 text-sm text-zinc-300">
            <PrefetchLink to="/login" className="hover:text-white transition-colors">{lang === 'ar' ? 'دخول' : 'Login'}</PrefetchLink>
            <PrefetchLink to="/register" className="hover:text-white transition-colors">{lang === 'ar' ? 'إنشاء حساب' : 'Register'}</PrefetchLink>
            <PrefetchLink to="/request" className="hover:text-white transition-colors">{lang === 'ar' ? 'طلب محتوى' : 'Request Content'}</PrefetchLink>
            <PrefetchLink to="/terms" className="hover:text-white transition-colors">{lang === 'ar' ? 'الشروط' : 'Terms'}</PrefetchLink>
            <PrefetchLink to="/privacy" className="hover:text-white transition-colors">{lang === 'ar' ? 'الخصوصية' : 'Privacy'}</PrefetchLink>
          </nav>
        </div>
      </div>
    </footer>
  )
}
