import { UnifiedSectionPage } from './UnifiedSectionPage'

// Movies page now uses UnifiedSectionPage component

export const MoviesPage = () => {
  // Use UnifiedSectionPage component for movies
  return <UnifiedSectionPage contentType="movies" activeFilter="all" />
}
