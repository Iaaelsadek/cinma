
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

UPDATES = [
    {"name_pattern": "مشاري", "image": "https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg"},
    {"name_pattern": "العفاسي", "image": "https://upload.wikimedia.org/wikipedia/commons/2/29/Mishary_Rashid_Al-Afasy.jpg"},
    {"name_pattern": "السديس", "image": "https://static.surahquran.com/images/reciters/1.jpg"},
    {"name_pattern": "الشريم", "image": "https://static.surahquran.com/images/reciters/6.jpg"},
    {"name_pattern": "المعيقلي", "image": "https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg"},
    {"name_pattern": "الغامدي", "image": "https://static.surahquran.com/images/reciters/4.jpg"},
    {"name_pattern": "العجمي", "image": "https://static.surahquran.com/images/reciters/3.jpg"},
    {"name_pattern": "الدوسري", "image": "https://static.surahquran.com/images/reciters/2.jpg"},
    {"name_pattern": "الحصري", "image": "https://static.surahquran.com/images/reciters/5.jpg"},
    {"name_pattern": "المنشاوي", "image": "https://static.surahquran.com/images/reciters/10.jpg"},
    {"name_pattern": "عبد الباسط", "image": "https://static.surahquran.com/images/reciters/12.jpg"},
    {"name_pattern": "فارس عباد", "image": "https://static.surahquran.com/images/reciters/8.jpg"},
    {"name_pattern": "إدريس أبكر", "image": "https://static.surahquran.com/images/reciters/19.jpg"},
    {"name_pattern": "القطامي", "image": "https://static.surahquran.com/images/reciters/16.jpg"},
]

def update_images():
    supabase = get_supabase()
    
    count = 0
    for update in UPDATES:
        pattern = f"%{update['name_pattern']}%"
        
        try:
            res = supabase.table("quran_reciters").select("id, name").ilike("name", pattern).execute()
            
            for reciter in res.data:
                print(f"Updating {reciter['name']}...")
                supabase.table("quran_reciters").update({
                    "featured": True,
                    "image": update["image"],
                    "category": "Famous"
                }).eq("id", reciter["id"]).execute()
                count += 1
                
        except Exception as e:
            print(f"Error updating for pattern {pattern}: {e}")

    print(f"Updated {count} reciters.")

if __name__ == "__main__":
    update_images()
