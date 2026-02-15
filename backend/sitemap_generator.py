import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
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

BASE_URL = "https://cinma.online"

def generate_sitemap():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials missing.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Generating sitemap...")
    
    urls = []
    
    # Static pages
    static_pages = [
        "",
        "/movies",
        "/series",
        "/anime",
        "/games",
        "/software",
        "/quran",
        "/kids",
        "/search",
        "/dmca",
        "/privacy"
    ]
    
    for page in static_pages:
        urls.append({
            "loc": f"{BASE_URL}{page}",
            "lastmod": datetime.now().strftime("%Y-%m-%d"),
            "changefreq": "daily",
            "priority": "1.0" if page == "" else "0.8"
        })

    # Fetch Movies
    try:
        movies = supabase.table("movies").select("id, created_at").eq("is_active", True).execute()
        for m in movies.data:
            urls.append({
                "loc": f"{BASE_URL}/watch/movie/{m['id']}",
                "lastmod": m.get('created_at', datetime.now().isoformat())[:10],
                "changefreq": "weekly",
                "priority": "0.9"
            })
    except Exception as e:
        print(f"Error fetching movies: {e}")

    # Fetch TV Series
    try:
        series = supabase.table("tv_series").select("id, created_at").eq("is_active", True).execute()
        for s in series.data:
            urls.append({
                "loc": f"{BASE_URL}/watch/tv/{s['id']}",
                "lastmod": s.get('created_at', datetime.now().isoformat())[:10],
                "changefreq": "weekly",
                "priority": "0.9"
            })
    except Exception as e:
        print(f"Error fetching series: {e}")

    # Generate XML content
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for url in urls:
        xml_content += '  <url>\n'
        xml_content += f'    <loc>{url["loc"]}</loc>\n'
        xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += f'    <changefreq>{url["changefreq"]}</changefreq>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        xml_content += '  </url>\n'
    
    xml_content += '</urlset>'
    
    # Save to public folder
    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'sitemap.xml')
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
        
    print(f"Sitemap generated successfully with {len(urls)} URLs at {output_path}")

if __name__ == "__main__":
    generate_sitemap()
