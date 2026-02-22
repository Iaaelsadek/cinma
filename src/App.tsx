import { Route, Routes, useNavigate, Navigate, useParams } from 'react-router-dom'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AdsManager } from './components/features/system/AdsManager'
import { supabase } from './lib/supabase'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from 'sonner'
import { getProfile } from './lib/supabase'
import { useLang } from './state/useLang'
import { setTmdbLanguage } from './lib/tmdb'
import { useInitAuth } from './hooks/useInitAuth'
import { QuranPlayerProvider } from './context/QuranPlayerContext'
import { PwaProvider } from './context/PwaContext'
import { PageLoader } from './components/common/PageLoader'
import { ScrollToTop } from './components/utils/ScrollToTop'
import { NetworkStatus } from './components/features/system/NetworkStatus'

// --- Pages ---
// Home
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const TopWatched = lazy(() => import('./pages/discovery/TopWatched').then(m => ({ default: m.TopWatched })))

const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.default })))
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin').then(m => ({ default: m.AdminLogin })))

// Media & Content
const MovieDetails = lazy(() => import('./pages/media/MovieDetails').then(m => ({ default: m.MovieDetails })))
const Watch = lazy(() => import('./pages/media/Watch').then(m => ({ default: m.Watch })))
const WatchVideo = lazy(() => import('./pages/media/WatchVideo').then(m => ({ default: m.WatchVideo })))
const SeriesDetails = lazy(() => import('./pages/media/SeriesDetails').then(m => ({ default: m.default })))
const CinematicDetails = lazy(() => import('./pages/media/CinematicDetails').then(m => ({ default: m.default })))
const GameDetails = lazy(() => import('./pages/media/GameDetails').then(m => ({ default: m.GameDetails })))
const SoftwareDetails = lazy(() => import('./pages/media/SoftwareDetails').then(m => ({ default: m.SoftwareDetails })))

// Discovery
const Search = lazy(() => import('./pages/discovery/Search').then(m => ({ default: m.Search })))
const CategoryPage = lazy(() => import('./pages/discovery/Category').then(m => ({ default: m.CategoryPage })))
const CategoryHub = lazy(() => import('./pages/CategoryHub').then(m => ({ default: m.CategoryHub })))
const Gaming = lazy(() => import('./pages/discovery/Gaming').then(m => ({ default: m.Gaming })))
const Software = lazy(() => import('./pages/discovery/Software').then(m => ({ default: m.Software })))
const MoviesPage = lazy(() => import('./pages/discovery/Movies').then(m => ({ default: m.MoviesPage })))
const SeriesPage = lazy(() => import('./pages/discovery/Series').then(m => ({ default: m.SeriesPage })))
const AnimePage = lazy(() => import('./pages/discovery/Anime').then(m => ({ default: m.AnimePage })))
const AsianDramaPage = lazy(() => import('./pages/discovery/AsianDrama').then(m => ({ default: m.AsianDramaPage })))
const DynamicContentPage = lazy(() => import('./pages/discovery/DynamicContent').then(m => ({ default: m.DynamicContentPage })))
const PlaysPage = lazy(() => import('./pages/discovery/Plays').then(m => ({ default: m.PlaysPage })))
const ClassicsPage = lazy(() => import('./pages/discovery/Classics').then(m => ({ default: m.ClassicsPage })))
const SummariesPage = lazy(() => import('./pages/discovery/Summaries').then(m => ({ default: m.SummariesPage })))
const QuranPage = lazy(() => import('./pages/discovery/Quran').then(m => ({ default: m.QuranPage })))
const QuranRadio = lazy(() => import('./pages/discovery/QuranRadio').then(m => ({ default: m.QuranRadio })))
const RamadanPage = lazy(() => import('./pages/discovery/Ramadan').then(m => ({ default: m.RamadanPage })))
const RandomDiscovery = lazy(() => import('./pages/discovery/RandomDiscovery').then(m => ({ default: m.RandomDiscovery })))
const ReciterDetails = lazy(() => import('./pages/media/ReciterDetails').then(m => ({ default: m.ReciterDetails })))

// User
const Profile = lazy(() => import('./pages/user/Profile').then(m => ({ default: m.Profile })))
const RequestPage = lazy(() => import('./pages/user/Request').then(m => ({ default: m.RequestPage })))

// Legal
const Terms = lazy(() => import('./pages/legal/Terms').then(m => ({ default: m.Terms })))
const Privacy = lazy(() => import('./pages/legal/Privacy').then(m => ({ default: m.Privacy })))

