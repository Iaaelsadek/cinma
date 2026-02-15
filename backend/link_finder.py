import requests
import asyncio
import aiohttp
from typing import Dict, List, Optional

class LinkFinder:
    def __init__(self):
        self.sources = {
            'vidsrc': 'https://vidsrc.to/embed/{type}/{id}',
            '2embed': 'https://www.2embed.cc/embed/{id}', # Requires special handling for TV
            'embed_su': 'https://embed.su/embed/{type}/{id}',
            'autoembed': 'https://autoembed.to/{type}/tmdb/{id}'
        }

    def generate_links(self, tmdb_id: int, content_type: str = 'movie', season: int = 1, episode: int = 1) -> Dict[str, str]:
        """Generates embed links based on patterns."""
        links = {}
        
        # vidsrc
        if content_type == 'movie':
            links['vidsrc'] = f"https://vidsrc.to/embed/movie/{tmdb_id}"
        else:
            links['vidsrc'] = f"https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}"

        # 2embed
        if content_type == 'movie':
            links['2embed'] = f"https://www.2embed.cc/embed/{tmdb_id}"
        else:
            links['2embed'] = f"https://www.2embed.cc/embed/tv/{tmdb_id}&s={season}&e={episode}"

        # embed_su
        if content_type == 'movie':
            links['embed_su'] = f"https://embed.su/embed/movie/{tmdb_id}"
        else:
            links['embed_su'] = f"https://embed.su/embed/tv/{tmdb_id}/{season}/{episode}"
            
        return links

    async def check_link(self, session, name: str, url: str) -> Optional[Dict]:
        """Checks if a link is reachable (HEAD request)."""
        try:
            async with session.head(url, timeout=5, allow_redirects=True) as response:
                return {
                    'source': name,
                    'url': url,
                    'status': response.status,
                    'active': 200 <= response.status < 400
                }
        except Exception as e:
            return {
                'source': name,
                'url': url,
                'status': 0,
                'active': False,
                'error': str(e)
            }

    async def check_all_links(self, links: Dict[str, str]) -> Dict[str, bool]:
        """Checks all generated links concurrently."""
        results = {}
        async with aiohttp.ClientSession() as session:
            tasks = [self.check_link(session, name, url) for name, url in links.items()]
            checked = await asyncio.gather(*tasks)
            
            for res in checked:
                if res['active']:
                    results[res['source']] = res['url']
        
        return results

if __name__ == "__main__":
    # Test
    finder = LinkFinder()
    links = finder.generate_links(550, 'movie') # Fight Club
    print(f"Generated: {links}")
    
    # Run async check
    active = asyncio.run(finder.check_all_links(links))
    print(f"Active: {active}")
