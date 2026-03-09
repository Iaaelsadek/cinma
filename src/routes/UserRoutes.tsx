import React, { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Auth = lazy(() => import('../pages/Auth').then(m => ({ default: m.default })))
const Profile = lazy(() => import('../pages/user/Profile').then(m => ({ default: m.Profile })))
const PublicProfile = lazy(() => import('../pages/user/PublicProfile').then(m => ({ default: m.PublicProfile })))
const RequestPage = lazy(() => import('../pages/user/Request').then(m => ({ default: m.RequestPage })))

const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export const UserRoutes = () => (
  <>
    <Route path="/auth" element={<Auth />} />
    <Route path="/login" element={<Auth />} />
    <Route path="/register" element={<Auth />} />
    <Route path="/auth/callback" element={<Navigate to="/" replace />} />

    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route path="/user/:username" element={<PublicProfile />} />
    <Route
      path="/favorites"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route path="/request" element={<RequestPage />} />
  </>
)

