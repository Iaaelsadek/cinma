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

const TABLES = [
    'movies',
    'tv_series',
    'seasons',
    'episodes',
    'actors',
    'movie_cast',
    'tv_cast',
    'movie_genres',
    'tv_genres'
];

async function createTursoSchema() {
    console.log('\n📋 إنشاء Schema في Turso...\n');

    // Read schema from CockroachDB
    const schemaQueries = {
        movies: `
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        title_ar TEXT,
        title_original TEXT,
        slug TEXT UNIQUE NOT NULL,
        overview TEXT,
        overview_ar TEXT,
        release_date TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        runtime INTEGER,
        status TEXT,
        tagline TEXT,
        budget REAL,
        revenue REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
        tv_series: `
      CREATE TABLE IF NOT EXISTS tv_series (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        name_original TEXT,
        slug TEXT UNIQUE NOT NULL,
        overview TEXT,
        overview_ar TEXT,
        first_air_date TEXT,
        last_air_date TEXT,
        poster_path TEXT,
        backdrop_path TEXT,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        number_of_seasons INTEGER,
        number_of_episodes INTEGER,
        status TEXT,
        type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
        seasons: `
      CREATE TABLE IF NOT EXISTS seasons (
        id TEXT PRIMARY KEY,
        series_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL,
        name TEXT,
        name_ar TEXT,
        overview TEXT,
        overview_ar TEXT,
        air_date TEXT,
        episode_count INTEGER,
        poster_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES tv_series(id)
      )
    `,
        episodes: `
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL,
        episode_number INTEGER NOT NULL,
        name TEXT,
        name_ar TEXT,
        overview TEXT,
        overview_ar TEXT,
        air_date TEXT,
        runtime INTEGER,
        still_path TEXT,
        vote_average REAL,
        vote_count INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (season_id) REFERENCES seasons(id)
      )
    `,
        actors: `
      CREATE TABLE IF NOT EXISTS actors (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT,
        biography TEXT,
        biography_ar TEXT,
        birthday TEXT,
        deathday TEXT,
        place_of_birth TEXT,
        profile_path TEXT,
        popularity REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
        movie_cast: `
      CREATE TABLE IF NOT EXISTS movie_cast (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        actor_id INTEGER NOT NULL,
        character_name TEXT,
        cast_order INTEGER,
        FOREIGN KEY (movie_id) REFERENCES movies(id),
        FOREIGN KEY (actor_id) REFERENCES actors(id)
      )
    `,
        tv_cast: `
      CREATE TABLE IF NOT EXISTS tv_cast (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        actor_id INTEGER NOT NULL,
        character_name TEXT,
        cast_order INTEGER,
        FOREIGN KEY (series_id) REFERENCES tv_series(id),
        FOREIGN KEY (actor_id) REFERENCES actors(id)
      )
    `,
        movie_genres: `
      CREATE TABLE IF NOT EXISTS movie_genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        genre_id INTEGER NOT NULL,
        FOREIGN KEY (movie_id) REFERENCES movies(id)
      )
    `,
        tv_genres: `
      CREATE TABLE IF NOT EXISTS tv_genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        genre_id INTEGER NOT NULL,
        FOREIGN KEY (series_id) REFERENCES tv_series(id)
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

        // Clear Turso table
        await turso.execute(`DELETE FROM ${tableName}`);

        // Insert in batches
        const batchSize = 100;
        let synced = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            for (const row of batch) {
                const columns = Object.keys(row);
                const values = Object.values(row).map(v =>
                    v === null ? null :
                        typeof v === 'object' ? JSON.stringify(v) :
                            v
                );
                const placeholders = columns.map((_, idx) => `?`).join(', ');

                const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

                await turso.execute({
                    sql: query,
                    args: values
                });

                synced++;
            }

            // Progress
            if (i % 1000 === 0 && i > 0) {
                console.log(`   📊 ${synced.toLocaleString()} / ${rows.length.toLocaleString()}`);
            }
        }

        console.log(`   ✅ تم: ${synced.toLocaleString()} صف`);
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
            'tv_cast',
            'movie_genres',
            'tv_genres'
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
