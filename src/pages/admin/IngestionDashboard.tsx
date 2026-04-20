import { useState, useEffect } from 'react'
import { toast } from '../../lib/toast-manager'
import { 
  getIngestionStats, 
  getIngestionLog, 
  queueItems,
  requeueFailed, 
  triggerProcessing,
  type IngestionLogItem
} from '../../services/ingestionAPI'
import {
  Download,
  RefreshCw,
  Play,
  RotateCcw,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Database,
  PlusCircle
} from 'lucide-react'
// REMOVED: import pool from '../../db/pool' - Frontend should NOT import database pool directly!

function IngestionDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    isProcessing: false
  })
  const [log, setLog] = useState<IngestionLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', contentType: 'all' })
  const [activeTab, setActiveTab] = useState<'queue' | 'manual'>('queue')
  const [manualQueue, setManualQueue] = useState<{
    externalSource: 'TMDB'
    externalId: string
    contentType: 'movie' | 'tv_series'
  }>({
    externalSource: 'TMDB',
    externalId: '',
    contentType: 'movie'
  })
  const [manualSoftware, setManualSoftware] = useState({
    title: '',
    overview: '',
    poster_url: '',
    release_year: new Date().getFullYear(),
    developer: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, logData] = await Promise.all([
        getIngestionStats(),
        getIngestionLog({
          page: 1,
          limit: 50,
          status: filters.status !== 'all' ? filters.status : undefined,
          contentType: filters.contentType !== 'all' ? filters.contentType : undefined
        })
      ])
      setStats(statsData)
      setLog(logData.data)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load ingestion data', { id: 'ingestion-load-error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [filters])

  const handleQueueManual = async () => {
    if (!manualQueue.externalId.trim()) {
      toast.error('Please enter an external ID', { id: 'queue-validation' })
      return
    }

    try {
      const result = await queueItems([manualQueue])
      toast.success(result.message, { id: 'queue-success' })
      setManualQueue({ ...manualQueue, externalId: '' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to queue item', { id: 'queue-error' })
    }
  }

  const handleRequeueFailed = async () => {
    try {
      const result = await requeueFailed()
      toast.success(result.message, { id: 'requeue-success' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to requeue', { id: 'requeue-error' })
    }
  }

  const handleStartProcessing = async () => {
    try {
      const result = await triggerProcessing(1)
      toast.success(result.message, { id: 'process-success' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to start processing', { id: 'process-error' })
    }
  }

  const handleManualSoftwareSubmit = async () => {
    if (!manualSoftware.title.trim()) {
      toast.error('Title is required', { id: 'software-validation' })
      return
    }
    if (!manualSoftware.overview.trim()) {
      toast.error('Overview is required', { id: 'software-validation' })
      return
    }

    try {
      setSubmitting(true)
      
      // Generate slug from title
      const slug = manualSoftware.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Use API endpoint instead of direct database access
      const response = await fetch('/api/admin/software', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: manualSoftware.title,
          slug: slug,
          overview: manualSoftware.overview,
          poster_url: manualSoftware.poster_url || null,
          release_year: manualSoftware.release_year,
          developer: manualSoftware.developer || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add software')
      }

      const result = await response.json()

      toast.success(`Software "${manualSoftware.title}" added successfully!`, { id: 'software-success' })
      
      // Reset form
      setManualSoftware({
        title: '',
        overview: '',
        poster_url: '',
        release_year: new Date().getFullYear(),
        developer: ''
      })
      
      loadData()
    } catch (error: any) {
      console.error('Manual software entry error:', error)
      toast.error(error.message || 'Failed to add software', { id: 'software-error' })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, color: 'text-yellow-400 bg-yellow-500/10', label: 'Pending' },
      processing: { icon: Loader, color: 'text-blue-400 bg-blue-500/10 animate-pulse', label: 'Processing' },
      success: { icon: CheckCircle, color: 'text-green-400 bg-green-500/10', label: 'Success' },
      failed: { icon: XCircle, color: 'text-red-400 bg-red-500/10', label: 'Failed' },
      skipped: { icon: AlertCircle, color: 'text-gray-400 bg-gray-500/10', label: 'Skipped' }
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30">
            <Database className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Content Ingestion
          </h1>
        </div>
        <p className="text-gray-400 text-sm">Manage and monitor content ingestion pipeline</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Database, color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30' },
          { label: 'Processing', value: stats.processing, icon: Loader, color: 'from-blue-500/20 to-purple-500/20 border-blue-500/30' },
          { label: 'Success', value: stats.success, icon: CheckCircle, color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: 'from-red-500/20 to-pink-500/20 border-red-500/30' },
          { label: 'Skipped', value: stats.skipped, icon: AlertCircle, color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30' },
          { label: 'Status', value: stats.isProcessing ? 'Active' : 'Idle', icon: RefreshCw, color: stats.isProcessing ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-gray-500/20 to-slate-500/20 border-gray-500/30' }
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${stat.color} backdrop-blur-sm border p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                <Icon className={`w-4 h-4 text-gray-400 ${stat.label === 'Processing' && stats.processing > 0 ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleRequeueFailed}
          disabled={stats.failed === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 border border-orange-500/30 text-orange-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Re-queue Failed ({stats.failed})
        </button>
        <button
          onClick={handleStartProcessing}
          disabled={stats.pending === 0 || stats.isProcessing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 text-green-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Start Processing
        </button>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-400 font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20">
        <div className="flex items-center gap-4 mb-4 border-b border-purple-500/20 pb-4">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            Queue from API
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Manual Software Entry
          </button>
        </div>

        {activeTab === 'queue' ? (
          <>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-400" />
              Queue Content from External API
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={manualQueue.externalSource}
                onChange={(e) => setManualQueue({ ...manualQueue, externalSource: e.target.value as 'TMDB' })}
                className="px-4 py-2.5 rounded-lg bg-[#1C1B1F] border border-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-[#0F0F14] transition-colors"
              >
                <option value="TMDB" className="bg-[#1C1B1F] text-white">TMDB</option>
              </select>
              <input
                type="text"
                placeholder="External ID (e.g., 550)"
                value={manualQueue.externalId}
                onChange={(e) => setManualQueue({ ...manualQueue, externalId: e.target.value })}
                className="px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <select
                value={manualQueue.contentType}
                onChange={(e) => setManualQueue({ ...manualQueue, contentType: e.target.value as 'movie' | 'tv_series' })}
                className="px-4 py-2.5 rounded-lg bg-[#1C1B1F] border border-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-[#0F0F14] transition-colors"
              >
                <option value="movie" className="bg-[#1C1B1F] text-white">Movie</option>
                <option value="tv_series" className="bg-[#1C1B1F] text-white">TV Series</option>
              </select>
              <button
                onClick={handleQueueManual}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all"
              >
                Queue Item
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              Add Software Manually
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Software title"
                  value={manualSoftware.title}
                  onChange={(e) => setManualSoftware({ ...manualSoftware, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Developer
                </label>
                <input
                  type="text"
                  placeholder="Developer name"
                  value={manualSoftware.developer}
                  onChange={(e) => setManualSoftware({ ...manualSoftware, developer: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Overview <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Software description"
                  value={manualSoftware.overview}
                  onChange={(e) => setManualSoftware({ ...manualSoftware, overview: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Poster URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/poster.jpg"
                  value={manualSoftware.poster_url}
                  onChange={(e) => setManualSoftware({ ...manualSoftware, poster_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Release Year
                </label>
                <input
                  type="number"
                  min="1970"
                  max={new Date().getFullYear() + 5}
                  value={manualSoftware.release_year}
                  onChange={(e) => setManualSoftware({ ...manualSoftware, release_year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-700/50 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleManualSoftwareSubmit}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Adding Software...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Add Software
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 rounded-lg bg-[#1C1B1F] border border-gray-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-[#0F0F14] transition-colors"
        >
          <option value="all" className="bg-[#1C1B1F] text-white">All Status</option>
          <option value="pending" className="bg-[#1C1B1F] text-white">Pending</option>
          <option value="processing" className="bg-[#1C1B1F] text-white">Processing</option>
          <option value="success" className="bg-[#1C1B1F] text-white">Success</option>
          <option value="failed" className="bg-[#1C1B1F] text-white">Failed</option>
          <option value="skipped" className="bg-[#1C1B1F] text-white">Skipped</option>
        </select>
        <select
          value={filters.contentType}
          onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
          className="px-3 py-1.5 rounded-lg bg-[#1C1B1F] border border-gray-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-[#0F0F14] transition-colors"
        >
          <option value="all" className="bg-[#1C1B1F] text-white">All Types</option>
          <option value="movie" className="bg-[#1C1B1F] text-white">Movies</option>
          <option value="tv_series" className="bg-[#1C1B1F] text-white">TV Series</option>
        </select>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">External ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Retries</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Error</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Loading ingestion log...</p>
                  </td>
                </tr>
              ) : log.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No ingestion records found
                  </td>
                </tr>
              ) : (
                log.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{item.external_source}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{item.external_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 capitalize">{item.content_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{item.retry_count}</td>
                    <td className="px-4 py-3 text-sm text-red-400 max-w-xs truncate">{item.last_error || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default IngestionDashboard
