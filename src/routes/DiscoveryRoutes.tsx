import React, { lazy } from 'react'
import { Route, Navigate, useParams } from 'react-router-dom'

const Search = lazy(() => import('../pages/discovery/Search').then(m => ({ default: m.Search })))
const CategoryPage = lazy(() => import('../pages/discovery/Category').then(m => ({ default: m.CategoryPage })))
const CategoryHub = lazy(() => import('../pages/CategoryHub').then(m => ({ default: m.CategoryHub })))
const Gaming = lazy(() => import('../pages/discovery/Gaming').then(m => ({ default: m.Gaming })))
const Software = lazy(() => import('../pages/discovery/Software').then(m => ({ default: m.Software })))
const MoviesPage = lazy(() => import('../pages/discovery/Movies').then(m => ({ default: m.MoviesPage })))
const SeriesPage = lazy(() => import('../pages/discovery/Series').then(m => ({ default: m.SeriesPage })))
const AnimePage = lazy(() => import('../pages/discovery/Anime').then(m => ({ default: m.AnimePage })))
const AsianDramaPage = lazy(() => import('../pages/discovery/AsianDrama').then(m => ({ default: m.AsianDramaPage })))
const DynamicContentPage = lazy(() => import('../pages/discovery/DynamicContent').then(m => ({ default: m.DynamicContentPage })))
const PlaysPage = lazy(() => import('../pages/discovery/Plays').then(m => ({ default: m.PlaysPage })))
const ClassicsPage = lazy(() => import('../pages/discovery/Classics').then(m => ({ default: m.ClassicsPage })))
const SummariesPage = lazy(() => import('../pages/discovery/Summaries').then(m => ({ default: m.SummariesPage })))
const QuranPage = lazy(() => import('../pages/discovery/Quran').then(m => ({ default: m.QuranPage })))
const QuranRadio = lazy(() => import('../pages/discovery/QuranRadio'))

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

export const DiscoveryRoutes = () => (
  <>
    <Route path="/quran/radio" element={<QuranRadio />} />
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

    <Route path="/disney" element={<DynamicContentPage preset="disney" />} />
    <Route path="/spacetoon" element={<DynamicContentPage preset="spacetoon" />} />
    <Route path="/cartoons" element={<DynamicContentPage preset="cartoons" />} />
    <Route path="/animation" element={<DynamicContentPage preset="cartoons" />} />

    <Route path="/arabic-movies" element={<DynamicContentPage preset="arabic" type="movie" />} />
    <Route path="/arabic-series" element={<DynamicContentPage preset="arabic" type="tv" />} />
    <Route path="/foreign-movies" element={<DynamicContentPage preset="foreign" type="movie" />} />
    <Route path="/foreign-series" element={<DynamicContentPage preset="foreign" type="tv" />} />
    <Route path="/indian" element={<DynamicContentPage preset="indian" />} />
    <Route path="/ramadan" element={<DynamicContentPage preset="ramadan" />} />
    <Route path="/religious" element={<DynamicContentPage preset="religious" />} />

    <Route path="/anime" element={<AnimePage />} />
    <Route path="/anime/:genre" element={<AnimePage />} />
    <Route path="/anime/:genre/:year" element={<AnimePage />} />
    <Route path="/anime/:genre/:year/:rating" element={<AnimePage />} />

    <Route path="/chinese" element={<AsianDramaPage type="chinese" />} />
    <Route path="/chinese/:genre" element={<AsianDramaPage type="chinese" />} />
    <Route path="/chinese/:genre/:year" element={<AsianDramaPage type="chinese" />} />
    <Route path="/chinese/:genre/:year/:rating" element={<AsianDramaPage type="chinese" />} />

    <Route path="/k-drama" element={<AsianDramaPage type="korean" />} />
    <Route path="/k-drama/:genre" element={<AsianDramaPage type="korean" />} />
    <Route path="/k-drama/:genre/:year" element={<AsianDramaPage type="korean" />} />
    <Route path="/k-drama/:genre/:year/:rating" element={<AsianDramaPage type="korean" />} />

    <Route path="/bollywood" element={<AsianDramaPage type="bollywood" />} />
    <Route path="/bollywood/:genre" element={<AsianDramaPage type="bollywood" />} />
    <Route path="/bollywood/:genre/:year" element={<AsianDramaPage type="bollywood" />} />
    <Route path="/bollywood/:genre/:year/:rating" element={<AsianDramaPage type="bollywood" />} />

    <Route path="/turkish" element={<AsianDramaPage type="turkish" />} />
    <Route path="/turkish/:genre" element={<AsianDramaPage type="turkish" />} />
    <Route path="/turkish/:genre/:year" element={<AsianDramaPage type="turkish" />} />
    <Route path="/turkish/:genre/:year/:rating" element={<AsianDramaPage type="turkish" />} />

    <Route path="/plays" element={<PlaysPage />} />
    <Route path="/plays/:genre" element={<PlaysPage />} />
    <Route path="/plays/:genre/:year" element={<PlaysPage />} />
    <Route path="/plays/:genre/:year/:rating" element={<PlaysPage />} />

    <Route path="/summaries" element={<SummariesPage />} />
    <Route path="/summaries/:genre" element={<SummariesPage />} />
    <Route path="/summaries/:genre/:year" element={<SummariesPage />} />
    <Route path="/summaries/:genre/:year/:rating" element={<SummariesPage />} />

    <Route path="/classics" element={<ClassicsPage />} />
    <Route path="/gaming" element={<Gaming />} />
    <Route path="/software" element={<Software />} />
    <Route path="/quran" element={<QuranPage />} />

    <Route path="/movies" element={<MoviesPage />} />
    <Route path="/series" element={<SeriesPage />} />
    <Route path="/movies/year/:year" element={<MoviesByYear />} />
    <Route path="/movies/genre/:id" element={<MoviesByGenre />} />
    <Route path="/series/year/:year" element={<SeriesByYear />} />
    <Route path="/series/genre/:id" element={<SeriesByGenre />} />
  </>
)

