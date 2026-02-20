import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  Users, Film, Tv, PlayCircle, Activity, 
  ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Server, HardDrive,
  PieChart as PieChartIcon
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Views Chart */}
        <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
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
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm flex flex-col">
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

      {/* Recent Activity & System Health */}
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

        {/* Quick Actions / System Status */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
           <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-400" /> حالة النظام
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-xs font-medium text-green-400">Database Connection</span>
              <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-xs font-medium text-blue-400">API Latency</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">45ms</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <span className="text-xs font-medium text-purple-400">Cache Hit Rate</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">98%</span>
            </div>
          </div>
        </div>
      </div>
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
