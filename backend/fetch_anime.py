import os
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
)

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_top_anime(total: int = 50):
    url = "https://api.jikan.moe/v4/top/anime"
    per_page = 25
    pages = max(1, (total + per_page - 1) // per_page)
    out = []
    for page in range(1, pages + 1):
        resp = requests.get(url, params={"page": page, "limit": per_page}, timeout=30)
        resp.raise_for_status()
        data = resp.json().get("data") or []
        out.extend(data)
        time.sleep(0.5)
    return out[:total]

def categorize(item) -> str:
    genres = item.get("genres") or []
    if genres:
        name = (genres[0] or {}).get("name")
        if name:
            return name
    return "Others"

def upsert_anime(items):
    supabase = get_supabase()
    for item in items:
        payload = {
            "id": item.get("mal_id"),
            "mal_id": item.get("mal_id"),
            "title": item.get("title"),
            "title_english": item.get("title_english"),
            "title_japanese": item.get("title_japanese"),
            "type": item.get("type"),
            "episodes": item.get("episodes"),
            "status": item.get("status"),
            "score": item.get("score"),
            "rank": item.get("rank"),
            "popularity": item.get("popularity"),
            "synopsis": item.get("synopsis"),
            "year": item.get("year"),
            "season": item.get("season"),
            "category": categorize(item),
            "image_url": (item.get("images") or {}).get("jpg", {}).get("image_url"),
            "trailer_url": (item.get("trailer") or {}).get("url"),
            "source": "jikan",
        }
        try:
            supabase.table("anime").upsert(payload, on_conflict="id").execute()
        except Exception as e:
            print(f"Failed to upsert anime {item.get('title')}: {e}")
        time.sleep(0.2)

def main():
    items = fetch_top_anime(50)
    upsert_anime(items)
    print(f"Upserted {len(items)} anime")

if __name__ == "__main__":
    main()
