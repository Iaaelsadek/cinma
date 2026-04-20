import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.turso' });

// CockroachDB connection
const cockroachPool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false }
});

// Turso connection
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function createTursoSchema() {
  console.log('\n📋 إنشاء Schema في Turso...\n');

  // Drop existing tables first to recreate with correct schema
  const tables = ['tv_cast', 'movie_cast', 'episodes', 'seasons', 'actors', 'tv_series', 'movies'];

  console.log('🗑️  حذف الجداول القديمة...');
  for (const table of tables) {
    try {
      await turso.execute(`DROP TABLE IF EXISTS ${table}`);
      console.log(`   ✅ ${table}`);
    } catch (err) {
      console.log(`   ⚠️  ${table}: ${err.message}`);
    }
  }

  console.log('\n📋 إنشاء الجداول الجديدة...\n');

  const schemaQueries = {
    movies: `
      CREATE TABLE movies (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        title_ar TEXT,
        title_original TEXT,
        overview TEXT,
        overview_ar TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        release_date TEXT,
        runtime INTEGER,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        genres TEXT,
        original_language TEXT,
        slug TEXT,
        primary_genre TEXT,
        keywords TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `,
    tv_series: `
      CREATE TABLE tv_series (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        name_original TEXT,
        overview TEXT,
        overview_ar TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        first_air_date TEXT,
        last_air_date TEXT,
        number_of_seasons INTEGER,
        number_of_episodes INTEGER,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        genres TEXT,
        language TEXT,
        original_language TEXT,
        slug TEXT,
        primary_genre TEXT,
        category TEXT,
        target_audience TEXT,
        keywords TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `,
    seasons: `
      CREATE TABLE seasons (
        id INTEGER PRIMARY KEY,
        series_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL,
        name TEXT,
        name_ar TEXT,
        overview TEXT,
        overview_ar TEXT,
        poster_path TEXT,
        air_date TEXT,
        episode_count INTEGER,
        created_at TEXT
      )
    `,
    episodes: `
      CREATE TABLE episodes (
        id INTEGER PRIMARY KEY,
        season_id INTEGER NOT NULL,
        series_id INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        name TEXT,
        name_ar TEXT,
        overview TEXT,
        overview_ar TEXT,
        still_path TEXT,
        air_date TEXT,
        runtime INTEGER,
        vote_average REAL,
        vote_count INTEGER,
        created_at TEXT
      )
    `,
    actors: `
      CREATE TABLE actors (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        biography TEXT,
        biography_ar TEXT,
        profile_path TEXT,
        birthday TEXT,
        place_of_birth TEXT,
        popularity REAL,
        slug TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `,
    movie_cast: `
      CREATE TABLE movie_cast (
        id INTEGER PRIMARY KEY,
        movie_id INTEGER NOT NULL,
        actor_id INTEGER NOT NULL,
        character_name TEXT,
        cast_order INTEGER,
        created_at TEXT
      )
    `,
    tv_cast: `
      CREATE TABLE tv_cast (
        id INTEGER PRIMARY KEY,
        series_id INTEGER NOT NULL,
        actor_id INTEGER NOT NULL,
        character_name TEXT,
        cast_order INTEGER,
        created_at TEXT
      )
    `
  };

  for (const [table, query] of Object.entries(schemaQueries)) {
    try {
      await turso.execute(query);
      console.log(`✅ ${table}`);
    } catch (err) {
      console.log(`⚠️  ${table}: ${err.message}`);
    }
  }
}

async function syncTable(tableName) {
  try {
    console.log(`\n📦 مزامنة: ${tableName}...`);

    // Get data from CockroachDB
    const result = await cockroachPool.query(`SELECT * FROM ${tableName}`);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log(`   ⚠️  فارغ`);
      return;
    }

    // Get Turso table schema ONCE (not in loop!)
    const schemaResult = await turso.execute(`PRAGMA table_info(${tableName})`);
    const tursoColumns = schemaResult.rows.map(r => r.name);
    console.log(`   📋 أعمدة: ${tursoColumns.join(', ')}`);

    // Clear Turso table
    await turso.execute(`DELETE FROM ${tableName}`);

    // Insert in batches
    const batchSize = 50;
    let synced = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      for (const row of batch) {
        // Filter only columns that exist in Turso
        const columns = Object.keys(row).filter(col => tursoColumns.includes(col));
        const values = columns.map(col => {
          const v = row[col];
          if (v === null) return null;
          if (Array.isArray(v)) return JSON.stringify(v);
          if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
          if (v instanceof Date) return v.toISOString();
          return v;
        });

        const placeholders = columns.map(() => '?').join(', ');

        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        try {
          await turso.execute({
            sql: query,
            args: values
          });
          synced++;
        } catch (err) {
          errors++;
          if (errors === 1) {
            console.log(`   ⚠️  خطأ: ${err.message}`);
          }
        }
      }

      // Progress
      if (i % 1000 === 0 && i > 0) {
        console.log(`   📊 ${synced.toLocaleString()} / ${rows.length.toLocaleString()}`);
      }
    }

    console.log(`   ✅ تم: ${synced.toLocaleString()} صف${errors > 0 ? ` (${errors} خطأ)` : ''}`);
  } catch (err) {
    console.error(`   ❌ خطأ: ${err.message}`);
  }
}

async function syncDatabase() {
  try {
    console.log('\n🔄 بدء المزامنة من CockroachDB إلى Turso...\n');
    console.log('═'.repeat(60));

    // Create schema first
    await createTursoSchema();

    console.log('\n═'.repeat(60));
    console.log('\n📊 مزامنة البيانات...');

    // Sync tables in order (respecting foreign keys)
    const syncOrder = [
      'movies',
      'tv_series',
      'actors',
      'seasons',
      'episodes',
      'movie_cast',
      'tv_cast'
    ];

    for (const table of syncOrder) {
      await syncTable(table);
    }

    console.log('\n═'.repeat(60));
    console.log('✅ اكتملت المزامنة بنجاح!\n');

    // Save sync metadata
    const metadata = {
      sync_date: new Date().toISOString(),
      source: 'CockroachDB',
      destination: 'Turso',
      tables: syncOrder
    };

    fs.writeFileSync(
      './turso-sync-metadata.json',
      JSON.stringify(metadata, null, 2)
    );

    await cockroachPool.end();
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    process.exit(1);
  }
}

syncDatabase();
