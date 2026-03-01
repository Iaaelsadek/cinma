#!/usr/bin/env python3
"""
Script to populate Quran Reciters database
Fills the quran_reciters table with famous reciters and their server URLs
"""

import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE = os.getenv('SUPABASE_SERVICE_ROLE', '')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

# Famous Quran Reciters with reliable server URLs
RECITERS = [
    {
        "name": "مشاري العفاسي",
        "name_en": "Mishary Rashid Alafasy",
        "server": "https://server8.mp3quran.net/afs",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/mishary.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "عبدالباسط عبدالصمد",
        "name_en": "Abdul Basit Abdul Samad",
        "server": "https://server7.mp3quran.net/basit",
        "rewaya": "حفص عن عاصم - مجود",
        "image": "https://static.surahquran.com/images/reciters/12.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "محمد صديق المنشاوي",
        "name_en": "Muhammad Siddiq Al-Minshawi",
        "server": "https://server10.mp3quran.net/minsh",
        "rewaya": "حفص عن عاصم - مجود",
        "image": "https://static.surahquran.com/images/reciters/10.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "عبدالرحمن السديس",
        "name_en": "Abdul Rahman Al-Sudais",
        "server": "https://server11.mp3quran.net/sds",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/1.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "ماهر المعيقلي",
        "name_en": "Maher Al Muaiqly",
        "server": "https://server12.mp3quran.net/maher",
        "rewaya": "حفص عن عاصم",
        "image": "https://i1.sndcdn.com/artworks-000236613390-2p0a6v-t500x500.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "سعود الشريم",
        "name_en": "Saud Al-Shuraim",
        "server": "https://server7.mp3quran.net/shur",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/6.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "أحمد العجمي",
        "name_en": "Ahmed Al-Ajmi",
        "server": "https://server10.mp3quran.net/ajm",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/3.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "ياسر الدوسري",
        "name_en": "Yasser Al-Dosari",
        "server": "https://server11.mp3quran.net/yasser",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/2.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "ناصر القطامي",
        "name_en": "Nasser Al Qatami",
        "server": "https://server6.mp3quran.net/qtm",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/16.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "فارس عباد",
        "name_en": "Fares Abbad",
        "server": "https://server8.mp3quran.net/frs_a",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/8.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "إدريس أبكر",
        "name_en": "Idris Abkar",
        "server": "https://server6.mp3quran.net/abkr",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/19.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "محمود خليل الحصري",
        "name_en": "Mahmoud Khalil Al-Hussary",
        "server": "https://server13.mp3quran.net/husr",
        "rewaya": "حفص عن عاصم - مجود",
        "image": "https://static.surahquran.com/images/reciters/5.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "سعد الغامدي",
        "name_en": "Saad Al Ghamdi",
        "server": "https://server7.mp3quran.net/s_gmd",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/4.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "محمد محمود الطبلاوي",
        "name_en": "Mohamed Mahmoud Al-Tablawi",
        "server": "https://server12.mp3quran.net/tblawi",
        "rewaya": "حفص عن عاصم - مجود",
        "image": "https://static.surahquran.com/images/reciters/tablawi.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "مصطفى إسماعيل",
        "name_en": "Mustafa Ismail",
        "server": "https://server8.mp3quran.net/mustafa",
        "rewaya": "حفص عن عاصم - مجود",
        "image": "https://static.surahquran.com/images/reciters/mustafa.jpg",
        "featured": True,
        "category": "Famous"
    },
    {
        "name": "خالد الجليل",
        "name_en": "Khalid Al Jalil",
        "server": "https://server11.mp3quran.net/jalil",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/jalil.jpg",
        "featured": False,
        "category": "Popular"
    },
    {
        "name": "عبدالله الجهني",
        "name_en": "Abdullah Al Juhani",
        "server": "https://server12.mp3quran.net/jhn",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/juhani.jpg",
        "featured": False,
        "category": "Popular"
    },
    {
        "name": "بندر بليلة",
        "name_en": "Bandar Baleela",
        "server": "https://server10.mp3quran.net/bandar",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/bandar.jpg",
        "featured": False,
        "category": "Popular"
    },
    {
        "name": "علي جابر",
        "name_en": "Ali Jaber",
        "server": "https://server6.mp3quran.net/jbr",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/jaber.jpg",
        "featured": False,
        "category": "Popular"
    },
    {
        "name": "صلاح البدير",
        "name_en": "Salah Al Budair",
        "server": "https://server7.mp3quran.net/s_bud",
        "rewaya": "حفص عن عاصم",
        "image": "https://static.surahquran.com/images/reciters/budair.jpg",
        "featured": False,
        "category": "Popular"
    }
]

def main():
    print("🕌 Starting Quran Reciters Database Population...")
    print(f"📊 Total reciters to add: {len(RECITERS)}\n")
    
    success_count = 0
    error_count = 0
    
    for idx, reciter in enumerate(RECITERS, 1):
        try:
            # Create combined name for display
            display_name = f"{reciter['name']} - {reciter['name_en']}"
            
            # Check if reciter already exists
            existing = supabase.table('quran_reciters').select('id').eq('name', display_name).execute()
            
            if existing.data and len(existing.data) > 0:
                print(f"⏭️  [{idx}/{len(RECITERS)}] Skipping (already exists): {display_name}")
                continue
            
            # Insert reciter
            data = {
                "name": display_name,
                "server": reciter['server'],
                "rewaya": reciter['rewaya'],
                "image": reciter['image'],
                "is_active": True,
                "featured": reciter['featured'],
                "category": reciter['category'],
                "surah_list": None  # All surahs available by default
            }
            
            result = supabase.table('quran_reciters').insert(data).execute()
            
            if result.data:
                print(f"✅ [{idx}/{len(RECITERS)}] Added: {display_name}")
                success_count += 1
            else:
                print(f"❌ [{idx}/{len(RECITERS)}] Failed: {display_name}")
                error_count += 1
                
        except Exception as e:
            print(f"❌ [{idx}/{len(RECITERS)}] Error adding {reciter['name']}: {str(e)}")
            error_count += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully added: {success_count} reciters")
    print(f"❌ Errors: {error_count}")
    print(f"📊 Total processed: {success_count + error_count}/{len(RECITERS)}")
    print(f"{'='*60}\n")
    
    if success_count > 0:
        print("🎉 Quran Reciters database populated successfully!")
    else:
        print("⚠️  No new reciters were added. Database may already be populated.")

if __name__ == "__main__":
    main()
