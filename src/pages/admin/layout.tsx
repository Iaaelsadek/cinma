import { Link, NavLink, Outlet } from 'react-router-dom'

const AdminLayout = () => {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-zinc-800 p-4">
        <div className="mb-4 text-lg font-semibold">God Mode</div>
        <nav className="grid gap-2 text-sm">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>المستخدمون</NavLink>
          <NavLink to="/admin/add-movie" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>إضافة فيلم</NavLink>
          <NavLink to="/admin/series" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>المحتوى (مسلسلات)</NavLink>
          <NavLink to="/admin/ads" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>الإعلانات</NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>الإعدادات</NavLink>
          <NavLink to="/admin/backup" className={({ isActive }) => isActive ? 'text-primary' : 'text-zinc-300 hover:text-white'}>النسخ الاحتياطي</NavLink>
          <Link to="/" className="text-zinc-400">← العودة للموقع</Link>
        </nav>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  )
}

export default AdminLayout
