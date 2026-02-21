import { Signal, Lightbulb, WifiOff, Wifi, SkipForward, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'
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
      {/* Header: Secure Stream & Controls */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Signal size={12} />
          <span>Secure Stream</span>
        </div>
        
        <div className="flex items-center gap-2">
          {server && (
            <a 
              href={server.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg"
            >
              <ExternalLink size={12} />
              <span>Open External</span>
            </a>
          )}
          <button 
            onClick={toggleCinemaMode}
            className={`flex items-center gap-2 text-xs font-bold transition-colors ${cinemaMode ? 'text-[#f5c518] animate-pulse' : 'text-zinc-400 hover:text-white'}`}
          >
            <Lightbulb size={14} className={cinemaMode ? 'fill-[#f5c518]' : ''} />
            <span>{cinemaMode ? 'Cinema ON' : 'Cinema Mode'}</span>
          </button>
        </div>
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
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
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
      <div className="flex flex-col gap-2 px-1">
        <div className="flex justify-between items-center">
          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest flex items-center gap-2">
             <Wifi size={12} />
             <span>Protocol v2.0 • {server?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onReport}
              disabled={reporting}
              className="text-[10px] font-bold text-red-500/80 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <AlertTriangle size={12} />
              <span>{reporting ? 'Reporting...' : 'Report Broken'}</span>
            </button>
            
            <button 
              onClick={onNextServer}
              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span>Next Server</span>
              <SkipForward size={12} />
            </button>
          </div>
        </div>
        
        {/* Helper Tip */}
        <div className="text-[10px] text-zinc-600 text-center">
          If the video is unavailable or slow, please try switching servers using the buttons above.
        </div>
      </div>
    </div>
  )
}
