import express from 'express'
import pkg from 'pg'
const { Pool } = pkg

const router = express.Router()

// Initialize CockroachDB pool
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

// GET /api/server-configs - Get all server configurations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM server_provider_configs
      ORDER BY priority ASC
    `)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching server configs:', error)
    res.status(500).json({ error: 'Failed to fetch server configurations' })
  }
})

// POST /api/server-configs - Create new server configuration
router.post('/', async (req, res) => {
  try {
    const {
      id, name, base, movie_template, tv_template,
      is_active, supports_movie, supports_tv, is_download, priority,
      locked_subtitle_lang
    } = req.body
    
    const result = await pool.query(`
      INSERT INTO server_provider_configs (
        id, name, base, movie_template, tv_template,
        is_active, supports_movie, supports_tv, is_download, priority,
        locked_subtitle_lang, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      id, name, base, movie_template, tv_template,
      is_active, supports_movie, supports_tv, is_download, priority,
      locked_subtitle_lang
    ])
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating server config:', error)
    res.status(500).json({ error: 'Failed to create server configuration' })
  }
})

// PUT /api/server-configs/:id - Update server configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name, base, movie_template, tv_template,
      is_active, supports_movie, supports_tv, is_download, priority,
      locked_subtitle_lang
    } = req.body
    
    const result = await pool.query(`
      UPDATE server_provider_configs
      SET name = $1, base = $2, movie_template = $3, tv_template = $4,
          is_active = $5, supports_movie = $6, supports_tv = $7, is_download = $8,
          priority = $9, locked_subtitle_lang = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      name, base, movie_template, tv_template,
      is_active, supports_movie, supports_tv, is_download, priority,
      locked_subtitle_lang, id
    ])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server configuration not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating server config:', error)
    res.status(500).json({ error: 'Failed to update server configuration' })
  }
})

// DELETE /api/server-configs/:id - Delete server configuration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(`
      DELETE FROM server_provider_configs
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server configuration not found' })
    }
    
    res.json({ message: 'Server configuration deleted successfully' })
  } catch (error) {
    console.error('Error deleting server config:', error)
    res.status(500).json({ error: 'Failed to delete server configuration' })
  }
})

// POST /api/server-configs/bulk-upsert - Bulk upsert server configurations
router.post('/bulk-upsert', async (req, res) => {
  try {
    const { configs } = req.body
    
    console.log('📥 Bulk upsert request received:', { configCount: configs?.length })
    
    if (!Array.isArray(configs) || configs.length === 0) {
      console.error('❌ Invalid configs array')
      return res.status(400).json({ error: 'Invalid configs array' })
    }
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      for (const config of configs) {
        console.log(`💾 Upserting config: ${config.id} - ${config.name}`)
        await client.query(`
          INSERT INTO server_provider_configs (
            id, name, base, movie_template, tv_template,
            is_active, supports_movie, supports_tv, is_download, priority,
            locked_subtitle_lang, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            base = EXCLUDED.base,
            movie_template = EXCLUDED.movie_template,
            tv_template = EXCLUDED.tv_template,
            is_active = EXCLUDED.is_active,
            supports_movie = EXCLUDED.supports_movie,
            supports_tv = EXCLUDED.supports_tv,
            is_download = EXCLUDED.is_download,
            priority = EXCLUDED.priority,
            locked_subtitle_lang = EXCLUDED.locked_subtitle_lang,
            updated_at = CURRENT_TIMESTAMP
        `, [
          config.id, config.name, config.base, config.movie_template, config.tv_template,
          config.is_active, config.supports_movie, config.supports_tv, config.is_download,
          config.priority, config.locked_subtitle_lang
        ])
      }
      
      await client.query('COMMIT')
      console.log('✅ Bulk upsert successful:', configs.length, 'configs')
      res.json({ message: 'Server configurations updated successfully', count: configs.length })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ Transaction error:', error)
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error bulk upserting server configs:', error.message)
    console.error('Stack:', error.stack)
    res.status(500).json({ 
      error: 'Failed to bulk upsert server configurations',
      details: error.message 
    })
  }
})

export default router
