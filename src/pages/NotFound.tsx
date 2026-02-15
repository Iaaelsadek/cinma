import { Link } from 'react-router-dom'
import { Home, Search, Ghost } from 'lucide-react'
import { useLang } from '../state/useLang'
import { Button } from '../components/common/Button'

export const NotFound = () => {
  const { lang } = useLang()
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse bg-primary/20 blur-[100px]" />
        <Ghost size={120} className="relative z-10 text-zinc-800" />
        <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white mix-blend-overlay">
          404
        </div>
      </div>
      
      <h1 className="mb-4 text-3xl font-black tracking-tight text-white md:text-5xl">
        {lang === 'ar' ? 'عفواً، هذه الصفحة مفقودة' : 'Oops, Page Not Found'}
      </h1>
      
      <p className="mb-8 max-w-md text-zinc-400">
        {lang === 'ar'
          ? 'يبدو أنك وصلت إلى طريق مسدود. الصفحة التي تبحث عنها قد تكون حذفت أو تم تغيير رابطها.'
          : 'It seems you hit a dead end. The page you are looking for might have been removed or renamed.'}
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link to="/">
          <Button variant="primary" size="lg">
            <Home size={20} />
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Button>
        </Link>
        <Link to="/search">
          <Button variant="glass" size="lg">
            <Search size={20} />
            {lang === 'ar' ? 'بحث' : 'Search'}
          </Button>
        </Link>
      </div>
    </div>
  )
}
