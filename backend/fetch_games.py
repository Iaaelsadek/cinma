import os
import time
from typing import List, Dict, Any, Tuple
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
# Accept multiple env names for service role for flexibility
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
)
RAWG_API_KEY = os.environ.get("RAWG_API_KEY")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase credentials missing")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def categorize(platforms: List[Dict[str, Any]]) -> str:
    names = [p.get("platform", {}).get("name", "") for p in platforms or []]
    if any("PC" in n for n in names):
        return "PC"
    if any(any(x in n for x in ["PlayStation", "Xbox", "Nintendo"]) for n in names):
        return "Console"
    if any(any(x in n for x in ["Android", "iOS"]) for n in names):
        return "Mobile"
    return "Others"

def fetch_top_games(limit: int = 50) -> List[Dict[str, Any]]:
    try:
        base = "https://api.rawg.io/api/games"
        params = {"ordering": "-rating", "page_size": limit}
        if RAWG_API_KEY:
            params["key"] = RAWG_API_KEY
        r = requests.get(base, params=params, timeout=30)
        r.raise_for_status()
        data = r.json().get("results", [])
        items: List[Dict[str, Any]] = []
        for it in data:
            gid = it.get("id")
            try:
                details_url = f"https://api.rawg.io/api/games/{gid}"
                d_params = {}
                if RAWG_API_KEY:
                    d_params["key"] = RAWG_API_KEY
                dr = requests.get(details_url, params=d_params, timeout=30)
                desc = ""
                if dr.ok:
                    desc = dr.json().get("description_raw") or ""
            except Exception:
                desc = ""
            year = None
            released = it.get("released")
            if released and len(released) >= 4:
                try:
                    year = int(released[:4])
                except Exception:
                    year = None
            items.append({
                "id": int(gid) if gid is not None else None,
                "title": it.get("name") or "",
                "poster_url": it.get("background_image") or "",
                "rating": min(10.0, max(0.0, round(float(it.get("rating") or 0.0) * 2.0, 1))),
                "year": year,
                "description": desc or "لا يوجد وصف",
                "download_url": f"https://www.google.com/search?q={requests.utils.quote((it.get('name') or '') + ' PC download')}",
                "category": categorize(it.get("platforms") or [])
            })
            time.sleep(0.15)
        return items
    except Exception:
        # Fallback to SteamSpy Top in 2 weeks (no key required)
        spy_url = "https://steamspy.com/api.php"
        resp = requests.get(spy_url, params={"request": "top100in2weeks"}, timeout=30)
        resp.raise_for_status()
        raw = resp.json()
        # raw is a dict of {appid: item}
        items: List[Dict[str, Any]] = []
        for _, it in list(raw.items())[:limit]:
            appid = it.get("appid")
            name = it.get("name") or ""
            # Try portrait, fallback to header
            vertical = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/library_600x900.jpg"
            header = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg"
            poster = vertical
            rating = 8.5
            try:
                rank = int(it.get("score_rank") or 0)
                rating = max(6.0, min(10.0, 10.0 - (rank / 10.0) if rank > 0 else 8.5))
            except Exception:
                rating = 8.5
            items.append({
                "id": int(appid),
                "title": name,
                "poster_url": poster,
                "rating": round(float(rating), 1),
                "year": None,
                "description": "لعبة رائجة على Steam",
                "download_url": f"https://store.steampowered.com/app/{appid}/",
                "category": "PC"
            })
        return items

def upsert_games(rows: List[Dict[str, Any]]):
    sb = get_supabase()
    batch = []
    for i, row in enumerate(rows, 1):
        batch.append(row)
        if len(batch) >= 50 or i == len(rows):
            try:
                sb.table("games").upsert(batch).execute()
            except Exception as e:
                if "year" in str(e) and "column" in str(e):
                    fallback = []
                    for r in batch:
                        r2 = dict(r)
                        if "year" in r2:
                            r2["release_year"] = r2.pop("year")
                        fallback.append(r2)
                    sb.table("games").upsert(fallback).execute()
                else:
                    raise
            batch = []

def main():
    try:
        games = fetch_top_games(50)
        games = [g for g in games if g.get("id") is not None and g.get("title")]
        upsert_games(games)
        print(f"Inserted/updated {len(games)} games")
    except Exception as e:
        print(f"fetch_games error: {e}")

if __name__ == "__main__":
    main()
