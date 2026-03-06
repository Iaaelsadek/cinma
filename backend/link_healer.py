import asyncio
import os
import aiohttp
import json
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

# Providers to try for self-healing
PROVIDERS = [
    "https://vidsrc.to/embed/movie/{tmdb_id}",
    "https://vidsrc.me/embed/movie/{tmdb_id}",
    "https://www.2embed.cc/embed/{tmdb_id}",
    "https://autoembed.to/movie/tmdb/{tmdb_id}",
    "https://embed.su/embed/movie/{tmdb_id}"
]

PROVIDERS_TV = [
    "https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}",
    "https://vidsrc.me/embed/tv/{tmdb_id}/{season}/{episode}",
    "https://www.2embed.cc/embed/{tmdb_id}?s={season}&e={episode}",
    "https://autoembed.to/tv/tmdb/{tmdb_id}-{season}-{episode}",
    "https://embed.su/embed/tv/{tmdb_id}/{season}/{episode}"
]

async def check_url(session, url):
    try:
        async with session.head(url, timeout=5, allow_redirects=True) as response:
            return response.status == 200
    except:
        return False

async def find_alternative(session, media_type, tmdb_id, season=None, episode=None):
    providers = PROVIDERS if media_type == 'movie' else PROVIDERS_TV
    
    for template in providers:
        try:
            url = template.format(tmdb_id=tmdb_id, season=season, episode=episode)
            if await check_url(session, url):
                return url
        except Exception as e:
            print(f"Error checking provider {template}: {e}")
            continue
    return None

async def process_batch(batch):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for item in batch:
            tasks.append(heal_link(session, item))
        await asyncio.gather(*tasks)

async def heal_link(session, item):
    link_id = item['id']
    original_url = item['video_url']
    media_type = item.get('media_type', 'movie')
    tmdb_id = item.get('tmdb_id') # Assuming join or direct column
    
    # Check if original is working
    is_working = await check_url(session, original_url)
    
    if is_working:
        print(f"✅ Link {link_id} is working.")
        # Optional: Update last_checked timestamp
        return

    print(f"❌ Link {link_id} is broken. Attempting to heal...")
    
    # Try to find alternative if we have TMDB ID
    if tmdb_id:
        new_url = await find_alternative(session, media_type, tmdb_id, item.get('season'), item.get('episode'))
        
        if new_url:
            print(f"✨ Healed Link {link_id}: {new_url}")
            supabase.table('embed_links').update({
                'video_url': new_url,
                'status': 'active',
                'updated_at': 'now()'
            }).eq('id', link_id).execute()
        else:
            print(f"💀 Failed to heal Link {link_id}. Marking as broken.")
            supabase.table('embed_links').update({
                'status': 'broken',
                'updated_at': 'now()'
            }).eq('id', link_id).execute()
    else:
        print(f"⚠️  No TMDB ID for Link {link_id}, cannot heal automatically.")
        supabase.table('embed_links').update({
            'status': 'broken',
            'updated_at': 'now()'
        }).eq('id', link_id).execute()

async def main():
    print("Starting Link Healer...")
    
    # 1. Fetch links to check (active ones or those not checked recently)
    # We'll fetch a batch of 50 to avoid timeouts
    response = supabase.table('embed_links').select('*').eq('status', 'active').limit(50).execute()
    links = response.data
    
    if not links:
        print("No active links to check.")
        return

    print(f"Checking {len(links)} links...")
    await process_batch(links)
    print("Link Healer finished.")

if __name__ == "__main__":
    asyncio.run(main())
