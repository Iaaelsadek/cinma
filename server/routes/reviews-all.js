/**
 * Combined Reviews Router
 * 
 * Aggregates all review-related routes:
 * - Ratings (POST, DELETE, GET)
 * - Reviews CRUD (POST, PUT, DELETE, GET)
 * - Review Interactions (likes, reports, stats)
 * - Admin Moderation (hide/unhide, reports)
 */

import express from 'express'
import ratingsRouter from './reviews.js'
import reviewsCrudRouter from './reviews-crud.js'
import reviewsInteractionsRouter from './reviews-interactions.js'
import reviewsAdminRouter from './reviews-admin.js'

const router = express.Router()

// Mount all review routes
router.use('/', ratingsRouter)
router.use('/', reviewsCrudRouter)
router.use('/', reviewsInteractionsRouter)
router.use('/', reviewsAdminRouter)

export default router
