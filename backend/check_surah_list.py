
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def check_surah_lists():
    supabase = get_supabase()
    
    # Check famous reciters
    try:
        res = supabase.table("quran_reciters").select("name, surah_list, category").eq("category", "Famous").execute()
        
        print(f"Found {len(res.data)} famous reciters.")
        for r in res.data:
            has_list = "YES" if r.get('surah_list') else "NO"
            list_len = len(r.get('surah_list', '').split(',')) if r.get('surah_list') else 0
            print(f"Reciter: {r['name']}, Has List: {has_list}, Count: {list_len}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_surah_lists()
