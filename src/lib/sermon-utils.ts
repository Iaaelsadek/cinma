// Sermon Utility Functions

import type { Sermon, Scholar } from '../types/quran-sermons'

/**
 * Groups sermons by scholar and calculates metadata
 */
export function groupSermonsByScholar(sermons: Sermon[]): Scholar[] {
  const scholarMap = new Map<string, Scholar>()
  
  sermons.forEach(sermon => {
    const key = sermon.scholar_name_en
    
    if (!scholarMap.has(key)) {
      scholarMap.set(key, {
        name_ar: sermon.scholar_name_ar,
        name_en: sermon.scholar_name_en,
        image: sermon.scholar_image,
        sermon_count: 0,
        featured: false,
        sermons: []
      })
    }
    
    const scholar = scholarMap.get(key)!
    scholar.sermons.push(sermon)
    scholar.sermon_count++
    
    // Mark scholar as featured if any sermon is featured
    if (sermon.featured) {
      scholar.featured = true
    }
  })
  
  return Array.from(scholarMap.values())
    .sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      
      // Then by sermon count
      return b.sermon_count - a.sermon_count
    })
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formats play count with K/M suffixes
 */
export function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
