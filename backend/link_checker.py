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

# Embed Patterns for re-discovery
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

class LinkChecker:
    def __init__(self):
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.supabase = None
            print("Warning: Supabase credentials missing")

    async def check_url(self, session, url, source, content_id, content_type, season=None, episode=None, retries=2):
        """Check a single URL with retries."""
        for attempt in range(retries + 1):
            try:
                start = datetime.now()
                # Use GET with range 0-0 for better compatibility with some hosts than HEAD
                headers = {'Range': 'bytes=0-0'}
                async with session.get(url, timeout=10, allow_redirects=True, headers=headers) as response:
                    end = datetime.now()
                    response_time = (end - start).total_seconds() * 1000 # ms
                    
                    # Some hosts return 206 for Range requests
                    status = response.status
                    
                    res = {
                        'content_id': content_id,
                        'content_type': content_type,
                        'source_name': source,
                        'url': url,
                        'status_code': status,
                        'response_time_ms': int(response_time),
                        'checked_at': datetime.now().isoformat()
                    }
                    
                    if season: res['season_number'] = season
                    if episode: res['episode_number'] = episode

                    if status in [200, 206, 301, 302]:
                        return res
                    
                    if attempt < retries:
                        await asyncio.sleep(1)
                        continue

                    return res
            except Exception as e:
                if attempt < retries:
                    await asyncio.sleep(1)
                    continue
                
                res = {
                    'content_id': content_id,
                    'content_type': content_type,
                    'source_name': source,
                    'url': url,
                    'status_code': 0,
                    'response_time_ms': 0,
                    'error': str(e),
                    'checked_at': datetime.now().isoformat()
                }
                
                if season: res['season_number'] = season
                if episode: res['episode_number'] = episode
                
                return res

    async def _process_batch(self, session, items, content_type):
        """Process a batch of content items."""
        tasks = []
        for item in items:
            if item.get('embed_links'):
                for source, url in item['embed_links'].items():
                    tasks.append(self.check_url(session, url, source, item['id'], content_type))
        
        if not tasks:
            return []
            
        print(f"Checking {len(tasks)} links for {content_type}...")
        # Run in smaller chunks to avoid rate limiting
        chunk_size = 10
        all_results = []
        for i in range(0, len(tasks), chunk_size):
            chunk = tasks[i:i + chunk_size]
            results = await asyncio.gather(*chunk)
            all_results.extend(results)
            await asyncio.sleep(0.5) # Anti-ban delay
            
        return all_results

    async def _update_db(self, results, table_name):
        """Update database with check results."""
        for result in results:
            try:
                # Log to link_checks table
                insert_data = {
                    'content_id': result['content_id'],
                    'content_type': result['content_type'],
                    'source_name': result['source_name'],
                    'url': result['url'],
                    'status_code': result['status_code'],
                    'response_time_ms': result['response_time_ms'],
                    'checked_at': result['checked_at']
                }
                
                # Add season/episode for TV content
                if result.get('season_number'):
                    insert_data['season_number'] = result['season_number']
                if result.get('episode_number'):
                    insert_data['episode_number'] = result['episode_number']
                
                self.supabase.table('link_checks').insert(insert_data).execute()

                # If link is broken (0 or 4xx/5xx except some exclusions)
                is_broken = result['status_code'] not in [200, 206, 301, 302, 403] # 403 sometimes just blocks head/range
                
                if is_broken and result['status_code'] != 0: # Only remove if we got a definitive bad status
                    print(f"Broken link found: {result['url']} ({result['status_code']})")
                    data = self.supabase.table(table_name).select('embed_links').eq('id', result['content_id']).single().execute()
                    if data.data:
                        links = data.data.get('embed_links', {})
                        if result['source_name'] in links:
                            del links[result['source_name']]
                            self.supabase.table(table_name).update({
                                'embed_links': links,
                                'last_checked': datetime.now().isoformat()
                            }).eq('id', result['content_id']).execute()
                else:
                    # Update last_checked timestamp
                    self.supabase.table(table_name).update({
                        'last_checked': datetime.now().isoformat()
                    }).eq('id', result['content_id']).execute()
            except Exception as e:
                print(f"Error updating DB for {result['url']}: {e}")

    async def check_delta_links(self):
        if not self.supabase: return
        print("Starting optimized delta link check...")
        day_ago = (datetime.now() - timedelta(days=1)).isoformat()
        
        async with aiohttp.ClientSession(headers={'User-Agent': 'Mozilla/5.0'}) as session:
            # Check new or previously broken movies
            try:
                movies = self.supabase.table('movies').select('id, embed_links').or_('last_checked.is.null,last_checked.is.null').limit(20).execute()
                if movies.data:
                    results = await self._process_batch(session, movies.data, 'movie')
                    await self._update_db(results, 'movies')
            except Exception as e:
                print(f"Error in movie delta: {e}")

            # Check new or previously broken series
            try:
                series = self.supabase.table('tv_series').select('id, embed_links').or_('last_checked.is.null,last_checked.is.null').limit(20).execute()
                if series.data:
                    results = await self._process_batch(session, series.data, 'tv')
                    await self._update_db(results, 'tv_series')
            except Exception as e:
                print(f"Error in series delta: {e}")

            # Check new or previously broken episodes
            try:
                # Join with seasons to get series_id and season_number
                episodes = self.supabase.table('episodes').select('id, embed_links, season_id, episode_number').or_('last_checked.is.null,last_checked.is.null').limit(20).execute()
                if episodes.data:
                    tasks = []
                    for ep in episodes.data:
                        if ep.get('embed_links'):
                            season_data = self.supabase.table('seasons').select('season_number, series_id').eq('id', ep['season_id']).maybe_single().execute()
                            if season_data.data:
                                series_id = season_data.data['series_id']
                                season_num = season_data.data['season_number']
                                for source, url in ep['embed_links'].items():
                                    tasks.append(self.check_url(session, url, source, series_id, 'tv', season=season_num, episode=ep['episode_number']))
                    
                    if tasks:
                        results = await asyncio.gather(*tasks)
                        await self._update_db(results, 'episodes')
            except Exception as e:
                print(f"Error in episode delta: {e}")

    async def check_all_links(self):
        """Check all movie and series links in the database."""
        # ... existing check_all_links code ...
        pass

    def build_embed_urls(self, tmdb_id, media_type='movie', season=None, episode=None):
        """Builds potential embed links from all known patterns."""
        urls = {}
        for source, patterns in EMBED_PATTERNS.items():
            try:
                if media_type == 'movie':
                    url = patterns['movie'].format(id=tmdb_id)
                else:
                    if season is None or episode is None:
                        continue
                    url = patterns['tv'].format(id=tmdb_id, season=season, episode=episode)
                urls[source] = url
            except Exception:
                continue
        return urls

    async def recover_dead_content(self, limit=20):
        """Finds dead content (no working links) and tries to re-discover working servers."""
        if not self.supabase: return
        print(f"Attempting to recover dead content (Limit: {limit})...")
        
        async with aiohttp.ClientSession(headers={'User-Agent': 'Mozilla/5.0'}) as session:
            # 1. Recover Movies (marked as dead or with empty links)
            # Sort by last_checked ASC to handle "old to new"
            movies = self.supabase.table('movies').select('id, embed_links, last_checked').or_('embed_links.is.null,embed_links.eq.{}').order('last_checked', nulls_first=True).limit(limit).execute()
            
            if movies.data:
                for movie in movies.data:
                    potential_links = self.build_embed_urls(movie['id'], 'movie')
                    if potential_links:
                        print(f"Checking {len(potential_links)} potential links for dead movie {movie['id']}...")
                        results = []
                        for source, url in potential_links.items():
                            res = await self.check_url(session, url, source, movie['id'], 'movie')
                            results.append(res)
                        
                        # Find working links
                        working_links = {}
                        for r in results:
                            if r['status_code'] in [200, 206, 301, 302, 403]:
                                working_links[r['source_name']] = r['url']
                        
                        if working_links:
                            print(f"SUCCESS: Recovered {len(working_links)} links for movie {movie['id']}! Unhiding...")
                            self.supabase.table('movies').update({
                                'embed_links': working_links,
                                'last_checked': datetime.now().isoformat()
                            }).eq('id', movie['id']).execute()
                        else:
                            # Update last_checked so we don't keep retrying the same ones every time
                            self.supabase.table('movies').update({
                                'last_checked': datetime.now().isoformat()
                            }).eq('id', movie['id']).execute()

            # 2. Recover Series Episodes (same logic)
            episodes = self.supabase.table('episodes').select('id, season_id, episode_number, embed_links, last_checked').or_('embed_links.is.null,embed_links.eq.{}').order('last_checked', nulls_first=True).limit(limit).execute()
            
            if episodes.data:
                for ep in episodes.data:
                    # Get series ID and season number
                    season_data = self.supabase.table('seasons').select('season_number, series_id').eq('id', ep['season_id']).maybe_single().execute()
                    if season_data.data:
                        series_id = season_data.data['series_id']
                        season_num = season_data.data['season_number']
                        
                        potential_links = self.build_embed_urls(series_id, 'tv', season_num, ep['episode_number'])
                        if potential_links:
                            results = []
                            for source, url in potential_links.items():
                                res = await self.check_url(session, url, source, ep['id'], 'tv', season=season_num, episode=ep['episode_number'])
                                results.append(res)
                            
                            working_links = {}
                            for r in results:
                                if r['status_code'] in [200, 206, 301, 302, 403]:
                                    working_links[r['source_name']] = r['url']
                            
                            if working_links:
                                print(f"SUCCESS: Recovered {len(working_links)} links for episode {ep['id']}!")
                                self.supabase.table('episodes').update({
                                    'embed_links': working_links,
                                    'last_checked': datetime.now().isoformat()
                                }).eq('id', ep['id']).execute()
                            else:
                                self.supabase.table('episodes').update({
                                    'last_checked': datetime.now().isoformat()
                                }).eq('id', ep['id']).execute()

async def main():
    checker = LinkChecker()
    # 1. Check existing links to identify new broken content
    await checker.check_delta_links()
    # 2. Try to recover dead content (search for new working servers)
    await checker.recover_dead_content(limit=20)

if __name__ == "__main__":
    asyncio.run(main())
