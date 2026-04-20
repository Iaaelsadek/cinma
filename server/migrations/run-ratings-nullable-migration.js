#!/usr/bin/env node
/**
 * Migration: Make vote_average and vote_count nullable in games and software tables
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1-14.8
 * Idempotent: safe to run multiple times
 *
 * Usage: node server/migrations/run-ratings-nullable-migration.js
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const COCKROACHDB_URL = process.env.COCKROACHDB_URL;

if (!COCKROACHDB_URL) {
  console.error('❌ COCKROACHDB_URL not set in environment');
  process.exit(1);
}

const migrations = [
  {
    name: 'games.vote_average DROP NOT NULL',
    sql: 'ALTER TABLE games ALTER COLUMN vote_average DROP NOT NULL'
  },
  {
    name: 'games.vote_count DROP NOT NULL',
    sql: 'ALTER TABLE games ALTER COLUMN vote_count DROP NOT NULL'
  },
  {
    name: 'software.vote_average DROP NOT NULL',
    sql: 'ALTER TABLE software ALTER COLUMN vote_average DROP NOT NULL'
  },
  {
    name: 'software.vote_count DROP NOT NULL',
    sql: 'ALTER TABLE software ALTER COLUMN vote_count DROP NOT NULL'
  }
];

async function runMigration() {
  const pool = new Pool({
    connectionString: COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
  });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  try {
    console.log('🔗 Connecting to CockroachDB...');
    const client = await pool.connect();
    console.log('✅ Connected\n');

    for (const migration of migrations) {
      try {
        console.log(`  ⏳ Running: ${migration.name}`);
        await client.query(migration.sql);
        console.log(`  ✅ Done: ${migration.name}`);
        success++;
      } catch (err) {
        // CockroachDB returns "column is already nullable" or similar if already done
        if (
          err.message.includes('already nullable') ||
          err.message.includes('does not exist') ||
          err.message.includes('column') && err.message.includes('nullable')
        ) {
          console.log(`  ⏭️  Skipped (already nullable): ${migration.name}`);
          skipped++;
        } else {
          console.error(`  ❌ Failed: ${migration.name} - ${err.message}`);
          failed++;
          // Don't throw - try remaining migrations
        }
      }
    }

    client.release();

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Applied: ${success}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed:  ${failed}`);

    if (failed > 0) {
      console.error('\n❌ Migration completed with errors');
      process.exit(1);
    }

    // Verify schema changes
    console.log('\n🔍 Verifying schema changes...');
    const verifyClient = await pool.connect();
    try {
      const result = await verifyClient.query(`
        SELECT table_name, column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name IN ('games', 'software')
          AND column_name IN ('vote_average', 'vote_count')
        ORDER BY table_name, column_name
      `);

      console.log('\n   Table          | Column        | Nullable');
      console.log('   ---------------+---------------+---------');
      for (const row of result.rows) {
        const nullable = row.is_nullable === 'YES' ? '✅ YES' : '❌ NO';
        console.log(`   ${row.table_name.padEnd(15)}| ${row.column_name.padEnd(15)}| ${nullable}`);
      }

      const allNullable = result.rows.every(r => r.is_nullable === 'YES');
      if (allNullable) {
        console.log('\n✨ All rating columns are now nullable - migration successful!');
      } else {
        console.warn('\n⚠️  Some columns may not be nullable yet - check output above');
      }
    } finally {
      verifyClient.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Connection closed');
  }
}

runMigration();
