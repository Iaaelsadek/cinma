import { useState, useEffect } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  Users, Film, Tv, PlayCircle, Activity, 
  ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Server, HardDrive,
  PieChart as PieChartIcon, X, RefreshCw
} from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard = () => {
  const { stats, recentActivity, loading, refreshStats } = useAdmin()
  const [timeframe, setTimeframe] = useState('weekly')

  if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading Dashboard...</div>

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            لوحة القيادة
          </h1>
          <p className="text-xs text-zinc-500">مرحباً بك في لوحة التحكم المركزية</p>
        </div>
        <button 
          onClick={refreshStats}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <Activity size={14} /> تحديث البيانات
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard 
          title="إجمالي المستخدمين" 
          value={stats.totalUsers} 
          icon={<Users size={16} className="text-blue-400" />} 
          trend="+12%" 
          trendUp={true}
        />
        <StatCard 
          title="الأفلام" 
          value={stats.totalMovies} 
          icon={<Film size={16} className="text-purple-400" />} 
          trend="+5" 
          trendUp={true}
        />
        <StatCard 
          title="المسلسلات" 
          value={stats.totalSeries} 
          icon={<Tv size={16} className="text-pink-400" />} 
          trend="+2" 
          trendUp={true}
        />
        <StatCard 
          title="إجمالي المشاهدات" 
          value={stats.totalViews} 
          icon={<PlayCircle size={16} className="text-green-400" />} 
          trend="+24%" 
          trendUp={true}
        />
        <StatCard 
          title="حالة السيرفر"
          value="Online"
          icon={<Server size={16} className="text-cyan-400" />}
          trend="Stable"
          trendUp={true}
        />
        <StatCard 
          title="المساحة المستخدمة"
          value="62%"
          icon={<HardDrive size={16} className="text-amber-400" />}
          trend="+3%"
          trendUp={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Views Chart */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={16} className="text-primary" /> إحصائيات المشاهدة
            </h3>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300"
            >
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.viewsPerDay}>
                <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  cursor={{ fill: '#27272a' }}
                />
                <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Distribution */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm flex flex-col">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon size={16} className="text-orange-400" /> توزيع المحتوى
          </h3>
          <div className="h-[250px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity & Broken Links */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" /> النشاط الأخير
          </h3>
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.type === 'success' ? 'bg-green-500' : 
                    log.type === 'error' ? 'bg-red-500' : 
                    log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-200">
                      <span className="text-primary">{log.user}</span> {log.action} <span className="text-white font-bold">{log.target}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">{log.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broken Links / Server Health */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
           <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-rose-500">
            <Activity size={16} /> روابط معطلة (تلقائي)
          </h3>
          <BrokenLinksLog />
        </div>
      </div>
    </div>
  )
}

const BrokenLinksLog = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('broken_links_report')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(10)
    
    if (data) setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('broken_links_report').delete().eq('id', id)
    if (!error) {
      setLogs(logs.filter(l => l.id !== id))
    }
  }

  const recheckLog = async (log: any) => {
    setChecking(log.id)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 7000)
      
      await fetch(log.url, { 
        mode: 'no-cors', 
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      // If no error, it might be online
      await deleteLog(log.id)
      toast.success('تم إصلاح الرابط ومسحه من السجل بنجاح')
    } catch (e: any) {
      if (e.name === 'AbortError') {
        toast.error('انتهت مهلة الفحص، الرابط لا يزال بطيئاً أو غير مستقر')
      } else {
        toast.error('الرابط لا يزال معطلاً')
      }
    } finally {
      setChecking(null)
    }
  }

  const clearLogs = async () => {
    if (!confirm('هل أنت متأكد من مسح جميع السجلات؟')) return
    const { error } = await supabase.from('broken_links_report').delete().neq('id', '0')
    if (!error) {
      setLogs([])
    }
  }

  if (loading) return <div className="text-[10px] text-zinc-500">جاري التحميل...</div>
  
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <button 
          onClick={fetchLogs}
          className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-zinc-400 transition-colors"
        >
          تحديث
        </button>
        {logs.length > 0 && (
          <button 
            onClick={clearLogs}
            className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md text-rose-500 transition-colors"
          >
            مسح الكل
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-[10px] text-zinc-400 text-center py-4">لا توجد روابط معطلة مكتشفة حالياً.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg flex flex-col gap-1 group relative overflow-hidden">
              {checking === log.id && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 uppercase">{log.server_id}</span>
                <div className="flex items-center gap-1">
                   <button 
                    onClick={() => recheckLog(log)}
                    disabled={checking === log.id}
                    title="إعادة فحص"
                    className="p-1 text-zinc-500 hover:text-primary transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={10} className={checking === log.id ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => deleteLog(log.id)}
                    title="حذف السجل"
                    className="p-1 text-zinc-500 hover:text-rose-500 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              
              <div className="text-[11px] text-zinc-300">
                {log.type === 'movie' ? 'فيلم' : 'مسلسل'} ID: <span className="text-white font-bold">{log.tmdb_id}</span>
                {log.season && ` • موسم ${log.season} • حلقة ${log.episode}`}
              </div>
              <div className="text-[8px] text-zinc-500 truncate mt-1">
                {log.url}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const StatCard = ({ title, value, icon, trend, trendUp }: any) => (
  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 backdrop-blur-sm hover:border-zinc-700 transition-colors">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] text-zinc-400">{title}</span>
      {icon}
    </div>
    <div className="flex items-end justify-between">
      <span className="text-xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className={`text-[10px] flex items-center gap-0.5 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </span>
    </div>
  </div>
)

export default AdminDashboard
