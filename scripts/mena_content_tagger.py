import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

# --- CONFIGURATION ---
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

# Ramadan Start Dates (Approximate)
RAMADAN_DATES = {
    2015: "06-18",
    2016: "06-06",
    2017: "05-27",
    2018: "05-16",
    2019: "05-06",
    2020: "04-24",
    2021: "04-13",
    2022: "04-02",
    2023: "03-23",
    2024: "03-11",
    2025: "02-28",
    2026: "02-17",
}

def is_date_in_ramadan_window(date_str):
    """
    Checks if a date is within the Ramadan window (2 weeks before to 2 weeks after start).
    """
    if not date_str:
        return False
    
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        year = dt.year
        
        if year not in RAMADAN_DATES:
            return False
            
        ramadan_start = datetime.strptime(f"{year}-{RAMADAN_DATES[year]}", "%Y-%m-%d")
        
        # Calculate difference in days
        diff = (dt - ramadan_start).days
        
        # Series usually start 1-2 days before Ramadan or during the first week
        # We allow a window from -5 days to +20 days relative to start
        return -5 <= diff <= 20
        
    except ValueError:
        return False

def detect_content_type(item, media_type):
    """
    Analyzes item data to tag content.
    """
    tags = {
        "is_ramadan": False,
        "is_play": False
    }
    
    title = item.get('title') if media_type == 'movie' else item.get('name')
    original_title = item.get('original_title') if media_type == 'movie' else item.get('original_name')
    overview = item.get('overview', '') or ''
    origin_country = item.get('origin_country', []) or []
    
    # Ensure strings
    title = (title or "").lower()
    original_title = (original_title or "").lower()
    overview = overview.lower()
    
    # 1. Detect Ramadan Series
    if media_type == 'tv':
        # Must be Arabic origin usually
        is_arabic = 'EG' in origin_country or 'SA' in origin_country or 'KW' in origin_country or 'AE' in origin_country or 'SY' in origin_country or 'LB' in origin_country or any(c in ['EG','SA','KW','AE','SY','LB','IQ','OM','QA','BH','JO','PS','YE','SD','LY','TN','DZ','MA'] for c in origin_country)
        
        if is_arabic:
            first_air_date = item.get('first_air_date')
            if is_date_in_ramadan_window(first_air_date):
                tags["is_ramadan"] = True
                print(f"   [RAMADAN DETECTED BY DATE]: {title} ({first_air_date})")
            
            # Keyword Check
            keywords = ["ramadan", "رمضان", "mosalsalat", "مسلسل"]
            if any(k in title for k in keywords) or any(k in overview for k in keywords):
                # Only trust keyword if date is somewhat close or missing, or explicitly mentioned
                tags["is_ramadan"] = True
                print(f"   [RAMADAN DETECTED BY KEYWORD]: {title}")

    # 2. Detect Plays (Masrahiyat)
    if media_type == 'movie':
        play_indicators = ["theatre play", "stage play", "masrahiya", "مسرحية", "theatrical production", "مسرحيه"]
        
        if any(ind in title for ind in play_indicators) or \
           any(ind in original_title for ind in play_indicators) or \
           any(ind in overview for ind in play_indicators):
            tags["is_play"] = True
            print(f"   [PLAY DETECTED]: {title}")

    return tags

def tag_content():
    print("--- Starting Content Tagger ---")
    
    # 1. Tag Series
    print("\nScanning Series...")
    try:
        # Fetch all series (limit 1000 for now)
        response = supabase.table('tv_series').select('*').limit(1000).execute()
        series_list = response.data
        
        for series in series_list:
            tags = detect_content_type(series, 'tv')
            
            if tags['is_ramadan'] != series.get('is_ramadan', False):
                print(f" -> Updating {series.get('name')}: is_ramadan={tags['is_ramadan']}")
                supabase.table('tv_series').update({'is_ramadan': tags['is_ramadan']}).eq('id', series['id']).execute()
                
    except Exception as e:
        print(f"Error processing series: {e}")

    # 2. Tag Movies (Plays)
    print("\nScanning Movies...")
    try:
        # Fetch all movies
        response = supabase.table('movies').select('*').limit(1000).execute()
        movie_list = response.data
        
        for movie in movie_list:
            tags = detect_content_type(movie, 'movie')
            
            if tags['is_play'] != movie.get('is_play', False):
                print(f" -> Updating {movie.get('title')}: is_play={tags['is_play']}")
                supabase.table('movies').update({'is_play': tags['is_play']}).eq('id', movie['id']).execute()
                
    except Exception as e:
        print(f"Error processing movies: {e}")

    print("\n--- Tagging Complete ---")

if __name__ == "__main__":
    tag_content()
