import React, { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { SeriesRouteHandler } from '../components/routing/SeriesRouteHandler'

const MovieDetails = lazy(() => import('../pages/media/MovieDetails').then(m => ({ default: m.MovieDetails })))
const Watch = lazy(() => import('../pages/media/Watch').then(m => ({ default: m.Watch })))
const WatchVideo = lazy(() => import('../pages/media/WatchVideo').then(m => ({ default: m.WatchVideo })))
const Parts = lazy(() => import('../pages/media/Parts').then(m => ({ default: m.Parts })))
const SeriesDetails = lazy(() => import('../pages/media/SeriesDetails').then(m => ({ default: m.default })))
const CinematicDetails = lazy(() => import('../pages/media/CinematicDetails').then(m => ({ default: m.default })))
const GameDetails = lazy(() => import('../pages/media/GameDetails').then(m => ({ default: m.GameDetails })))
const SoftwareDetails = lazy(() => import('../pages/media/SoftwareDetails').then(m => ({ default: m.SoftwareDetails })))
const Actor = lazy(() => import('../pages/media/Actor').then(m => ({ default: m.Actor })))
const PartyJoin = lazy(() => import('../pages/media/PartyJoin').then(m => ({ default: m.PartyJoin })))
const ReciterDetails = lazy(() => import('../pages/media/ReciterDetails').then(m => ({ default: m.ReciterDetails })))

const WatchFromSeries = () => {
  const { id, s, e } = ({} as any) // placeholder, legacy redirect handled elsewhere
  return <Navigate to="/" replace />
}

export const MediaRoutes = () => (
  <>
    <Route path="/movie/:id" element={<MovieDetails />} />
    <Route path="/party/:partyId" element={<PartyJoin />} />

    <Route path="/video/:id" element={<WatchVideo />} />
    <Route path="/watch/yt/:id" element={<WatchVideo />} />
    <Route path="/watch/video/:id" element={<WatchVideo />} />
    <Route path="/watch/dm/:id" element={<WatchVideo />} />

    <Route path="/watch/:type/:id/:s/:e" element={<Watch />} />
    <Route path="/watch/:type/:id/:s" element={<Watch />} />
    <Route path="/watch/:type/:id" element={<Watch />} />
    <Route path="/watch/:id" element={<Watch />} />

    <Route path="/watch/:lang/summaries/:genre/:slug" element={<WatchVideo />} />
    <Route path="/watch/:lang/video/:category/:genre/:slug" element={<WatchVideo />} />
    <Route path="/watch/:lang/:type/:genre/:slug" element={<Watch />} />

    <Route path="/parts/:type/:id" element={<Parts />} />
    <Route path="/actor/:id" element={<Actor />} />
    <Route path="/series/:id/season/:s/episode/:e" element={<Watch />} />
    <Route path="/series/:id" element={<SeriesRouteHandler />} />

    <Route path="/cinematic/:type/:id" element={<CinematicDetails />} />
    <Route path="/cinematic/:id" element={<CinematicDetails />} />
    <Route path="/demo/details" element={<CinematicDetails />} />

    <Route path="/game/:id" element={<GameDetails />} />
    <Route path="/software/:id" element={<SoftwareDetails />} />
    <Route path="/quran/reciter/:id" element={<ReciterDetails />} />
  </>
)

