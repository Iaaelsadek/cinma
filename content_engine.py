import os
import time
import requests
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()
# Load from environment variables or set directly
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY") 
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)
TMDB_API_KEY = os.environ.get("TMDB_API_KEY") or os.environ.get("VITE_TMDB_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not TMDB_API_KEY:
    print("ERROR: Missing Environment Variables.")
    print(f"URL: {SUPABASE_URL}, KEY: {SUPABASE_KEY[:5]}..., TMDB: {TMDB_API_KEY[:5]}...")
    exit(1)

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# TMDB Base URL
TMDB_BASE_URL = "https://api.themoviedb.org/3"

def fetch_tmdb(endpoint, params=None):
    """Helper to fetch data from TMDB."""
    if params is None:
        params = {}
    params['api_key'] = TMDB_API_KEY
    params['language'] = 'ar-SA' # Prefer Arabic metadata
    try:
        response = requests.get(f"{TMDB_BASE_URL}{endpoint}", params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
        print(f"Error fetching {endpoint}: {response.status_code}")
    except Exception as e:
        print(f"Exception fetching {endpoint}: {e}")
    return None

def process_movies(movie_list):
    """Process a list of TMDB movie objects."""
    for tmdb_movie in movie_list:
        tmdb_id = tmdb_movie['id']
        title = tmdb_movie.get('title')
        
        print(f"Processing Movie: {title} ({tmdb_id})...")

        # 1. Check if exists in Supabase
        try:
            existing = supabase.table('movies').select('id').eq('tmdb_id', tmdb_id).execute()
            if existing.data:
                print(f" -> Updating existing movie...")
                movie_id = existing.data[0]['id']
            else:
                print(f" -> Creating new movie...")
                movie_id = None
        except Exception as e:
            print(f"Error checking existence: {e}")
            continue

        # 2. Source Hunting
        vidsrc_url = f"https://vidsrc.xyz/embed/movie/{tmdb_id}"
        superembed_url = f"https://superembed.stream/movie/{tmdb_id}"
        
        valid_links = []
        valid_links.append({'name': 'VidSrc', 'url': vidsrc_url, 'quality': 'HD', 'is_active': True, 'media_type': 'movie'})
        valid_links.append({'name': 'SuperEmbed', 'url': superembed_url, 'quality': 'HD', 'is_active': True, 'media_type': 'movie'})

        # 3. Fetch details for extra fields
        details = fetch_tmdb(f"/movie/{tmdb_id}")
        if not details:
            details = tmdb_movie # Fallback

        # 4. Prepare Data
        movie_data = {
            'tmdb_id': tmdb_id,
            'title': title,
            'original_title': details.get('original_title') or tmdb_movie.get('original_title'),
            'overview': details.get('overview') or tmdb_movie.get('overview'),
            'poster_path': details.get('poster_path') or tmdb_movie.get('poster_path'),
            'backdrop_path': details.get('backdrop_path') or tmdb_movie.get('backdrop_path'),
            'release_date': details.get('release_date') or tmdb_movie.get('release_date'),
            'vote_average': details.get('vote_average') or tmdb_movie.get('vote_average'),
            'popularity': details.get('popularity') or tmdb_movie.get('popularity'),
            'origin_country': details.get('origin_country') or tmdb_movie.get('origin_country', []),
            'is_published': True
        }

        try:
            # Upsert Movie
            if movie_id:
                res = supabase.table('movies').update(movie_data).eq('id', movie_id).execute()
            else:
                res = supabase.table('movies').insert(movie_data).execute()
                if res.data:
                    movie_id = res.data[0]['id']
            
            print(f" -> Upsert successful for {title}")

            # 5. Insert Links (Optional: Check if links exist first to avoid duplicates)
            if movie_id:
                for link in valid_links:
                    link['movie_id'] = movie_id
                    # Simple upsert or insert logic for links could be added here
                    # For now, we skip to avoid complexity or duplicate key errors without proper checks
                    pass

        except Exception as e:
            print(f" -> Error upserting data: {e}")

def process_series(series_list):
    """Process a list of TMDB TV series objects."""
    for tmdb_show in series_list:
        tmdb_id = tmdb_show['id']
        name = tmdb_show.get('name')
        
        print(f"Processing Series: {name} ({tmdb_id})...")

        # 1. Check if exists
        try:
            existing = supabase.table('tv_series').select('id').eq('tmdb_id', tmdb_id).execute()
            if existing.data:
                print(f" -> Updating existing series...")
                series_id = existing.data[0]['id']
            else:
                print(f" -> Creating new series...")
                series_id = None
        except Exception as e:
            print(f"Error checking existence: {e}")
            continue

        # 2. Fetch details
        details = fetch_tmdb(f"/tv/{tmdb_id}")
        if not details:
            details = tmdb_show

        # 3. Prepare Data
        series_data = {
            'tmdb_id': tmdb_id,
            'name': name,
            'original_name': details.get('original_name') or tmdb_show.get('original_name'),
            'overview': details.get('overview') or tmdb_show.get('overview'),
            'poster_path': details.get('poster_path') or tmdb_show.get('poster_path'),
            'backdrop_path': details.get('backdrop_path') or tmdb_show.get('backdrop_path'),
            'first_air_date': details.get('first_air_date') or tmdb_show.get('first_air_date'),
            'vote_average': details.get('vote_average') or tmdb_show.get('vote_average'),
            'popularity': details.get('popularity') or tmdb_show.get('popularity'),
            'origin_country': details.get('origin_country') or tmdb_show.get('origin_country', []),
            'is_published': True
        }

        try:
            # Upsert Series
            if series_id:
                res = supabase.table('tv_series').update(series_data).eq('id', series_id).execute()
            else:
                res = supabase.table('tv_series').insert(series_data).execute()
            
            print(f" -> Upsert successful for {name}")

        except Exception as e:
            print(f" -> Error upserting data: {e}")

def run_engine():
    print("--- Starting Content Engine ---")
    
    # Phase 1: Trending Movies
    print("Fetching Trending Movies...")
    trending_movies = fetch_tmdb('/trending/movie/week')
    if trending_movies:
        process_movies(trending_movies.get('results', []))

    # Phase 2: Now Playing Movies
    print("Fetching Now Playing Movies...")
    now_playing = fetch_tmdb('/movie/now_playing')
    if now_playing:
        process_movies(now_playing.get('results', []))

    # Phase 3: Trending Series
    print("Fetching Trending Series...")
    trending_series = fetch_tmdb('/trending/tv/week')
    if trending_series:
        process_series(trending_series.get('results', []))

    # Phase 4: Arabic Content (Movies & Series)
    print("Fetching Arabic Content...")
    arabic_movies = fetch_tmdb('/discover/movie', {'with_original_language': 'ar', 'sort_by': 'popularity.desc'})
    if arabic_movies:
        process_movies(arabic_movies.get('results', []))
        
    arabic_series = fetch_tmdb('/discover/tv', {'with_original_language': 'ar', 'sort_by': 'popularity.desc'})
    if arabic_series:
        process_series(arabic_series.get('results', []))

    print("--- Cycle Complete ---")

if __name__ == "__main__":
    run_engine()
