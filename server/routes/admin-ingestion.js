/**
 * Admin Ingestion API Routes
 * 
 * Authenticated routes for managing the ingestion pipeline
 * Requires Supabase JWT verification
 */

import express from 'express';
import pool from '../../src/db/pool.js';
import StateManager from '../../src/ingestion/StateManager.js';
import BatchProcessor from '../../src/ingestion/BatchProcessor.js';
import AdapterManager from '../../src/adapters/AdapterManager.js';

const router = express.Router();

// Initialize unified adapter manager
const adapterManager = new AdapterManager({
  tmdbApiKey: process.env.TMDB_API_KEY,
  igdbClientId: process.env.IGDB_CLIENT_ID,
  igdbClientSecret: process.env.IGDB_CLIENT_SECRET
});

const batchProcessor = new BatchProcessor(adapterManager);

/**
 * GET /api/admin/ingestion/stats - Get ingestion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await batchProcessor.getStats();
    const isProcessing = batchProcessor.isCurrentlyProcessing();

    // Ensure all required fields exist
    const response = {
      total: stats.total || 0,
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      success: stats.success || 0,
      failed: stats.failed || 0,
      skipped: stats.skipped || 0,
      isProcessing: isProcessing || false
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
 * Body: {
 *   items: [
 *     { externalSource: 'TMDB', externalId: '550', contentType: 'movie' }
 *   ]
 * }
 */
router.post('/queue', async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  // Validate items
  for (const item of items) {
    if (!item.externalSource || !item.externalId || !item.contentType) {
      return res.status(400).json({
        error: 'Each item must have externalSource, externalId, and contentType'
      });
    }

    const validTypes = ['movie', 'tv_series', 'software', 'actor'];
    if (!validTypes.includes(item.contentType)) {
      return res.status(400).json({
        error: `Invalid contentType: ${item.contentType}. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check if adapter is available for this content type
    if (!adapterManager.hasAdapter(item.contentType)) {
      return res.status(400).json({
        error: `No adapter configured for contentType: ${item.contentType}`,
        message: item.contentType === 'software'
          ? 'Software ingestion not yet implemented'
          : `${item.contentType} requires additional configuration`
      });
    }
  }

  try {
    const queuedCount = await batchProcessor.queueItems(items);

    res.json({
      success: true,
      queued: queuedCount,
      message: `Successfully queued ${queuedCount} items for ingestion`
    });
  } catch (error) {
    console.error('Error queuing items:', error);
    res.status(500).json({ error: 'Failed to queue items' });
  }
});

/**
 * POST /api/admin/ingestion/requeue-failed - Re-queue failed items
 */
router.post('/requeue-failed', async (req, res) => {
  try {
    const requeuedCount = await batchProcessor.requeueFailed();

    res.json({
      success: true,
      requeued: requeuedCount,
      message: `Successfully re-queued ${requeuedCount} failed items`
    });
  } catch (error) {
    console.error('Error re-queuing failed items:', error);
    res.status(500).json({ error: 'Failed to re-queue items' });
  }
});

/**
 * POST /api/admin/ingestion/process - Trigger batch processing
 */
router.post('/process', async (req, res) => {
  const maxBatches = parseInt(req.body.maxBatches) || 1;

  if (batchProcessor.isCurrentlyProcessing()) {
    return res.status(409).json({
      error: 'Processing already in progress',
      message: 'Another batch is currently being processed'
    });
  }

  try {
    // Start processing asynchronously
    batchProcessor.processAll(maxBatches).catch(error => {
      console.error('Batch processing error:', error);
    });

    res.json({
      success: true,
      message: `Started processing up to ${maxBatches} batch(es)`
    });
  } catch (error) {
    console.error('Error starting batch processing:', error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
});

export default router;
