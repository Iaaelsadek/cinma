/**
 * CockroachDB Connection Pool
 * 
 * Centralized database connection management for Cinema.online
 * 
 * CRITICAL: This connects to CockroachDB ONLY (not Supabase)
 * CockroachDB = Primary Database for ALL Content
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load .env files (only works locally, not in production)
dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.COCKROACHDB_URL;

if (!connectionString) {
  console.error('❌ COCKROACHDB_URL environment variable is not set');
  console.error('   Check .env.local or .env file');
  console.error('   In production (Koyeb), add it in Dashboard → Settings → Environment Variables');
  console.error('   Current env keys:', Object.keys(process.env).filter(k => k.includes('COCKROACH') || k.includes('DATABASE')));
  process.exit(1);
}

console.log('✅ COCKROACHDB_URL found:', connectionString.substring(0, 30) + '...');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Timeout for acquiring connection (increased to 30s)
  statement_timeout: 300000     // Query timeout 5 minutes (for complex ingestion operations)
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle CockroachDB client:', err);
  process.exit(-1);
});

// Log successful connection
pool.on('connect', () => {
  console.log('✅ CockroachDB connection established');
});

export default pool;
