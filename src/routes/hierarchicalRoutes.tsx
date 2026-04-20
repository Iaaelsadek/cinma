import { ReactElement } from 'react'
import { Route } from 'react-router-dom'
import { HierarchicalPage } from '../pages/discovery/HierarchicalPage'

// Genre lists
const MOVIE_GENRES = [
  'action', 'adventure', 'animation', 'comedy', 'crime', 'documentary', 
  'drama', 'family', 'fantasy', 'history', 'horror', 'music', 
  'mystery', 'romance', 'science-fiction', 'thriller', 'war', 
  'western', 'biography', 'sport'
]

const SERIES_GENRES = [
  'action', 'adventure', 'animation', 'comedy', 'crime', 'documentary',
  'drama', 'family', 'fantasy', 'history', 'horror', 'music',
  'mystery', 'romance', 'science-fiction'
]

const ANIME_GENRES = [
  'action', 'adventure', 'animation', 'comedy', 'drama', 'fantasy',
  'horror', 'mystery', 'romance', 'science-fiction', 'slice-of-life',
  'sports', 'supernatural', 'thriller', 'mecha'
]

const GAMING_PLATFORMS = [
  'pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'vr'
]

const GAMING_GENRES = [
  'action', 'adventure', 'rpg', 'strategy', 'simulation', 'sports',
  'racing', 'fighting', 'shooter', 'puzzle', 'platformer', 'horror',
  'survival', 'sandbox', 'mmo'
]

const SOFTWARE_PLATFORMS = [
  'windows', 'macos', 'linux', 'android', 'ios', 'web', 'cross-platform'
]

const SOFTWARE_CATEGORIES = [
  'productivity', 'development', 'design', 'security', 'utilities',
  'multimedia', 'education', 'business', 'communication', 'gaming'
]

// Year ranges
const MOVIE_YEARS = Array.from({ length: 47 }, (_, i) => 2026 - i) // 2026-1980
const SERIES_YEARS = Array.from({ length: 47 }, (_, i) => 2026 - i) // 2026-1980
const ANIME_YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i) // 2026-2000
const GAMING_YEARS = Array.from({ length: 17 }, (_, i) => 2026 - i) // 2026-2010

// Generate movie routes
export const generateMovieRoutes = (): ReactElement[] => {
  const routes: ReactElement[] = []

  // Special routes removed - now handled by ContentSectionLayout in DiscoveryRoutes
  // trending, top-rated, latest, upcoming, classics, summaries are in ContentSectionLayout

  // Genre routes (20)
  MOVIE_GENRES.forEach(genre => {
    routes.push(
      <Route key={`movies-${genre}`} path={`/movies/${genre}`} element={<HierarchicalPage contentType="movies" genre={genre} />} />
    )
  })

  // Year routes (47)
  MOVIE_YEARS.forEach(year => {
    routes.push(
      <Route key={`movies-${year}`} path={`/movies/${year}`} element={<HierarchicalPage contentType="movies" year={year} />} />
    )
  })

  // Combined genre + year routes (20 * 47 = 940)
  MOVIE_GENRES.forEach(genre => {
    MOVIE_YEARS.forEach(year => {
      routes.push(
        <Route key={`movies-${genre}-${year}`} path={`/movies/${genre}/${year}`} element={<HierarchicalPage contentType="movies" genre={genre} year={year} />} />
      )
    })
  })

  return routes
}

// Generate series routes
export const generateSeriesRoutes = (): ReactElement[] => {
  const routes: ReactElement[] = []

  // Special routes removed - now handled by ContentSectionLayout in DiscoveryRoutes
  // trending, top-rated, latest, upcoming, ramadan are in ContentSectionLayout

  // Genre routes (15)
  SERIES_GENRES.forEach(genre => {
    routes.push(
      <Route key={`series-${genre}`} path={`/series/${genre}`} element={<HierarchicalPage contentType="series" genre={genre} />} />
    )
  })

  // Year routes (47)
  SERIES_YEARS.forEach(year => {
    routes.push(
      <Route key={`series-${year}`} path={`/series/${year}`} element={<HierarchicalPage contentType="series" year={year} />} />
    )
  })

  // Combined genre + year routes (15 * 47 = 705)
  SERIES_GENRES.forEach(genre => {
    SERIES_YEARS.forEach(year => {
      routes.push(
        <Route key={`series-${genre}-${year}`} path={`/series/${genre}/${year}`} element={<HierarchicalPage contentType="series" genre={genre} year={year} />} />
      )
    })
  })

  return routes
}

