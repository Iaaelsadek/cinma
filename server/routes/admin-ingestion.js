/**
 * Admin Ingestion API Routes
 * 
 * Authenticated routes for managing the ingestion pipeline
 * Requires Supabase JWT verification
 */

import express from 'express';
import pool from '../../src/db/pool.js';
// Note: StateManager, BatchProcessor, and AdapterManager are not used in production
// These were part of the ingestion system that runs separately

const router = express.Router();

/**
 * GET /api/admin/ingestion/stats - Get ingestion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Query stats directly from database
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped
      FROM ingestion_log
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    const response = {
      total: parseInt(stats.total) || 0,
      pending: parseInt(stats.pending) || 0,
      processing: parseInt(stats.processing) || 0,
      success: parseInt(stats.success) || 0,
      failed: parseInt(stats.failed) || 0,
      skipped: parseInt(stats.skipped) || 0,
      isProcessing: false // Ingestion runs separately, not via API
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching ingestion stats:', error);
    // Return default stats on error
    res.json({
      total: 0,
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      isProcessing: false
    });
  }
});

/**
 * GET /api/admin/ingestion/log - Get ingestion log with filters and pagination
 */
router.get('/log', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const status = req.query.status; // 'pending', 'processing', 'success', 'failed', 'skipped'
  const contentType = req.query.contentType;

  let query = 'SELECT * FROM ingestion_log WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (contentType) {
    query += ` AND content_type = $${paramIndex}`;
    params.push(contentType);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM ingestion_log WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (contentType) {
      countQuery += ` AND content_type = $${countParamIndex}`;
      countParams.push(contentType);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ingestion log:', error);
    res.status(500).json({ error: 'Failed to fetch ingestion log' });
  }
});

/**
 * POST /api/admin/ingestion/queue - Queue new items for ingestion
 * 
 * Note: This endpoint is disabled in production.
 * Ingestion is handled by separate scripts, not via API.
 */
router.post('/queue', async (req, res) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Ingestion is handled by separate scripts. Use the ingestion scripts in scripts/ingestion/ directory.'
  });
});

/**
 * POST /api/admin/ingestion/requeue-failed - Re-queue failed items
 * 
 * Note: This endpoint is disabled in production.
 */
router.post('/requeue-failed', async (req, res) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Use ingestion scripts to requeue failed items.'
  });
});

/**
 * POST /api/admin/ingestion/process - Trigger batch processing
 * 
 * Note: This endpoint is disabled in production.
 */
router.post('/process', async (req, res) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Use ingestion scripts to process batches.'
  });
});

export default router;
