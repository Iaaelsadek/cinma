
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

def check_missing_famous():
    supabase = get_supabase()
    
    missing_names = [
        "ياسر الدوسري",
        "فارس عباد",
        "ناصر القطامي",
        "عبدالباسط عبدالصمد" # Abdul Basit (might be under different spelling)
    ]
    
    print("Checking specific names...")
    for name in missing_names:
        try:
            res = supabase.table("quran_reciters").select("name, surah_list, category").ilike("name", f"%{name}%").execute()
            for r in res.data:
                print(f"Found: {r['name']}, Category: {r['category']}, List Len: {len(r.get('surah_list', '').split(',')) if r.get('surah_list') else 0}")
        except Exception as e:
            print(f"Error checking {name}: {e}")

if __name__ == "__main__":
    check_missing_famous()
