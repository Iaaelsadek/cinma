#!/usr/bin/env python3
"""
Export data from Supabase to JSON files for migration to CockroachDB
Usage: python scripts/migration/02_export_from_supabase.py
"""

import os
import json
import sys
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
    from supabase import create_client
except ImportError:
    print("Installing supabase...")
    os.system(f"{sys.executable} -m pip install supabase")
    from supabase import create_client

SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
OUTPUT_DIR = Path(__file__).parent / 'data'
BATCH_SIZE = 1000

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

OUTPUT_DIR.mkdir(exist_ok=True)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def export_table(table_name: str, output_file: str):
    print(f"\nExporting {table_name}...")
    all_rows = []
    offset = 0

    while True:
        response = supabase.table(table_name).select('*').range(offset, offset + BATCH_SIZE - 1).execute()
        rows = response.data or []

        if not rows:
            break

        all_rows.extend(rows)
        offset += len(rows)
        print(f"  Fetched {len(all_rows)} rows...", end='\r')

        if len(rows) < BATCH_SIZE:
            break

    print(f"  Total: {len(all_rows)} rows exported")

    with open(OUTPUT_DIR / output_file, 'w', encoding='utf-8') as f:
        json.dump(all_rows, f, ensure_ascii=False, default=str)

    print(f"  Saved to {OUTPUT_DIR / output_file}")
    return len(all_rows)


def main():
    print("=" * 50)
    print("Supabase → CockroachDB Export")
    print("=" * 50)

    movies_count = export_table('movies', 'movies.json')
    tv_count = export_table('tv_series', 'tv_series.json')

    print(f"\n✅ Export complete!")
    print(f"   Movies: {movies_count:,}")
    print(f"   TV Series: {tv_count:,}")
    print(f"   Total: {movies_count + tv_count:,}")
    print(f"\nFiles saved in: {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
