import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

class AILinkFinder:
    def __init__(self):
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-3.1-pro')
        else:
            self.model = None
            print("Warning: Gemini API Key missing")

    def find_alternative_links(self, movie_title, year, media_type='movie'):
        """Use Gemini to guess potential embed link structures or find known ones."""
        if not self.model:
            return {}

        prompt = f"""You are an expert in streaming url structures. 
        Generate a JSON object containing POTENTIAL direct embed links for the {media_type} "{movie_title}" ({year}).
        Focus on these common patterns/services (replace ID/Title placeholders correctly):
        - vidsrc.to (usually requires TMDB ID, but try to guess if you know it or use title slug)
        - 2embed.cc
        - autoembed.to
        - embed.su
        - vidsrc.me
        - moviesapi.club
        
        Return ONLY valid JSON. No markdown formatting. No explanation.
        Format:
        {{
            "vidsrc": "https://vidsrc.to/embed/...",
            "2embed": "https://2embed.cc/embed/..."
        }}
        
        If you don't have enough info to generate a likely valid URL, return {{}}.
        """
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Clean up potential markdown code blocks
            if text.startswith('```json'):
                text = text[7:]
            if text.endswith('```'):
                text = text[:-3]
            
            links = json.loads(text.strip())
            return links
        except Exception as e:
            print(f"Gemini Link Find Error: {e}")
            return {}

if __name__ == "__main__":
    finder = AILinkFinder()
    links = finder.find_alternative_links("Inception", 2010)
    print(json.dumps(links, indent=2))
