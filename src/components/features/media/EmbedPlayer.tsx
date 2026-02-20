import { Signal, Lightbulb, WifiOff, Wifi, SkipForward, AlertTriangle, Loader2 } from 'lucide-react'
import { Server } from '../../../hooks/useServers'

type Props = {
  server: Server | undefined
  cinemaMode: boolean
  toggleCinemaMode: () => void
  loading: boolean
  onNextServer: () => void
  onReport: () => void
  reporting: boolean
}

export const EmbedPlayer = ({ server, cinemaMode, toggleCinemaMode, loading, onNextServer, onReport, reporting }: Props) => {
  if (loading) {
    return (
      <div className="aspect-video w-full rounded-3xl border border-white/5 bg-luxury-charcoal animate-pulse flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header: Secure Stream & Cinema Mode */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Signal size={12} />
          <span>Secure Stream</span>
        </div>
        
        <button 
          onClick={toggleCinemaMode}
          className={`flex items-center gap-2 text-xs font-bold transition-colors ${cinemaMode ? 'text-[#f5c518] animate-pulse' : 'text-zinc-400 hover:text-white'}`}
        >
          <Lightbulb size={14} className={cinemaMode ? 'fill-[#f5c518]' : ''} />
          <span>{cinemaMode ? 'Cinema ON' : 'Cinema Mode'}</span>
        </button>
      </div>

      {/* Video Player Container */}
      <div className={`relative aspect-video w-full overflow-hidden rounded-3xl border bg-black shadow-2xl transition-all duration-500 group
        ${cinemaMode 
          ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none' 
          : 'border-white/10 ring-1 ring-white/5'}`}
      >
        {server ? (
          <iframe
            key={server.url}
            src={server.url}
            className="h-full w-full bg-black"
            allowFullScreen
            scrolling="no"
            referrerPolicy="origin"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            style={{ border: 'none', overflow: 'hidden' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            title={`Stream ${server.name}`}
            onError={() => onNextServer()}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-4 bg-zinc-900/50">
            <WifiOff size={48} className="opacity-50" />
            <div className="text-center space-y-2">
              <span className="block text-lg font-medium text-zinc-300">No working servers found</span>
              <span className="block text-sm text-zinc-500">Try switching servers below or use the external link</span>
            </div>
          </div>
        )}
        
        {cinemaMode && (
          <button 
            onClick={toggleCinemaMode}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
          >
            <Lightbulb size={24} className="fill-white" />
          </button>
        )}
      </div>

      {/* Footer: Report & Auto-Switch */}
      <div className="flex justify-between items-center px-1">
        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest flex items-center gap-2">
           <Wifi size={12} />
           <span>Protocol v2.0 • {server?.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNextServer}
            disabled={reporting}
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 h-8 text-xs font-bold text-zinc-400 hover:bg-white/10 transition-all hover:text-white"
          >
            <SkipForward size={12} />
            <span>Next Server</span>
          </button>
          
          {server && (
            <a
              href={server.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-emerald-500/10 px-3 h-8 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Direct Link</span>
            </a>
          )}
          
          <button
            onClick={onReport}
            disabled={reporting}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 h-8 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all"
          >
            {reporting ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            <span>Report</span>
          </button>
        </div>
      </div>
    </div>
  )
}
