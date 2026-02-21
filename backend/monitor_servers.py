import os
import time
import requests
import json
from supabase import create_client, Client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use Service Role Key for write access to the database
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[ERROR] Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# List of providers to monitor
# Using the same list as in useServers.ts
PROVIDERS = [
  { "id": 'vidsrc', "name": 'VidSrc (Primary)', "base": 'https://vidsrc.to' },
  { "id": 'vidsrc_me', "name": 'VidSrc Me', "base": 'https://vidsrc.me' },
  { "id": 'embed_su', "name": 'Embed.su', "base": 'https://embed.su' },
  { "id": 'vidsrc_pro', "name": 'VidSrc Pro', "base": 'https://vidsrc.pro' },
  { "id": 'vidsrc_vip', "name": 'VidSrc VIP', "base": 'https://vidsrc.vip' },
  { "id": 'vidsrc_xyz', "name": 'VidSrc XYZ', "base": 'https://vidsrc.xyz' },
  { "id": 'vidsrc_icu', "name": 'VidSrc ICU', "base": 'https://vidsrc.icu' },
  { "id": 'autoembed', "name": 'AutoEmbed', "base": 'https://autoembed.co' },
  { "id": 'vidsrc_cc', "name": 'VidSrc CC', "base": 'https://vidsrc.cc' },
  { "id": 'vidlink', "name": 'VidLink', "base": 'https://vidlink.pro' },
  { "id": 'superembed', "name": 'SuperEmbed', "base": 'https://superembed.stream' },
  { "id": 'smashystream', "name": 'SmashyStream', "base": 'https://embed.smashystream.com' },
  { "id": 'multiembed', "name": 'MultiEmbed', "base": 'https://multiembed.mov' },
  { "id": '2embed', "name": '2Embed', "base": 'https://www.2embed.cc' },
]

def check_server(provider):
    """Checks the health of a server by making a HEAD request."""
    url = provider['base']
    start_time = time.time()
    try:
        # Some servers block HEAD, so we use GET with stream=True to just get headers
        response = requests.get(url, timeout=5, stream=True)
        latency = int((time.time() - start_time) * 1000)
        
        if response.status_code < 500:
            return "online", latency
        else:
            return "degraded", latency
    except Exception as e:
        print(f"Error checking {provider['name']}: {e}")
        return "offline", None

def update_status():
    """Loops through providers and updates their status in Supabase."""
    print("Starting server health check...")
    
    for provider in PROVIDERS:
        status, latency = check_server(provider)
        print(f"[{provider['name']}] Status: {status}, Latency: {latency}ms")
        
        data = {
            "server_id": provider['id'],
            "name": provider['name'],
            "status": status,
            "latency": latency,
            "last_checked": time.strftime('%Y-%m-%dT%H:%M:%S%z'),
            "updated_at": time.strftime('%Y-%m-%dT%H:%M:%S%z')
        }
        
        try:
            # Upsert into server_status table
            # We use on_conflict='server_id' to update existing records
            supabase.table("server_status").upsert(data, on_conflict="server_id").execute()
        except Exception as e:
            print(f"[ERROR] Failed to update DB for {provider['name']}: {e}")

if __name__ == "__main__":
    update_status()
