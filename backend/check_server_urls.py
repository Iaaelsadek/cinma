import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set")
    # Try to read directly from .env if load_dotenv failed or vars have different names
    print("Debug: Env vars found:", list(os.environ.keys()))
    exit(1)

supabase: Client = create_client(url, key)

response = supabase.table("quran_reciters").select("name, server").eq("is_active", True).execute()
reciters = response.data

import sys

# Set encoding to utf-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

print(f"Found {len(reciters)} active reciters.")
for r in reciters:
    server = r.get('server')
    if server:
        print(f"Name: {r['name']}, Server: {server}")
    else:
        print(f"Name: {r['name']}, Server: NONE")
