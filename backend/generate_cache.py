import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PUBLIC_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

def generate_homepage_cache():
    print("Generating Homepage Cache...")
    
    cache_data = {}

    # 1. Latest Movies
    try:
        movies = supabase.table('movies').select('*').order('popularity', desc=True).limit(20).execute()
        cache_data['latest_movies'] = movies.data
    except Exception as e:
        print(f"Error fetching movies: {e}")
        cache_data['latest_movies'] = []

    # 2. Latest Series
    try:
        series = supabase.table('tv_series').select('*').order('popularity', desc=True).limit(20).execute()
        cache_data['latest_series'] = series.data
    except Exception as e:
        print(f"Error fetching series: {e}")
        cache_data['latest_series'] = []

    # 3. Trending (if table exists, otherwise use popularity from movies)
    # We'll just reuse top movies for trending for now to save complexity
    cache_data['trending'] = cache_data['latest_movies'][:10]

    # 4. Plays and Classics (for useFetchContent)
    try:
        plays = supabase.table('videos').select('*').eq('category', 'plays').order('created_at', desc=True).limit(20).execute()
        cache_data['plays'] = plays.data
    except Exception as e:
        print(f"Error fetching plays: {e}")

    try:
        # Classics logic: category=plays OR year < 2000 (simplified for cache to just old movies from videos table?)
        # Actually useClassicVideos uses: or(category.eq.plays,year.lt.2000)
        # Let's just fetch some old videos
        classics = supabase.table('videos').select('*').lt('year', 2000).order('created_at', desc=True).limit(20).execute()
        cache_data['classics'] = classics.data
    except Exception as e:
        print(f"Error fetching classics: {e}")

    # Write to JSON
    file_path = os.path.join(PUBLIC_DATA_DIR, 'homepage_cache.json')
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)
    
    print(f"Cache saved to {file_path}")

def generate_trending_cache():
    # Separate file for trending if needed, but homepage_cache covers it for now.
    pass

if __name__ == "__main__":
    generate_homepage_cache()
