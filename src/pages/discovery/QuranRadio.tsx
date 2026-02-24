import { useState, useEffect, useRef } from 'react'
import { Play, Pause, ChevronRight, ChevronLeft, Power } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

// Ultra-Reliable HTTPS MP3 Streams
const STATIONS = [
  { id: 'cairo_alt', name: 'إذاعة القرآن الكريم (عبدالباسط)', url: 'https://qurango.net/radio/abdulbasit_abdulsamad_mojawwad' },
  { id: 'minshawi', name: 'إذاعة القرآن الكريم (المنشاوي)', url: 'https://qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad' },
  { id: 'alafasy', name: 'إذاعة القرآن الكريم (العفاسي)', url: 'https://qurango.net/radio/mishary_alafasy_mojawwad' },
  { id: 'tablawi', name: 'إذاعة القرآن الكريم (الطبلاوي)', url: 'https://qurango.net/radio/mohammed_mahmoud_altablawi_mojawwad' },
  { id: 'maher', name: 'إذاعة القرآن الكريم (ماهر المعيقلي)', url: 'https://qurango.net/radio/maher_al_muaiqly_mojawwad' },
  { id: 'shuraim', name: 'إذاعة القرآن الكريم (سعود الشريم)', url: 'https://qurango.net/radio/saud_alshuraim_mojawwad' },
  { id: 'sudais', name: 'إذاعة القرآن الكريم (عبدالرحمن السديس)', url: 'https://qurango.net/radio/abdulrahman_alsudaes_mojawwad' },
  { id: 'ajmy', name: 'إذاعة القرآن الكريم (أحمد العجمي)', url: 'https://qurango.net/radio/ahmad_alajmy_mojawwad' },
  { id: 'fares', name: 'إذاعة القرآن الكريم (فارس عباد)', url: 'https://qurango.net/radio/fares_abbad' },
  { id: 'idris', name: 'إذاعة القرآن الكريم (إدريس أبكر)', url: 'https://qurango.net/radio/idris_abkar' },
  { id: 'yasser', name: 'إذاعة القرآن الكريم (ياسر الدوسري)', url: 'https://qurango.net/radio/yasser_aldosari' },
]

