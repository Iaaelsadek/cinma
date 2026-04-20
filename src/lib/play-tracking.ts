// Play Count Tracking Utility

const PLAY_TRACKING_KEY = 'quran_play_tracking'
const TRACKING_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

interface PlayTrackingEntry {
  trackId: string
  trackType: 'recitation' | 'sermon' | 'story'
  timestamp: number
}

/**
 * Checks if a track was recently played (within 1 hour)
 * to prevent duplicate play count increments
 */
export function wasRecentlyPlayed(trackId: string, trackType: 'recitation' | 'sermon' | 'story'): boolean {
  try {
    const stored = localStorage.getItem(PLAY_TRACKING_KEY)
    if (!stored) return false
    
    const entries: PlayTrackingEntry[] = JSON.parse(stored)
    const now = Date.now()
    
    // Clean old entries
    const validEntries = entries.filter(e => now - e.timestamp < TRACKING_WINDOW)
    
    // Check if this track was recently played
    const found = validEntries.find(e => 
      e.trackId === trackId && e.trackType === trackType
    )
    
    // Update storage with cleaned entries
    localStorage.setItem(PLAY_TRACKING_KEY, JSON.stringify(validEntries))
    
    return !!found
  } catch (error: any) {
    console.error('Error checking play tracking:', error)
    return false
  }
}

/**
 * Records that a track was played
 */
export function recordPlayTracking(trackId: string, trackType: 'recitation' | 'sermon' | 'story'): void {
  try {
    const stored = localStorage.getItem(PLAY_TRACKING_KEY)
    const entries: PlayTrackingEntry[] = stored ? JSON.parse(stored) : []
    
    entries.push({
      trackId,
      trackType,
      timestamp: Date.now()
    })
    
    localStorage.setItem(PLAY_TRACKING_KEY, JSON.stringify(entries))
  } catch (error: any) {
    console.error('Error recording play tracking:', error)
  }
}
