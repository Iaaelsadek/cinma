import os
import time
import requests
import json
import re
import argparse
from supabase import create_client, Client
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not (SUPABASE_URL and SUPABASE_KEY and TMDB_API_KEY):
    raise SystemExit("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE or TMDB_API_KEY in environment")

# Initialize Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY missing. SEO content generation will be skipped/limited.")

# Global Counters for Daily Limits
PROCESSED_COUNT = 0
MAX_DAILY_ITEMS = 50  # Default safe limit for free tiers

def check_limit():
    global PROCESSED_COUNT
    if PROCESSED_COUNT >= MAX_DAILY_ITEMS:
        print(f"🛑 Daily limit of {MAX_DAILY_ITEMS} items reached. Stopping script to protect quotas.", flush=True)
        return True
    return False

def get_rating_color(release_dates):
    """Determine rating color based on US certification."""
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

def build_embed_urls(tmdb_id: int, content_type: str = 'movie'):
    """Generate embed URLs for various providers."""
    if content_type == 'movie':
        return {
            "vidsrc": f"https://vidsrc.to/embed/movie/{tmdb_id}",
            "vidsrc_me": f"https://vidsrc.me/embed/{tmdb_id}",
            "embed_su": f"https://embed.su/embed/movie/{tmdb_id}",
            "vidsrc_pro": f"https://vidsrc.pro/embed/movie/{tmdb_id}",
            "vidsrc_vip": f"https://vidsrc.vip/embed/movie/{tmdb_id}",
            "vidsrc_xyz": f"https://vidsrc.xyz/embed/movie/{tmdb_id}",
            "vidsrc_icu": f"https://vidsrc.icu/embed/movie/{tmdb_id}",
            "autoembed": f"https://autoembed.to/movie/tmdb/{tmdb_id}",
            "vidsrc_cc": f"https://vidsrc.cc/v2/embed/movie/{tmdb_id}",
            "vidlink": f"https://vidlink.pro/movie/{tmdb_id}",
            "superembed": f"https://superembed.stream/movie/{tmdb_id}",
            "smashystream": f"https://embed.smashystream.com/playere.php?tmdb={tmdb_id}",
            "multiembed": f"https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1",
            "2embed": f"https://www.2embed.cc/embed/{tmdb_id}",
        }
    elif content_type == 'tv':
        return {
            "vidsrc": f"https://vidsrc.to/embed/tv/{tmdb_id}",
            "vidsrc_me": f"https://vidsrc.me/embed/{tmdb_id}",
            "embed_su": f"https://embed.su/embed/tv/{tmdb_id}",
            "vidsrc_pro": f"https://vidsrc.pro/embed/tv/{tmdb_id}",
            "vidsrc_vip": f"https://vidsrc.vip/embed/tv/{tmdb_id}",
            "vidsrc_xyz": f"https://vidsrc.xyz/embed/tv/{tmdb_id}",
            "vidsrc_icu": f"https://vidsrc.icu/embed/tv/{tmdb_id}",
            "autoembed": f"https://autoembed.to/tv/tmdb/{tmdb_id}",
            "vidsrc_cc": f"https://vidsrc.cc/v2/embed/tv/{tmdb_id}",
            "vidlink": f"https://vidlink.pro/tv/{tmdb_id}",
            "superembed": f"https://superembed.stream/tv/{tmdb_id}",
            "smashystream": f"https://embed.smashystream.com/playere.php?tmdb={tmdb_id}",
            "multiembed": f"https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1",
            "2embed": f"https://www.2embed.cc/embed/{tmdb_id}",
        }
    return {}

def generate_seo_content(title, original_overview, content_type='movie'):
    """
    Generate Arabic SEO-friendly title and summary using Gemini with Fallback Mechanism.
    """
    if not GEMINI_API_KEY:
        return {"arabic_title": title, "ai_summary": original_overview}

    prompt = f"""
    Act as a professional SEO Content Writer for an Arabic Streaming Platform.
    Content: {content_type} "{title}"
    Original Overview: "{original_overview}"

    Task:
    1. Translate the title to Arabic (Creative & Catchy).
    2. Write a 2-sentence exciting summary in Arabic (Egyptian or White Arabic) optimized for SEO.
    3. Include keywords naturally.

    Output STRICT JSON:
    {{
        "arabic_title": "...",
        "ai_summary": "..."
    }}
    """

    def process_response(response):
        try:
            text = response.text
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
        return None

    try:
        # 1. Primary Model (Flash - Efficient & High Limit)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        data = process_response(response)
        if data: return data
        
    except Exception as e:
        error_str = str(e)
        if "ResourceExhausted" in error_str or "429" in error_str:
            print(f"[Gemini] Primary model exhausted. Switching to Fallback...")
            try:
                # 2. Fallback Model (Pro)
                model = genai.GenerativeModel("gemini-1.5-pro")
                response = model.generate_content(prompt)
                data = process_response(response)
                if data: return data
            except Exception as fallback_e:
                print(f"[Gemini] Fallback failed: {fallback_e}")
        else:
            print(f"[Gemini] Error: {e}")

    return {"arabic_title": title, "ai_summary": original_overview}

