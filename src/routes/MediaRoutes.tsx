import React, { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { SeriesRouteHandler } from '../components/routing/SeriesRouteHandler'
import { LegacyRedirect } from '../components/utils/LegacyRedirect'

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

export const MediaRoutes = () => (
  <>
    <Route path="/movie/:slug" element={<MovieDetails />} />
    <Route path="/movie/id/:id" element={<LegacyRedirect type="movie" />} />
    
    <Route path="/party/:partyId" element={<PartyJoin />} />

    <Route path="/video/:id" element={<WatchVideo />} />

    <Route path="/watch/:type/:slug/:s/:e" element={<Watch />} />
    <Route path="/watch/:type/:slug/:s" element={<Watch />} />
    <Route path="/watch/:type/:slug" element={<Watch />} />
    <Route path="/watch/:id" element={<Watch />} />

    <Route path="/parts/:type/:slug" element={<Parts />} />
    <Route path="/actor/:slug" element={<Actor />} />
    <Route path="/actor/id/:id" element={<LegacyRedirect type="actor" />} />

    <Route path="/series/:slug/season/:s/episode/:e" element={<Watch />} />
    <Route path="/series/:slug" element={<SeriesRouteHandler />} />
    <Route path="/series/id/:id" element={<LegacyRedirect type="tv" />} />
    <Route path="/tv/:slug" element={<Navigate to="/series/:slug" replace />} />

    <Route path="/series/details/:slug" element={<SeriesDetails />} />

    <Route path="/cinematic/:type/:slug" element={<CinematicDetails />} />
    <Route path="/cinematic/:slug" element={<CinematicDetails />} />

    <Route path="/game/:slug" element={<GameDetails />} />
    <Route path="/game/id/:id" element={<LegacyRedirect type="game" />} />
    
    <Route path="/software/:slug" element={<SoftwareDetails />} />
    <Route path="/software/id/:id" element={<LegacyRedirect type="software" />} />
    
    <Route path="/quran/reciter/:id" element={<ReciterDetails />} />
  </>
)
