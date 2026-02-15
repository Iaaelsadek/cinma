
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

def check_reciters():
    supabase = get_supabase()
    try:
        response = supabase.table("quran_reciters").select("count", count="exact").execute()
        print(f"Total Reciters: {response.count}")
        
        # Check first few records
        response = supabase.table("quran_reciters").select("*").limit(5).execute()
        for reciter in response.data:
            print(f"ID: {reciter.get('id')}, Name: {reciter.get('name')}, Category: {reciter.get('category')}")
            
    except Exception as e:
        print(f"Error checking reciters: {e}")

if __name__ == "__main__":
    check_reciters()
