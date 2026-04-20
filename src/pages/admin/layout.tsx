import { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getProfile } from '../../lib/supabase'
import { AdminProvider } from '../../context/AdminContext'
import { useQuery } from '@tanstack/react-query'
import {
    LayoutDashboard,
    Users,
    Film,
    Tv,
    FileText,
    Heart,
    Server,
    Megaphone,
    Settings,
    Database,
    Zap,
    Download,
    Home,
    Sparkles
} from 'lucide-react'

const AdminLayout = () => {
    const { user, profile } = useAuth()

    const { data: dbProfile } = useQuery({
        queryKey: ['admin-profile', user?.id],
        queryFn: () => getProfile(user!.id),
        enabled: !!user && !profile?.role,
        staleTime: 1000 * 60 * 5
    })

    const role = useMemo(() => {
        if (profile?.role) return profile.role as 'admin' | 'supervisor' | null
        if (dbProfile?.role) return dbProfile.role as 'admin' | 'supervisor' | null
        return null
    }, [profile?.role, dbProfile?.role])

    const isSuper = role === 'admin'

    return (
        <AdminProvider>
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 font-cairo" dir="rtl">
                <div className="flex">
                    {/* Enhanced Sidebar - 256px width */}
                    <aside className="w-64 min-h-screen border-l border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 flex flex-col">
                        {/* Header - Logo & Brand */}
                        <div className="p-4 border-b border-white/5">
                            <Link to="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-bold text-white">Cinema Admin</h1>
                                    <p className="text-xs text-zinc-500">Control Panel</p>
                                </div>
                            </Link>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {/* Overview Section */}
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-600 px-2 mb-2">OVERVIEW</p>
                                <NavLink
                                    to="/admin/dashboard"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <LayoutDashboard className="w-5 h-5" />
                                    <span className="text-sm font-medium">لوحة المعلومات</span>
                                </NavLink>
                                {isSuper && (
                                    <NavLink
                                        to="/admin/users"
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Users className="w-5 h-5" />
                                        <span className="text-sm font-medium">المستخدمين</span>
                                    </NavLink>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-600 px-2 mb-2 mt-4">CONTENT</p>
                                <NavLink
                                    to="/admin/movies"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <Film className="w-5 h-5" />
                                    <span className="text-sm font-medium">إدارة الأفلام</span>
                                </NavLink>
                                <NavLink
                                    to="/admin/series"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <Tv className="w-5 h-5" />
                                    <span className="text-sm font-medium">إدارة المسلسلات</span>
                                </NavLink>
                                <NavLink
                                    to="/admin/ingestion"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <Download className="w-5 h-5" />
                                    <span className="text-sm font-medium">استيراد المحتوى</span>
                                </NavLink>
                                <NavLink
                                    to="/admin/requests"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <FileText className="w-5 h-5" />
                                    <span className="text-sm font-medium">طلبات المحتوى</span>
                                </NavLink>
                                <NavLink
                                    to="/admin/content-health"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                            ? 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-400 border border-rose-500/30'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <Heart className="w-5 h-5" />
                                    <span className="text-sm font-medium">صحة المحتوى</span>
                                </NavLink>
                            </div>

                            {/* System Section */}
                            {isSuper && (
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-zinc-600 px-2 mb-2 mt-4">SYSTEM</p>
                                    <NavLink
                                        to="/admin/ads"
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                                ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Megaphone className="w-5 h-5" />
                                        <span className="text-sm font-medium">الإعلانات</span>
                                    </NavLink>
                                    <NavLink
                                        to="/admin/settings"
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                                ? 'bg-gradient-to-r from-zinc-500/20 to-gray-500/20 text-zinc-300 border border-zinc-500/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Settings className="w-5 h-5" />
                                        <span className="text-sm font-medium">الإعدادات</span>
                                    </NavLink>
                                    <NavLink
                                        to="/admin/backups"
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                                ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-400 border border-indigo-500/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Database className="w-5 h-5" />
                                        <span className="text-sm font-medium">النسخ الاحتياطية</span>
                                    </NavLink>
                                    <NavLink
                                        to="/admin/system"
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isActive
                                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`
                                        }
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        <span className="text-sm font-medium">نظام التحكم</span>
                                    </NavLink>
                                </div>
                            )}
                        </nav>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5">
                            <Link
                                to="/"
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all w-full"
                            >
                                <Home className="w-5 h-5" />
                                <span className="text-sm font-medium">العودة للموقع</span>
                            </Link>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AdminProvider>
    )
}

export default AdminLayout
