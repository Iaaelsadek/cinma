import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../state/useLang'
import { useAuth } from '../../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { Send, Film, MessageSquare } from 'lucide-react'
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestForm>()

  const onSubmit = async (data: RequestForm) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('requests').insert({
        title: data.title,
        notes: data.notes,
        user_id: user?.id || null // Allow anonymous requests if user is null
      })

      if (error) throw error

      toast.success(lang === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Request sent successfully')
      reset()
    } catch (error) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending request')
      console.error(error)
    } finally {
      setLoading(false)
    }
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
                <span className="animate-pulse">{lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Send size={18} />
                  <span>{lang === 'ar' ? 'إرسال الطلب' : 'Submit Request'}</span>
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
