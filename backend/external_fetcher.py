import yt_dlp
import requests
import json
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class ExternalContentFetcher:
    def __init__(self):
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.supabase = None
            print("Warning: Supabase credentials missing")

    def fetch_youtube_playlist(self, playlist_url, category='movies'):
        """Fetch videos from a YouTube playlist."""
        print(f"Fetching YouTube playlist: {playlist_url}")
        ydl_opts = {
            'quiet': True,
            'extract_flat': True,
            'force_generic_extractor': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(playlist_url, download=False)
                
                if 'entries' in info:
                    videos = []
                    for entry in info['entries'][:50]: # Limit to 50
                        # Skip if no title or id
                        if not entry.get('title') or not entry.get('id'):
                            continue

                        video_data = {
                            'id': entry.get('id'), # Use YT ID as ID? Or generate UUID?
                            'title': entry.get('title'),
                            'url': f"https://www.youtube.com/embed/{entry.get('id')}",
                            'thumbnail': f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg",
                            'views': entry.get('view_count', 0),
                            'duration': entry.get('duration'),
                            'category': category,
                            'created_at': datetime.now().isoformat(),
                            # Add year if available, or current year
                            'year': datetime.now().year 
                        }
                        videos.append(video_data)
                        
                        # Store in Supabase 'videos' table (assuming it exists for custom content)
                        if self.supabase:
                            try:
                                # Use upsert based on ID if possible, but videos table schema might use UUID
                                # We might need to adjust based on schema. 
                                # Assuming 'videos' table from initial setup has 'url' or 'id' as unique?
                                # Let's check schema. If 'id' is UUID, we can't force YT ID.
                                # But we can query by URL to check existence.
                                
                                # Simple check-then-insert logic for now
                                existing = self.supabase.table('videos').select('id').eq('url', video_data['url']).execute()
                                if not existing.data:
                                    self.supabase.table('videos').insert(video_data).execute()
                                    print(f"✓ Saved YouTube video: {video_data['title']}")
                                else:
                                    print(f"• Skipped existing: {video_data['title']}")
                            except Exception as e:
                                print(f"✗ Error saving {video_data['title']}: {e}")
                    
                    return videos
        except Exception as e:
            print(f"Error fetching YouTube playlist: {e}")
            return []

    def search_and_fetch_videos(self, query, category='video', limit=20):
        """Search YouTube and fetch videos."""
        print(f"Searching YouTube for: {query} ({category})")
        ydl_opts = {
            'quiet': True,
            'extract_flat': True,
            'force_generic_extractor': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # ytsearch{limit}:{query}
                search_query = f"ytsearch{limit}:{query}"
                info = ydl.extract_info(search_query, download=False)
                
                if 'entries' in info:
                    videos = []
                    for entry in info['entries']:
                        if not entry: continue
                        # Skip if no title or id
                        if not entry.get('title') or not entry.get('id'):
                            continue

                        video_data = {
                            'id': entry.get('id'),
                            'title': entry.get('title'),
                            'url': f"https://www.youtube.com/embed/{entry.get('id')}",
                            'thumbnail': f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg",
                            'views': entry.get('view_count', 0),
                            'duration': entry.get('duration'),
                            'category': category,
                            'created_at': datetime.now().isoformat(),
                            'year': datetime.now().year 
                        }
                        videos.append(video_data)
                        
                        if self.supabase:
                            try:
                                existing = self.supabase.table('videos').select('id').eq('url', video_data['url']).execute()
                                if not existing.data:
                                    self.supabase.table('videos').insert(video_data).execute()
                                    print(f"✓ Saved: {video_data['title']}")
                                else:
                                    print(f"• Skipped existing: {video_data['title']}")
                            except Exception as e:
                                print(f"✗ Error saving {video_data['title']}: {e}")
                    
                    return videos
        except Exception as e:
            print(f"Error searching YouTube: {e}")
            return []

    def fetch_archive_items(self, query='movie', max_results=50):
        """Fetch content from Internet Archive."""
        print(f"Fetching Archive.org items for query: {query}")
        url = "https://archive.org/advancedsearch.php"
        params = {
            'q': query,
            'fl[]': ['identifier', 'title', 'description', 'mediatype', 'year', 'downloads'],
            'sort[]': 'downloads desc',
            'rows': max_results,
            'page': 1,
            'output': 'json'
        }
        
        try:
            resp = requests.get(url, params=params).json()
            items = []
            for doc in resp.get('response', {}).get('docs', []):
                identifier = doc.get('identifier')
                if not identifier: continue

                item = {
                    'title': doc.get('title', 'Unknown Title'),
                    'description': doc.get('description'),
                    'year': int(doc.get('year')) if doc.get('year') and doc.get('year').isdigit() else None,
                    'url': f"https://archive.org/embed/{identifier}",
                    'thumbnail': f"https://archive.org/services/img/{identifier}",
                    'views': int(doc.get('downloads', 0)),
                    'category': 'classic', # Archive items are usually classics
                    'created_at': datetime.now().isoformat()
                }
                items.append(item)

                if self.supabase:
                    try:
                        # Check existence by URL
                        existing = self.supabase.table('videos').select('id').eq('url', item['url']).execute()
                        if not existing.data:
                            self.supabase.table('videos').insert(item).execute()
                            print(f"✓ Saved Archive item: {item['title']}")
                        else:
                            print(f"• Skipped existing: {item['title']}")
                    except Exception as e:
                        print(f"✗ Error saving {item['title']}: {e}")

            return items
        except Exception as e:
            print(f"Error fetching Archive items: {e}")
            return []

if __name__ == "__main__":
    fetcher = ExternalContentFetcher()
    
    # Example: Fetch Documentaries from YouTube (Official DW Documentary channel playlist)
    # DW Documentary: PL9D461D22F5875220
    # fetcher.fetch_youtube_playlist('https://www.youtube.com/playlist?list=PL9D461D22F5875220', 'documentary')
    
    # Example: Fetch Charlie Chaplin movies from Archive.org
    fetcher.fetch_archive_items('collection:(charlie_chaplin_movies)', max_results=10)
