import React, { lazy } from 'react'
import { Route } from 'react-router-dom'

const Home = lazy(() => import('../pages/Home').then(m => ({ default: m.Home })))
const TopWatched = lazy(() => import('../pages/discovery/TopWatched').then(m => ({ default: m.TopWatched })))
const Terms = lazy(() => import('../pages/Terms').then(m => ({ default: m.Terms })))
const Privacy = lazy(() => import('../pages/Privacy').then(m => ({ default: m.Privacy })))
const DMCA = lazy(() => import('../pages/DMCA').then(m => ({ default: m.DMCA })))

export const MainRoutes = () => (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/top-watched" element={<TopWatched />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/dmca" element={<DMCA />} />
  </>
)

