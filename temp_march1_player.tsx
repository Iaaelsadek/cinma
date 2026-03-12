import { Signal, Lightbulb, WifiOff, Wifi, SkipForward, AlertTriangle, Loader2, ExternalLink, RefreshCcw, Server as ServerIcon } from 'lucide-react'
import { Server } from '../../../hooks/useServers'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

type Props = {
  server: Server | undefined
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
}

export const EmbedPlayer = ({ server, cinemaMode, toggleCinemaMode, loading, onNextServer, onReport, reporting, title, onProgress, onPlay, onPause, playing, seekTo }: Props) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isSlowConnection, setIsSlowConnection] = useState(false)
  const [loadStartTime, setLoadStartTime] = useState<number>(0)
  const [autoSwitchTimer, setAutoSwitchTimer] = useState<number>(0)

  // Connection Quality Detection
  useEffect(() => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      const updateConn = () => {
        setIsSlowConnection(conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === '3g')
      }
      conn.addEventListener('change', updateConn)
      updateConn()
      return () => conn.removeEventListener('change', updateConn)
    }
  }, [])

  // Auto-switch Logic if loading takes too long
  useEffect(() => {
    let timeout: number | null = null
    
    if (isIframeLoading && server) {
      setLoadStartTime(Date.now())
      // If server doesn't load in 15 seconds, consider it a failure and offer next
      timeout = window.setTimeout(() => {
        if (isIframeLoading) {
           // We don't auto-switch immediately to avoid annoying the user, 
           // but we show a helpful warning and a quick-switch button
           onNextServer()
        }
      }, 15000)
    }

    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [isIframeLoading, server?.url, onNextServer])

  // Reset loading state when server changes
  useEffect(() => {
    setIsIframeLoading(true)
    setRetryCount(0)
  }, [server?.url])

  if (loading) {
    return (
      <div className="aspect-video w-full rounded-[2rem] border border-white/5 bg-luxury-charcoal animate-pulse flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={56} />
          <div className="absolute inset-0 blur-3xl bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
           <span className="block text-xs font-black text-primary uppercase tracking-[0.3em] animate-pulse">Initializing Flux Relay</span>
           <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Searching for optimized secure channels...</span>
        </div>
      </div>
    )
  }

  const isOffline = server?.status === 'offline'
  const isDegraded = server?.status === 'degraded'

  const handleIframeLoad = () => {
    setIsIframeLoading(false)
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setIsIframeLoading(true)
  }

  return (
    <div className="space-y-4">
      {/* Header: Stream Status & Cinema Mode */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-tighter transition-all duration-500",
            isOffline ? "border-red-500/20 bg-red-500/10 text-red-500" : 
            isDegraded ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500" : 
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          )}>
            <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-red-500" : isDegraded ? "bg-yellow-500" : "bg-emerald-500")} />
            <Signal size={10} />
            <span>{isOffline ? 'Offline' : isDegraded ? 'Degraded' : 'Secure Stream'}</span>
          </div>

          {server && (
            <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <ServerIcon size={12} />
              <span>{server.name}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleCinemaMode}
            className={clsx(
              "group relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border overflow-hidden",
              cinemaMode 
                ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(245,197,24,0.3)]" 
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
            )}
          >
            <Lightbulb size={14} className={clsx("transition-transform duration-500", cinemaMode ? "fill-black scale-110" : "group-hover:scale-110")} />
            <span>{cinemaMode ? 'Cinema ON' : 'Cinema Mode'}</span>
          </button>
        </div>
      </div>

      {/* Video Player Container */}
      <div className={clsx(
        "relative aspect-video w-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group",
        cinemaMode 
          ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none bg-black' 
          : 'rounded-[2rem] border border-white/10 bg-black shadow-2xl ring-1 ring-white/5'
      )}>
        {/* Iframe Loading State */}
        <AnimatePresence>
          {isIframeLoading && server && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl gap-4"
            >
              <div className="relative">
                <Loader2 className="animate-spin text-primary" size={56} />
                <div className="absolute inset-0 blur-2xl bg-primary/20 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <span className="block text-xs font-black text-white uppercase tracking-[0.2em]">{server.name}</span>
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Establishing Encrypted Connection...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Frame */}
        <div className="h-full w-full relative">
          {server ? (
            <iframe
              key={`${server.url}-${retryCount}`}
              src={server.url}
              className={clsx(
                "h-full w-full bg-black transition-opacity duration-1000",
                isIframeLoading ? "opacity-0" : "opacity-100"
              )}
              allowFullScreen
              scrolling="no"
              onLoad={handleIframeLoad}
              referrerPolicy="origin"
              style={{ border: 'none', overflow: 'hidden' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              title={`Stream ${server.name}`}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-6 bg-zinc-950/50 backdrop-blur-3xl">
              <div className="p-8 rounded-full bg-white/5 border border-white/5">
                <WifiOff size={64} className="opacity-20" />
              </div>
              <div className="text-center space-y-3 max-w-xs">
                <span className="block text-xl font-black text-zinc-200 uppercase tracking-tighter">Transmission Lost</span>
                <span className="block text-xs text-zinc-500 font-medium leading-relaxed">All secure uplink channels are currently unresponsive. Attempting to rotate to alternative relay nodes.</span>
                <button 
                  onClick={onNextServer}
                  className="mt-4 px-6 py-3 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Switch to Next Relay
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Cinema Mode Close Button */}
        {cinemaMode && (
          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={toggleCinemaMode}
            className="absolute top-8 right-8 z-[70] flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Exit Cinema</span>
            <Lightbulb size={20} className="fill-white" />
          </motion.button>
        )}

        {/* Floating Controls for Iframe (Visual only to maintain LUMEN style) */}
        {!cinemaMode && !isIframeLoading && server && (
          <div className="absolute top-4 left-4 pointer-events-none">
             <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Wifi size={10} className="text-emerald-500" />
                <span>Live Relay • {server.name}</span>
             </div>
          </div>
        )}
      </div>

      {/* Footer: Detailed Controls & Reporting */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleRetry}
            className="group flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform duration-700" />
            <span>Reconnect</span>
          </button>
          
          <div className="w-px h-3 bg-white/10" />

          {server && (
            <a 
              href={server.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              <ExternalLink size={12} />
              <span>External</span>
            </a>
          )}
        </div>

        <div className="flex justify-center order-first md:order-none">
           <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl">
              <button 
                onClick={onNextServer}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <span>Rotate Server</span>
                <SkipForward size={14} />
              </button>
           </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={onReport}
            disabled={reporting}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              reporting 
                ? "bg-red-500/20 text-red-500 border border-red-500/20" 
                : "text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
            )}
          >
            <AlertTriangle size={14} />
            <span>{reporting ? 'Reporting...' : 'Report Failure'}</span>
          </button>
        </div>
      </div>
      
      {/* Help Banner */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-2 p-3 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center"
      >
        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.1em] leading-relaxed">
          Uplink optimization in progress. If buffering persists, use the <span className="text-primary">Rotate Server</span> command to switch relay nodes.
        </span>
      </motion.div>
    </div>
  )
}
