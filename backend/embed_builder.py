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

def build_embed_for_all(limit=100):
    """Generates and updates embed links for all content without links or needing update."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials missing.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. Movies
        print(f"Building embed links for up to {limit} movies...")
        # Check both NULL and empty object
        movies = supabase.table('movies').select('id').or_('embed_links.is.null,embed_links.eq.{}').limit(limit).execute()
        
        for movie in movies.data:
            links = build_embed_urls(movie['id'], 'movie')
            if links:
                supabase.table('movies').update({'embed_links': links}).eq('id', movie['id']).execute()
                print(f"Updated links for movie {movie['id']}")
                
        # 2. Episodes
        print(f"Building embed links for up to {limit} episodes...")
        episodes = supabase.table('episodes').select('id, season_id, episode_number').or_('embed_links.is.null,embed_links.eq.{}').limit(limit).execute()
             
        for ep in episodes.data:
            # Need series ID and season number. Fetch season -> series
            season_data = supabase.table('seasons').select('season_number, series_id').eq('id', ep['season_id']).maybe_single().execute()
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
