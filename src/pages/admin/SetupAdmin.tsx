import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const SetupAdmin = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const onClaim = async () => {
    if (!user) return
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const res = await fetch(`${API_BASE}/api/admin/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim admin')
      
      toast.success('تمت ترقيتك إلى مدير بنجاح!')
      navigate('/admin/dashboard', { replace: true })
      // Reload to refresh permissions
      window.location.reload()
      
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-zinc-600 mx-auto" />
          <h1 className="text-2xl font-bold">يجب تسجيل الدخول أولاً</h1>
          <button 
            onClick={() => navigate('/login?next=/admin/setup')}
            className="bg-primary text-white px-6 py-2 rounded-lg"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-yellow-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">إعداد المدير</h1>
          <p className="text-zinc-400 text-sm">
            أنت على وشك تفعيل وضع المسؤول (Admin Mode). هذا الإجراء متاح فقط للمستخدم الأول.
          </p>
        </div>

        <div className="bg-zinc-950 p-3 rounded-lg text-xs text-zinc-500 text-right" dir="rtl">
          <ul className="list-disc list-inside space-y-1">
            <li>سيتم منحك صلاحيات كاملة.</li>
            <li>ستتمكن من الوصول للوحة التحكم.</li>
            <li>لن يتمكن أي شخص آخر من استخدام هذا الرابط بعدك.</li>
          </ul>
        </div>

        <button
          onClick={onClaim}
          disabled={busy}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {busy ? 'جاري التفعيل...' : 'تفعيل حساب المدير الآن'}
          {!busy && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
