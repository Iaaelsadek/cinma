import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type QuranTrack = {
  id: number | string
  title: string
  reciter: string
  url: string
  image?: string | null
}

interface QuranPlayerState {
  currentTrack: QuranTrack | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  
  // Actions
  playTrack: (track: QuranTrack) => void
  toggle: () => void
  stop: () => void
  setVolume: (value: number) => void
  seek: (time: number) => void
  skipNext: () => void
  skipPrev: () => void
  
  // Internal updates (called by Audio Controller)
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useQuranPlayerStore = create<QuranPlayerState>()(
  devtools(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,

      playTrack: (track) => {
        const { currentTrack } = get()
        if (currentTrack?.id === track.id) {
          get().toggle()
          return
        }
        set({ currentTrack: track, isPlaying: true, error: null, isLoading: true })
      },

      toggle: () => {
        const { isPlaying, currentTrack } = get()
        if (!currentTrack) return
        set({ isPlaying: !isPlaying })
      },

      stop: () => {
        set({ isPlaying: false, currentTrack: null, currentTime: 0, duration: 0 })
      },

      setVolume: (volume) => {
        set({ volume })
      },

      seek: (time) => {
        set({ currentTime: time })
      },

      skipNext: () => {
        // Logic will be handled by the component or a helper, 
        // but state update happens here.
        // Ideally, the "next track logic" should be in a separate helper 
        // that calculates the next track and calls playTrack.
        // For now, we just expose the action to trigger the logic.
      },

      skipPrev: () => {
        // Same as skipNext
      },

      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error })
    }),
    { name: 'QuranPlayerStore' }
  )
)
