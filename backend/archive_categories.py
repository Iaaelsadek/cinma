from tmdb_fetcher import TMDBFetcher

def main():
    fetcher = TMDBFetcher()
    
    # 1. Disney Content
    print("\n--- Fetching Disney Content ---")
    fetcher.fetch_discover('movie', {'with_companies': '2|3', 'sort_by': 'popularity.desc'}, pages=3)
    
    # 2. Arabic Content (Movies & Series)
    print("\n--- Fetching Arabic Content ---")
    fetcher.fetch_discover('movie', {'with_original_language': 'ar', 'sort_by': 'popularity.desc'}, pages=5)
    fetcher.fetch_discover('tv', {'with_original_language': 'ar', 'sort_by': 'popularity.desc'}, pages=5)
    
    # 3. Ramadan Series
    print("\n--- Fetching Ramadan Content ---")
    # Using generic query or specific keywords if known. 
    # Keyword 209288 is often used for Ramadan Series.
    fetcher.fetch_discover('tv', {'with_keywords': '209288', 'sort_by': 'first_air_date.desc'}, pages=3)
    # Backup: Text search for "رمضان" to catch items without the keyword
    print("\n--- Fetching Ramadan Content (Text Search) ---")
    fetcher.fetch_search('tv', 'رمضان', pages=2)
    
    # 4. Indian Cinema
    print("\n--- Fetching Indian Content ---")
    fetcher.fetch_discover('movie', {'with_original_language': 'hi', 'sort_by': 'popularity.desc'}, pages=3)
    
    # 5. Foreign (English) - Top Rated/Popular
    print("\n--- Fetching Foreign Content ---")
    fetcher.fetch_discover('movie', {'with_original_language': 'en', 'sort_by': 'popularity.desc'}, pages=3)
    
    # 6. Animation / Cartoons
    print("\n--- Fetching Animation ---")
    fetcher.fetch_discover('movie', {'with_genres': '16', 'sort_by': 'popularity.desc'}, pages=3)

if __name__ == "__main__":
    main()
