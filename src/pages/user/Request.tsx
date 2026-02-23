import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { tmdb } from '../../lib/tmdb'
import { errorLogger } from '../../services/errorLogging'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { Send, Film, X, Check, Play, AlertCircle, Star } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Link } from 'react-router-dom'
import { TmdbImage } from '../../components/common/TmdbImage'

type RequestForm = {
  title: string
  notes: string
}

export const RequestPage = () => {
  const { lang } = useLang()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [pendingData, setPendingData] = useState<RequestForm | null>(null)
  const [existingContent, setExistingContent] = useState<any[]>([])
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestForm>()

  const submitToSupabase = async (data: RequestForm) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('requests').insert({
        title: data.title,
        notes: data.notes,
        user_id: user?.id || null
      })

      if (error) throw error

      toast.success(lang === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Request sent successfully')
      reset()
      setShowSuggestions(false)
      setSearchResults([])
      setExistingContent([])
      setPendingData(null)
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending request')
      errorLogger.logError({
        message: 'Error sending request',
        severity: 'high',
        category: 'database',
        context: { error, data }
      })
    } finally {
      setLoading(false)
    }
  }

  const checkExistingContent = async (title: string) => {
    // Check Movies
    const { data: movies } = await supabase
      .from('movies')
      .select('id, title, poster_path, vote_average, release_date')
      .ilike('title', `%${title}%`)
      .limit(3)

    // Check Series
    const { data: series } = await supabase
      .from('tv_series')
      .select('id, title:name, poster_path, vote_average, first_air_date')
      .ilike('name', `%${title}%`)
      .limit(3)

    const found = [
      ...(movies || []).map(m => ({ ...m, media_type: 'movie' })),
      ...(series || []).map(s => ({ ...s, media_type: 'tv' }))
    ]

    return found
  }

  const onSubmit = async (data: RequestForm) => {
    setLoading(true)
    setExistingContent([])
    setSearchResults([])
    
    try {
      // 1. Check if we already have it in Supabase
      const existing = await checkExistingContent(data.title)
      if (existing.length > 0) {
        setExistingContent(existing)
        setPendingData(data)
        setShowSuggestions(true)
        setLoading(false)
        return
      }

      // 2. If not found locally, search TMDB to confirm it exists
      const { data: res } = await tmdb.get('/search/multi', {
        params: { 
          query: data.title, 
          language: lang === 'ar' ? 'ar-SA' : 'en-US',
          page: 1
        }
      })

      const results = res.results?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv') || []

      if (results.length > 0) {
        setSearchResults(results.slice(0, 4))
        setPendingData(data)
        setShowSuggestions(true)
        setLoading(false)
        return
      }
      
      // If no results found anywhere, proceed directly
      await submitToSupabase(data)
    } catch (e) {
      errorLogger.logError({
        message: 'Search failed, proceeding with request',
        severity: 'low',
        category: 'network',
        context: { error: e, title: data.title }
      })
      await submitToSupabase(data)
    }
  }

  const handleCancel = () => {
    setShowSuggestions(false)
    setSearchResults([])
    setPendingData(null)
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12 md:py-16">
      <Helmet>
        <title>{lang === 'ar' ? 'طلب محتوى | سينما أونلاين' : 'Request Content | Cinema Online'}</title>
      </Helmet>

      <div className="mx-auto max-w-lg">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film size={24} />
          </div>
          <h1 className="mb-1 text-2xl font-black text-white">
            {lang === 'ar' ? 'اطلب فيلماً أو مسلسلاً' : 'Request a Movie or Series'}
          </h1>
          <p className="text-xs text-zinc-400">
            {lang === 'ar' 
              ? 'لم تجد ما تبحث عنه؟ املأ النموذج أدناه وسنقوم بإضافته في أقرب وقت.' 
              : 'Can\'t find what you\'re looking for? Fill out the form below and we\'ll add it soon.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md md:p-5">
          {!showSuggestions ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  {lang === 'ar' ? 'اسم العمل' : 'Title'}
                </label>
                <div className="relative">
                  <Input
                    {...register('title', { required: true })}
                    placeholder={lang === 'ar' ? 'ابحث عن فيلم أو مسلسل...' : 'Search for movie or series...'}
                    className="w-full h-10 bg-black/40 text-sm"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                     {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Film size={16} />}
                  </div>
                </div>
                {errors.title && <span className="text-[10px] text-red-400">{lang === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required'}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  {lang === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder={lang === 'ar' ? 'مثال: سنة الإصدار 2010، نسخة 4K...' : 'e.g. Release year 2010, 4K version...'}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse">{lang === 'ar' ? 'جاري التحقق...' : 'Checking...'}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send size={16} />
                    <span>{lang === 'ar' ? 'بحث وإرسال' : 'Search & Submit'}</span>
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {existingContent.length > 0 ? (
                 <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="mb-3 flex items-center gap-2 text-emerald-400">
                       <Check size={20} />
                       <h3 className="font-bold">{lang === 'ar' ? 'هذا المحتوى متوفر بالفعل!' : 'This content is already available!'}</h3>
                    </div>
                    <div className="space-y-3">
                       {existingContent.map((item) => (
                          <Link 
                             key={item.id} 
                             to={`/${item.media_type === 'tv' ? 'series' : 'movie'}/${item.id}`}
                             className="flex items-center gap-3 rounded-lg bg-black/40 p-2 hover:bg-emerald-500/20 transition group"
                          >
                             <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md">
                                <TmdbImage
                                   path={item.poster_path}
                                   alt={item.title || item.name}
                                   className="h-full w-full object-cover"
                                   size="w92"
                                />
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">{item.title || item.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                   <span>{new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}</span>
                                   <span className="flex items-center gap-1 text-yellow-500"><Star size={10} /> {item.vote_average?.toFixed(1)}</span>
                                </div>
                             </div>
                             <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
                                <Play size={14} fill="currentColor" />
                             </div>
                          </Link>
                       ))}
                    </div>
                    <Button
                        onClick={handleCancel}
                        variant="secondary"
                        className="mt-4 w-full h-9 text-xs"
                     >
                       {lang === 'ar' ? 'بحث عن عنوان آخر' : 'Search for another title'}
                    </Button>
                 </div>
              ) : (
                 <>
                    <div className="mb-4 flex items-center justify-between">
                       <h3 className="text-sm font-bold text-white">
                       {lang === 'ar' ? 'هل تقصد أحد هذه الأعمال؟' : 'Did you mean one of these?'}
                       </h3>
                       <button 
                          onClick={handleCancel}
                          className="rounded-full p-1 hover:bg-white/10 transition"
                       >
                          <X size={16} className="text-zinc-400" />
                       </button>
                    </div>

                    <div className="space-y-3 mb-6">
                       {searchResults.map((item) => (
                          <div 
                             key={item.id} 
                             className="flex items-center gap-3 rounded-lg bg-black/40 p-2 border border-transparent hover:border-white/10 transition"
                          >
                             <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md">
                                <TmdbImage
                                   path={item.poster_path}
                                   alt={item.title || item.name}
                                   className="h-full w-full object-cover"
                                   size="w92"
                                />
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{item.title || item.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                   <span className="capitalize">{item.media_type === 'tv' ? (lang === 'ar' ? 'مسلسل' : 'TV Series') : (lang === 'ar' ? 'فيلم' : 'Movie')}</span>
                                   <span>•</span>
                                   <span>{new Date(item.release_date || item.first_air_date || '').getFullYear() || 'N/A'}</span>
                                </div>
                             </div>
                             <Button
                                onClick={() => {
                                   if (pendingData) {
                                      submitToSupabase({ ...pendingData, title: item.title || item.name })
                                   }
                                }}
                                className="h-8 px-3 text-xs bg-primary hover:bg-primary/80 text-black font-bold rounded-lg"
                             >
                                {lang === 'ar' ? 'طلب هذا' : 'Request This'}
                             </Button>
                          </div>
                       ))}
                    </div>

                    <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
                       <div className="mb-2 flex justify-center text-yellow-500">
                          <AlertCircle size={24} />
                       </div>
                       <p className="text-xs text-zinc-300 mb-3">
                          {lang === 'ar' 
                             ? 'إذا لم يكن عملك المطلوب في القائمة أعلاه، يمكنك المتابعة وإرسال الطلب كما كتبته.'
                             : 'If your requested title is not in the list above, you can proceed and submit the request as typed.'}
                       </p>
                       <Button
                          onClick={() => pendingData && submitToSupabase(pendingData)}
                          variant="secondary"
                          className="w-full h-9 text-xs"
                       >
                          {lang === 'ar' ? 'إرسال الاسم كما هو' : 'Submit title as is'}
                       </Button>
                    </div>
                 </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
