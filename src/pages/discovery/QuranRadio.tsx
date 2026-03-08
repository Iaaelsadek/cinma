import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Radio, Clock, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'

type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'

const PRAYER_LABELS_AR: Record<PrayerKey, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseHHMM(hhmm: string) {
  const cleaned = String(hhmm).split(' ')[0].trim()
  const [hRaw, mRaw] = cleaned.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return { h, m }
}

function formatHHMM(hhmm: string) {
  const t = parseHHMM(hhmm)
  if (!t) return null
  const h12 = ((t.h + 11) % 12) + 1
  const suffix = t.h < 12 ? 'ص' : 'م'
  const hStr = h12.toLocaleString('ar-EG', { useGrouping: false })
  const mStr = t.m.toLocaleString('ar-EG', { minimumIntegerDigits: 2, useGrouping: false })
  return `${hStr}:${mStr} ${suffix}`
}

const STATIONS = [
  {
    id: 'cairo',
    name: 'إذاعة القرآن الكريم - القاهرة',
    name_en: 'Holy Quran Radio (Cairo)',
    url: '/api/radio/cairo',
    externalUrl: 'https://surahquran.com/Radio-Quran-Cairo.html'
  },
  {
    id: 'mix',
    name: 'تلاوات خاشعة متنوعة',
    name_en: 'Mixed Recitations',
    url: 'https://qurango.net/radio/mix',
    externalUrl: 'https://qurango.net/radio/mix'
  },
  {
    id: 'tarateel',
    name: 'تراتيل قصيرة متميزة',
    name_en: 'Amazing Short Recitations',
    url: 'https://qurango.net/radio/tarateel',
    externalUrl: 'https://qurango.net/radio/tarateel'
  },
  {
    id: 'salma',
    name: 'تلاوات خاشعة',
    name_en: 'Calm Recitations',
    url: 'https://qurango.net/radio/salma',
    externalUrl: 'https://qurango.net/radio/salma'
  },
  {
    id: 'ali_jaber',
    name: 'الشيخ علي جابر',
    name_en: 'Ali Jaber',
    url: 'https://qurango.net/radio/ali_jaber',
    externalUrl: 'https://qurango.net/radio/ali_jaber'
  },
  {
    id: 'yasser',
    name: 'الشيخ ياسر الدوسري',
    name_en: 'Yasser Al-Dosari',
    url: 'https://qurango.net/radio/yasser_aldosari',
    externalUrl: 'https://qurango.net/radio/yasser_aldosari'
  },
  {
    id: 'mishary',
    name: 'الشيخ مشاري العفاسي',
    name_en: 'Mishary Alafasy',
    url: 'https://qurango.net/radio/mishary_alafasi',
    externalUrl: 'https://qurango.net/radio/mishary_alafasi'
  }
]

