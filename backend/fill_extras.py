import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def run():
    try:
        from db_automator import ensure_schema
        ok = ensure_schema()
        if not ok:
            print("fill_extras: Schema step failed or unreachable; proceeding with fillers assuming tables exist.")
    except Exception as e:
        print(f"fill_extras schema error: {e}")
        print("fill_extras: proceeding with fillers assuming tables exist.")
    try:
        import fetch_games
        fetch_games.main()
    except Exception as e:
        print(f"fill_extras games error: {e}")
    try:
        import fetch_software
        fetch_software.main()
    except Exception as e:
        print(f"fill_extras software error: {e}")
    try:
        import fetch_anime
        fetch_anime.main()
    except Exception as e:
        print(f"fill_extras anime error: {e}")
    try:
        import fetch_quran
        fetch_quran.main()
    except Exception as e:
        print(f"fill_extras quran error: {e}")

if __name__ == "__main__":
    run()
