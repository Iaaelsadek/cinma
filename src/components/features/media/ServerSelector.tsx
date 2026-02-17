import { Server as ServerIcon } from 'lucide-react'
import { Server } from '../../../hooks/useServers'

type Props = {
  servers: Server[]
  active: number
  onSelect: (index: number) => void
}

export const ServerSelector = ({ servers, active, onSelect }: Props) => {
  return (
    <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold">
            <ServerIcon size={18} />
            <h3>Select Server</h3>
        </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {servers.map((s, idx) => {
          const isActive = idx === active
          const isOnline = s.status === 'online'
          
          return (
            <button
              key={`${s.name}-${idx}`}
              onClick={() => onSelect(idx)}
              className={`group relative flex items-center gap-2 rounded-lg border p-2 text-xs font-bold transition-all duration-300 overflow-hidden
                ${isActive
                  ? 'bg-gradient-to-br from-primary to-purple-600 border-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] z-10'
                  : 'bg-black/40 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}
            >
              <div className={`relative z-10 flex items-center justify-center h-6 w-6 rounded-md ${isActive ? 'bg-black/20' : 'bg-black/40'}`}>
                 <ServerIcon size={12} className={isActive ? 'text-white' : 'text-zinc-500'} />
              </div>
              
              <div className="relative z-10 flex flex-col items-start min-w-0 w-full">
                <span className="truncate w-full text-[10px]">{s.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`h-1 w-1 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-zinc-600'}`} />
                  <span className={`text-[8px] uppercase tracking-wider ${isOnline ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {isOnline ? `${s.responseTime}ms` : 'Checking'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
