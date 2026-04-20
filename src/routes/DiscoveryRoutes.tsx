import React, { lazy } from 'react'
import { Route, Navigate, useParams } from 'react-router-dom'
import { HierarchicalPage } from '../pages/discovery/HierarchicalPage'
import { ContentSectionLayout } from '../components/layout/ContentSectionLayout'
import { PlaysWithFilters } from '../pages/discovery/PlaysWithFilters'
import { ClassicsWithFilters } from '../pages/discovery/ClassicsWithFilters'
import { SummariesWithFilters } from '../pages/discovery/SummariesWithFilters'
import { PageErrorBoundary } from '../components/common/PageErrorBoundary'
import {
  generateMovieRoutes,
  generateSeriesRoutes,
  generateAnimeRoutes,
  generateSoftwareRoutes
} from './hierarchicalRoutes'

const Search = lazy(() => import('../pages/discovery/Search').then(m => ({ default: m.Search })))
const CategoryPage = lazy(() => import('../pages/discovery/Category').then(m => ({ default: m.CategoryPage })))
const CategoryHub = lazy(() => import('../pages/CategoryHub').then(m => ({ default: m.CategoryHub })))
const Software = lazy(() => import('../pages/discovery/Software').then(m => ({ default: m.Software })))
const MoviesPage = lazy(() => import('../pages/discovery/Movies').then(m => ({ default: m.MoviesPage })))
const SeriesPage = lazy(() => import('../pages/discovery/Series').then(m => ({ default: m.SeriesPage })))
const AnimePage = lazy(() => import('../pages/discovery/Anime').then(m => ({ default: m.AnimePage })))
const UnifiedSectionPage = lazy(() => import('../pages/discovery/UnifiedSectionPage').then(m => ({ default: m.UnifiedSectionPage })))
const PlaysPage = lazy(() => import('../pages/discovery/Plays').then(m => ({ default: m.PlaysPage })))
const ClassicsPage = lazy(() => import('../pages/discovery/Classics').then(m => ({ default: m.ClassicsPage })))
const SummariesPage = lazy(() => import('../pages/discovery/Summaries').then(m => ({ default: m.SummariesPage })))
const QuranPage = lazy(() => import('../pages/discovery/Quran').then(m => ({ default: m.QuranPage })))
const QuranRadio = lazy(() => import('../pages/discovery/QuranRadio'))
const GenreCategoryPage = lazy(() => import('../pages/discovery/GenreCategoryPage').then(m => ({ default: m.GenreCategoryPage })))

const MoviesByYear = () => {
  const { year } = useParams()
  const y = String(year || '')
  return <Navigate to={`/search?types=movie&yfrom=${encodeURIComponent(y)}&yto=${encodeURIComponent(y)}`} replace />
}

const MoviesByGenre = () => {
  const { id } = useParams()
  const g = String(id || '')
  return <Navigate to={`/search?types=movie&genres=${encodeURIComponent(g)}`} replace />
}

const SeriesByYear = () => {
  const { year } = useParams()
  const y = String(year || '')
  return <Navigate to={`/search?types=tv&yfrom=${encodeURIComponent(y)}&yto=${encodeURIComponent(y)}`} replace />
}

const SeriesByGenre = () => {
  const { id } = useParams()
  const g = String(id || '')
  return <Navigate to={`/search?types=tv&genres=${encodeURIComponent(g)}`} replace />
}

// Dynamic route wrappers for hierarchical pages
const DynamicMoviePage = () => {
  const { genre, year } = useParams()
  return <HierarchicalPage contentType="movies" genre={genre} year={year ? Number(year) : undefined} />
}

const DynamicSeriesPage = () => {
  const { genre, year } = useParams()
  return <HierarchicalPage contentType="series" genre={genre} year={year ? Number(year) : undefined} />
}

const DynamicAnimePage = () => {
  const { genre, year } = useParams()
  return <HierarchicalPage contentType="anime" genre={genre} year={year ? Number(year) : undefined} />
}

