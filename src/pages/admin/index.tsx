import {useEffect, useMemo, useState} from 'react'
import { useAdmin } from '../../context/AdminContext'
import { supabase } from '../../lib/supabase'
import { fetchDB } from '../../lib/db'
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
  PlayCircle,
  Activity,
  Server,
  HardDrive,
  Link2Off,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

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
  const { stats, loading, refreshStats } = useAdmin()
  const [healthLoading, setHealthLoading] = useState(true)
  const [health, setHealth] = useState<HealthStats>({
    status: 'Down',
    lastCheckAt: null,
    brokenLinks: 0,
    totalChecks: 0,
    usedSpaceMB: 0,
    storageGrowth: 0,
    brokenRatio: 0
  })
  const trafficByDay = Array.isArray(stats?.trafficByDay) ? stats.trafficByDay : []
  const userGrowthByDay = Array.isArray(stats?.userGrowthByDay) ? stats.userGrowthByDay : []
  const contentByGenre = Array.isArray(stats?.contentByGenre) ? stats.contentByGenre : []
  const topWatched = Array.isArray(stats?.topWatched) ? stats.topWatched : []
  const healthCodes = useMemo(() => new Set([0, 200, 201, 206, 301, 302, 403, 408, 409, 425, 429, 500, 502, 503, 504, 520, 521, 522, 524]), [])

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

  const fetchHealthStats = async () => {
    setHealthLoading(true)
    const now = Date.now()
    const oneHourAgoIso = new Date(now - 60 * 60 * 1000).toISOString()
    const healthyTransientCodes = '(0,200,201,206,301,302,403,408,409,425,429,500,502,503,504,520,521,522,524)'
    const last30Iso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    const prev30StartIso = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()
    const prev30EndIso = last30Iso

    // Use CockroachDB for content stats and Supabase for social stats
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
      supabase
        .from('link_checks')
        .select('*', { count: 'exact', head: true })
        .not('status_code', 'in', healthyTransientCodes),
      supabase.from('link_checks').select('*', { count: 'exact', head: true }),
      supabase.from('link_checks').select('checked_at').order('checked_at', { ascending: false }).limit(1),
      supabase.from('link_checks').select('status_code, checked_at').gte('checked_at', oneHourAgoIso).limit(5000),
      // Use CockroachDB API for counts instead of fetching all rows from Supabase
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies' }) }),
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series' }) }),
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies WHERE created_at >= $1', params: [last30Iso] }) }),
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series WHERE created_at >= $1', params: [last30Iso] }) }),
      // Previous 30 days counts
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM movies WHERE created_at >= $1 AND created_at < $2', params: [prev30StartIso, prev30EndIso] }) }),
      fetchDB('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT COUNT(*) as count FROM tv_series WHERE created_at >= $1 AND created_at < $2', params: [prev30StartIso, prev30EndIso] }) })
    ])

    const brokenLinks = brokenCountRes.count || 0
    const totalChecks = totalCountRes.count || 0
    const lastCheckAt = lastCheckRes.data?.[0]?.checked_at || null
    const recentChecks = Array.isArray(recentChecksRes.data) ? recentChecksRes.data : []
    const brokenRecent = recentChecks.filter((item) => !healthCodes.has(Number(item.status_code))).length
    const brokenRatio = recentChecks.length > 0 ? brokenRecent / recentChecks.length : (totalChecks > 0 ? brokenLinks / totalChecks : 0)

    // Estimate storage used based on row counts (much faster than fetching all rows)
    const moviesCount = moviesCountRes?.rows?.[0]?.count || 0
    const seriesCount = seriesCountRes?.rows?.[0]?.count || 0
    const avgMovieRowSize = 1024 // ~1KB per movie
    const avgSeriesRowSize = 1536 // ~1.5KB per series
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

    setHealth({
      status,
      lastCheckAt,
      brokenLinks,
      totalChecks,
      usedSpaceMB,
      storageGrowth: Number(storageGrowth.toFixed(1)),
      brokenRatio: Number((brokenRatio * 100).toFixed(1))
    })
    setHealthLoading(false)
  }

  useEffect(() => {
    fetchHealthStats()
  }, [])

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading Dashboard...</div>

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Command Center
          </h1>
          <p className="text-xs text-zinc-500">Live analytics from production data</p>
        </div>
        <button
          onClick={async () => {
            await refreshStats()
            await fetchHealthStats()
          }}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <Activity size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<Users size={16} className="text-blue-400" />} trend={usersGrowth} />
        <StatCard title="Movies" value={stats.totalMovies} icon={<Film size={16} className="text-purple-400" />} />
        <StatCard title="Series" value={stats.totalSeries} icon={<Tv size={16} className="text-pink-400" />} />
        <StatCard title="Total Views" value={stats.totalViews} icon={<PlayCircle size={16} className="text-green-400" />} trend={viewsGrowth} />
        <StatCard title="Avg Views/Title" value={averageViewsPerTitle} icon={<Activity size={16} className="text-cyan-400" />} />
        <StatCard title="Top Watched Items" value={topWatched.length} icon={<PlayCircle size={16} className="text-amber-400" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Server Status</h3>
            <Server size={16} className="text-zinc-300" />
          </div>
          <div className="flex items-end justify-between">
            <span className={`text-xl font-bold ${health.status === 'Online' ? 'text-emerald-400' : health.status === 'Degraded' ? 'text-amber-400' : 'text-rose-400'}`}>
              {healthLoading ? '...' : health.status}
            </span>
            <span className="text-[11px] text-zinc-500">
              {health.lastCheckAt ? new Date(health.lastCheckAt).toLocaleString() : 'No checks yet'}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Used Space</h3>
            <HardDrive size={16} className="text-zinc-300" />
          </div>
          <div className="text-xl font-bold text-white mb-2">{healthLoading ? '...' : `${health.usedSpaceMB.toLocaleString()} MB`}</div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
            <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${usedSpacePercent}%` }} />
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between">
            <span>{usedSpacePercent}% of {storageQuotaMB.toLocaleString()} MB</span>
            <span className={health.storageGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {health.storageGrowth >= 0 ? '+' : ''}{health.storageGrowth}% / 30d
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Broken Links (روابط معطلة)</h3>
            <Link2Off size={16} className="text-zinc-300" />
          </div>
          <div className="text-xl font-bold text-rose-400 mb-2">{healthLoading ? '...' : health.brokenLinks.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Total checks: {health.totalChecks.toLocaleString()}</span>
            <span>{health.brokenRatio}%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-6">
        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-4">Traffic (Views by day)</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficByDay}>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="#3b82f633" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-4">User Growth (new users/day)</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthByDay}>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Bar dataKey="users" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-6">
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-4">Content by Genre</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contentByGenre}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {contentByGenre.map((_, index) => (
                    <Cell key={`genre-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {contentByGenre.slice(0, 6).map((genre) => (
              <div key={genre.name} className="flex items-center justify-between text-[11px] text-zinc-300">
                <span>{genre.name}</span>
                <span className="font-bold text-white">{genre.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-4">Top Watched</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
                  <th className="text-right py-2">Title</th>
                  <th className="text-right py-2">Type</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Rating</th>
                </tr>
              </thead>
              <tbody>
                {topWatched.map((item) => (
                  <tr key={`${item.content_type}-${item.id}`} className="border-b border-zinc-900 hover:bg-white/5">
                    <td className="py-2 text-white font-medium">{item.title}</td>
                    <td className="py-2 text-zinc-300">{item.content_type === 'movie' ? 'Movie' : 'Series'}</td>
                    <td className="py-2 text-zinc-200">{item.views.toLocaleString()}</td>
                    <td className="py-2 text-zinc-200">{item.vote_average.toFixed(1)}</td>
                  </tr>
                ))}
                {topWatched.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">No watch data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({
  title,
  value,
  icon,
  trend
}: {
  title: string
  value: number
  icon: ReactNode
  trend?: number
}) => (
  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 backdrop-blur-sm hover:border-zinc-700 transition-colors">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] text-zinc-400">{title}</span>
      {icon}
    </div>
    <div className="flex items-end justify-between">
      <span className="text-xl font-bold text-white">{value.toLocaleString()}</span>
      {typeof trend === 'number' && (
        <span className={`text-[10px] flex items-center gap-0.5 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  </div>
)

export default AdminDashboard
