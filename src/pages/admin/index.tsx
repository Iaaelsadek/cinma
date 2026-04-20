import { useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { fetchDB } from '../../lib/db'
import { useQuery } from '@tanstack/react-query'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import {
    Users,
    Film,
    Tv,
    Activity,
    Server,
    HardDrive,
    Link2Off,
    Eye,
    Star,
    RefreshCw
} from 'lucide-react'
import { StatsCard } from '../../components/admin/StatsCard'
import { Breadcrumbs } from '../../components/admin/Breadcrumbs'
import { AdminLoadingState } from '../../components/admin/LoadingState'

const COLORS = ['#06b6d4', '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#22c55e']

const growthPercent = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
}

type HealthStats = {
    status: 'Online' | 'Degraded' | 'Down'
    lastCheckAt: string | null
    brokenLinks: number
    totalChecks: number
    usedSpaceMB: number
    storageGrowth: number
    brokenRatio: number
}

const AdminDashboard = () => {
    const { stats, loading, triggerRefreshStats } = useAdmin()
    const healthCodes = useMemo(() => new Set([0, 200, 201, 206, 301, 302, 403, 408, 409, 425, 429, 500, 502, 503, 504, 520, 521, 522, 524]), [])

    const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
        queryKey: ['admin-health-stats'],
        queryFn: async () => {
            const now = Date.now()
            const oneHourAgoIso = new Date(now - 60 * 60 * 1000).toISOString()
            const last30Iso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
            const prev30StartIso = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()
            const prev30EndIso = last30Iso

            const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || ''

            const [
                brokenCountRes,
                totalCountRes,
                lastCheckRes,
                recentChecksRes,
                moviesCountRes,
                seriesCountRes,
                moviesRecentRes,
                seriesRecentRes,
                prev30MoviesRes,
                prev30SeriesRes
            ] = await Promise.all([
                fetch(`${API_BASE}/api/link-checks?filter=broken&count=true`).then(r => r.json()),
                fetch(`${API_BASE}/api/link-checks?count=true`).then(r => r.json()),
                fetch(`${API_BASE}/api/link-checks?limit=1&order=checked_at.desc`).then(r => r.json()),
                fetch(`${API_BASE}/api/link-checks?since=${oneHourAgoIso}&limit=5000`).then(r => r.json()),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies' }) }),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series' }) }),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies WHERE created_at >= $1', params: [last30Iso] }) }),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series WHERE created_at >= $1', params: [last30Iso] }) }),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies WHERE created_at >= $1 AND created_at < $2', params: [prev30StartIso, prev30EndIso] }) }),
                fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series WHERE created_at >= $1 AND created_at < $2', params: [prev30StartIso, prev30EndIso] }) })
            ])

            const brokenLinks = brokenCountRes.count || 0
            const totalChecks = totalCountRes.count || 0
            const lastCheckAt = lastCheckRes.data?.[0]?.checked_at || null
            const recentChecks = Array.isArray(recentChecksRes.data) ? recentChecksRes.data : []
            const brokenRecent = recentChecks.filter((item: any) => !healthCodes.has(Number(item.status_code))).length
            const brokenRatio = recentChecks.length > 0 ? brokenRecent / recentChecks.length : (totalChecks > 0 ? brokenLinks / totalChecks : 0)

            const moviesCount = moviesCountRes?.rows?.[0]?.count || 0
            const seriesCount = seriesCountRes?.rows?.[0]?.count || 0
            const avgMovieRowSize = 1024
            const avgSeriesRowSize = 1536
            const usedBytes = (moviesCount * avgMovieRowSize) + (seriesCount * avgSeriesRowSize)
            const usedSpaceMB = Number((usedBytes / (1024 * 1024)).toFixed(2))

            const current30Count = Number(moviesRecentRes?.rows?.[0]?.count || 0) + Number(seriesRecentRes?.rows?.[0]?.count || 0)
            const previous30Count = Number(prev30MoviesRes?.rows?.[0]?.count || 0) + Number(prev30SeriesRes?.rows?.[0]?.count || 0)
            const storageGrowth = growthPercent(current30Count, previous30Count)

            let status: HealthStats['status'] = 'Online'
            if (!lastCheckAt) {
                status = 'Down'
            } else {
                const minutesSinceLastCheck = (now - new Date(lastCheckAt).getTime()) / 60000
                if (minutesSinceLastCheck > 720) status = 'Down'
                else if (minutesSinceLastCheck > 120 || brokenRatio >= 0.35) status = 'Degraded'
            }

            return {
                status,
                lastCheckAt,
                brokenLinks,
                totalChecks,
                usedSpaceMB,
                storageGrowth: Number(storageGrowth.toFixed(1)),
                brokenRatio: Number((brokenRatio * 100).toFixed(1))
            }
        },
        staleTime: 1000 * 60 * 5
    })

    const health = healthData || {
        status: 'Down' as const,
        lastCheckAt: null,
        brokenLinks: 0,
        totalChecks: 0,
        usedSpaceMB: 0,
        storageGrowth: 0,
        brokenRatio: 0
    }

    const trafficByDay = Array.isArray(stats?.trafficByDay) ? stats.trafficByDay : []
    const userGrowthByDay = Array.isArray(stats?.userGrowthByDay) ? stats.userGrowthByDay : []
    const contentByGenre = Array.isArray(stats?.contentByGenre) ? stats.contentByGenre : []
    const topWatched = Array.isArray(stats?.topWatched) ? stats.topWatched : []

    const viewsGrowth = useMemo(
        () => growthPercent(stats.totalViews, stats.previousPeriodViews),
        [stats.totalViews, stats.previousPeriodViews]
    )
    const usersGrowth = useMemo(
        () => growthPercent(stats.totalUsers, stats.previousPeriodUsers),
        [stats.totalUsers, stats.previousPeriodUsers]
    )
    const averageViewsPerTitle = useMemo(() => {
        const totalTitles = stats.totalMovies + stats.totalSeries
        if (totalTitles === 0) return 0
        return Math.round(stats.totalViews / totalTitles)
    }, [stats.totalViews, stats.totalMovies, stats.totalSeries])

    const storageQuotaMB = 2048
    const usedSpacePercent = useMemo(() => {
        if (storageQuotaMB <= 0) return 0
        return Math.min(100, Number(((health.usedSpaceMB / storageQuotaMB) * 100).toFixed(1)))
    }, [health.usedSpaceMB])

    if (loading) {
        return <AdminLoadingState type="spinner" message="Loading Command Center..." />
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[{ label: 'Dashboard' }]} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                        Emperor Command Center
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">Real-time analytics from production database</p>
                </div>
                <button
                    onClick={async () => {
                        await triggerRefreshStats()
                        await refetchHealth()
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh Data</span>
                </button>
            </div>

            {/* Primary Stats Grid - Using StatsCard */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    trend={usersGrowth}
                    color="blue"
                />
                <StatsCard
                    title="Movies"
                    value={stats.totalMovies}
                    icon={Film}
                    color="purple"
                />
                <StatsCard
                    title="TV Series"
                    value={stats.totalSeries}
                    icon={Tv}
                    color="pink"
                />
                <StatsCard
                    title="Total Views"
                    value={stats.totalViews}
                    icon={Eye}
                    trend={viewsGrowth}
                    color="green"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-300">Server Status</h3>
                        <Server className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className={`text-2xl font-bold ${health.status === 'Online' ? 'text-emerald-400' :
                                    health.status === 'Degraded' ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                {healthLoading ? '...' : health.status}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                                {health.lastCheckAt ? new Date(health.lastCheckAt).toLocaleString('ar-EG') : 'No checks yet'}
                            </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${health.status === 'Online' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' :
                                health.status === 'Degraded' ? 'bg-amber-400 shadow-lg shadow-amber-400/50' : 'bg-rose-400 shadow-lg shadow-rose-400/50'
                            } animate-pulse`} />
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-300">Storage Used</h3>
                        <HardDrive className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-3">
                        {healthLoading ? '...' : `${health.usedSpaceMB.toLocaleString()} MB`}
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800/50 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${usedSpacePercent}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">{usedSpacePercent}% of {storageQuotaMB.toLocaleString()} MB</span>
                        <span className={health.storageGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {health.storageGrowth >= 0 ? '+' : ''}{health.storageGrowth}% / 30d
                        </span>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-300">Broken Links</h3>
                        <Link2Off className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="text-2xl font-bold text-rose-400 mb-3">
                        {healthLoading ? '...' : health.brokenLinks.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Total: {health.totalChecks.toLocaleString()}</span>
                        <span className="text-rose-400">{health.brokenRatio}% broken</span>
                    </div>
                </GlassCard>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                <GlassCard>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Traffic Analytics (30 Days)</h3>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficByDay}>
                                <defs>
                                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderColor: '#27272a',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    stroke="#3b82f6"
                                    fill="url(#viewsGradient)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">User Growth (30 Days)</h3>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userGrowthByDay}>
                                <XAxis
                                    dataKey="date"
                                    stroke="#52525b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderColor: '#27272a',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                />
                                <Bar
                                    dataKey="users"
                                    fill="#14b8a6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* Bottom Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                <GlassCard>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Content by Genre</h3>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={contentByGenre}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                >
                                    {contentByGenre.map((_, index) => (
                                        <Cell key={`genre-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderColor: '#27272a',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-1 mt-2">
                        {contentByGenre.slice(0, 5).map((genre) => (
                            <div key={genre.name} className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">{genre.name}</span>
                                <span className="font-bold text-white">{genre.value}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <div className="lg:col-span-2">
                    <GlassCard>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Top Watched Content</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-zinc-400 border-b border-white/5">
                                        <th className="text-right py-2 font-medium">Title</th>
                                        <th className="text-right py-2 font-medium">Type</th>
                                        <th className="text-right py-2 font-medium">Views</th>
                                        <th className="text-right py-2 font-medium">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topWatched.slice(0, 8).map((item) => (
                                        <tr
                                            key={`${item.content_type}-${item.id}`}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                        >
                                            <td className="py-2.5 text-white font-medium">{item.title}</td>
                                            <td className="py-2.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.content_type === 'movie'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : 'bg-pink-500/20 text-pink-400'
                                                    }`}>
                                                    {item.content_type === 'movie' ? 'Movie' : 'Series'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-zinc-300">{item.views.toLocaleString()}</td>
                                            <td className="py-2.5">
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                    <span className="text-zinc-300">{item.vote_average.toFixed(1)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {topWatched.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-zinc-500">
                                                No watch data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}

// Glassmorphism Card Component
const GlassCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all">
        {children}
    </div>
)

export default AdminDashboard
