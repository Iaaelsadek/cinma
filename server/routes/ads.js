/**
 * Ads Routes - CockroachDB
 * 
 * Handles all advertisement operations
 * Migrated from Supabase to CockroachDB (content data)
 */

import express from 'express';
import { pool } from '../db/cockroach.js';

const router = express.Router();

/**
 * GET /api/ads
 * Get all ads (optionally filtered by active status, type, or position)
 */
router.get('/', async (req, res) => {
  try {
    const { active, type, position } = req.query;
    
    let query = 'SELECT * FROM ads WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND active = $${paramCount}`;
      params.push(active === 'true');
      paramCount++;
    }

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (position) {
      query += ` AND position = $${paramCount}`;
      params.push(position);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

/**
 * GET /api/ads/:id
 * Get a single ad by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM ads WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
});

/**
 * POST /api/ads
 * Create a new ad
 * Requires admin authentication
 */
router.post('/', async (req, res) => {
  try {
    const { type, position, title, content, image_url, link_url, active } = req.body;

    // Validation
    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const result = await pool.query(
      `INSERT INTO ads (type, position, title, content, image_url, link_url, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type, position, title, content, image_url, link_url, active !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

/**
 * PUT /api/ads/:id
 * Update an existing ad
 * Requires admin authentication
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, position, title, content, image_url, link_url, active } = req.body;

    const result = await pool.query(
      `UPDATE ads 
       SET type = COALESCE($1, type),
           position = COALESCE($2, position),
           title = COALESCE($3, title),
           content = COALESCE($4, content),
           image_url = COALESCE($5, image_url),
           link_url = COALESCE($6, link_url),
           active = COALESCE($7, active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [type, position, title, content, image_url, link_url, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

/**
 * DELETE /api/ads/:id
 * Delete an ad
 * Requires admin authentication
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM ads WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({ message: 'Ad deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

/**
 * POST /api/ads/:id/impression
 * Increment impression count for an ad
 */
router.post('/:id/impression', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE ads 
       SET impressions = impressions + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING impressions`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({ impressions: result.rows[0].impressions });
  } catch (error) {
    console.error('Error incrementing impression:', error);
    res.status(500).json({ error: 'Failed to increment impression' });
  }
});

/**
 * POST /api/ads/:id/click
 * Increment click count for an ad
 */
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE ads 
       SET clicks = clicks + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING clicks`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json({ clicks: result.rows[0].clicks });
  } catch (error) {
    console.error('Error incrementing click:', error);
    res.status(500).json({ error: 'Failed to increment click' });
  }
});

export default router;
