import { Route, Routes, useNavigate, Navigate, useParams } from 'react-router-dom'
import { Suspense, lazy } from 'react'
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const MovieDetails = lazy(() => import('./pages/MovieDetails').then(m => ({ default: m.MovieDetails })))
const Watch = lazy(() => import('./pages/Watch').then(m => ({ default: m.Watch })))
const AdminDashboard = lazy(() => import('./pages/admin').then(m => ({ default: m.default })))
import { useAuth } from './hooks/useAuth'
import { AdsManager } from './components/common/AdsManager'
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
import { supabase } from './lib/supabase'
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })))
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { getProfile } from './lib/supabase'
const SeriesDetails = lazy(() => import('./pages/SeriesDetails').then(m => ({ default: m.default })))
const AdminSeriesList = lazy(() => import('./pages/admin/series').then(m => ({ default: m.default })))
const SeriesManage = lazy(() => import('./pages/admin/series/SeriesManage').then(m => ({ default: m.default })))
const SeasonManage = lazy(() => import('./pages/admin/series/SeasonManage').then(m => ({ default: m.default })))
const AdminLayout = lazy(() => import('./pages/admin/layout').then(m => ({ default: m.default })))
const AdminUsersPage = lazy(() => import('./pages/admin/users').then(m => ({ default: m.default })))
const AdminSettingsPage = lazy(() => import('./pages/admin/settings').then(m => ({ default: m.default })))
const AdminAdsPage = lazy(() => import('./pages/admin/ads').then(m => ({ default: m.default })))
const AdminBackupPage = lazy(() => import('./pages/admin/backup').then(m => ({ default: m.default })))
import { useLang } from './state/useLang'
import { setTmdbLanguage } from './lib/tmdb'
const CinematicDetails = lazy(() => import('./pages/CinematicDetails').then(m => ({ default: m.default })))
import { useInitAuth } from './hooks/useInitAuth'
const CategoryPage = lazy(() => import('./pages/Category').then(m => ({ default: m.CategoryPage })))
import { QuranPage } from './pages/Quran'

const WatchVideo = lazy(() => import('./pages/WatchVideo').then(m => ({ default: m.WatchVideo })))
const Gaming = lazy(() => import('./pages/Gaming').then(m => ({ default: m.Gaming })))
const Software = lazy(() => import('./pages/Software').then(m => ({ default: m.Software })))
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })))
const GameDetails = lazy(() => import('./pages/GameDetails').then(m => ({ default: m.GameDetails })))
const SoftwareDetails = lazy(() => import('./pages/SoftwareDetails').then(m => ({ default: m.SoftwareDetails })))
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })))
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })))
const RequestPage = lazy(() => import('./pages/Request').then(m => ({ default: m.RequestPage })))
import { QuranPlayerProvider } from './context/QuranPlayerContext'

const ProtectedAdmin = ({ children }: { children: JSX.Element }) => {
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
  if (loading || allowed === null) return null
  if (!allowed) return <Navigate to="/" replace />
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
    <QuranPlayerProvider>
      <MainLayout>
        <Suspense fallback={null}>
          <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/video/:id" element={<WatchVideo />} />
        <Route path="/watch/yt/:id" element={<WatchVideo />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/gaming" element={<Gaming />} />
        <Route path="/software" element={<Software />} />
        <Route path="/game/:id" element={<GameDetails />} />
        <Route path="/software/:id" element={<SoftwareDetails />} />
        <Route path="/series/:id" element={<SeriesDetails />} />
        <Route path="/series/:id/season/:s/episode/:e" element={<WatchFromSeries />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/kids" element={<CategoryPage />} />
        <Route path="/anime" element={<CategoryPage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/movies" element={<MoviesRoot />} />
        <Route path="/series" element={<SeriesRoot />} />
        <Route path="/movies/year/:year" element={<MoviesByYear />} />
        <Route path="/movies/genre/:id" element={<MoviesByGenre />} />
        <Route path="/series/year/:year" element={<SeriesByYear />} />
        <Route path="/series/genre/:id" element={<SeriesByGenre />} />
        <Route path="/demo/details" element={<CinematicDetails />} />
        <Route path="/cinematic/:type/:id" element={<CinematicDetails />} />
        <Route path="/cinematic/:id" element={<CinematicDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/request" element={<RequestPage />} />
        <Route
          path="/admin/*"
          element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="series" element={<AdminSeriesList />} />
          <Route path="series/:id" element={<SeriesManage />} />
          <Route path="series/:id/season/:seasonId" element={<SeasonManage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="ads" element={<AdminAdsPage />} />
          <Route path="backup" element={<AdminBackupPage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
          </Routes>
        </Suspense>
        <AdsManager type="popunder" position="global" />
        <Toaster richColors position="top-center" />
      </MainLayout>
    </QuranPlayerProvider>
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
