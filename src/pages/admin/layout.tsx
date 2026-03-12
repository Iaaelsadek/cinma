import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getProfile } from '../../lib/supabase'
import { AdminProvider } from '../../context/AdminContext'

const AdminLayout = () => {
  const { user, profile } = useAuth()
  const [role, setRole] = useState<'admin' | 'supervisor' | null>((profile?.role as any) || null)

  useEffect(() => {
    let cancelled = false
    if (profile?.role) {
      setRole(profile.role as any)
    } else if (user) {
      getProfile(user.id)
        .then(p => {
          if (!cancelled) setRole(p?.role as any)
        })
        .catch(() => {
          if (!cancelled) setRole(null)
        })
    }
    return () => { cancelled = true }
  }, [user, profile?.role])
  
  const isSuper = role === 'admin'

  return (
    <AdminProvider>
      <div className="grid gap-2 md:grid-cols-[180px_1fr] font-cairo" dir="rtl">
        <aside className="rounded-lg border border-zinc-800 p-2 h-fit sticky top-16 bg-zinc-900/50 backdrop-blur-sm">
          <div className={`mb-6 flex items-center gap-2 px-2 font-bold text-lg ${isSuper ? 'text-cyan-400' : 'text-yellow-500'}`}>
            {isSuper ? '⚡ لوحة التحكم' : '🛡️ Supervisor'}
          </div>
          <nav className="flex flex-col gap-6 text-[12px]">
            {/* Group 1: الرئيسية */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 px-2 font-bold mb-1 opacity-50">الرئيسية</span>
              <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                📊 لوحة المعلومات
              </NavLink>
              {isSuper && (
                <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                  👥 المستخدمين
                </NavLink>
              )}
            </div>
            
            {/* Group 2: المحتوى */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 px-2 font-bold mb-1 opacity-50">المحتوى</span>
              <NavLink to="/admin/movies" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                🎥 إدارة الأفلام
              </NavLink>
              <NavLink to="/admin/series" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                📺 إدارة المسلسلات
              </NavLink>
              <NavLink to="/admin/content-health" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-rose-500 font-bold bg-rose-500/10 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-rose-500 px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                ❤️ صحة المحتوى
              </NavLink>
              <NavLink to="/admin/servers" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-cyan-400 font-bold bg-cyan-400/10 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-cyan-400 px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                🧪 إدارة السيرفرات
              </NavLink>
            </div>
            
            {/* Group 3: النظام */}
            {isSuper && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 px-2 font-bold mb-1 opacity-50">النظام</span>
                <NavLink to="/admin/ads" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                  📢 الإعلانات
                </NavLink>
                <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                  ⚙️ الإعدادات
                </NavLink>
                <NavLink to="/admin/backups" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-primary font-bold bg-white/5 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                  💾 النسخ الاحتياطية
                </NavLink>
                <NavLink to="/admin/system" className={({ isActive }) => isActive ? 'flex items-center gap-2 text-cyan-400 font-bold bg-cyan-400/10 px-3 py-2 rounded-lg transition-all' : 'flex items-center gap-2 text-zinc-400 hover:text-cyan-400 px-3 py-2 hover:bg-white/5 rounded-lg transition-all'}>
                  ⚡ نظام التحكم
                </NavLink>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <Link to="/" className="text-zinc-500 hover:text-white flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-xs">
                <span>←</span> العودة للموقع
              </Link>
            </div>
          </nav>
        </aside>
        <section className="min-h-[400px]">
          <Outlet />
        </section>
      </div>
    </AdminProvider>
  )
}

export default AdminLayout
