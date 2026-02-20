import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://lhpuwupbhpcqkwqugkhh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database indexes for performance optimization
const indexes = [
  // Profiles table indexes
  {
    name: 'idx_profiles_role',
    table: 'profiles',
    columns: ['role'],
    description: 'Improve role-based queries'
  },
  {
    name: 'idx_profiles_username',
    table: 'profiles',
    columns: ['username'],
    description: 'Improve username search'
  },
  {
    name: 'idx_profiles_created_at',
    table: 'profiles',
    columns: ['created_at'],
    description: 'Improve date-based sorting'
  },
  
  // Movies table indexes
  {
    name: 'idx_movies_title',
    table: 'movies',
    columns: ['title'],
    description: 'Improve movie title search'
  },
  {
    name: 'idx_movies_popularity',
    table: 'movies',
    columns: ['popularity'],
    description: 'Improve popularity-based sorting'
  },
  {
    name: 'idx_movies_release_date',
    table: 'movies',
    columns: ['release_date'],
    description: 'Improve date-based filtering'
  },
  {
    name: 'idx_movies_status',
    table: 'movies',
    columns: ['status'],
    description: 'Improve status-based filtering'
  },
  
  // TV Series table indexes
  {
    name: 'idx_tv_series_name',
    table: 'tv_series',
    columns: ['name'],
    description: 'Improve series name search'
  },
  {
    name: 'idx_tv_series_popularity',
    table: 'tv_series',
    columns: ['popularity'],
    description: 'Improve popularity-based sorting'
  },
  {
    name: 'idx_tv_series_first_air_date',
    table: 'tv_series',
    columns: ['first_air_date'],
    description: 'Improve date-based filtering'
  },
  
  // Episodes table indexes
  {
    name: 'idx_episodes_series_id',
    table: 'episodes',
    columns: ['series_id'],
    description: 'Improve series episode queries'
  },
  {
    name: 'idx_episodes_season_episode',
    table: 'episodes',
    columns: ['season_number', 'episode_number'],
    description: 'Improve season/episode lookups'
  },
  
  // Watch history indexes
  {
    name: 'idx_watch_history_user_content',
    table: 'watch_history',
    columns: ['user_id', 'content_id', 'content_type'],
    description: 'Improve user content history queries'
  },
  {
    name: 'idx_watch_history_updated_at',
    table: 'watch_history',
    columns: ['updated_at'],
    description: 'Improve history sorting'
  },
  
  // Continue watching indexes
  {
    name: 'idx_continue_watching_user',
    table: 'continue_watching',
    columns: ['user_id'],
    description: 'Improve user continue watching queries'
  },
  {
    name: 'idx_continue_watching_updated_at',
    table: 'continue_watching',
    columns: ['updated_at'],
    description: 'Improve continue watching sorting'
  },
  
  // Watchlist indexes
  {
    name: 'idx_watchlist_user_content',
    table: 'watchlist',
    columns: ['user_id', 'content_id', 'content_type'],
    description: 'Improve watchlist lookups'
  },
  
  // Reviews indexes
  {
    name: 'idx_reviews_user_content',
    table: 'reviews',
    columns: ['user_id', 'content_id', 'content_type'],
    description: 'Improve review lookups'
  },
  {
    name: 'idx_reviews_content',
    table: 'reviews',
    columns: ['content_id', 'content_type'],
    description: 'Improve content review queries'
  },
  
  // Genres indexes
  {
    name: 'idx_genres_name',
    table: 'genres',
    columns: ['name'],
    description: 'Improve genre name search'
  },
  
  // Content genres indexes
  {
    name: 'idx_content_genres_content',
    table: 'content_genres',
    columns: ['content_id', 'content_type'],
    description: 'Improve content genre lookups'
  },
  {
    name: 'idx_content_genres_genre',
    table: 'content_genres',
    columns: ['genre_id'],
    description: 'Improve genre-based content queries'
  }
];

async function checkAndCreateIndexes() {
  console.log('🔍 Checking and creating database indexes for performance optimization...\n');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const index of indexes) {
    try {
      console.log(`📊 Processing: ${index.name}`);
      console.log(`📝 Description: ${index.description}`);
      
      // Check if index exists
      const { data: existingIndexes, error: checkError } = await supabase
        .rpc('pg_indexes_size', { indexname: index.name })
        .select();
      
      if (checkError) {
        console.log(`⚠️  Could not check index ${index.name}, attempting to create...`);
      }
      
      // Create index SQL
      const columns = index.columns.join(', ');
      const createIndexSQL = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table} (${columns});`;
      
      console.log(`🔧 SQL: ${createIndexSQL}`);
      
      // Try to create the index
      try {
        // For now, we'll log the SQL since we can't execute directly
        console.log(`✅ Index creation SQL logged: ${index.name}`);
        createdCount++;
      } catch (error) {
        console.log(`⚠️  Index ${index.name} might already exist or cannot be created: ${error.message}`);
        skippedCount++;
      }
      
      console.log(''); // Empty line for readability
      
    } catch (error) {
      console.error(`❌ Error processing index ${index.name}:`, error.message);
      skippedCount++;
      console.log('');
    }
  }
  
  console.log(`📈 Index creation summary:`);
  console.log(`✅ Indexes processed: ${createdCount}`);
  console.log(`⚠️  Indexes skipped: ${skippedCount}`);
  console.log(`📋 Total indexes: ${indexes.length}`);
  
  // Generate SQL script for manual execution
  const sqlScript = indexes.map(index => {
    const columns = index.columns.join(', ');
    return `-- ${index.description}
CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table} (${columns});`;
  }).join('\n\n');
  
  console.log('\n📝 SQL Script for manual execution:');
  console.log('--- START SQL SCRIPT ---');
  console.log(sqlScript);
  console.log('--- END SQL SCRIPT ---');
  
  // Save SQL script to file
  const scriptPath = path.join(process.cwd(), 'scripts', 'create_indexes.sql');
  await fs.writeFile(scriptPath, sqlScript);
  console.log(`\n💾 SQL script saved to: ${scriptPath}`);
}

// Run the optimization
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndCreateIndexes().catch(console.error);
}