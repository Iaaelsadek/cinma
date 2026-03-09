import React, { lazy } from 'react'
import { Route } from 'react-router-dom'

const Home = lazy(() => import('../pages/Home').then(m => ({ default: m.Home })))
const TopWatched = lazy(() => import('../pages/discovery/TopWatched').then(m => ({ default: m.TopWatched })))

export const MainRoutes = () => (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/top-watched" element={<TopWatched />} />
  </>
)

