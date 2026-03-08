import requests
import re
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin

def inspect_page(url, referer=None):
    print(f"\n[*] Inspecting: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    if referer:
        headers['Referer'] = referer
        
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"[*] Status: {response.status_code}")
        
        if response.status_code != 200:
            return None

        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for media
        m3u8 = re.findall(r'(https?://[^\s"\'<>]+\.m3u8)', html)
        mp4 = re.findall(r'(https?://[^\s"\'<>]+\.mp4)', html)
        
        if m3u8:
            print(f"[+] FOUND M3U8: {m3u8[0]}")
        if mp4:
            print(f"[+] FOUND MP4: {mp4[0]}")
            
        # Check for Clappr/JWPlayer
        if "Clappr.Player" in html:
            print("[!] Detected Clappr Player")
        if "jwplayer(" in html:
            print("[!] Detected JWPlayer")
            
        # Check for obfuscation
        if "eval(function(p,a,c,k,e,d)" in html:
            print("[!] DETECTED: Packed JavaScript (Dean Edwards)")
            
        # List Scripts
        scripts = soup.find_all('script')
        print(f"[*] Found {len(scripts)} scripts.")
        for s in scripts:
            if s.get('src'):
                print(f"    - Script SRC: {s.get('src')}")
            # Check inline for keywords
            elif s.string:
                if 'player' in s.string.lower() or 'source' in s.string.lower():
                    print(f"    - Inline script contains 'player' or 'source' keywords.")

        # Return soup for further extraction
        return soup
        
    except Exception as e:
        print(f"[!] Error: {e}")
        return None

def test_scraper():
    # Level 1: vidsrc.to
    start_url = "https://vidsrc.to/embed/movie/157336"
    soup = inspect_page(start_url, referer="https://vidsrc.to/")
    
    if not soup:
        return

    # Look for iframes to follow
    iframes = soup.find_all('iframe')
    for iframe in iframes:
        src = iframe.get('src')
        if src:
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(start_url, src)
                
            print(f"[*] Found Iframe: {src}")
            
            # Level 2: The Nested Player (e.g. vsembed.ru)
            # We follow it
            inspect_page(src, referer=start_url)

if __name__ == "__main__":
    test_scraper()
