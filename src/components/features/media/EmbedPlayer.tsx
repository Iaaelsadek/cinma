import { Signal, Lightbulb, WifiOff, AlertTriangle, Loader2, Download } from 'lucide-react'
import { Server } from '../../../hooks/useServers'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

type Props = {
  server: Server | undefined
  serverIndex?: number
  cinemaMode: boolean
  toggleCinemaMode: () => void
  loading: boolean
  onNextServer: () => void
  onReport: () => void
  reporting: boolean
  title?: string
  onProgress?: (seconds: number) => void
  onPlay?: () => void
  onPause?: () => void
  playing?: boolean
  seekTo?: number
  lang?: 'ar' | 'en'
  servers: Server[]
  activeServerIndex: number
  onServerSelect: (index: number) => void
  downloadUrl?: string
}

export const EmbedPlayer = ({ server, serverIndex = 0, cinemaMode, toggleCinemaMode, loading, onNextServer, onReport, reporting, title, onProgress, onPlay, onPause, playing, seekTo, lang = 'ar', servers, activeServerIndex, onServerSelect, downloadUrl }: Props) => {
  void serverIndex
  
  const [isIframeLoading, setIsIframeLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    setIsIframeLoading(true)
    setHasError(false)
    setIframeKey(prev => prev + 1)
  }, [server?.url])

  const iframeUrl = (() => {
    if (!server?.url) return ''
    return server.url 
  })()

  if (loading) {
    return (
      <div className="aspect-video w-full max-h-[65vh] rounded-[2rem] border border-white/5 bg-luxury-charcoal animate-pulse flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} />
          <div className="absolute inset-0 blur-3xl bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
           <span className="block text-sm font-bold text-primary animate-pulse">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
           <span className="block text-xs text-zinc-500 font-medium">{lang === 'ar' ? 'البحث عن أفضل سيرفر...' : 'Finding best server...'}</span>
        </div>
      </div>
    )
  }

  const isOffline = server?.status === 'offline'
  const isDegraded = server?.status === 'degraded'

  const handleIframeLoad = () => {
    setIsIframeLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setHasError(true)
    onNextServer()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          {servers.map((s, idx) => {
            const isActive = idx === activeServerIndex
            const isServerOffline = s.status === 'offline'
            
            return (
              <button
                key={`${s.name}-${idx}`}
                onClick={() => !isServerOffline && onServerSelect(idx)}
                title={`${s.name} - ${isServerOffline ? 'Offline' : isActive ? 'Active' : 'Available'}`}
                disabled={isServerOffline}
                className={clsx(
                  "flex items-center justify-center p-3 rounded-xl border transition-all duration-300 font-black text-xs",
                  isActive
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : isServerOffline
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-500/50 cursor-not-allowed opacity-50"
                      : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                )}
              >
                V{idx + 1}
              </button>
            )
          })}
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={lang === 'ar' ? 'تحميل' : 'Download'}
              className="flex items-center justify-center p-3 rounded-xl border transition-all duration-300 bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
            >
              <Download size={18} />
            </a>
          )}

          <button 
            onClick={toggleCinemaMode}
            title={cinemaMode ? (lang === 'ar' ? 'وضع السينما مفعّل' : 'Cinema ON') : (lang === 'ar' ? 'وضع السينما' : 'Cinema Mode')}
            className={clsx(
              "group relative flex items-center justify-center p-3 rounded-xl transition-all duration-500 border overflow-hidden",
              cinemaMode 
                ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(245,197,24,0.3)]" 
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
            )}
          >
            <Lightbulb size={18} className={clsx("transition-transform duration-500", cinemaMode ? "fill-black scale-110" : "group-hover:scale-110")} />
          </button>

          <button 
            onClick={onReport}
            disabled={reporting}
            title={reporting ? (lang === 'ar' ? 'جاري الإبلاغ...' : 'Reporting...') : (lang === 'ar' ? 'إبلاغ عن مشكلة' : 'Report Issue')}
            className={clsx(
              "flex items-center justify-center p-3 rounded-xl border transition-all duration-300",
              reporting 
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-not-allowed" 
                : "bg-white/5 border-white/5 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-300"
            )}
          >
            <AlertTriangle size={18} />
          </button>

          <div 
            title={isOffline ? 'Offline' : isDegraded ? 'Degraded' : 'Secure Stream'}
            className={clsx(
              "flex items-center justify-center p-3 rounded-xl border transition-all duration-500",
              isOffline ? "border-red-500/20 bg-red-500/10 text-red-500" : 
              isDegraded ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500" : 
              "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            )}
          >
            <div className="relative">
              <Signal size={18} />
              <div className={clsx(
                "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse",
                isOffline ? "bg-red-500" : isDegraded ? "bg-yellow-500" : "bg-emerald-500"
              )} />
            </div>
          </div>
        </div>
      </div>

      <div className={clsx(
        "relative aspect-video w-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group",
        cinemaMode 
          ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none bg-black' 
          : 'rounded-[2rem] border border-white/10 bg-black shadow-2xl ring-1 ring-white/5 max-h-[65vh]'
      )}>
        {isIframeLoading && server && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl gap-4">
            <div className="relative">
              <Loader2 className="animate-spin text-primary" size={56} />
              <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <span className="block text-sm font-bold text-white">{lang === 'ar' ? 'جاري الاتصال...' : 'Connecting...'}</span>
            </div>
          </div>
        )}

        <div className="h-full w-full relative">
          {server && !hasError ? (
            <iframe
              key={iframeKey}
              src={iframeUrl}
              className={clsx(
                "h-full w-full bg-black transition-opacity duration-1000",
                isIframeLoading ? "opacity-0" : "opacity-100"
              )}
              allowFullScreen
              scrolling="no"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              referrerPolicy="origin"
              style={{ border: 'none', overflow: 'hidden', width: '100%', height: '100%' }}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share"
              title={`Stream ${server.name}`}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-6 bg-zinc-950/50 backdrop-blur-3xl">
              <div className="p-8 rounded-full bg-white/5 border border-white/5">
                <WifiOff size={64} className="opacity-20" />
              </div>
              <div className="text-center space-y-3 max-w-xs">
                <span className="block text-xl font-bold text-zinc-200">{lang === 'ar' ? 'لا يوجد اتصال' : 'No Connection'}</span>
                <span className="block text-sm text-zinc-500 font-medium leading-relaxed">{lang === 'ar' ? 'جميع السيرفرات غير متاحة حالياً' : 'All servers unavailable'}</span>
                <button 
                  onClick={onNextServer}
                  className="mt-4 px-6 py-3 rounded-2xl bg-primary text-black text-sm font-bold hover:scale-105 transition-transform"
                >
                  {lang === 'ar' ? 'تجربة سيرفر آخر' : 'Try Another Server'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {cinemaMode && (
          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={toggleCinemaMode}
            className="absolute top-8 right-8 z-[70] flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 transition-all group"
          >
            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">{lang === 'ar' ? 'إغلاق وضع السينما' : 'Exit Cinema'}</span>
            <Lightbulb size={20} className="fill-white" />
          </motion.button>
        )}
      </div>
    </div>
  )
}