// Admin
const AdminDashboard = lazy(() => import('./pages/admin').then(m => ({ default: m.default })))
const AdminSeriesList = lazy(() => import('./pages/admin/series').then(m => ({ default: m.default })))
const SeriesManage = lazy(() => import('./pages/admin/series/SeriesManage').then(m => ({ default: m.default })))
const SeasonManage = lazy(() => import('./pages/admin/series/SeasonManage').then(m => ({ default: m.default })))
const AdminLayout = lazy(() => import('./pages/admin/layout').then(m => ({ default: m.default })))
const AdminUsersPage = lazy(() => import('./pages/admin/users').then(m => ({ default: m.default })))
const AdminSettingsPage = lazy(() => import('./pages/admin/settings').then(m => ({ default: m.default })))
const AdminAdsPage = lazy(() => import('./pages/admin/ads').then(m => ({ default: m.default })))
const AdminBackupPage = lazy(() => import('./pages/admin/backup').then(m => ({ default: m.default })))
const AdminSystemControl = lazy(() => import('./pages/admin/system').then(m => ({ default: m.default })))
const AddMovie = lazy(() => import('./pages/admin/AddMovie').then(m => ({ default: m.AddMovie })))
const MoviesManage = lazy(() => import('./pages/admin/MoviesManage').then(m => ({ default: m.MoviesManage })))

import { SeriesRouteHandler } from './components/routing/SeriesRouteHandler'

const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

const SetupAdmin = lazy(() => import('./pages/admin/SetupAdmin').then(m => ({ default: m.SetupAdmin })))

const ProtectedAdmin = ({ children }: { children: React.JSX.Element }) => {
  const { user, loading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (loading) return
      if (!user) {
        setAllowed(false)
        return
      }
      const p = await getProfile(user.id)
      if (cancelled) return
      // Allow both admin and supervisor to access the dashboard area
      setAllowed(p?.role === 'admin' || p?.role === 'supervisor')
    })()
    return () => { cancelled = true }
  }, [user, loading])
  if (loading || allowed === null) return <PageLoader />
  if (!allowed) return <Navigate to="/" replace />
  return children
}

const ProtectedSuperAdmin = ({ children }: { children: React.JSX.Element }) => {
  const { user, loading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (loading) return
      if (!user) {
        setAllowed(false)
        return
      }
      const p = await getProfile(user.id)
      if (cancelled) return
      setAllowed(p?.role === 'admin')
    })()
    return () => { cancelled = true }
  }, [user, loading])
  if (loading || allowed === null) return <PageLoader />
  if (!allowed) return <Navigate to="/admin/dashboard" replace />
  return children
}