def fetch_tmdb_movies(pages=5, list_type="popular"):
    """Fetch movies from TMDB and insert into Supabase."""
    global PROCESSED_COUNT
    print(f"--- Starting Movie Import ({list_type}, {pages} pages) ---")
    
    for page in range(1, pages + 1):
        if check_limit(): return

        print(f"Fetching {list_type} movies page {page}/{pages}...")
        url = f"https://api.themoviedb.org/3/movie/{list_type}"
        params = {"api_key": TMDB_API_KEY, "language": "ar-SA", "page": page}
        
        try:
            resp = requests.get(url, params=params, timeout=20)
            if resp.status_code != 200:
                print(f"Failed to fetch page {page}: {resp.status_code}")
                continue

            movies = resp.json().get("results", [])
            
            for movie in movies:
                if check_limit(): return

                tmdb_id = movie["id"]
                
                # 1. Check existence first
                try:
                    existing = supabase.table("movies").select("id, embed_links").eq("id", tmdb_id).maybe_single().execute()
                    if existing and existing.data:
                        # Update embed links if they are outdated (simple check: count keys)
                        current_links = existing.data.get('embed_links') or {}
                        new_links = build_embed_urls(tmdb_id, 'movie')
                        
                        # If we have significantly more new links, update the record
                        if len(new_links) > len(current_links):
                            print(f"🔄 Updating links for {movie.get('title')} ({len(current_links)} -> {len(new_links)} providers)")
                            supabase.table("movies").update({"embed_links": new_links}).eq("id", tmdb_id).execute()
                        else:
                            print(f"⏩ Skipping {movie.get('title')} (Already exists & up-to-date)")
                        continue
                except Exception as e:
                    print(f"⚠️ Supabase check failed for {tmdb_id}: {e}")
                    # If check fails, we might as well try to continue and upsert, or skip.
                    # Safest is to skip to avoid crashing, but we want to be robust.
                    pass

                # Fetch Details for Rating & Release Dates
                detail_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
                detail_params = {
                    "api_key": TMDB_API_KEY,
                    "append_to_response": "release_dates,credits",
                    "language": "ar-SA",
                }
                detail_resp = requests.get(detail_url, params=detail_params, timeout=20)
                if detail_resp.status_code != 200: continue
                detail = detail_resp.json()

                rating_color = get_rating_color((detail.get("release_dates") or {}).get("results"))
                embed_links = build_embed_urls(tmdb_id, 'movie')

                # Generate SEO Content
                seo_data = generate_seo_content(movie.get("title"), movie.get("overview"), 'movie')

                movie_data = {
                    "id": tmdb_id,
                    "title": movie.get("title"),
                    "arabic_title": seo_data.get("arabic_title") or movie.get("title"),
                    "overview": movie.get("overview"),
                    "ai_summary": seo_data.get("ai_summary"),
                    "poster_path": movie.get("poster_path"),
                    "backdrop_path": movie.get("backdrop_path"),
                    "release_date": movie.get("release_date"),
                    "rating_color": rating_color,
                    "embed_links": embed_links,
                    "source": "tmdb_mass_import",
                    "updated_at": "now()"
                }

                try:
                    supabase.table("movies").upsert(movie_data, on_conflict="id").execute()
                    print(f"✅ Imported Movie: {movie_data['arabic_title']}")
                    PROCESSED_COUNT += 1
                except Exception as e:
                    print(f"❌ Failed to upsert movie {tmdb_id}: {e}")
                
                time.sleep(4) # Sleep 4s to respect Gemini Free Tier 15 RPM limit

        except Exception as e:
            print(f"Error on page {page}: {e}")

