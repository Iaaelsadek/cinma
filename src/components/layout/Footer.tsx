import { useLang } from '../../state/useLang'
import { Link } from 'react-router-dom'

export const Footer = () => {
  const { lang } = useLang()
  return (
    <footer className="relative z-10 glass-panel py-12 px-6 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
        <div className="space-y-4 col-span-2 md:col-span-1">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-luxury-purple bg-clip-text text-transparent">
            {lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online'}
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
            <Link to="/" className="hover:text-white transition-colors">{lang === 'ar' ? 'الرئيسية' : 'Home'}</Link>
            <Link to="/movies" className="hover:text-white transition-colors">{lang === 'ar' ? 'أفلام' : 'Movies'}</Link>
            <Link to="/series" className="hover:text-white transition-colors">{lang === 'ar' ? 'مسلسلات' : 'Series'}</Link>
            <Link to="/search?q=%D9%85%D8%B3%D8%B1%D8%AD%D9%8A%D8%A9" className="hover:text-white transition-colors">{lang === 'ar' ? 'الكلاسيكيات (مسرحيات)' : 'Classics (Plays)'}</Link>
          </nav>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">{lang === 'ar' ? 'الأقسام' : 'Sections'}</h4>
          <nav className="grid gap-2 text-sm text-zinc-300">
            <Link to="/gaming" className="hover:text-white transition-colors">{lang === 'ar' ? 'الألعاب' : 'Gaming'}</Link>
            <Link to="/software" className="hover:text-white transition-colors">{lang === 'ar' ? 'البرمجيات' : 'Software'}</Link>
            <Link to="/anime" className="hover:text-white transition-colors">{lang === 'ar' ? 'الأنمي' : 'Anime'}</Link>
            <Link to="/quran" className="hover:text-white transition-colors">{lang === 'ar' ? 'القرآن' : 'Quran'}</Link>
            <Link to="/kids" className="hover:text-white transition-colors">{lang === 'ar' ? 'ركن الأطفال' : 'Kids Corner'}</Link>
          </nav>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">{lang === 'ar' ? 'الحساب' : 'Account'}</h4>
          <nav className="grid gap-2 text-sm text-zinc-300">
            <Link to="/login" className="hover:text-white transition-colors">{lang === 'ar' ? 'دخول' : 'Login'}</Link>
            <Link to="/register" className="hover:text-white transition-colors">{lang === 'ar' ? 'إنشاء حساب' : 'Register'}</Link>
            <Link to="/terms" className="hover:text-white transition-colors">{lang === 'ar' ? 'الشروط' : 'Terms'}</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">{lang === 'ar' ? 'الخصوصية' : 'Privacy'}</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
