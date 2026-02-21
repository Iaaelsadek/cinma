#!/usr/bin/env python3
import os
import time
import json
import requests
from supabase import create_client
import google.generativeai as genai

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if not TMDB_API_KEY or not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    raise SystemExit("Missing required environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_rating_color(release_dates):
    for rd in release_dates or []:
        if rd.get("iso_3166_1") == "US":
            arr = rd.get("release_dates") or []
            cert = (arr[0].get("certification") if arr else "") or ""
            u = cert.upper()
            if u in ("G", "PG"):
                return "green"
            if u in ("PG-13"):
                return "yellow"
            if u in ("R", "NC-17", "TV-MA"):
                return "red"
    return "yellow"

def gemini_sum(text):
    if not GEMINI_API_KEY:
        return None
    
    # Fallback Mechanism for Gemini API
    try:
        # 1. Primary Model (Latest)
        model = genai.GenerativeModel("gemini-3.1-pro")
        prompt = "لخص النص التالي في 3 جمل عربية قصيرة:\n\n" + text
        resp = model.generate_content(prompt)
        return getattr(resp, "text", None)
    except Exception as e:
        # 2. Check for Resource Exhaustion or Rate Limits
        error_str = str(e)
        if "ResourceExhausted" in error_str or "429" in error_str or "Quota" in error_str:
            print(f"[LOG] Warning: Primary model exhausted or rate limited. Switching to fallback model... Error: {e}")
            try:
                # 3. Fallback Model (Older/Cheaper)
                model = genai.GenerativeModel("gemini-pro")
                prompt = "لخص النص التالي في 3 جمل عربية قصيرة:\n\n" + text
                resp = model.generate_content(prompt)
                return getattr(resp, "text", None)
            except Exception as e2:
                print(f"[LOG] Error in fallback model: {e2}")
                return None
        else:
            # 4. Catch unexpected errors
            print(f"[LOG] Unexpected Gemini Error: {e}")
            return None

def sync_movies(pages=1):
    page = 1
    while page <= pages:
        url = "https://api.themoviedb.org/3/movie/popular"
        params = {"api_key": TMDB_API_KEY, "language": "ar-SA", "page": page}
        try:
            data = requests.get(url, params=params, timeout=15).json()
        except Exception:
            break
        results = data.get("results") or []
        if not results:
            break
        for m in results:
            mid = m.get("id")
            if not mid:
                continue
            detail_url = f"https://api.themoviedb.org/3/movie/{mid}"
            detail_params = {"api_key": TMDB_API_KEY, "append_to_response": "release_dates"}
            detail = requests.get(detail_url, params=detail_params, timeout=15).json()
            rating_color = get_rating_color((detail.get("release_dates") or {}).get("results"))
            exist = supabase.table("movies").select("ai_summary").eq("id", mid).execute()
            ai_summary = None
            need_ai = True
            if exist.data and len(exist.data) > 0 and (exist.data[0].get("ai_summary") or None):
                need_ai = False
            if need_ai:
                text = (m.get("overview") or "")[:1200]
                ai_summary = gemini_sum(text)
                time.sleep(0.4)
            movie_data = {
                "id": mid,
                "title": m.get("title"),
                "arabic_title": m.get("title"),
                "overview": m.get("overview"),
                "ai_summary": ai_summary,
                "rating_color": rating_color,
                "genres": json.dumps((detail.get("genres") or [])),
                "release_date": m.get("release_date"),
                "poster_path": m.get("poster_path"),
                "backdrop_path": m.get("backdrop_path"),
            }
            supabase.table("movies").upsert(movie_data).execute()
        page += 1
        time.sleep(0.5)

def sync_tv(pages=1):
    page = 1
    while page <= pages:
        url = "https://api.themoviedb.org/3/tv/popular"
        params = {"api_key": TMDB_API_KEY, "language": "ar-SA", "page": page}
        try:
            data = requests.get(url, params=params, timeout=15).json()
        except Exception:
            break
        results = data.get("results") or []
        if not results:
            break
        for t in results:
            tid = t.get("id")
            if not tid:
                continue
            detail_url = f"https://api.themoviedb.org/3/tv/{tid}"
            detail_params = {"api_key": TMDB_API_KEY, "append_to_response": "content_ratings"}
            detail = requests.get(detail_url, params=detail_params, timeout=15).json()
            rating_color = "yellow"
            try:
                cr = (detail.get("content_ratings") or {}).get("results") or []
                us = next((x for x in cr if x.get("iso_3166_1") == "US"), None)
                code = (us or {}).get("rating", "")
                u = (code or "").upper()
                if u in ("TV-Y", "TV-G"):
                    rating_color = "green"
                elif u in ("TV-PG", "TV-14"):
                    rating_color = "yellow"
                elif u in ("TV-MA",):
                    rating_color = "red"
            except Exception:
                pass
            tv_data = {
                "id": tid,
                "name": t.get("name"),
                "arabic_name": t.get("name"),
                "overview": t.get("overview"),
                "ai_summary": None,
                "rating_color": rating_color,
                "genres": json.dumps((detail.get("genres") or [])),
                "first_air_date": t.get("first_air_date"),
                "poster_path": t.get("poster_path"),
                "backdrop_path": t.get("backdrop_path"),
            }
            supabase.table("tv_series").upsert(tv_data).execute()
        page += 1
        time.sleep(0.5)

if __name__ == "__main__":
    sync_movies(pages=2)
    sync_tv(pages=2)
    print("Sync done")