const DynamicGamingPage = () => {
  const { platform, genre } = useParams()
  return <HierarchicalPage contentType="gaming" platform={platform} genre={genre} />
}

const DynamicSoftwarePage = () => {
  const { platform, category } = useParams()
  return <HierarchicalPage contentType="software" platform={platform} genre={category} />
}

export const DiscoveryRoutes = () => (
  <>
    {/* Hierarchical Routes - 2,585 routes total */}
    {/* Movies: 20 genres + 47 years + 940 combined + 5 special = 1,012 routes */}
    {generateMovieRoutes()}

    {/* Series: 15 genres + 47 years + 705 combined + 5 special = 772 routes */}
    {generateSeriesRoutes()}

    {/* Anime: 15 genres + 27 years + 405 combined + 5 special = 452 routes */}
    {generateAnimeRoutes()}

    {/* Software: 7 platforms + 10 categories + 70 combined + 6 special = 93 routes */}
    {generateSoftwareRoutes()}

    {/* Existing Routes - Preserved for backward compatibility */}
    <Route path="/quran/radio" element={
      <PageErrorBoundary pageName="راديو القرآن">
        <QuranRadio />
      </PageErrorBoundary>
    } />
    <Route path="/search" element={<Search />} />

    <Route path="/movies/genre/:genre" element={<CategoryHub type="movie" />} />
    <Route path="/series/genre/:genre" element={<CategoryHub type="tv" />} />
    <Route path="/movies/:category/:year/:genre" element={<CategoryHub type="movie" />} />
    <Route path="/movies/:category/:year" element={<CategoryHub type="movie" />} />
    <Route path="/movies/:category" element={<CategoryHub type="movie" />} />
    <Route path="/series/:category/:year/:genre" element={<CategoryHub type="tv" />} />
    <Route path="/series/:category/:year" element={<CategoryHub type="tv" />} />

    <Route path="/rating/:rating" element={<CategoryHub />} />
    <Route path="/year/:year" element={<CategoryHub />} />

    <Route path="/category/:category" element={<CategoryPage />} />
    <Route path="/kids" element={<CategoryPage />} />

    {/* Redirect /anime/search to search page with anime filter */}
    <Route path="/anime/search" element={<Navigate to="/search?types=anime" replace />} />

    {/* Redirect old routes to main sections with filters */}
    <Route path="/ramadan" element={<Navigate to="/series?category=ramadan" replace />} />
    <Route path="/religious" element={<Navigate to="/search?category=religious" replace />} />
    <Route path="/animation" element={<Navigate to="/anime" replace />} />

    {/* Redirect deleted language-specific pages to main sections with language filters */}
    {/* Movies redirects */}
    <Route path="/arabic-movies" element={<Navigate to="/movies?language=ar" replace />} />
    <Route path="/foreign-movies" element={<Navigate to="/movies?language=en" replace />} />
    <Route path="/indian" element={<Navigate to="/movies?language=hi" replace />} />

    {/* Series redirects */}
    <Route path="/arabic-series" element={<Navigate to="/series?language=ar" replace />} />
    <Route path="/foreign-series" element={<Navigate to="/series?language=en" replace />} />
    <Route path="/k-drama" element={<Navigate to="/series?language=ko" replace />} />
    <Route path="/chinese" element={<Navigate to="/series?language=zh" replace />} />
    <Route path="/turkish" element={<Navigate to="/series?language=tr" replace />} />
    <Route path="/bollywood" element={<Navigate to="/series?language=hi" replace />} />

    {/* Anime redirects */}
    <Route path="/disney" element={<Navigate to="/anime?genre=family" replace />} />
    <Route path="/spacetoon" element={<Navigate to="/anime?genre=kids" replace />} />
    <Route path="/cartoons" element={<Navigate to="/anime" replace />} />

    {/* Plays routes - standalone without shared layout */}
    <Route path="/plays">
      <Route index element={
        <PageErrorBoundary pageName="المسرحيات">
          <PlaysWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre" element={
        <PageErrorBoundary pageName="المسرحيات">
          <PlaysWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre/:year" element={
        <PageErrorBoundary pageName="المسرحيات">
          <PlaysWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre/:year/:rating" element={
        <PageErrorBoundary pageName="المسرحيات">
          <PlaysWithFilters />
        </PageErrorBoundary>
      } />
    </Route>

    {/* Summaries routes - standalone without shared layout */}
    <Route path="/summaries">
      <Route index element={
        <PageErrorBoundary pageName="الملخصات">
          <SummariesWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre" element={
        <PageErrorBoundary pageName="الملخصات">
          <SummariesWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre/:year" element={
        <PageErrorBoundary pageName="الملخصات">
          <SummariesWithFilters />
        </PageErrorBoundary>
      } />
      <Route path=":genre/:year/:rating" element={
        <PageErrorBoundary pageName="الملخصات">
          <SummariesWithFilters />
        </PageErrorBoundary>
      } />
    </Route>

    {/* Classics route - standalone without shared layout */}
    <Route path="/classics">
      <Route index element={
        <PageErrorBoundary pageName="الكلاسيكيات">
          <ClassicsWithFilters />
        </PageErrorBoundary>
      } />
    </Route>

    <Route path="/quran" element={
      <PageErrorBoundary pageName="القرآن الكريم">
        <QuranPage />
      </PageErrorBoundary>
    } />

    {/* Movies routes with shared layout */}
    <Route path="/movies" element={<ContentSectionLayout contentType="movies" />}>
      <Route index element={<UnifiedSectionPage contentType="movies" activeFilter="all" />} />
      <Route path="trending" element={<UnifiedSectionPage contentType="movies" activeFilter="trending" />} />
      <Route path="top-rated" element={<UnifiedSectionPage contentType="movies" activeFilter="top-rated" />} />
      <Route path="latest" element={<UnifiedSectionPage contentType="movies" activeFilter="latest" />} />
      <Route path="upcoming" element={<UnifiedSectionPage contentType="movies" activeFilter="upcoming" />} />
      <Route path="classics" element={<UnifiedSectionPage contentType="movies" activeFilter="classics" />} />
      <Route path="summaries" element={<UnifiedSectionPage contentType="movies" activeFilter="summaries" />} />
      <Route path="animation" element={<HierarchicalPage contentType="movies" genre="animation" />} />
    </Route>



    {/* Series routes with shared layout */}
    <Route path="/series" element={<ContentSectionLayout contentType="series" />}>
      <Route index element={<UnifiedSectionPage contentType="series" activeFilter="all" />} />
      <Route path="trending" element={<UnifiedSectionPage contentType="series" activeFilter="trending" />} />
      <Route path="top-rated" element={<UnifiedSectionPage contentType="series" activeFilter="top-rated" />} />
      <Route path="latest" element={<UnifiedSectionPage contentType="series" activeFilter="latest" />} />
      <Route path="upcoming" element={<UnifiedSectionPage contentType="series" activeFilter="upcoming" />} />
      <Route path="classics" element={<UnifiedSectionPage contentType="series" activeFilter="classics" />} />
      <Route path="summaries" element={<UnifiedSectionPage contentType="series" activeFilter="summaries" />} />
      <Route path="arabic" element={<UnifiedSectionPage contentType="series" activeFilter="arabic" />} />
      <Route path="ramadan" element={<UnifiedSectionPage contentType="series" activeFilter="ramadan" />} />
      <Route path="korean" element={<UnifiedSectionPage contentType="series" activeFilter="korean" />} />
      <Route path="turkish" element={<UnifiedSectionPage contentType="series" activeFilter="turkish" />} />
      <Route path="chinese" element={<UnifiedSectionPage contentType="series" activeFilter="chinese" />} />
      <Route path="foreign" element={<UnifiedSectionPage contentType="series" activeFilter="foreign" />} />
      <Route path="animation" element={<HierarchicalPage contentType="series" genre="animation" />} />
    </Route>



    {/* Anime routes with shared layout */}
    <Route path="/anime" element={<ContentSectionLayout contentType="anime" />}>
      <Route index element={<AnimePage />} />
      <Route path="trending" element={<UnifiedSectionPage contentType="anime" activeFilter="trending" />} />
      <Route path="top-rated" element={<UnifiedSectionPage contentType="anime" activeFilter="top-rated" />} />
      <Route path="latest" element={<UnifiedSectionPage contentType="anime" activeFilter="latest" />} />
      <Route path="upcoming" element={<UnifiedSectionPage contentType="anime" activeFilter="upcoming" />} />
      <Route path="animation-movies" element={<UnifiedSectionPage contentType="anime" activeFilter="animation_movies" />} />
      <Route path="cartoon-series" element={<UnifiedSectionPage contentType="anime" activeFilter="cartoon_series" />} />
      <Route path=":genre" element={<AnimePage />} />
      <Route path=":genre/:year" element={<AnimePage />} />
      <Route path=":genre/:year/:rating" element={<AnimePage />} />
    </Route>

    {/* Software routes with shared layout */}
    <Route path="/software" element={<ContentSectionLayout contentType="software" />}>
      <Route index element={<Software />} />
      <Route path="trending" element={<UnifiedSectionPage contentType="software" activeFilter="trending" />} />
      <Route path="top-rated" element={<UnifiedSectionPage contentType="software" activeFilter="top-rated" />} />
      <Route path="latest" element={<UnifiedSectionPage contentType="software" activeFilter="latest" />} />
      <Route path="windows" element={<UnifiedSectionPage contentType="software" activeFilter="windows" />} />
      <Route path="mac" element={<UnifiedSectionPage contentType="software" activeFilter="mac" />} />
      <Route path="linux" element={<UnifiedSectionPage contentType="software" activeFilter="linux" />} />
      <Route path="android" element={<UnifiedSectionPage contentType="software" activeFilter="android" />} />
      <Route path="ios" element={<UnifiedSectionPage contentType="software" activeFilter="ios" />} />
    </Route>

    <Route path="/quran" element={
      <PageErrorBoundary pageName="القرآن الكريم">
        <QuranPage />
      </PageErrorBoundary>
    } />

    <Route path="/plays/masrah-masr" element={
      <PageErrorBoundary pageName="المسرحيات">
        <PlaysWithFilters category="masrah-masr" />
      </PageErrorBoundary>
    } />
    <Route path="/plays/adel-imam" element={
      <PageErrorBoundary pageName="المسرحيات">
        <PlaysWithFilters category="adel-imam" />
      </PageErrorBoundary>
    } />
    <Route path="/plays/gulf" element={
      <PageErrorBoundary pageName="المسرحيات">
        <PlaysWithFilters category="gulf" />
      </PageErrorBoundary>
    } />
    <Route path="/plays/classics" element={
      <PageErrorBoundary pageName="المسرحيات">
        <PlaysWithFilters category="classics" />
      </PageErrorBoundary>
    } />

    <Route path="/movies/year/:year" element={<MoviesByYear />} />
    <Route path="/movies/genre/:id" element={<MoviesByGenre />} />
    <Route path="/series/year/:year" element={<SeriesByYear />} />
    <Route path="/series/genre/:id" element={<SeriesByGenre />} />

    {/* Genre Category Pages */}
    <Route path="/movies/category/:category" element={<GenreCategoryPage contentType="movies" />} />
    <Route path="/series/category/:category" element={<GenreCategoryPage contentType="series" />} />
    <Route path="/anime/category/:category" element={<GenreCategoryPage contentType="anime" />} />
    <Route path="/gaming/category/:category" element={<GenreCategoryPage contentType="gaming" />} />
    <Route path="/software/category/:category" element={<GenreCategoryPage contentType="software" />} />
  </>
)

