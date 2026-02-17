import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Search, Ghost, Send, AlertTriangle } from 'lucide-react'
import { useLang } from '../state/useLang'
import { Button } from '../components/common/Button'
import { supabase } from '../lib/supabase'

export const NotFound = () => {
  const { lang } = useLang()
  const [reported, setReported] = useState(false)

  const handleReport = async () => {
    if (reported) return
    try {
      const url = window.location.href
      const { data } = await supabase.from('error_reports').select('url, count').eq('url', url).maybeSingle()
      
      if (data) {
        await supabase.from('error_reports').update({ count: (data.count || 1) + 1 }).eq('url', url)
      } else {
        await supabase.from('error_reports').insert({ url, count: 1 })
      }
      
      setReported(true)
    } catch (err) {
      console.error('Failed to report:', err)
      setReported(true)
    }
  }
  
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

      <div className="mb-12 flex flex-col items-center gap-4">
        <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 p-[1px]">
          <div className="rounded-xl bg-black/90 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-bold text-white flex items-center justify-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              {lang === 'ar' ? 'ساعدنا في تحسين الموقع' : 'Help us improve'}
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              {lang === 'ar' 
                ? 'إذا كنت تعتقد أن هذه الصفحة يجب أن تكون موجودة، يرجى إبلاغنا.' 
                : 'If you think this page should exist, please let us know.'}
            </p>
            <button
              onClick={handleReport}
              disabled={reported}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-8 py-3 font-bold transition-all ${
                reported 
                  ? 'bg-green-500/20 text-green-500 cursor-default' 
                  : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:scale-105 hover:shadow-lg hover:shadow-red-500/20'
              }`}
            >
              {reported ? (
                <>
                  <span className="text-xl">✓</span>
                  {lang === 'ar' ? 'تم استلام بلاغك شكراً لك' : 'Report Received, Thanks'}
                </>
              ) : (
                <>
                  <Send size={20} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  {lang === 'ar' ? 'أبلغ عن صفحة مفقودة' : 'Report Missing Page'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link to="/">
          <Button variant="secondary" size="lg">
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