def fetch_tmdb_series(pages=5, list_type="popular"):
    """Fetch TV Series from TMDB and insert into Supabase."""
    global PROCESSED_COUNT
    print(f"--- Starting TV Series Import ({list_type}, {pages} pages) ---")
    
    for page in range(1, pages + 1):
        if check_limit(): return

        print(f"Fetching {list_type} series page {page}/{pages}...")
        url = f"https://api.themoviedb.org/3/tv/{list_type}"
        params = {"api_key": TMDB_API_KEY, "language": "ar-SA", "page": page}
        
        try:
            resp = requests.get(url, params=params, timeout=20)
            if resp.status_code != 200:
                print(f"Failed to fetch page {page}: {resp.status_code}")
                continue

            series_list = resp.json().get("results", [])
            
            for series in series_list:
                if check_limit(): return

                tmdb_id = series["id"]
                
                # 1. Check existence first
                try:
                    existing = supabase.table("tv_series").select("id, embed_links").eq("id", tmdb_id).maybe_single().execute()
                    if existing and existing.data:
                        # Update embed links
                        current_links = existing.data.get('embed_links') or {}
                        new_links = build_embed_urls(tmdb_id, 'tv')
                        
                        if len(new_links) > len(current_links):
                            print(f"🔄 Updating links for {series.get('name')} ({len(current_links)} -> {len(new_links)} providers)")
                            supabase.table("tv_series").update({"embed_links": new_links}).eq("id", tmdb_id).execute()
                        else:
                            print(f"⏩ Skipping {series.get('name')} (Already exists & up-to-date)")
                        continue
                except Exception as e:
                    print(f"⚠️ Supabase check failed for {tmdb_id}: {e}")
                    pass
                    # Continue to try upsert even if check failed, or skip? 
                    # Safer to skip to avoid duplicates if check failed, but maybe we should try to upsert.
                    # Let's try to upsert.

                # Fetch Details
                detail_url = f"https://api.themoviedb.org/3/tv/{tmdb_id}"
                detail_params = {
                    "api_key": TMDB_API_KEY,
                    "append_to_response": "content_ratings",
                    "language": "ar-SA",
                }
                detail_resp = requests.get(detail_url, params=detail_params, timeout=20)
                if detail_resp.status_code != 200: continue
                detail = detail_resp.json()

                # Determine Rating
                rating = "yellow"
                ratings = (detail.get("content_ratings") or {}).get("results", [])
                for r in ratings:
                    if r.get("iso_3166_1") == "US":
                        if r.get("rating") in ["TV-Y", "TV-Y7", "TV-G"]: rating = "green"
                        elif r.get("rating") in ["TV-MA"]: rating = "red"
                        break

                embed_links = build_embed_urls(tmdb_id, 'tv')
                
                # Generate SEO Content
                seo_data = generate_seo_content(series.get("name"), series.get("overview"), 'tv series')

                series_data = {
                    "id": tmdb_id,
                    "title": series.get("name"),
                    "arabic_title": seo_data.get("arabic_title") or series.get("name"),
                    "overview": series.get("overview"),
                    "ai_summary": seo_data.get("ai_summary"),
                    "poster_path": series.get("poster_path"),
                    "backdrop_path": series.get("backdrop_path"),
                    "first_air_date": series.get("first_air_date"),
                    "rating_color": rating,
                    "embed_links": embed_links,
                    "source": "tmdb_mass_import",
                    "updated_at": "now()"
                }

                try:
                    supabase.table("tv_series").upsert(series_data, on_conflict="id").execute()
                    print(f"✅ Imported Series: {series_data['arabic_title']}")
                    PROCESSED_COUNT += 1
                except Exception as e:
                    print(f"❌ Failed to upsert series {tmdb_id}: {e}")
                
                time.sleep(4) # Sleep 4s to respect Gemini Free Tier 15 RPM limit

        except Exception as e:
            print(f"Error on page {page}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mass Content Importer with Free Tier Limits")
    parser.add_argument("--limit", type=int, default=50, help="Daily import limit (default: 50)")
    parser.add_argument("--pages", type=int, default=2, help="Pages per list type (default: 2)")
    args = parser.parse_args()

    MAX_DAILY_ITEMS = args.limit
    
    print(f"🚀 Starting Mass Content Import (Limit: {MAX_DAILY_ITEMS} items/run)...", flush=True)
    
    fetch_tmdb_movies(pages=args.pages, list_type="popular")
    if not check_limit():
        fetch_tmdb_movies(pages=args.pages, list_type="top_rated")
    
    if not check_limit():
        fetch_tmdb_series(pages=args.pages, list_type="popular")
    if not check_limit():
        fetch_tmdb_series(pages=args.pages, list_type="top_rated")
    
    print(f"🎉 Import Session Completed. Processed: {PROCESSED_COUNT} items.")

    # Generate Sitemap
    try:
        print("🗺️ Generating Sitemap...")
        import sitemap_generator
        sitemap_generator.generate_sitemap()
        print("✅ Sitemap Updated Successfully.")
    except Exception as e:
        print(f"⚠️ Sitemap Generation Failed: {e}")
