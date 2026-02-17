from external_fetcher import ExternalContentFetcher

def main():
    fetcher = ExternalContentFetcher()
    
    # 1. Plays (Masrahiyat)
    print("\n--- Fetching Plays ---")
    fetcher.search_and_fetch_videos('مسرحية كاملة', category='play', limit=20)
    fetcher.search_and_fetch_videos('مسرحية عادل امام كاملة', category='play', limit=10)
    fetcher.search_and_fetch_videos('مسرحية محمد صبحي كاملة', category='play', limit=10)

    # 2. Summaries (Molakhasat)
    print("\n--- Fetching Summaries ---")
    fetcher.search_and_fetch_videos('ملخص فيلم', category='summary', limit=20)
    fetcher.search_and_fetch_videos('فيلم في الخمسينة', category='summary', limit=10) # Popular summary channel style query

    # 3. Classics
    print("\n--- Fetching Classics ---")
    fetcher.search_and_fetch_videos('classic movies full movie', category='classic', limit=20)
    fetcher.search_and_fetch_videos('افلام ابيض واسود كاملة', category='classic', limit=20)
    
    # Also fetch from Archive.org for classics
    fetcher.fetch_archive_items('collection:(classic_cinema)', max_results=10)

if __name__ == "__main__":
    main()
