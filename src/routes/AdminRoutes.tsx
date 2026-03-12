import React, { lazy, useEffect, useState } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProfile } from '../lib/supabase'
import { PageLoader } from '../components/common/PageLoader'

const AdminLogin = lazy(() => import('../pages/auth/AdminLogin').then(m => ({ default: m.AdminLogin })))
const SetupAdmin = lazy(() => import('../pages/admin/SetupAdmin').then(m => ({ default: m.SetupAdmin })))
const AdminDashboard = lazy(() => import('../pages/admin').then(m => ({ default: m.default })))
const AdminSeriesList = lazy(() => import('../pages/admin/series').then(m => ({ default: m.default })))
const SeriesManage = lazy(() => import('../pages/admin/series/SeriesManage').then(m => ({ default: m.default })))
const SeasonManage = lazy(() => import('../pages/admin/series/SeasonManage').then(m => ({ default: m.default })))
const AdminLayout = lazy(() => import('../pages/admin/layout').then(m => ({ default: m.default })))
const AdminUsersPage = lazy(() => import('../pages/admin/users').then(m => ({ default: m.default })))
const AdminSettingsPage = lazy(() => import('../pages/admin/settings').then(m => ({ default: m.default })))
const AdminAdsPage = lazy(() => import('../pages/admin/ads').then(m => ({ default: m.default })))
const AdminBackupPage = lazy(() => import('../pages/admin/backup').then(m => ({ default: m.default })))
const AdminSystemControl = lazy(() => import('../pages/admin/system').then(m => ({ default: m.default })))
const MoviesManage = lazy(() => import('../pages/admin/MoviesManage').then(m => ({ default: m.MoviesManage })))
const ContentHealth = lazy(() => import('../pages/admin/ContentHealth').then(m => ({ default: m.ContentHealth })))
const ServerTester = lazy(() => import('../pages/admin/ServerTester').then(m => ({ default: m.ServerTester })))

const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const ProtectedAdmin = ({ children }: { children: React.JSX.Element }) => {
  const { user, profile, loading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    setAllowed(null)
    ;(async () => {
      if (loading) return
      if (!user) {
        setAllowed(false)
        return
      }
      if (profile) {
        setAllowed(profile.role === 'admin' || profile.role === 'supervisor')
        return
      }
      try {
        const p = await withTimeout(getProfile(user.id), 4000)
        if (cancelled) return
        setAllowed(p?.role === 'admin' || p?.role === 'supervisor')
      } catch {
        if (!cancelled) setAllowed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, profile, loading])
  if (loading || allowed === null) return <PageLoader />
  if (!allowed) return <Navigate to="/" replace />
  return children
}

const ProtectedSuperAdmin = ({ children }: { children: React.JSX.Element }) => {
  const { user, profile, loading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    setAllowed(null)
    ;(async () => {
      if (loading) return
      if (!user) {
        setAllowed(false)
        return
      }
      if (profile) {
        setAllowed(profile.role === 'admin')
        return
      }
      try {
        const p = await withTimeout(getProfile(user.id), 4000)
        if (cancelled) return
        setAllowed(p?.role === 'admin')
      } catch {
        if (!cancelled) setAllowed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, profile, loading])
  if (loading || allowed === null) return <PageLoader />
  if (!allowed) return <Navigate to="/admin/dashboard" replace />
  return children
}

export const AdminRoutes = () => (
  <>
    <Route path="/admin/setup" element={<SetupAdmin />} />
    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/server-tester" element={<Navigate to="/admin/servers" replace />} />

    <Route
      path="/admin/*"
      element={
        <ProtectedAdmin>
          <AdminLayout />
        </ProtectedAdmin>
      }
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="series" element={<AdminSeriesList />} />
      <Route path="series/:id" element={<SeriesManage />} />
      <Route path="series/:id/season/:seasonId" element={<SeasonManage />} />
      <Route path="movies" element={<MoviesManage />} />
      <Route path="add-movie" element={<Navigate to="/admin/movies" replace />} />
      <Route path="content-health" element={<ContentHealth />} />
      <Route path="servers" element={<ServerTester />} />
      <Route
        path="users"
        element={
          <ProtectedSuperAdmin>
            <AdminUsersPage />
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="settings"
        element={
          <ProtectedSuperAdmin>
            <AdminSettingsPage />
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="ads"
        element={
          <ProtectedSuperAdmin>
            <AdminAdsPage />
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="backup"
        element={
          <ProtectedSuperAdmin>
            <AdminBackupPage />
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="backups"
        element={
          <ProtectedSuperAdmin>
            <AdminBackupPage />
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="system"
        element={
          <ProtectedSuperAdmin>
            <AdminSystemControl />
          </ProtectedSuperAdmin>
        }
      />
    </Route>
  </>
)

