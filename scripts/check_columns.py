import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY") 
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Environment Variables.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_columns():
    print("Checking columns...")
    try:
        # Try to select the specific columns
        # If they don't exist, this should fail
        response = supabase.table('tv_series').select('is_ramadan').limit(1).execute()
        print("Success: 'is_ramadan' column exists in 'tv_series'.")
    except Exception as e:
        print(f"Error checking 'is_ramadan': {e}")
        
    try:
        response = supabase.table('movies').select('is_play').limit(1).execute()
        print("Success: 'is_play' column exists in 'movies'.")
    except Exception as e:
        print(f"Error checking 'is_play': {e}")

if __name__ == "__main__":
    check_columns()
