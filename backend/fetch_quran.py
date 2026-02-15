import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_reciters(limit: int = 200):
    urls = [
        "https://www.mp3quran.net/api/v3/reciters",
        "https://api.mp3quran.net/api/v3/reciters",
    ]
    last_err = None
    for url in urls:
        for _ in range(3):
            try:
                resp = requests.get(url, params={"language": "ar"}, timeout=60)
                resp.raise_for_status()
                data = resp.json()
                reciters = data.get("reciters") or []
                print(f"Fetched {len(reciters)} reciters from API")
                return reciters[:limit]
            except Exception as e:
                last_err = e
                print(f"Error fetching from {url}: {e}")
    if last_err:
        raise last_err
    return []

def categorize(item) -> str:
    # Basic categorization logic
    # We can use 'letter' or try to guess based on name
    letter = item.get("letter")
    if letter:
        return letter
    return "Others"

def insert_reciters(items):
    supabase = get_supabase()
    count = 0
    for item in items:
        # Extract moshaf info
        moshafs = item.get("moshaf", [])
        if not moshafs:
            print(f"Skipping {item.get('name')} - No moshaf found")
            continue
            
        # Try to find Hafs first (most common), otherwise take the first one
        selected_moshaf = moshafs[0]
        for m in moshafs:
            if "حفص" in m.get("name", ""):
                selected_moshaf = m
                break
        
        server = selected_moshaf.get("server")
        rewaya = selected_moshaf.get("name")
        surah_list = selected_moshaf.get("surah_list")
        
        if not server:
            print(f"Skipping {item.get('name')} - No server found")
            continue

        payload = {
            "id": item.get("id"),
            "name": item.get("name"),
            "rewaya": rewaya,
            "letter": item.get("letter"),
            "server": server,
            "surah_list": surah_list,
            "category": categorize(item),
            "is_active": True,
            "featured": False,
            # "image": None # API doesn't provide image, let frontend handle it
        }
        
        try:
            supabase.table("quran_reciters").upsert(payload, on_conflict="id").execute()
            count += 1
        except Exception as e:
            print(f"Failed to upsert reciter {item.get('name')}: {e}")
            
    print(f"Successfully upserted {count} reciters")

def main():
    try:
        items = fetch_reciters(200)
        insert_reciters(items)
    except Exception as e:
        print(f"Main execution failed: {e}")

if __name__ == "__main__":
    main()
