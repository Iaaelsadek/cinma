import { ChevronDown, Calendar, PlayCircle } from 'lucide-react'
import { useState } from 'react'

type Props = {
  season: number
  episode: number
  setSeason: (s: number) => void
  setEpisode: (e: number) => void
  seasonsCount?: number
  episodesCount?: number
}

export const EpisodeSelector = ({ season, episode, setSeason, setEpisode, seasonsCount = 10, episodesCount = 24 }: Props) => {
  const [seasonOpen, setSeasonOpen] = useState(false)

  return (
    <div className="space-y-4 bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-primary font-bold mb-2">
          <Calendar size={18} />
          <h3>Episodes & Seasons</h3>
      </div>

      {/* Season Dropdown */}
      <div className="relative">
        <button
          onClick={() => setSeasonOpen(!seasonOpen)}
          className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold hover:bg-white/10 transition-all"
        >
          <span>Season {season}</span>
          <ChevronDown size={16} className={`transition-transform ${seasonOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {seasonOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {Array.from({ length: seasonsCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setSeason(i + 1)
                  setEpisode(1) // Reset episode on season change
                  setSeasonOpen(false)
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${season === i + 1 ? 'text-primary font-bold bg-primary/10' : 'text-zinc-400'}`}
              >
                Season {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Episodes Grid/List */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {Array.from({ length: episodesCount }).map((_, i) => {
          const epNum = i + 1
          const isActive = epNum === episode
          return (
            <button
              key={epNum}
              onClick={() => setEpisode(epNum)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-bold transition-all
                ${isActive 
                  ? 'bg-primary border-primary text-black scale-105 shadow-[0_0_10px_rgba(0,255,204,0.4)]' 
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}
            >
              <PlayCircle size={14} className={`mb-1 ${isActive ? 'fill-black text-black' : ''}`} />
              <span>Ep {epNum}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
