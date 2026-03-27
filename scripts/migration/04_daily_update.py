#!/usr/bin/env python3
"""
Daily content update from TMDB to CockroachDB
Runs via GitHub Actions at 2 AM daily
"""

import os
import json
import sys
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta

# Load .env.local if running locally
env_file = Path(__file__).parent.parent.parent / '.env.local'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                val = val.strip().strip('"').strip("'")
                os.environ.setdefault(key.strip(), val)

try:
    import psycopg2
except ImportError:
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2

TMDB_API_KEY = os.environ.get('TMDB_API_KEY') or os.environ.get('VITE_TMDB_API_KEY', '')
COCKROACHDB_URL = os.environ.get('COCKROACHDB_URL', '')
TMDB_BASE = 'https://api.themoviedb.org/3'
MIN_RATING = 4.0
MIN_VOTES = 100


def tmdb_get(endpoint, params=None):
    params = params or {}
    params['api_key'] = TMDB_API_KEY
    params['language'] = 'ar-SA'
    r = requests.get(f'{TMDB_BASE}{endpoint}', params=params, timeout=10)
    r.raise_for_status()
    return r.json()


GENRE_MAP = {}  # populated lazily from TMDB


def get_genre_map(media_type='movie'):
    """Fetch genre id→name mapping from TMDB (cached per run)."""
    global GENRE_MAP
    key = media_type
    if key in GENRE_MAP:
        return GENRE_MAP[key]
    try:
        endpoint = '/genre/movie/list' if media_type == 'movie' else '/genre/tv/list'
        data = tmdb_get(endpoint)
        GENRE_MAP[key] = {g['id']: g['name'] for g in data.get('genres', [])}
    except Exception:
        GENRE_MAP[key] = {}
    return GENRE_MAP[key]


def build_genres_jsonb(genre_ids, media_type='movie'):
    """Convert list of genre IDs to JSONB array of {id, name} objects."""
    gmap = get_genre_map(media_type)
    return json.dumps([{'id': gid, 'name': gmap.get(gid, '')} for gid in (genre_ids or [])])


def upsert_movie(conn, movie):
    cur = conn.cursor()
    genres_jsonb = build_genres_jsonb(movie.get('genre_ids', []), 'movie')
    cur.execute("""
        INSERT INTO movies (id, title, original_title, overview, poster_path, backdrop_path,
            release_date, vote_average, vote_count, popularity, adult, original_language, genres)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            vote_average = EXCLUDED.vote_average,
            vote_count   = EXCLUDED.vote_count,
            popularity   = EXCLUDED.popularity,
            genres       = EXCLUDED.genres,
            updated_at   = NOW()
    """, (
        movie['id'], movie.get('title', ''), movie.get('original_title'),
        movie.get('overview'), movie.get('poster_path'), movie.get('backdrop_path'),
        movie.get('release_date') or None,
        movie.get('vote_average', 0), movie.get('vote_count', 0),
        movie.get('popularity', 0), movie.get('adult', False),
        movie.get('original_language'),
        genres_jsonb
    ))
    cur.close()


def upsert_tv(conn, show):
    cur = conn.cursor()
    genres_jsonb = build_genres_jsonb(show.get('genre_ids', []), 'tv')
    cur.execute("""
        INSERT INTO tv_series (id, name, original_name, overview, poster_path, backdrop_path,
            first_air_date, vote_average, vote_count, popularity, adult, original_language, genres)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            vote_average = EXCLUDED.vote_average,
            vote_count   = EXCLUDED.vote_count,
            popularity   = EXCLUDED.popularity,
            genres       = EXCLUDED.genres,
            updated_at   = NOW()
    """, (
        show['id'], show.get('name', ''), show.get('original_name'),
        show.get('overview'), show.get('poster_path'), show.get('backdrop_path'),
        show.get('first_air_date') or None,
        show.get('vote_average', 0), show.get('vote_count', 0),
        show.get('popularity', 0), show.get('adult', False),
        show.get('original_language'),
        genres_jsonb
    ))
    cur.close()


def main():
    print(f"[{datetime.now()}] Starting daily content update...")

    if not TMDB_API_KEY:
        print("ERROR: Missing TMDB_API_KEY")
        sys.exit(1)

    conn = psycopg2.connect(COCKROACHDB_URL, sslmode='verify-full')
    movies_added = 0
    tv_added = 0

    # Fetch trending movies (last 7 days)
    for page in range(1, 6):
        try:
            data = tmdb_get('/trending/movie/week', {'page': page})
            for movie in data.get('results', []):
                if movie.get('vote_average', 0) >= MIN_RATING and movie.get('vote_count', 0) >= MIN_VOTES:
                    upsert_movie(conn, movie)
                    movies_added += 1
            conn.commit()
            time.sleep(0.25)
        except Exception as e:
            print(f"Error fetching movies page {page}: {e}")

    # Fetch trending TV
    for page in range(1, 6):
        try:
            data = tmdb_get('/trending/tv/week', {'page': page})
            for show in data.get('results', []):
                if show.get('vote_average', 0) >= MIN_RATING and show.get('vote_count', 0) >= MIN_VOTES:
                    upsert_tv(conn, show)
                    tv_added += 1
            conn.commit()
            time.sleep(0.25)
        except Exception as e:
            print(f"Error fetching TV page {page}: {e}")

    conn.close()
    print(f"✅ Done! Added/updated: {movies_added} movies, {tv_added} TV series")


if __name__ == '__main__':
    main()