export const QuranRadio = () => {
  const [isOn, setIsOn] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [stationIndex, setStationIndex] = useState(0)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const currentStation = STATIONS[stationIndex]

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Handle station change
  useEffect(() => {
    if (isOn && audioRef.current) {
      setLoading(true)
      setError(false)
      setIsPlaying(false)
      
      // Direct playback without delay
      const playStation = async () => {
        try {
          if (!audioRef.current) return
          
          audioRef.current.load()
          audioRef.current.volume = volume
          const promise = audioRef.current.play()
          
          if (promise !== undefined) {
            promise.then(() => {
              setIsPlaying(true)
              setLoading(false)
              setError(false)
            }).catch(e => {
              console.error("Play promise error:", e)
              if (e.name === 'NotAllowedError') {
                 // User interaction needed
                 setLoading(false)
                 setIsPlaying(false)
              } else {
                 // Try next station automatically on error?
                 // or show error
                 setError(true)
                 setLoading(false)
              }
            })
          }
        } catch (e: any) {
          console.error("Play error:", e)
          setError(true)
          setLoading(false)
        }
      }

      playStation()
    }
  }, [stationIndex])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const initAudio = () => {
    if (!audioRef.current) return
    setError(false)
    setLoading(true)
    
    audioRef.current.load()
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true)
        setLoading(false)
      })
      .catch(e => {
        console.error("Init error:", e)
        setLoading(false)
        if (e.name !== 'NotAllowedError') {
           setError(true)
        }
      })
  }

  const togglePower = () => {
    if (isOn) {
      // Turn off
      setIsOn(false)
      setIsPlaying(false)
      setLoading(false)
      setError(false)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } else {
      // Turn on
      setIsOn(true)
      setLoading(true)
      setError(false)
      // Immediate attempt
      setTimeout(() => initAudio(), 100) 
    }
  }

  const togglePlay = () => {
    if (!isOn) return
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      initAudio()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
  }

  const nextStation = () => {
    if (!isOn) return
    setStationIndex((prev) => (prev + 1) % STATIONS.length)
  }

  const prevStation = () => {
    if (!isOn) return
    setStationIndex((prev) => (prev - 1 + STATIONS.length) % STATIONS.length)
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4 relative overflow-hidden font-mono select-none">
      <Helmet>
        <title>Quran Radio</title>
        <style>{`
          .ltr-input {
            direction: ltr !important;
            transform: scaleX(1) !important;
            -webkit-appearance: slider-horizontal !important;
          }
          /* Force range track to be LTR visual */
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
          }
        `}</style>
      </Helmet>

      {/* Antenna */}
      <div className="absolute top-0 right-10 w-2 h-32 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 rounded-t-full origin-bottom transform -rotate-12 translate-y-12 z-0 shadow-lg border-l border-gray-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gray-300 shadow-sm border border-gray-400" />
        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-b from-transparent via-black/10 to-black/30" />
      </div>

      {/* Main Radio Body */}
      <div className="relative z-10 w-full max-w-[320px] bg-[#1a1a1a] rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] border-4 border-[#2a2a2a] flex flex-col gap-5">
        
        {/* Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none mix-blend-overlay rounded-2xl" />

        {/* Top Section: Speaker & Brand */}
        <div className="flex justify-between items-start relative z-10">
           {/* Speaker Grille */}
           <div className="grid grid-cols-6 gap-1 w-24 h-24 p-1">
              {[...Array(36)].map((_, i) => (
                <div key={i} className="w-full h-full bg-[#0a0a0a] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)]" />
              ))}
           </div>
           
           {/* Brand Badge */}
           <div className="flex flex-col items-end">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-100 shadow border border-yellow-900 mb-1">
                 GOLD EDITION
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5 bg-[#111] px-1.5 py-0.5 rounded border border-white/10 shadow-inner">
                    <div className={`w-2 h-2 rounded-full border border-zinc-600 transition-all duration-300 ${isOn && isPlaying && !loading ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse' : 'bg-[#333]'}`} />
                    <span className={`text-[9px] font-bold tracking-wider transition-colors ${isOn && isPlaying && !loading ? 'text-red-500 text-shadow-red' : 'text-zinc-700'}`}>STEREO</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Display Screen */}
        <div className={`relative h-24 bg-[#9ea792] rounded shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] border-4 border-[#8e9782] p-3 flex flex-col justify-between overflow-hidden transition-opacity duration-1000 ${isOn ? 'opacity-100' : 'opacity-40 grayscale'}`}>
           {/* LCD Grain */}
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-10 pointer-events-none" />
           
           <div className="flex justify-between items-start text-[#2c3323] relative z-10">
              <span className="text-[10px] font-bold">{isOn ? (isPlaying ? 'PLAYING' : 'PAUSED') : 'OFF'}</span>
              <span className="font-mono text-sm tracking-widest">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
           </div>

           <div className="text-center relative z-10">
              {error ? (
                <span className="text-sm font-bold text-red-800/80 animate-pulse tracking-widest">NO SIGNAL</span>
              ) : loading ? (
                <span className="text-sm font-bold animate-pulse tracking-widest">TUNING...</span>
              ) : !isPlaying && isOn ? (
                <span className="text-sm font-bold animate-pulse tracking-widest text-zinc-700">READY</span>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold line-clamp-1">{currentStation.name}</span>
                  <span className="text-[10px] opacity-70">FM {90 + stationIndex * 2}.0 MHZ</span>
                </div>
              )}
           </div>

           {/* Signal Bars */}
           <div className="flex flex-col items-end gap-0.5 relative z-10 opacity-90">
              <span className="text-[6px] font-bold text-[#2c3323] tracking-widest uppercase">Signal</span>
              <div className="flex gap-0.5 items-end h-4">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className={`w-1.5 transition-all duration-300 ${!error && (loading || (isOn && isPlaying)) ? 'bg-[#1a2015] shadow-sm' : 'bg-[#8a9280]/30'}`} style={{ height: loading ? `${(i % 3 + 1) * 25}%` : isPlaying && !error ? `${i*20}%` : '10%' }} />
                 ))}
              </div>
           </div>
        </div>

        {/* Controls Area */}
        <div className="bg-[#222] rounded-xl p-4 shadow-inner border border-[#333] relative z-10">
           
           {/* Main Buttons */}
           <div className="flex items-center justify-between mb-6">
              <button 
                onClick={togglePower}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95 transition-all border-2 ${isOn ? 'bg-red-900 border-red-800 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-[#1a1a1a] border-[#333] text-zinc-600 animate-pulse'}`}
                title={isOn ? "Power Off" : "Power On"}
              >
                <Power size={20} />
              </button>

              <div className="flex items-center gap-3 bg-[#111] p-1.5 rounded-full shadow-inner border border-white/5">
                 <button 
                   onClick={prevStation}
                   disabled={!isOn}
                   className="w-10 h-10 rounded-full bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-95 transition-all border border-gray-600 disabled:opacity-50 hover:text-white"
                 >
                   <ChevronLeft size={20} />
                 </button>

                 <button 
                   onClick={togglePlay}
                   disabled={!isOn}
                   className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all border-2 shadow-lg disabled:grayscale disabled:opacity-50 ${
                     isPlaying 
                       ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                       : 'bg-gradient-to-b from-orange-400 to-orange-600 border-orange-300 text-white'
                   }`}
                 >
                   {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                 </button>

                 <button 
                   onClick={nextStation}
                   disabled={!isOn}
                   className="w-10 h-10 rounded-full bg-gradient-to-b from-gray-700 to-gray-800 text-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center active:scale-95 transition-all border border-gray-600 disabled:opacity-50 hover:text-white"
                 >
                   <ChevronRight size={20} />
                 </button>
              </div>
           </div>

           {/* Volume Slider - Retro Style */}
           <div className="relative px-2" dir="ltr">
              <div className="flex justify-between text-[8px] font-bold text-zinc-500 mb-1.5 px-1 uppercase tracking-wider">
                <span>Min</span>
                <span>Volume</span>
                <span>Max</span>
              </div>
              <div className="relative h-4 bg-[#111] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center px-1 border-b border-white/5">
                 {/* LED Indicators */}
                 <div className="absolute left-2 right-2 flex justify-between pointer-events-none z-0">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full transition-all duration-300 ${isOn && volume > (i/10) ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-[#222]'}`}></div>
                    ))}
                 </div>
                 
                 <input 
                   type="range" 
                   min="0" 
                   max="1" 
                   step="0.05"
                   value={volume}
                   onChange={handleVolumeChange}
                   disabled={!isOn}
                   style={{ direction: 'ltr', transform: 'scaleX(1)' }}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 ltr-input"
                 />
                 
                 {/* Physical Knob */}
                 <div 
                   className="absolute top-1/2 -translate-y-1/2 w-8 h-6 bg-gradient-to-b from-zinc-600 to-zinc-800 rounded border border-zinc-500 shadow-xl pointer-events-none transition-all duration-75 z-10"
                   style={{ left: `calc(${volume * 100}% - 16px)` }}
                 >
                   <div className="w-0.5 h-3 mx-auto mt-1.5 bg-zinc-900/50 border-r border-white/10"></div>
                 </div>
              </div>
           </div>
        </div>

        {/* Bottom Label */}
        <div className="relative z-10 text-center mt-1">
           <span className="text-[9px] text-zinc-600 font-bold tracking-[0.2em] uppercase">High Fidelity Sound System</span>
        </div>

      </div>

      <audio 
        ref={audioRef}
        src={currentStation.url}
        preload="none"
        playsInline
        onEnded={() => {
           if (isOn && audioRef.current) {
              setLoading(true)
              audioRef.current.play().catch(console.error)
           }
        }}
        onError={(e) => {
          console.error("Audio error event:", e)
          if (isOn) {
             // Simple retry once then fail
             if (audioRef.current) {
                 const promise = audioRef.current.play()
                 if (promise) {
                    promise.catch(() => setError(true))
                 }
             }
          }
        }}
        onWaiting={() => { if(isOn) setLoading(true) }}
        onPlaying={() => { 
          if(isOn) {
            setLoading(false)
            setIsPlaying(true)
            setError(false)
          }
        }}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}
