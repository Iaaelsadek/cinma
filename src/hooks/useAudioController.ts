import { useEffect, useRef } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { toast } from 'sonner'
import { SURAHS } from '../data/quran'
import { logger } from '../lib/logger'

// Singleton Audio Instance
const audio = new Audio()
audio.preload = 'auto'

export const useAudioController = () => {
  const currentTrack = useQuranPlayerStore((s) => s.currentTrack)
  const isPlaying = useQuranPlayerStore((s) => s.isPlaying)
  const volume = useQuranPlayerStore((s) => s.volume)
  const setCurrentTime = useQuranPlayerStore((s) => s.setCurrentTime)
  const setDuration = useQuranPlayerStore((s) => s.setDuration)
  const setIsPlaying = useQuranPlayerStore((s) => s.setIsPlaying)
  const setIsLoading = useQuranPlayerStore((s) => s.setIsLoading)
  const setError = useQuranPlayerStore((s) => s.setError)
  const playTrack = useQuranPlayerStore((s) => s.playTrack)
  
  const isSeekingRef = useRef(false)
  const lastTrackIdRef = useRef<string | number | null>(null)

  // 1. Handle Volume
  useEffect(() => {
    audio.volume = volume
  }, [volume])

  // 2. Handle Track Changes & Play/Pause
  useEffect(() => {
    if (!currentTrack) {
      audio.pause()
      audio.src = ''
      lastTrackIdRef.current = null
      return
    }

    const loadAndPlay = async () => {
      try {
        if (lastTrackIdRef.current !== currentTrack.id) {
          // New track
          audio.src = currentTrack.url
          lastTrackIdRef.current = currentTrack.id
          setIsLoading(true)
          if (isPlaying) {
             await audio.play()
          }
        } else {
          // Same track, just toggle
          if (isPlaying) {
            await audio.play()
          } else {
            audio.pause()
          }
        }
      } catch (err: any) {
        logger.error("Audio playback error:", err)
        setIsPlaying(false)
        setIsLoading(false)
        if (err.name !== 'AbortError') {
          setError(err.message)
          toast.error('خطأ في تشغيل الملف الصوتي')
        }
      }
    }

    loadAndPlay()

  }, [currentTrack, isPlaying])

  // 3. Bind Events (Run once)
  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      // Auto-next logic
      handleNext()
    }
    
    const handleError = (e: Event) => {
       logger.error("Audio error event:", e)
       setIsLoading(false)
       setIsPlaying(false)
       setError("Failed to load audio")
    }
    
    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [])

  // Helper for Next/Prev Logic (Moved from Context)
  const handleNext = () => {
    const state = useQuranPlayerStore.getState()
    if (!state.currentTrack) return

    try {
      const parts = state.currentTrack.id.toString().split('-')
      if (parts.length === 2) {
        const reciterId = parts[0]
        const surahId = parseInt(parts[1])
        if (surahId < 114) {
          const nextSurahId = surahId + 1
          const paddedId = nextSurahId.toString().padStart(3, '0')
          const nextUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
          
          const nextSurah = SURAHS.find(s => s.id === nextSurahId)
          const nextTitle = nextSurah?.name || `Surah ${nextSurahId}` // Arabic default
          
          playTrack({
            ...state.currentTrack,
            id: `${reciterId}-${nextSurahId}`,
            title: nextTitle,
            url: nextUrl
          })
        } else {
             // Loop to first? or Stop.
             setIsPlaying(false)
        }
      }
    } catch (e) {
      logger.error("Skip failed", e)
    }
  }
  
  // Expose seeking handler to update audio immediately
  // We subscribe to store changes for seek? No, usually UI calls seek action.
  // But store.seek just updates state. We need to sync audio.
  // Actually, better to have a dedicated effect for currentTime ONLY if it differs significantly?
  // Or better: UI calls `audio.currentTime = time` AND `setCurrentTime(time)`.
  // Let's make `seek` action in store trigger a side effect here?
  // Zustand subscribe is good for this.
  
  useEffect(() => {
    const unsub = useQuranPlayerStore.subscribe(
      (state, prevState) => {
        const currentTime = state.currentTime
        if (currentTime === prevState.currentTime) return
        if (Math.abs(currentTime - audio.currentTime) > 1.5) {
          audio.currentTime = currentTime
        }
      }
    )
    return unsub
  }, [])
}
