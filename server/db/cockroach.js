// server/db/cockroach.js - CockroachDB connection re-export
// Re-exports from lib/db.js for backward compatibility
import { getPool as _getPool } from '../lib/db.js'

export { query, getPool, transaction, closePool } from '../lib/db.js'

// Export pool directly for files that use it
export const pool = _getPool()
