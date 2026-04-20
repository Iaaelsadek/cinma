/**
 * Settings Routes - CockroachDB
 * 
 * Handles all system settings operations (key-value store)
 * Migrated from Supabase to CockroachDB (content data)
 */

import express from 'express';
import { pool } from '../db/cockroach.js';

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings ORDER BY key ASC'
    );

    // Convert to key-value object for easier frontend consumption
    const settingsObject = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    res.json({
      settings: settingsObject,
      raw: result.rows // Also include raw array format
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * GET /api/settings/:key
 * Get a single setting by key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

/**
 * POST /api/settings
 * Create a new setting
 * Requires admin authentication
 */
router.post('/', async (req, res) => {
  try {
    const { key, value, description } = req.body;

    // Validation
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const result = await pool.query(
      `INSERT INTO settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = EXCLUDED.description,
           updated_at = NOW()
       RETURNING *`,
      [key, value, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

/**
 * PUT /api/settings/:key
 * Update an existing setting
 * Requires admin authentication
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const result = await pool.query(
      `UPDATE settings 
       SET value = COALESCE($1, value),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE key = $3
       RETURNING *`,
      [value, description, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * DELETE /api/settings/:key
 * Delete a setting
 * Requires admin authentication
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'DELETE FROM settings WHERE key = $1 RETURNING key',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully', key: result.rows[0].key });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

/**
 * POST /api/settings/bulk
 * Bulk update multiple settings at once
 * Requires admin authentication
 */
router.post('/bulk', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const results = [];
      
      for (const [key, value] of Object.entries(settings)) {
        const result = await client.query(
          `INSERT INTO settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value,
               updated_at = NOW()
           RETURNING *`,
          [key, value]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      
      res.json({
        message: 'Settings updated successfully',
        count: results.length,
        settings: results
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ error: 'Failed to bulk update settings' });
  }
});

export default router;
