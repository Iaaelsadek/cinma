import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { tmdb } from '../../lib/tmdb'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { Send, Film, MessageSquare, X, Check } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'

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
      setPendingData(null)
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending request')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: RequestForm) => {
    setLoading(true)
    try {
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
      
      // If no results found, proceed directly
      await submitToSupabase(data)
    } catch (e) {
      console.error('Search failed, proceeding with request', e)
      await submitToSupabase(data)
    }
  }

  const handleCancel = () => {
    setShowSuggestions(false)
    setSearchResults([])
    setPendingData(null)
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-24 md:py-32">
      <Helmet>
        <title>{lang === 'ar' ? 'طلب محتوى | سينما أونلاين' : 'Request Content | Cinema Online'}</title>
      </Helmet>

      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film size={32} />
          </div>
          <h1 className="mb-2 text-3xl font-black text-white">
            {lang === 'ar' ? 'اطلب فيلماً أو مسلسلاً' : 'Request a Movie or Series'}
          </h1>
          <p className="text-zinc-400">
            {lang === 'ar' 
              ? 'لم تجد ما تبحث عنه؟ املأ النموذج أدناه وسنقوم بإضافته في أقرب وقت.' 
              : 'Can\'t find what you\'re looking for? Fill out the form below and we\'ll add it soon.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
          {!showSuggestions ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">
                  {lang === 'ar' ? 'اسم العمل' : 'Title'}
                </label>
                <Input
                  {...register('title', { required: true })}
                  placeholder={lang === 'ar' ? 'مثال: Inception' : 'e.g. Inception'}
                  className="w-full bg-black/40"
                />
                {errors.title && <span className="text-xs text-red-400">{lang === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required'}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">
                  {lang === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  placeholder={lang === 'ar' ? 'مثال: سنة الإصدار 2010، نسخة 4K...' : 'e.g. Release year 2010, 4K version...'}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse">{lang === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send size={18} />
                    <span>{lang === 'ar' ? 'إرسال الطلب' : 'Submit Request'}</span>
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">
                  {lang === 'ar' ? 'هل تقصد أحد هذه الأعمال؟' : 'Do you mean one of these?'}
                </h3>
                <p className="text-sm text-zinc-400">
                  {lang === 'ar' ? 'وجدنا بعض النتائج المشابهة لطلبك' : 'We found some matches for your request'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {searchResults.map((item) => (
                  <div key={item.id} className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-black/50 group">
                    {item.poster_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} 
                        alt={item.title || item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-zinc-800 text-zinc-500">
                        <Film size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                      <h4 className="font-bold text-white text-sm line-clamp-2">{item.title || item.name}</h4>
                      <span className="text-xs text-zinc-400">
                        {new Date(item.release_date || item.first_air_date || Date.now()).getFullYear()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <Button
                  onClick={() => pendingData && submitToSupabase(pendingData)}
                  variant="primary"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="animate-pulse">{lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check size={18} />
                      <span>{lang === 'ar' ? 'تأكيد الطلب' : 'Complete Request'}</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
