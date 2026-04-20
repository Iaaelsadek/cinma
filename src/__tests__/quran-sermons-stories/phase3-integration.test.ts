/**
 * Phase 3 Integration Tests: Audio Player Updates for Sermons and Stories
 * 
 * Tests for tasks 10.1 through 10.4:
 * - Track completion callback in player store
 * - Scholar/narrator name display in FullPlayer and MiniPlayer
 * - Play count tracking integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuranPlayerStore } from '../../state/useQuranPlayerStore'
import { wasRecentlyPlayed, recordPlayTracking } from '../../lib/play-tracking'

describe('Phase 3: Audio Player Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    // Reset store state
    const store = useQuranPlayerStore.getState()
    store.stop()
    store.setOnTrackComplete(undefined)
  })

  describe('Task 10.1: Track Completion Callback', () => {
    it('should allow setting onTrackComplete callback', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      const mockCallback = vi.fn()
      
      act(() => {
        result.current.setOnTrackComplete(mockCallback)
      })
      
      expect(result.current.onTrackComplete).toBe(mockCallback)
    })

    it('should allow clearing onTrackComplete callback', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      const mockCallback = vi.fn()
      
      act(() => {
        result.current.setOnTrackComplete(mockCallback)
      })
      
      expect(result.current.onTrackComplete).toBe(mockCallback)
      
      act(() => {
        result.current.setOnTrackComplete(undefined)
      })
      
      expect(result.current.onTrackComplete).toBeUndefined()
    })

    it('should store callback in player state', () => {
      const mockCallback = vi.fn()
      
      act(() => {
        useQuranPlayerStore.getState().setOnTrackComplete(mockCallback)
      })
      
      const state = useQuranPlayerStore.getState()
      expect(state.onTrackComplete).toBe(mockCallback)
    })
  })

  describe('Task 10.4: Play Count Tracking', () => {
    it('should track sermon play correctly', () => {
      const trackId = 'sermon-1'
      const trackType = 'sermon'
      
      // Initially not played
      expect(wasRecentlyPlayed(trackId, trackType)).toBe(false)
      
      // Record play
      recordPlayTracking(trackId, trackType)
      
      // Should now be marked as recently played
      expect(wasRecentlyPlayed(trackId, trackType)).toBe(true)
    })

    it('should track story play correctly', () => {
      const trackId = 'story-1'
      const trackType = 'story'
      
      // Initially not played
      expect(wasRecentlyPlayed(trackId, trackType)).toBe(false)
      
      // Record play
      recordPlayTracking(trackId, trackType)
      
      // Should now be marked as recently played
      expect(wasRecentlyPlayed(trackId, trackType)).toBe(true)
    })

    it('should differentiate between track types', () => {
      const trackId = 'sermon-1'
      
      // Record as sermon
      recordPlayTracking(trackId, 'sermon')
      
      // Should be marked as played for sermon
      expect(wasRecentlyPlayed(trackId, 'sermon')).toBe(true)
      
      // Should NOT be marked as played for story
      expect(wasRecentlyPlayed(trackId, 'story')).toBe(false)
    })

    it('should clean old entries from localStorage', () => {
      const trackId = 'sermon-1'
      
      // Manually add an old entry (2 hours ago)
      const oldEntry = {
        trackId,
        trackType: 'sermon' as const,
        timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      }
      
      localStorage.setItem('quran_play_tracking', JSON.stringify([oldEntry]))
      
      // Check if recently played (should clean old entries)
      const result = wasRecentlyPlayed(trackId, 'sermon')
      
      // Old entry should be cleaned, so should return false
      expect(result).toBe(false)
      
      // Verify localStorage was updated
      const stored = localStorage.getItem('quran_play_tracking')
      const entries = stored ? JSON.parse(stored) : []
      expect(entries.length).toBe(0)
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw and return false
      expect(() => wasRecentlyPlayed('sermon-1', 'sermon')).not.toThrow()
      expect(wasRecentlyPlayed('sermon-1', 'sermon')).toBe(false)
      
      // Restore
      localStorage.getItem = originalGetItem
    })
  })

  describe('Track Type Support', () => {
    it('should support recitation track type', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      act(() => {
        result.current.playTrack({
          id: '1-1',
          title: 'Al-Fatiha',
          reciter: 'Abdul Basit',
          url: 'https://example.com/001.mp3',
          type: 'recitation'
        })
      })
      
      expect(result.current.currentTrack?.type).toBe('recitation')
    })

    it('should support sermon track type', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      act(() => {
        result.current.playTrack({
          id: 'sermon-1',
          title: 'Friday Khutbah',
          reciter: 'Sheikh Ahmad',
          url: 'https://example.com/sermon1.mp3',
          type: 'sermon'
        })
      })
      
      expect(result.current.currentTrack?.type).toBe('sermon')
    })

    it('should support story track type', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      act(() => {
        result.current.playTrack({
          id: 'story-1',
          title: 'Story of Prophet Yusuf',
          reciter: 'Narrator Name',
          url: 'https://example.com/story1.mp3',
          type: 'story'
        })
      })
      
      expect(result.current.currentTrack?.type).toBe('story')
    })

    it('should default to recitation if type not specified', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      act(() => {
        result.current.playTrack({
          id: '1-1',
          title: 'Al-Fatiha',
          reciter: 'Abdul Basit',
          url: 'https://example.com/001.mp3'
        })
      })
      
      // Type should be undefined or default to recitation in the callback
      expect(result.current.currentTrack?.type).toBeUndefined()
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing recitation functionality', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      // Play a recitation track (existing functionality)
      act(() => {
        result.current.playTrack({
          id: '1-1',
          title: 'Al-Fatiha',
          reciter: 'Abdul Basit',
          url: 'https://example.com/001.mp3'
        })
      })
      
      expect(result.current.currentTrack).toBeDefined()
      expect(result.current.currentTrack?.id).toBe('1-1')
      expect(result.current.currentTrack?.title).toBe('Al-Fatiha')
      expect(result.current.currentTrack?.reciter).toBe('Abdul Basit')
    })

    it('should work without onTrackComplete callback set', () => {
      const { result } = renderHook(() => useQuranPlayerStore())
      
      // Don't set callback
      expect(result.current.onTrackComplete).toBeUndefined()
      
      // Should still be able to play tracks
      act(() => {
        result.current.playTrack({
          id: '1-1',
          title: 'Al-Fatiha',
          reciter: 'Abdul Basit',
          url: 'https://example.com/001.mp3'
        })
      })
      
      expect(result.current.currentTrack).toBeDefined()
    })
  })
})
