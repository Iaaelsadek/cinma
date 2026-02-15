import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

EMBED_PATTERNS = {
    'vidsrc': {
        'movie': 'https://vidsrc.to/embed/movie/{id}',
        'tv': 'https://vidsrc.to/embed/tv/{id}/{season}/{episode}'
    },
    '2embed': {
        'movie': 'https://www.2embed.cc/embed/{id}',
        'tv': 'https://www.2embed.cc/embed/tv/{id}&s={season}&e={episode}'
    },
    'autoembed': {
        'movie': 'https://autoembed.to/movie/tmdb/{id}',
        'tv': 'https://autoembed.to/tv/tmdb/{id}-{season}x{episode}'
    },
    'embed_su': {
        'movie': 'https://embed.su/embed/movie/{id}',
        'tv': 'https://embed.su/embed/tv/{id}/{season}/{episode}'
    },
    'vidsrcme': {
        'movie': 'https://vidsrc.me/embed/{id}',
        'tv': 'https://vidsrc.me/embed/{id}/{season}-{episode}'
    },
    'moviesapi': {
        'movie': 'https://moviesapi.club/movie/{id}',
        'tv': 'https://moviesapi.club/tv/{id}-{season}x{episode}'
    }
}

def build_embed_urls(tmdb_id, media_type='movie', season=None, episode=None):
    """بناء روابط من جميع المصادر لفيلم/مسلسل معين"""
    urls = {}
    for source, patterns in EMBED_PATTERNS.items():
        try:
            if media_type == 'movie':
                url = patterns['movie'].format(id=tmdb_id)
            else:
                if season is None or episode is None:
                    continue # TV shows need season/episode
                url = patterns['tv'].format(id=tmdb_id, season=season, episode=episode)
            urls[source] = url
        except Exception as e:
            # print(f"Error building url for {source}: {e}")
            continue
    return urls

def build_embed_for_all():
    """Generates and updates embed links for all content without links or needing update."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials missing.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. Movies
        print("Building embed links for movies...")
        # Fetch movies with empty embed_links or NULL (or check limit 50 for demo)
        # Using a limit to avoid timeouts in this context, but in production could be paginated
        movies = supabase.table('movies').select('id').is_('embed_links', 'null').limit(100).execute()
        
        if not movies.data:
            # Check if empty object {}
            movies = supabase.table('movies').select('id').eq('embed_links', '{}').limit(100).execute()
            
        for movie in movies.data:
            links = build_embed_urls(movie['id'], 'movie')
            if links:
                supabase.table('movies').update({'embed_links': links}).eq('id', movie['id']).execute()
                print(f"Updated links for movie {movie['id']}")
                
        # 2. Episodes
        print("Building embed links for episodes...")
        episodes = supabase.table('episodes').select('id, season_id, episode_number').is_('embed_links', 'null').limit(100).execute()
        
        if not episodes.data:
             episodes = supabase.table('episodes').select('id, season_id, episode_number').eq('embed_links', '{}').limit(100).execute()
             
        for ep in episodes.data:
            # Need series ID and season number. Fetch season -> series
            season_data = supabase.table('seasons').select('season_number, series_id').eq('id', ep['season_id']).single().execute()
            if season_data.data:
                series_id = season_data.data['series_id']
                season_num = season_data.data['season_number']
                
                links = build_embed_urls(series_id, 'tv', season_num, ep['episode_number'])
                if links:
                    supabase.table('episodes').update({'embed_links': links}).eq('id', ep['id']).execute()
                    print(f"Updated links for episode {ep['id']}")

    except Exception as e:
        print(f"Error in build_embed_for_all: {e}")

if __name__ == "__main__":
    build_embed_for_all()