// Generate anime routes
export const generateAnimeRoutes = (): ReactElement[] => {
  const routes: ReactElement[] = []

  // Special routes removed - now handled by ContentSectionLayout in DiscoveryRoutes
  // trending, top-rated, latest, upcoming, animation-movies, cartoon-series are in ContentSectionLayout

  // Genre routes (15)
  ANIME_GENRES.forEach(genre => {
    routes.push(
      <Route key={`anime-${genre}`} path={`/anime/${genre}`} element={<HierarchicalPage contentType="anime" genre={genre} />} />
    )
  })

  // Year routes (27)
  ANIME_YEARS.forEach(year => {
    routes.push(
      <Route key={`anime-${year}`} path={`/anime/${year}`} element={<HierarchicalPage contentType="anime" year={year} />} />
    )
  })

  // Combined genre + year routes (15 * 27 = 405)
  ANIME_GENRES.forEach(genre => {
    ANIME_YEARS.forEach(year => {
      routes.push(
        <Route key={`anime-${genre}-${year}`} path={`/anime/${genre}/${year}`} element={<HierarchicalPage contentType="anime" genre={genre} year={year} />} />
      )
    })
  })

  return routes
}

// Generate gaming routes
export const generateGamingRoutes = (): ReactElement[] => {
  const routes: ReactElement[] = []

  // Special routes removed - now handled by ContentSectionLayout in DiscoveryRoutes
  // trending, top-rated, latest, upcoming are in ContentSectionLayout

  // Platform routes (6)
  GAMING_PLATFORMS.forEach(platform => {
    routes.push(
      <Route key={`gaming-${platform}`} path={`/gaming/${platform}`} element={<HierarchicalPage contentType="gaming" platform={platform} />} />
    )
  })

  // Genre routes (15)
  GAMING_GENRES.forEach(genre => {
    routes.push(
      <Route key={`gaming-genre-${genre}`} path={`/gaming/genre/${genre}`} element={<HierarchicalPage contentType="gaming" genre={genre} />} />
    )
  })

  // Year routes (17)
  GAMING_YEARS.forEach(year => {
    routes.push(
      <Route key={`gaming-${year}`} path={`/gaming/${year}`} element={<HierarchicalPage contentType="gaming" year={year} />} />
    )
  })

  // Combined platform + genre routes (6 * 15 = 90)
  GAMING_PLATFORMS.forEach(platform => {
    GAMING_GENRES.forEach(genre => {
      routes.push(
        <Route key={`gaming-${platform}-${genre}`} path={`/gaming/${platform}/${genre}`} element={<HierarchicalPage contentType="gaming" platform={platform} genre={genre} />} />
      )
    })
  })

  return routes
}

// Generate software routes
export const generateSoftwareRoutes = (): ReactElement[] => {
  const routes: ReactElement[] = []

  // Special routes removed - now handled by ContentSectionLayout in DiscoveryRoutes
  // trending, top-rated, latest are in ContentSectionLayout

  // Platform routes (7)
  SOFTWARE_PLATFORMS.forEach(platform => {
    routes.push(
      <Route key={`software-${platform}`} path={`/software/${platform}`} element={<HierarchicalPage contentType="software" platform={platform} />} />
    )
  })

  // Category routes (10)
  SOFTWARE_CATEGORIES.forEach(category => {
    routes.push(
      <Route key={`software-cat-${category}`} path={`/software/category/${category}`} element={<HierarchicalPage contentType="software" genre={category} />} />
    )
  })

  // Combined platform + category routes (7 * 10 = 70)
  SOFTWARE_PLATFORMS.forEach(platform => {
    SOFTWARE_CATEGORIES.forEach(category => {
      routes.push(
        <Route key={`software-${platform}-${category}`} path={`/software/${platform}/${category}`} element={<HierarchicalPage contentType="software" platform={platform} genre={category} />} />
      )
    })
  })

  return routes
}
