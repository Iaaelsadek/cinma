import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def main():
    try:
        from db_automator import init_db
        ok = init_db()
        if not ok:
            print("[SETUP] Database initialization failed. Check your password or DATABASE_URL.")
            return
    except Exception as e:
        print(f"[SETUP] Failed to initialize DB: {e}. Check your password or DATABASE_URL.")
        return

    try:
        from fill_extras import run as run_extras
        run_extras()
    except Exception as e:
        print(f"[SETUP] Failed to run extras fetcher: {e}")

if __name__ == "__main__":
    main()
