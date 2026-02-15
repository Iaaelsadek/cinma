import requests
import os
from typing import Dict, Optional

class OMDbFetcher:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OMDB_API_KEY")
        self.base_url = "http://www.omdbapi.com/"

    def get_details(self, imdb_id: str) -> Optional[Dict]:
        """Fetch additional details from OMDb using IMDb ID."""
        if not self.api_key:
            return None
            
        params = {
            'apikey': self.api_key,
            'i': imdb_id,
            'plot': 'full'
        }
        
        try:
            resp = requests.get(self.base_url, params=params)
            data = resp.json()
            
            if data.get('Response') == 'True':
                return {
                    'imdb_rating': data.get('imdbRating'),
                    'metascore': data.get('Metascore'),
                    'awards': data.get('Awards'),
                    'director': data.get('Director'),
                    'actors': data.get('Actors'),
                    'writer': data.get('Writer'),
                    'box_office': data.get('BoxOffice'),
                    'production': data.get('Production')
                }
        except Exception as e:
            print(f"OMDb Fetch Error: {e}")
            
        return None
