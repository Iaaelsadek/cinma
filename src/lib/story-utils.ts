// Story Utility Functions

import type { Story, Narrator } from '../types/quran-stories'
import { formatDuration, formatPlayCount } from './sermon-utils'

/**
 * Groups stories by narrator and calculates metadata
 */
export function groupStoriesByNarrator(stories: Story[]): Narrator[] {
  const narratorMap = new Map<string, Narrator>()
  
  stories.forEach(story => {
    const key = story.narrator_name_en
    
    if (!narratorMap.has(key)) {
      narratorMap.set(key, {
        name_ar: story.narrator_name_ar,
        name_en: story.narrator_name_en,
        image: story.narrator_image,
        story_count: 0,
        featured: false,
        stories: []
      })
    }
    
    const narrator = narratorMap.get(key)!
    narrator.stories.push(story)
    narrator.story_count++
    
    // Mark narrator as featured if any story is featured
    if (story.featured) {
      narrator.featured = true
    }
  })
  
  return Array.from(narratorMap.values())
    .sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      
      // Then by story count
      return b.story_count - a.story_count
    })
}

// Re-export shared utilities
export { formatDuration, formatPlayCount }
