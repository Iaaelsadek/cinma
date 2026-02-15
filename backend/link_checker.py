import asyncio
import aiohttp
from supabase import create_client, Client
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class LinkChecker:
    def __init__(self):
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.supabase = None
            print("Warning: Supabase credentials missing")

    async def check_url(self, session, url, source, content_id, content_type):
        """Check a single URL."""
        try:
            start = datetime.now()
            async with session.head(url, timeout=5, allow_redirects=True) as response:
                end = datetime.now()
                response_time = (end - start).total_seconds() * 1000 # ms
                
                return {
                    'content_id': content_id,
                    'content_type': content_type,
                    'source_name': source,
                    'url': url,
                    'status_code': response.status,
                    'response_time_ms': int(response_time),
                    'checked_at': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'content_id': content_id,
                'content_type': content_type,
                'source_name': source,
                'url': url,
                'status_code': 0,
                'response_time_ms': 0,
                'error': str(e),
                'checked_at': datetime.now().isoformat()
            }

    async def check_delta_links(self):
        if not self.supabase:
            return
        print("Starting delta link check...")
        day_ago = (datetime.now() - timedelta(days=1)).isoformat()
        try:
            import aiohttp
        except Exception:
            pass
        async with aiohttp.ClientSession() as session:
            try:
                movies_new = self.supabase.table('movies').select('id, embed_links').or_('last_checked.is.null,last_checked.is.null').limit(50).execute()
                broken_m = self.supabase.table('link_checks').select('content_id').eq('content_type', 'movie').gte('checked_at', day_ago).or_('status_code.lt.200,status_code.gte.400').execute()
                ids = set()
                rows = []
                for m in (movies_new.data or []):
                    ids.add(m['id'])
                    rows.append(m)
                if broken_m.data:
                    broken_ids = list({r['content_id'] for r in broken_m.data if r.get('content_id') is not None})
                    if broken_ids:
                        broken_rows = self.supabase.table('movies').select('id, embed_links').in_('id', broken_ids).limit(50).execute()
                        for r in (broken_rows.data or []):
                            if r['id'] not in ids:
                                ids.add(r['id'])
                                rows.append(r)
                if rows:
                    print(f"Checking {len(rows)} movies (delta)...")
                    tasks = []
                    for mv in rows:
                        if mv.get('embed_links'):
                            for source, url in mv['embed_links'].items():
                                tasks.append(self.check_url(session, url, source, mv['id'], 'movie'))
                    if tasks:
                        results = await asyncio.gather(*tasks)
                        for result in results:
                            self.supabase.table('link_checks').insert({
                                'content_id': result['content_id'],
                                'content_type': 'movie',
                                'source_name': result['source_name'],
                                'url': result['url'],
                                'status_code': result['status_code'],
                                'response_time_ms': result['response_time_ms'],
                                'checked_at': result['checked_at']
                            }).execute()
                            if result.get('status_code') not in [200, 301, 302]:
                                movie_data = self.supabase.table('movies').select('embed_links').eq('id', result['content_id']).single().execute()
                                if movie_data.data:
                                    embed_links = movie_data.data.get('embed_links', {})
                                    if result['source_name'] in embed_links:
                                        del embed_links[result['source_name']]
                                        self.supabase.table('movies').update({
                                            'embed_links': embed_links,
                                            'last_checked': datetime.now().isoformat()
                                        }).eq('id', result['content_id']).execute()
                            else:
                                self.supabase.table('movies').update({
                                    'last_checked': datetime.now().isoformat()
                                }).eq('id', result['content_id']).execute()
            except Exception as e:
                print(f"Error checking movies delta: {e}")
            try:
                series_new = self.supabase.table('tv_series').select('id, embed_links').or_('last_checked.is.null,last_checked.is.null').limit(50).execute()
                broken_t = self.supabase.table('link_checks').select('content_id').eq('content_type', 'tv').gte('checked_at', day_ago).or_('status_code.lt.200,status_code.gte.400').execute()
                ids_t = set()
                rows_t = []
                for t in (series_new.data or []):
                    ids_t.add(t['id'])
                    rows_t.append(t)
                if broken_t.data:
                    broken_ids_t = list({r['content_id'] for r in broken_t.data if r.get('content_id') is not None})
                    if broken_ids_t:
                        broken_rows_t = self.supabase.table('tv_series').select('id, embed_links').in_('id', broken_ids_t).limit(50).execute()
                        for r in (broken_rows_t.data or []):
                            if r['id'] not in ids_t:
                                ids_t.add(r['id'])
                                rows_t.append(r)
                if rows_t:
                    print(f"Checking {len(rows_t)} tv items (delta)...")
                    tasks_t = []
                    for tv in rows_t:
                        if tv.get('embed_links'):
                            for source, url in tv['embed_links'].items():
                                tasks_t.append(self.check_url(session, url, source, tv['id'], 'tv'))
                    if tasks_t:
                        results_t = await asyncio.gather(*tasks_t)
                        for result in results_t:
                            self.supabase.table('link_checks').insert({
                                'content_id': result['content_id'],
                                'content_type': 'tv',
                                'source_name': result['source_name'],
                                'url': result['url'],
                                'status_code': result['status_code'],
                                'response_time_ms': result['response_time_ms'],
                                'checked_at': result['checked_at']
                            }).execute()
                            if result.get('status_code') not in [200, 301, 302]:
                                tv_data = self.supabase.table('tv_series').select('embed_links').eq('id', result['content_id']).single().execute()
                                if tv_data.data:
                                    embed_links = tv_data.data.get('embed_links', {})
                                    if result['source_name'] in embed_links:
                                        del embed_links[result['source_name']]
                                        self.supabase.table('tv_series').update({
                                            'embed_links': embed_links,
                                            'last_checked': datetime.now().isoformat()
                                        }).eq('id', result['content_id']).execute()
                            else:
                                self.supabase.table('tv_series').update({
                                    'last_checked': datetime.now().isoformat()
                                }).eq('id', result['content_id']).execute()
            except Exception as e:
                print(f"Error checking tv delta: {e}")

    async def check_all_links(self):
        """Check all movie and series links in the database."""
        if not self.supabase:
            return

        print("Starting comprehensive link check...")
        
        # Fetch movies checked more than 7 days ago or never checked
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        # Movies
        try:
            movies = self.supabase.table('movies').select('id, embed_links').or_(f"last_checked.lt.{week_ago},last_checked.is.null").limit(50).execute()
            if not movies.data:
                print("No movies need checking.")
            else:
                print(f"Checking {len(movies.data)} movies...")
                
                async with aiohttp.ClientSession() as session:
                    tasks = []
                    for movie in movies.data:
                        if movie.get('embed_links'):
                            for source, url in movie['embed_links'].items():
                                tasks.append(self.check_url(session, url, source, movie['id'], 'movie'))
                    
                    if tasks:
                        results = await asyncio.gather(*tasks)
                        
                        # Process results
                        for result in results:
                            # Log check
                            self.supabase.table('link_checks').insert({
                                'content_id': result['content_id'],
                                'content_type': 'movie',
                                'source_name': result['source_name'],
                                'url': result['url'],
                                'status_code': result['status_code'],
                                'response_time_ms': result['response_time_ms'],
                                'checked_at': result['checked_at']
                            }).execute()

                            # If link is broken, remove it from movie
                            if result.get('status_code') not in [200, 301, 302]:
                                print(f"Broken link found: {result['url']} ({result['status_code']})")
                                # Fetch current movie data again to avoid race conditions (simplified here)
                                movie_data = self.supabase.table('movies').select('embed_links').eq('id', result['content_id']).single().execute()
                                if movie_data.data:
                                    embed_links = movie_data.data.get('embed_links', {})
                                    if result['source_name'] in embed_links:
                                        del embed_links[result['source_name']]
                                        self.supabase.table('movies').update({
                                            'embed_links': embed_links,
                                            'last_checked': datetime.now().isoformat()
                                        }).eq('id', result['content_id']).execute()
                            else:
                                # Update last_checked even if good
                                self.supabase.table('movies').update({
                                    'last_checked': datetime.now().isoformat()
                                }).eq('id', result['content_id']).execute()

        except Exception as e:
            print(f"Error checking movies: {e}")

if __name__ == "__main__":
    checker = LinkChecker()
    asyncio.run(checker.check_delta_links())
