/**
 * Quran API Routes - Islamic Audio Content
 * 
 * Endpoints:
 * - GET /api/quran/reciters - Fetch Quran reciters
 * - GET /api/quran/sermons - Fetch Islamic sermons
 * - GET /api/quran/stories - Fetch Islamic stories
 * - POST /api/quran/sermons/:id/play - Increment sermon play count
 * - POST /api/quran/stories/:id/play - Increment story play count
 * 
 * Database: CockroachDB ONLY
 */

import express from 'express'
import { GET as getReciters } from '../api/quran/reciters.js'
import { GET as getSermons } from '../api/quran/sermons.js'
import { GET as getStories } from '../api/quran/stories.js'
import { POST as incrementSermonPlayCount } from '../api/quran/sermon-play.js'
import { POST as incrementStoryPlayCount } from '../api/quran/story-play.js'

const router = express.Router()

// Quran Reciters endpoint
router.get('/quran/reciters', async (req, res) => {
  await getReciters(req, res)
})

// Quran Sermons endpoint
router.get('/quran/sermons', async (req, res) => {
  await getSermons(req, res)
})

// Quran Stories endpoint
router.get('/quran/stories', async (req, res) => {
  await getStories(req, res)
})

// Sermon play count tracking endpoint
router.post('/quran/sermons/:id/play', async (req, res) => {
  await incrementSermonPlayCount(req, res)
})

// Story play count tracking endpoint
router.post('/quran/stories/:id/play', async (req, res) => {
  await incrementStoryPlayCount(req, res)
})

export default router
