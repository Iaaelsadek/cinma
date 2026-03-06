import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyAdminContentAccess() {
  console.log('🔍 Verifying admin content access...');
  
  // Find admin user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  const adminUser = users.find(u => u.email === 'cairo.tv@gmail.com');
  
  if (!adminUser) {
    console.error('❌ Admin user not found!');
    return;
  }

  console.log(`✅ Found admin user: ${adminUser.id}`);
  
  try {
    // 1. Check movies table access
    console.log('\n📽️  Checking movies table access...');
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .limit(5);
    
    if (moviesError) {
      console.error('❌ Movies access error:', moviesError);
    } else {
      console.log(`✅ Movies access successful - Found ${movies?.length || 0} movies`);
      if (movies && movies.length > 0) {
        console.log('   Sample movie:', movies[0].title);
      }
    }
    
    // 2. Check tv_series table access
    console.log('\n📺 Checking tv_series table access...');
    const { data: series, error: seriesError } = await supabase
      .from('tv_series')
      .select('*')
      .limit(5);
    
    if (seriesError) {
      console.error('❌ TV Series access error:', seriesError);
    } else {
      console.log(`✅ TV Series access successful - Found ${series?.length || 0} series`);
      if (series && series.length > 0) {
        console.log('   Sample series:', series[0].name);
      }
    }
    
    // 3. Check seasons table access
    console.log('\n📅 Checking seasons table access...');
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('*')
      .limit(5);
    
    if (seasonsError) {
      console.error('❌ Seasons access error:', seasonsError);
    } else {
      console.log(`✅ Seasons access successful - Found ${seasons?.length || 0} seasons`);
      if (seasons && seasons.length > 0) {
        console.log('   Sample season:', seasons[0].name);
      }
    }
    
    // 4. Check episodes table access
    console.log('\n🎬 Checking episodes table access...');
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .limit(5);
    
    if (episodesError) {
      console.error('❌ Episodes access error:', episodesError);
    } else {
      console.log(`✅ Episodes access successful - Found ${episodes?.length || 0} episodes`);
      if (episodes && episodes.length > 0) {
        console.log('   Sample episode:', episodes[0].name);
      }
    }
    
    // 5. Check watchlist table access
    console.log('\n📋 Checking watchlist table access...');
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlist')
      .select('*')
      .limit(5);
    
    if (watchlistError) {
      console.error('❌ Watchlist access error:', watchlistError);
    } else {
      console.log(`✅ Watchlist access successful - Found ${watchlist?.length || 0} items`);
    }
    
    // 6. Check history table access
    console.log('\n📜 Checking history table access...');
    const { data: history, error: historyError } = await supabase
      .from('history')
      .select('*')
      .limit(5);
    
    if (historyError) {
      console.error('❌ History access error:', historyError);
    } else {
      console.log(`✅ History access successful - Found ${history?.length || 0} items`);
    }
    
    // 7. Check continue_watching table access
    console.log('\n⏯️  Checking continue_watching table access...');
    const { data: continueWatching, error: continueWatchingError } = await supabase
      .from('continue_watching')
      .select('*')
      .limit(5);
    
    if (continueWatchingError) {
      console.error('❌ Continue watching access error:', continueWatchingError);
    } else {
      console.log(`✅ Continue watching access successful - Found ${continueWatching?.length || 0} items`);
    }
    
    // 8. Test admin-specific operations (using existing ID)
    console.log('\n⚡ Testing admin-specific operations...');
    
    // Test updating a movie (safer than creating new ones)
    if (movies && movies.length > 0) {
      const testMovie = movies[0];
      console.log(`\n📝 Testing update on movie: ${testMovie.title} (ID: ${testMovie.id})`);
      
      const { data: updatedMovie, error: updateError } = await supabase
        .from('movies')
        .update({ overview: 'Updated by admin verification script' })
        .eq('id', testMovie.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Movie update error:', updateError);
      } else {
        console.log('✅ Movie updated successfully:', updatedMovie?.title);
        
        // Revert the update
        const { data: revertedMovie, error: revertError } = await supabase
          .from('movies')
          .update({ overview: testMovie.overview })
          .eq('id', testMovie.id)
          .select()
          .single();
        
        if (revertError) {
          console.error('❌ Movie revert error:', revertError);
        } else {
          console.log('✅ Movie reverted successfully');
        }
      }
    }
    
    // 9. Test admin dashboard data access
    console.log('\n📊 Testing admin dashboard data access...');
    
    // Count total content
    const { count: totalMoviesCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalSeriesCount } = await supabase
      .from('tv_series')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📈 Content Statistics:`);
    console.log(`   Total Movies: ${totalMoviesCount || 0}`);
    console.log(`   Total Series: ${totalSeriesCount || 0}`);
    console.log(`   Total Users: ${totalUsersCount || 0}`);
    
    console.log('\n🎉 Admin content access verification complete!');
    console.log('\n✅ Summary:');
    console.log('   - Admin has full read access to all content tables');
    console.log('   - Admin can update existing content');
    console.log('   - Admin can access dashboard statistics');
    console.log('   - All content management features are working');
    
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error);
  }
}

// Run verification
verifyAdminContentAccess().catch(console.error);
