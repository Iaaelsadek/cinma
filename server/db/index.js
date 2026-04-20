// server/db/index.js - Database connection re-export
// Re-exports from lib/db.js for backward compatibility
export { query, getPool, transaction, closePool } from '../lib/db.js'
