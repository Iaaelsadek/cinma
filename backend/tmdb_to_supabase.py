import os
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

if not (SUPABASE_URL and SUPABASE_KEY and TMDB_API_KEY):
    raise SystemExit("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE or TMDB_API_KEY in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_rating_color(release_dates):
    for rd in release_dates or []:
        if rd.get('iso_3166_1') == 'US':
            rels = rd.get('release_dates') or []
            cert = (rels[0].get('certification') if rels else '') or ''
            if cert in ['G', 'PG']:
                return 'green'
            if cert == 'PG-13':
                return 'yellow'
            if cert in ['R', 'NC-17', 'TV-MA']:
                return 'red'
    return 'yellow'

def build_embed_urls(tmdb_id: int):
    return {
        "vidsrc": f"https://vidsrc.to/embed/movie/{tmdb_id}",
        "2embed": f"https://www.2embed.cc/embed/{tmdb_id}",
        "autoembed": f"https://autoembed.to/movie/tmdb/{tmdb_id}",
        "embed_su": f"https://embed.su/embed/movie/{tmdb_id}",
        "vidsrcme": f"https://vidsrc.me/embed/{tmdb_id}",
    }

def fetch_and_store_movies(pages: int = 2):
    for page in range(1, pages + 1):
        print(f"Fetching popular movies page {page}...")
        url = "https://api.themoviedb.org/3/movie/popular"
        params = {"api_key": TMDB_API_KEY, "language": "ar-SA", "page": page}
        resp = requests.get(url, params=params, timeout=20)
        if resp.status_code != 200:
            print(f"Failed to fetch page {page}: {resp.status_code} {resp.text[:120]}")
            continue

        movies = (resp.json() or {}).get("results", [])
        for movie in movies:
            tmdb_id = movie["id"]

            detail_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
            detail_params = {
                "api_key": TMDB_API_KEY,
                "append_to_response": "release_dates",
                "language": "ar-SA",
            }
            detail = requests.get(detail_url, params=detail_params, timeout=20).json()

            rating_color = get_rating_color((detail.get("release_dates") or {}).get("results"))

            embed_links = build_embed_urls(tmdb_id)

            movie_data = {
                "id": tmdb_id,
                "title": movie.get("title"),
                "overview": movie.get("overview"),
                "poster_path": movie.get("poster_path"),
                "backdrop_path": movie.get("backdrop_path"),
                "release_date": movie.get("release_date"),
                # Optional columns like genres, trailer_key are intentionally omitted to avoid schema mismatch
                "embed_links": embed_links,
                "source": "tmdb",
            }
            try:
                supabase.table("movies").upsert(movie_data, on_conflict="id").execute()
                print(f"Upserted {movie_data['title']}")
            except Exception as e:
                print(f"Failed to upsert {movie.get('title')}: {e}")

            time.sleep(0.25)

if __name__ == "__main__":
    fetch_and_store_movies(pages=2)
