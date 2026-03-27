#!/usr/bin/env python3
"""
Import data from JSON files to CockroachDB
Usage: python scripts/migration/03_import_to_cockroachdb.py
"""

import os
import json
import sys
import time
from pathlib import Path

# Load .env.local
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
    import psycopg2.extras
except ImportError:
    print("Installing psycopg2...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2
    import psycopg2.extras

DATA_DIR = Path(__file__).parent / 'data'
COCKROACHDB_URL = os.environ.get('COCKROACHDB_URL', '')
BATCH_SIZE = 100

if not COCKROACHDB_URL:
    print("ERROR: Missing COCKROACHDB_URL in .env.local")
    sys.exit(1)


def get_connection():
    return psycopg2.connect(COCKROACHDB_URL, sslmode='verify-full')


def import_movies(conn, rows):
    cursor = conn.cursor()
    inserted = 0
    errors = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            for row in batch:
                cursor.execute("""
                    INSERT INTO movies (
                        id, title, original_title, overview, poster_path, backdrop_path,
                        release_date, vote_average, vote_count, popularity, adult,
                        original_language, runtime, status, tagline, budget, revenue,
                        genres, cast_data, crew_data, similar_content,
                        production_companies, spoken_languages, keywords, videos, images
                    ) VALUES (
                        %(id)s, %(title)s, %(original_title)s, %(overview)s,
                        %(poster_path)s, %(backdrop_path)s, %(release_date)s,
                        %(vote_average)s, %(vote_count)s, %(popularity)s, %(adult)s,
                        %(original_language)s, %(runtime)s, %(status)s, %(tagline)s,
                        %(budget)s, %(revenue)s,
                        %(genres)s::jsonb, %(cast_data)s::jsonb, %(crew_data)s::jsonb,
                        %(similar_content)s::jsonb, %(production_companies)s::jsonb,
                        %(spoken_languages)s::jsonb, %(keywords)s::jsonb,
                        %(videos)s::jsonb, %(images)s::jsonb
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        vote_average = EXCLUDED.vote_average,
                        popularity = EXCLUDED.popularity,
                        updated_at = NOW()
                """, {
                    'id': row.get('id'),
                    'title': row.get('title', ''),
                    'original_title': row.get('original_title'),
                    'overview': row.get('overview'),
                    'poster_path': row.get('poster_path'),
                    'backdrop_path': row.get('backdrop_path'),
                    'release_date': row.get('release_date') or None,
                    'vote_average': row.get('vote_average', 0) or 0,
                    'vote_count': row.get('vote_count', 0) or 0,
                    'popularity': row.get('popularity', 0) or 0,
                    'adult': row.get('adult', False),
                    'original_language': row.get('original_language'),
                    'runtime': row.get('runtime'),
                    'status': row.get('status'),
                    'tagline': row.get('tagline'),
                    'budget': row.get('budget', 0) or 0,
                    'revenue': row.get('revenue', 0) or 0,
                    'genres': json.dumps(row.get('genres') or []),
                    'cast_data': json.dumps(row.get('cast_data') or []),
                    'crew_data': json.dumps(row.get('crew_data') or []),
                    'similar_content': json.dumps(row.get('similar_content') or []),
                    'production_companies': json.dumps(row.get('production_companies') or []),
                    'spoken_languages': json.dumps(row.get('spoken_languages') or []),
                    'keywords': json.dumps(row.get('keywords') or []),
                    'videos': json.dumps(row.get('videos') or []),
                    'images': json.dumps(row.get('images') or []),
                })
            conn.commit()
            inserted += len(batch)
            print(f"  Imported {inserted}/{len(rows)} movies...", end='\r')
        except Exception as e:
            conn.rollback()
            errors += len(batch)
            print(f"\n  Error in batch {i//BATCH_SIZE + 1}: {e}")

    cursor.close()
    return inserted, errors


def import_tv_series(conn, rows):
    cursor = conn.cursor()
    inserted = 0
    errors = 0

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        try:
            for row in batch:
                cursor.execute("""
                    INSERT INTO tv_series (
                        id, name, original_name, overview, poster_path, backdrop_path,
                        first_air_date, last_air_date, vote_average, vote_count, popularity,
                        adult, original_language, number_of_seasons, number_of_episodes,
                        status, tagline, type,
                        genres, cast_data, crew_data, similar_content,
                        production_companies, spoken_languages, keywords, videos, images,
                        networks, seasons
                    ) VALUES (
                        %(id)s, %(name)s, %(original_name)s, %(overview)s,
                        %(poster_path)s, %(backdrop_path)s, %(first_air_date)s,
                        %(last_air_date)s, %(vote_average)s, %(vote_count)s, %(popularity)s,
                        %(adult)s, %(original_language)s, %(number_of_seasons)s,
                        %(number_of_episodes)s, %(status)s, %(tagline)s, %(type)s,
                        %(genres)s::jsonb, %(cast_data)s::jsonb, %(crew_data)s::jsonb,
                        %(similar_content)s::jsonb, %(production_companies)s::jsonb,
                        %(spoken_languages)s::jsonb, %(keywords)s::jsonb,
                        %(videos)s::jsonb, %(images)s::jsonb,
                        %(networks)s::jsonb, %(seasons)s::jsonb
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        vote_average = EXCLUDED.vote_average,
                        popularity = EXCLUDED.popularity,
                        updated_at = NOW()
                """, {
                    'id': row.get('id'),
                    'name': row.get('name', ''),
                    'original_name': row.get('original_name'),
                    'overview': row.get('overview'),
                    'poster_path': row.get('poster_path'),
                    'backdrop_path': row.get('backdrop_path'),
                    'first_air_date': row.get('first_air_date') or None,
                    'last_air_date': row.get('last_air_date') or None,
                    'vote_average': row.get('vote_average', 0) or 0,
                    'vote_count': row.get('vote_count', 0) or 0,
                    'popularity': row.get('popularity', 0) or 0,
                    'adult': row.get('adult', False),
                    'original_language': row.get('original_language'),
                    'number_of_seasons': row.get('number_of_seasons', 0) or 0,
                    'number_of_episodes': row.get('number_of_episodes', 0) or 0,
                    'status': row.get('status'),
                    'tagline': row.get('tagline'),
                    'type': row.get('type'),
                    'genres': json.dumps(row.get('genres') or []),
                    'cast_data': json.dumps(row.get('cast_data') or []),
                    'crew_data': json.dumps(row.get('crew_data') or []),
                    'similar_content': json.dumps(row.get('similar_content') or []),
                    'production_companies': json.dumps(row.get('production_companies') or []),
                    'spoken_languages': json.dumps(row.get('spoken_languages') or []),
                    'keywords': json.dumps(row.get('keywords') or []),
                    'videos': json.dumps(row.get('videos') or []),
                    'images': json.dumps(row.get('images') or []),
                    'networks': json.dumps(row.get('networks') or []),
                    'seasons': json.dumps(row.get('seasons') or []),
                })
            conn.commit()
            inserted += len(batch)
            print(f"  Imported {inserted}/{len(rows)} TV series...", end='\r')
        except Exception as e:
            conn.rollback()
            errors += len(batch)
            print(f"\n  Error in batch {i//BATCH_SIZE + 1}: {e}")

    cursor.close()
    return inserted, errors


def main():
    print("=" * 50)
    print("CockroachDB Import")
    print("=" * 50)

    # Connect
    print("\nConnecting to CockroachDB...")
    try:
        conn = get_connection()
        print("✅ Connected!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # Import movies
    movies_file = DATA_DIR / 'movies.json'
    if movies_file.exists():
        print(f"\nImporting movies from {movies_file}...")
        with open(movies_file, encoding='utf-8') as f:
            movies = json.load(f)
        start = time.time()
        inserted, errors = import_movies(conn, movies)
        elapsed = time.time() - start
        print(f"\n✅ Movies: {inserted:,} imported, {errors:,} errors ({elapsed:.1f}s)")
    else:
        print(f"⚠️  No movies.json found in {DATA_DIR}")

    # Import TV series
    tv_file = DATA_DIR / 'tv_series.json'
    if tv_file.exists():
        print(f"\nImporting TV series from {tv_file}...")
        with open(tv_file, encoding='utf-8') as f:
            tv_series = json.load(f)
        start = time.time()
        inserted, errors = import_tv_series(conn, tv_series)
        elapsed = time.time() - start
        print(f"\n✅ TV Series: {inserted:,} imported, {errors:,} errors ({elapsed:.1f}s)")
    else:
        print(f"⚠️  No tv_series.json found in {DATA_DIR}")

    conn.close()
    print("\n✅ Import complete!")


if __name__ == '__main__':
    main()
