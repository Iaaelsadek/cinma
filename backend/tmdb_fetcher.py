import requests
import time
import os
import re
from typing import Dict, List, Optional
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
# import google.generativeai as genai
genai = None

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)

if GEMINI_API_KEY and genai:
    genai.configure(api_key=GEMINI_API_KEY)

class TMDBFetcher:
    def __init__(self):
        self.api_key = TMDB_API_KEY
        self.base_url = "https://api.themoviedb.org/3"
        
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.supabase = None
            print("Warning: Supabase credentials missing")

    def get_headers(self):
        return {
            "Authorization": f"Bearer {os.environ.get('TMDB_ACCESS_TOKEN')}", # Optional if using key in params
            "Content-Type": "application/json;charset=utf-8"
        }

    def generate_slug(self, title: str, item_id: int) -> str:
        """Generate a unique slug using Gemini, with fallback."""
        if not GEMINI_API_KEY:
            return self._fallback_slug(title, item_id)
            
        try:
            if not genai:
                 return self._fallback_slug(title, item_id)

            model = genai.GenerativeModel('gemini-pro')
            prompt = f"Create a clean, SEO-friendly URL slug for the movie/series title '{title}'. Return ONLY the slug (e.g., 'the-dark-knight'). No explanation."
            response = model.generate_content(prompt)
            slug = response.text.strip().lower().replace(' ', '-')
            # Basic validation
            if not re.match(r'^[a-z0-9-]+$', slug):
                return self._fallback_slug(title, item_id)
            return f"{slug}-{item_id}"
        except Exception as e:
            print(f"Gemini slug generation failed: {e}")
            return self._fallback_slug(title, item_id)

    def _fallback_slug(self, title: str, item_id: int) -> str:
        """Simple regex based slug generation."""
        slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
        slug = re.sub(r'[\s]+', '-', slug)
        return f"{slug}-{item_id}"

    def ensure_category(self, category_name: str):
        """Ensure category exists in the categories table."""
        if not self.supabase or not category_name:
            return

        try:
            # Check if exists
            res = self.supabase.table('categories').select('id').eq('name', category_name).execute()
            if res.data:
                return
            
            # Create if not exists
            # For Arabic categories, don't strip everything
            slug = re.sub(r'[\s]+', '-', category_name.strip().lower())
            if not slug:
                 slug = str(time.time()) # Fallback
            self.supabase.table('categories').insert({
                'name': category_name,
                'slug': slug
            }).execute()
            print(f"Created new category: {category_name}")
        except Exception as e:
            print(f"Error ensuring category {category_name}: {e}")

    def fetch_details(self, media_type: str, item_id: int) -> Optional[Dict]:
        """Fetch detailed information including release dates, videos, and credits."""
        url = f"{self.base_url}/{media_type}/{item_id}"
        params = {
            'api_key': self.api_key,
            'append_to_response': 'release_dates,videos,credits,external_ids',
            'language': 'ar-SA',
            'include_video_language': 'en,ar,null'
        }
        
        try:
            # First try Arabic
            resp = requests.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                
                # If overview is missing in Arabic, fallback to English
                if not data.get('overview'):
                    params['language'] = 'en-US'
                    en_resp = requests.get(url, params=params)
                    if en_resp.status_code == 200:
                        en_data = en_resp.json()
                        data['overview'] = en_data.get('overview')
                        data['tagline'] = en_data.get('tagline')
                
                return data
        except Exception as e:
            print(f"Error fetching details for {item_id}: {e}")
            
        return None

    def determine_rating_color(self, details: Dict) -> str:
        """Determine rating color based on US certification."""
        release_dates = details.get('release_dates', {}).get('results', [])
        
        # Look for US certification
        for rd in release_dates:
            if rd.get('iso_3166_1') == 'US':
                for release in rd.get('release_dates', []):
                    cert = release.get('certification', '')
                    if cert in ['G', 'PG']: return 'green'
                    if cert in ['PG-13', 'TV-14']: return 'yellow'
                    if cert in ['R', 'NC-17', 'TV-MA']: return 'red'
        
        # Fallback based on adult flag
        if details.get('adult'): return 'red'
        
        return 'yellow' # Default

    def _select_trailer(self, videos: List[Dict]) -> Optional[str]:
        vids = [v for v in videos if v.get('site') == 'YouTube']
        primary = [v for v in vids if v.get('type') == 'Trailer' and v.get('official') is True]
        if primary:
            return primary[0].get('key')
        secondary = [v for v in vids if v.get('type') in ['Trailer', 'Teaser']]
        if secondary:
            return secondary[0].get('key')
        if vids:
            return vids[0].get('key')
        return None

    def extract_trailer(self, details: Dict) -> Optional[str]:
        videos = details.get('videos', {}).get('results', [])
        return self._select_trailer(videos)

    def fetch_videos_direct(self, media_type: str, item_id: int) -> List[Dict]:
        url = f"{self.base_url}/{media_type}/{item_id}/videos"
        params = {
            'api_key': self.api_key,
            'language': 'ar-SA',
            'include_video_language': 'en,ar,null'
        }
        try:
            resp = requests.get(url, params=params)
            if resp.status_code == 200:
                return resp.json().get('results', [])
        except Exception:
            pass
        return []

    def process_item(self, item: Dict, media_type: str):
        """Process a single item and save to Supabase."""
        details = self.fetch_details(media_type, item['id'])
        if not details:
            return

        rating_color = self.determine_rating_color(details)
        trailer_key = self.extract_trailer(details)
        if not trailer_key:
            fallback_videos = self.fetch_videos_direct(media_type, item['id'])
            if fallback_videos:
                trailer_key = self._select_trailer(fallback_videos)
        trailer_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else None
        
        title = details.get('title') or details.get('name')
        slug = self.generate_slug(title, item['id'])
        
        genres = [g['name'] for g in details.get('genres', [])]
        main_category = genres[0] if genres else ('Movies' if media_type == 'movie' else 'TV Series')
        
        # Ensure category exists
        self.ensure_category(main_category)

        data = {
            'id': details['id'],
            'title': title,
            'slug': slug,
            'arabic_title': details.get('title') or details.get('name'), # Already fetched with ar-SA
            'overview': details.get('overview'),
            'poster_path': details.get('poster_path'),
            'backdrop_path': details.get('backdrop_path'),
            'release_date': details.get('release_date') or details.get('first_air_date'),
            'rating_color': rating_color,
            'trailer_url': trailer_url,
            'genres': genres,
            'category': main_category,
            'source': 'tmdb',
            'is_active': True,
            'updated_at': datetime.now().isoformat()
            # Note: embed_links logic is handled by master_engine or separate process
        }
        
        # Optional: Add OMDb data if IMDb ID exists
        imdb_id = details.get('external_ids', {}).get('imdb_id')
        if imdb_id:
             # This would be integrated if OMDbFetcher is initialized
             pass

        if self.supabase:
            table = 'movies' if media_type == 'movie' else 'tv_series'
            try:
                self.supabase.table(table).upsert(data).execute()
                print(f"✓ Processed {media_type}: {data['title']} | trailer_url={data.get('trailer_url') or '-'}")
            except Exception as e:
                print(f"✗ Error saving {media_type} {data['title']}: {e}")

    def fetch_trending(self, media_type: str = 'movie', pages: int = 5, start_page: int = 1, limit_per_page: Optional[int] = None):
        """Fetch trending content."""
        print(f"Starting fetch for trending {media_type}s...")
        
        for page in range(start_page, start_page + pages):
            url = f"{self.base_url}/{media_type}/popular"
            params = {
                'api_key': self.api_key,
                'language': 'ar-SA',
                'page': page,
                'region': 'SA' # Prioritize content popular in Saudi Arabia/MENA
            }
            
            try:
                resp = requests.get(url, params=params)
                if resp.status_code == 200:
                    results = resp.json().get('results', [])
                    if limit_per_page:
                        results = results[:limit_per_page]
                    print(f"Page {page}: Found {len(results)} items")
                    
                    for item in results:
                        self.process_item(item, media_type)
                        time.sleep(0.2) # Rate limiting
                else:
                    print(f"Error fetching page {page}: {resp.status_code}")
                    
            except Exception as e:
                print(f"Error in fetch loop: {e}")
            
            time.sleep(1) # Delay between pages

if __name__ == "__main__":
    fetcher = TMDBFetcher()
    # Test run
    fetcher.fetch_trending('movie', pages=1)
    fetcher.fetch_trending('tv', pages=1)