const App = () => {
  useInitAuth()
  const { user, loading } = useAuth()
  const { lang } = useLang()
  useEffect(() => {
    const html = document.documentElement
    html.dir = lang === 'ar' ? 'rtl' : 'ltr'
    html.lang = lang === 'ar' ? 'ar' : 'en'
    setTmdbLanguage(lang === 'ar' ? 'ar-SA' : 'en-US')
  }, [lang])
  const navigate = useNavigate()
  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }
  return (
    <PwaProvider>
      <QuranPlayerProvider>
        <MainLayout>
          <ScrollToTop />
          <NetworkStatus />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Media Routes */}
            <Route path="/movie/:id" element={<MovieDetails />} />

            {/* SEO Friendly Watch Routes */}
            <Route path="/watch/:lang/summaries/:genre/:slug" element={<WatchVideo />} />
            <Route path="/watch/:lang/video/:category/:genre/:slug" element={<WatchVideo />} />
            <Route path="/watch/:lang/:type/:genre/:slug" element={<Watch />} />
            
            <Route path="/video/:id" element={<WatchVideo />} />
            <Route path="/watch/yt/:id" element={<WatchVideo />} />
            <Route path="/watch/video/:id" element={<WatchVideo />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/watch/:type/:id" element={<Watch />} />
            <Route path="/series/:id/season/:s/episode/:e" element={<WatchFromSeries />} />
            
            {/* 
              Conflict Handler: /series/:id vs /series/:category 
              If :id is numeric -> SeriesDetails
              If :id is string  -> CategoryHub
            */}
            <Route path="/series/:id" element={<SeriesRouteHandler />} />

            <Route path="/cinematic/:type/:id" element={<CinematicDetails />} />
            <Route path="/cinematic/:id" element={<CinematicDetails />} />
            <Route path="/demo/details" element={<CinematicDetails />} />

            {/* Discovery Routes */}
            <Route path="/quran/radio" element={<QuranRadio />} />
            <Route path="/random" element={<RandomDiscovery />} />
            <Route path="/search" element={<Search />} />
            
            {/* Silo Routes */}
            <Route path="/movies/genre/:genre" element={<CategoryHub type="movie" />} />
            <Route path="/series/genre/:genre" element={<CategoryHub type="tv" />} />
            <Route path="/movies/:category/:year/:genre" element={<CategoryHub type="movie" />} />
            <Route path="/movies/:category/:year" element={<CategoryHub type="movie" />} />
            <Route path="/movies/:category" element={<CategoryHub type="movie" />} />
            <Route path="/series/:category/:year/:genre" element={<CategoryHub type="tv" />} />
            <Route path="/series/:category/:year" element={<CategoryHub type="tv" />} />
            {/* Handled by SeriesRouteHandler */}
            {/* <Route path="/series/:category" element={<CategoryHub type="tv" />} /> */}

            <Route path="/rating/:rating" element={<CategoryHub />} />
            <Route path="/year/:year" element={<CategoryHub />} />

            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/kids" element={<CategoryPage />} />
            
            {/* Dynamic Content Routes */}
            <Route path="/disney" element={<DynamicContentPage preset="disney" />} />
            <Route path="/spacetoon" element={<DynamicContentPage preset="spacetoon" />} />
            <Route path="/cartoons" element={<DynamicContentPage preset="cartoons" />} />
            <Route path="/animation" element={<DynamicContentPage preset="cartoons" />} />
            
            <Route path="/arabic-movies" element={<DynamicContentPage preset="arabic" type="movie" />} />
            <Route path="/arabic-series" element={<DynamicContentPage preset="arabic" type="tv" />} />
            
            <Route path="/foreign-movies" element={<DynamicContentPage preset="foreign" type="movie" />} />
            <Route path="/foreign-series" element={<DynamicContentPage preset="foreign" type="tv" />} />
            
            <Route path="/indian" element={<DynamicContentPage preset="indian" />} />
            <Route path="/ramadan" element={<RamadanPage />} />
            <Route path="/religious" element={<DynamicContentPage preset="religious" />} />

            {/* Anime Routes with Filters */}
            <Route path="/anime" element={<AnimePage />} />
            <Route path="/anime/:genre" element={<AnimePage />} />
            <Route path="/anime/:genre/:year" element={<AnimePage />} />
            <Route path="/anime/:genre/:year/:rating" element={<AnimePage />} />

            {/* Asian Drama Routes */}
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

            {/* Plays Routes with Filters */}
            <Route path="/plays" element={<PlaysPage />} />
            <Route path="/plays/:genre" element={<PlaysPage />} />
            <Route path="/plays/:genre/:year" element={<PlaysPage />} />
            <Route path="/plays/:genre/:year/:rating" element={<PlaysPage />} />

            {/* Summaries Routes with Filters */}
            <Route path="/summaries" element={<SummariesPage />} />
            <Route path="/summaries/:genre" element={<SummariesPage />} />
            <Route path="/summaries/:genre/:year" element={<SummariesPage />} />
            <Route path="/summaries/:genre/:year/:rating" element={<SummariesPage />} />

            <Route path="/classics" element={<ClassicsPage />} />
            <Route path="/gaming" element={<Gaming />} />
            <Route path="/game/:id" element={<GameDetails />} />
            <Route path="/software" element={<Software />} />
            <Route path="/software/:id" element={<SoftwareDetails />} />
            <Route path="/quran" element={<QuranPage />} />
            <Route path="/quran/reciter/:id" element={<ReciterDetails />} />

            {/* Content Redirects */}
            <Route path="/movies" element={<MoviesPage />} />
        <Route path="/top-watched" element={<TopWatched />} />
        <Route path="/series" element={<SeriesPage />} />
            <Route path="/movies/year/:year" element={<MoviesByYear />} />
            <Route path="/movies/genre/:id" element={<MoviesByGenre />} />
            <Route path="/series/year/:year" element={<SeriesByYear />} />
            <Route path="/series/genre/:id" element={<SeriesByGenre />} />

            {/* Auth Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/auth/callback" element={<Navigate to="/" replace />} />
            
            {/* User Routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/request" element={<RequestPage />} />

            {/* Legal Routes */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Admin — غرفة القيادة */}
            <Route path="/admin/setup" element={<SetupAdmin />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="series" element={<AdminSeriesList />} />
              <Route path="series/:id" element={<SeriesManage />} />
              <Route path="series/:id/season/:seasonId" element={<SeasonManage />} />
              <Route path="movies" element={<MoviesManage />} />
              <Route path="add-movie" element={<AddMovie />} />
              <Route path="users" element={<ProtectedSuperAdmin><AdminUsersPage /></ProtectedSuperAdmin>} />
              <Route path="settings" element={<ProtectedSuperAdmin><AdminSettingsPage /></ProtectedSuperAdmin>} />
              <Route path="ads" element={<ProtectedSuperAdmin><AdminAdsPage /></ProtectedSuperAdmin>} />
              <Route path="backup" element={<ProtectedSuperAdmin><AdminBackupPage /></ProtectedSuperAdmin>} />
              <Route path="system" element={<ProtectedSuperAdmin><AdminSystemControl /></ProtectedSuperAdmin>} />
            </Route>
          </Routes>
        </Suspense>
        <AdsManager type="popunder" position="global" />
        <Toaster richColors position="top-center" toastOptions={{ style: { zIndex: 999999 } }} />
        </MainLayout>
      </QuranPlayerProvider>
    </PwaProvider>
  )
}
export default App

const WatchFromSeries = () => {
  const { id, s, e } = useParams()
  const ss = (s as string) || '1'
  const ee = (e as string) || '1'
  return <Navigate to={`/watch/${id}?type=tv&season=${ss}&episode=${ee}`} replace />
}

const MoviesRoot = () => <Navigate to="/search?types=movie" replace />
const SeriesRoot = () => <Navigate to="/search?types=tv" replace />
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
