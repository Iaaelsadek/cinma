import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Search, Ghost, Send, AlertTriangle } from 'lucide-react'
import { useLang } from '../state/useLang'
import { Button } from '../components/common/Button'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

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
      errorLogger.logError({
        message: 'Failed to report 404',
        severity: 'low',
        category: 'network',
        context: { error: err, url: window.location.href }
      })
      setReported(true)
    }
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 animate-pulse bg-primary/20 blur-[80px]" />
        <Ghost size={80} className="relative z-10 text-zinc-800" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white mix-blend-overlay">
          404
        </div>
      </div>
      
      <h1 className="mb-2 text-xl font-black tracking-tight text-white md:text-3xl">
        {lang === 'ar' ? 'عفواً، هذه الصفحة مفقودة' : 'Oops, Page Not Found'}
      </h1>
      
      <p className="mb-4 max-w-md text-xs text-zinc-400">
        {lang === 'ar'
          ? 'يبدو أنك وصلت إلى طريق مسدود. الصفحة التي تبحث عنها قد تكون حذفت أو تم تغيير رابطها.'
          : 'It seems you hit a dead end. The page you are looking for might have been removed or renamed.'}
      </p>

      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 p-[1px]">
          <div className="rounded-xl bg-black/90 p-4 backdrop-blur-sm">
            <h3 className="mb-1.5 text-sm font-bold text-white flex items-center justify-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} />
              {lang === 'ar' ? 'ساعدنا في تحسين الموقع' : 'Help us improve'}
            </h3>
            <p className="mb-2 text-[10px] text-zinc-400">
              {lang === 'ar' 
                ? 'إذا كنت تعتقد أن هذه الصفحة يجب أن تكون موجودة، يرجى إبلاغنا.' 
                : 'If you think this page should exist, please let us know.'}
            </p>
            <button
              onClick={handleReport}
              disabled={reported}
              className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2 font-bold transition-all text-xs ${
                reported 
                  ? 'bg-green-500/20 text-green-500 cursor-default' 
                  : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:scale-105 hover:shadow-lg hover:shadow-red-500/20'
              }`}
            >
              {reported ? (
                <>
                  <span className="text-base">✓</span>
                  {lang === 'ar' ? 'تم استلام بلاغك شكراً لك' : 'Report Received, Thanks'}
                </>
              ) : (
                <>
                  <Send size={14} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  {lang === 'ar' ? 'أبلغ عن صفحة مفقودة' : 'Report Missing Page'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link to="/">
          <Button variant="secondary" size="sm">
            <Home size={16} />
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Button>
        </Link>
        <Link to="/search">
          <Button variant="glass" size="sm">
            <Search size={16} />
            {lang === 'ar' ? 'بحث' : 'Search'}
          </Button>
        </Link>
      </div>
    </div>
  )
}