export default function QuranRadio() {
  const [stationIndex, setStationIndex] = useState(0)
  const currentStation = STATIONS[stationIndex]
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const autoFallbackForStationIdRef = useRef<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [prayerTimings, setPrayerTimings] = useState<null | {
    ymd: string
    timings: Record<PrayerKey, string>
    meta?: { lat?: number; lon?: number }
  }>(null)
  const dayKey = ymdLocal(now)
  const [weather, setWeather] = useState<null | { tempC: number; code: number }>(null)

  const handleNext = () => setStationIndex((prev) => (prev + 1) % STATIONS.length)
  const handlePrev = () => setStationIndex((prev) => (prev - 1 + STATIONS.length) % STATIONS.length)

  const attemptPlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      audio.muted = false
      audio.volume = 1
      await audio.play()
      setIsAutoplayBlocked(false)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : (err as { name?: string } | null)?.name
      if (name === 'NotAllowedError') {
        setIsAutoplayBlocked(true)
        return
      }
    }
  }, [])

  const handleAudioError = useCallback(() => {
    setIsPlaying(false)

    if (autoFallbackForStationIdRef.current === currentStation.id) return
    autoFallbackForStationIdRef.current = currentStation.id
    setTimeout(() => {
      setStationIndex((prev) => (prev + 1) % STATIONS.length)
    }, 500)
  }, [currentStation.id])

  const weatherIcon = useCallback((code: number) => {
    if (code === 0) return Sun
    if (code === 1 || code === 2) return Cloud
    if (code === 3) return Wind
    if (code === 45 || code === 48) return Cloud
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain
    if ([71, 73, 75, 77, 85, 86].includes(code)) return CloudSnow
    if ([95, 96, 99].includes(code)) return CloudLightning
    return Cloud
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchTimings(lat: number, lon: number, ymd: string) {
      const res = await fetch(`/api/prayer/timings?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`, {
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('prayer_fetch_failed')
      const json = await res.json()
      const t = json?.data?.timings
      const timings: Record<PrayerKey, string> = {
        Fajr: String(t?.Fajr || ''),
        Dhuhr: String(t?.Dhuhr || ''),
        Asr: String(t?.Asr || ''),
        Maghrib: String(t?.Maghrib || ''),
        Isha: String(t?.Isha || '')
      }
      if (!Object.values(timings).every((v) => parseHHMM(v))) throw new Error('prayer_parse_failed')
      if (cancelled) return
      setPrayerTimings({ ymd, timings, meta: { lat, lon } })
    }

    async function load() {
      const cairo = { lat: 30.0444, lon: 31.2357 }
      try {
        await fetchTimings(cairo.lat, cairo.lon, dayKey)
      } catch {
        if (!cancelled) setPrayerTimings(null)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [dayKey])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const cairo = { lat: 30.0444, lon: 31.2357 }
      try {
        const res = await fetch(
          `/api/weather/current?lat=${encodeURIComponent(String(cairo.lat))}&lon=${encodeURIComponent(String(cairo.lon))}`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error('weather_fetch_failed')
        const json = await res.json()
        const tempC = Number(json?.current_weather?.temperature)
        const code = Number(json?.current_weather?.weathercode)
        if (!Number.isFinite(tempC) || !Number.isFinite(code)) throw new Error('weather_parse_failed')
        if (!cancelled) setWeather({ tempC, code })
      } catch {
        if (!cancelled) setWeather(null)
      }
    }

    void load()
    const id = window.setInterval(load, 15 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [dayKey])

  useEffect(() => {
    autoFallbackForStationIdRef.current = null
    if (audioRef.current) {
      audioRef.current.load()
      attemptPlay()
    }
  }, [stationIndex, attemptPlay])

  return (
    <div className="fixed inset-0 bg-[#07070a]/98 backdrop-blur-2xl flex items-center justify-center p-4 z-[500] select-none">
      <Helmet>
        <title>Radio Quran | راديو القرآن</title>
      </Helmet>

      {/* Main Radio Container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-[440px] bg-[#0f0f14] rounded-[2.5rem] p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] border border-white/5"
      >
        
        {/* Header Section */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-amber-500/70'} shadow-[0_0_10px_rgba(245,158,11,0.35)]`} />
              <span className="text-[10px] tracking-widest text-white/60 uppercase">Quran Radio</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold mt-1 tracking-wide">
              <span>{now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              {weather ? (() => {
                const Icon = weatherIcon(weather.code)
                return (
                  <span className="inline-flex items-center gap-1.5 text-white/55">
                    <Icon size={14} />
                    <span>{Math.round(weather.tempC).toLocaleString('ar-EG')}°</span>
                  </span>
                )
              })() : null}
            </div>
          </div>
          <button 
            onClick={() => window.close()} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Display Screen Area */}
        <div className="rounded-[2.25rem] border border-white/5 p-3 shadow-inner mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-sky-500/[0.06]" />
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:18px_18px]" />

          <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={handlePrev} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all active:scale-90"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="flex-1 min-w-0 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStation.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="text-white text-xl font-bold truncate tracking-wide"
                  >
                    {currentStation.name}
                  </motion.div>
                </AnimatePresence>
                <div className="text-white/50 text-[10px] mt-1 tracking-[0.2em] uppercase">
                  {currentStation.name_en}
                </div>
              </div>

              <button 
                onClick={handleNext} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 hover:text-white transition-all active:scale-90"
              >
                <ChevronRight size={22} />
              </button>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-3xl px-5 py-4 flex items-center justify-between">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 text-white/70">
                  <Clock size={14} />
                  <span className="text-[10px] tracking-[0.25em] uppercase">Live</span>
                </div>
                <div className="text-white text-2xl font-semibold tracking-[0.15em] mt-1">
                  {now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">
                  {isPlaying ? 'On Air' : isAutoplayBlocked ? 'Press Play' : 'Ready'}
                </div>
                <div className="flex items-end gap-1 h-8">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-white/30"
                      style={{ height: 10 }}
                      animate={
                        isPlaying
                          ? { scaleY: [0.35, 1.2, 0.5, 1.0, 0.4] }
                          : { scaleY: 0.35 }
                      }
                      transition={
                        isPlaying
                          ? { duration: 1.2 + (i % 3) * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.04 }
                          : { duration: 0.2 }
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-white/50 text-[10px]">
                  <Radio size={14} />
                  <span className="tracking-[0.2em] uppercase">MP3</span>
                </div>
                <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50 mt-2">
                  {currentStation.id === 'cairo' ? 'Cairo' : 'Live'}
                </div>
              </div>
            </div>

          </div>
        </div>

        {prayerTimings ? (
          <div className="mb-3 -mt-3">
            <div className="grid grid-cols-6 gap-2">
              {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as PrayerKey[]).map((k, idx) => {
                const t = formatHHMM(prayerTimings.timings[k])
                if (!t) return null
                return (
                  <div
                    key={k}
                    className={`${idx < 3 ? 'col-span-2' : 'col-span-3'} w-full`}
                  >
                    <div className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold tracking-wide">
                      <span className="text-white/60">{PRAYER_LABELS_AR[k]}</span>
                      <span className="text-white">{t}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* NATIVE PLAYER CONTAINER */}
        <div className="relative space-y-4">
          <div className="bg-black/30 p-4 rounded-[2.25rem] border border-white/10 shadow-[0_25px_60px_-25px_rgba(0,0,0,0.8)] backdrop-blur flex items-center justify-center">
            <audio 
              ref={audioRef}
              src={currentStation.url}
              controls 
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleAudioError}
              className="w-full h-14"
            />
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between items-center px-8 text-zinc-700">
            <div className="flex items-center gap-2">
              <Radio size={14} />
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase">Direct Link</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-[0.2em] uppercase">MP3 Stream</span>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  )
}
