import os
import re
import json
import time
from typing import Any, Dict, List, Tuple
import requests
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass
try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = Any
try:
    import yt_dlp as ytdlp
except Exception:
    ytdlp = None
try:
    from pytrends.request import TrendReq
except Exception:
    TrendReq = None
try:
    import openai
except Exception:
    openai = None
try:
    import google.generativeai as genai
except Exception:
    genai = None

BLACKLIST = ['summary', 'recap', 'ملخص', 'مشهد', 'part', 'clip', 'trailer', 'promo']
WHITELIST_RECAP = ['ملخص', 'شرح', 'تحليل', 'قصة', 'مراجعة', 'Recap', 'Breakdown', 'Analysis', 'Review', 'Explained', 'Story of']

SEARCH_QUERIES = {
    'gaming': [
        'Best gameplay no copyright', 'Top gaming moments', 'Walkthrough no commentary', 
        'Minecraft survival guide', 'Fortnite best moments', 'Elden Ring gameplay', 
        'GTA V funny moments', 'Roblox gameplay', 'League of Legends pro play',
        'Valorant highlights', 'Call of Duty warzone gameplay'
    ],
    'programming': [
        'Python full course for beginners', 'React tutorial 2025', 'Web development roadmap 2025',
        'JavaScript crash course', 'Next.js 14 tutorial', 'Learn coding from scratch',
        'Data structures and algorithms python', 'Machine learning basics', 'Flutter tutorial',
        'Docker for beginners', 'SQL database tutorial'
    ],
    'trending': [
        'Viral videos 2025', 'Most viewed videos this week', 'Trending now worldwide',
        'Funny videos 2025', 'Amazing inventions', 'Satisfying videos', 'Life hacks 2025'
    ],
    'golden_era': [
        'Old Egyptian movies archive', 'Classic Arabic movies', 'Public domain horror movies',
        'Charlie Chaplin full movie', 'Buster Keaton full movie', 'Alfred Hitchcock public domain',
        'افلام ابيض واسود كاملة', 'افلام مصرية قديمة نادرة', 'مسرحيات مصرية قديمة'
    ],
    'plays': [
        'مسرحية كاملة', 'مسرحيات مصرية كوميدية', 'مسرحية العيال كبرت كاملة', 
        'مسرحية مدرسة المشاغبين كاملة', 'مسرحية المتزوجون كاملة', 'مسرحية سك على بناتك'
    ],
    'music': [
        'No copyright music', 'Lo-fi hip hop study beats', 'Relaxing music for coding',
        'Workout music 2025', 'Top hits 2025 clean', 'Classical music for focus'
    ]
}

def supabase_client() -> Client:
    url = os.getenv('SUPABASE_URL') or ''
    key = (
        os.getenv('SUPABASE_SERVICE_ROLE')
        or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        or os.getenv('SUPABASE_ANON_KEY')
        or ''
    )
    if not create_client:
        raise RuntimeError('supabase missing')
    if not url or not key:
        raise RuntimeError('supabase env')
    return create_client(url, key)
def classify_content_gemini(title: str, description: str) -> str:
    if not genai:
        return 'unknown'
    try:
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Analyze the following video title and description and categorize it into EXACTLY one of these tags: ['movie', 'play', 'gaming', 'programming', 'trending', 'music'].
        
        Title: {title}
        Description: {description[:500]}
        
        Return ONLY the tag name. If it doesn't fit, return 'other'.
        """
        response = model.generate_content(prompt)
        tag = response.text.strip().lower()
        valid_tags = ['movie', 'play', 'gaming', 'programming', 'trending', 'music']
        if tag in valid_tags:
            return tag
        return 'other'
    except Exception:
        return 'unknown'

def classify_fallback(title: str, description: str) -> str:
    text = (title + ' ' + description).lower()
    if any(x in text for x in ['gameplay', 'walkthrough', 'no copyright', 'gaming', 'ps5', 'xbox', 'minecraft', 'fortnite']):
        return 'gaming'
    if any(x in text for x in ['tutorial', 'course', 'python', 'javascript', 'react', 'coding', 'programming', 'web development']):
        return 'programming'
    if any(x in text for x in ['play', 'masrahiya', 'theater', 'مسرحية']):
        return 'play'
    if any(x in text for x in ['movie', 'film', 'full movie', 'فيلم', 'حصري']):
        return 'movie'
    if any(x in text for x in ['music', 'song', 'clip', 'video', 'track']):
        return 'music'
    return 'trending'

def ai_clean_title_year(title: str) -> Tuple[str, int | None]:
    # Try Gemini first if available
    if genai:
        try:
            genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
            model = genai.GenerativeModel('gemini-pro')
            prompt = f"Extract real Arabic/English title and 4-digit year if present from: {title}. Return as JSON with keys title and year."
            resp = model.generate_content(prompt)
            txt = resp.text.strip()
            # extract json from text if needed (sometimes gemini adds backticks)
            if '```json' in txt:
                txt = txt.split('```json')[1].split('```')[0]
            elif '```' in txt:
                txt = txt.split('```')[1].split('```')[0]
            obj = json.loads(txt)
            t = str(obj.get('title') or title).strip()
            y = obj.get('year')
            if isinstance(y, str) and y.isdigit():
                y = int(y)
            if isinstance(y, int) and (y < 1900 or y > 2100):
                y = None
            return t, y
        except Exception:
            pass
            
    if not openai:
        y = None
        t = re.sub(r'\b(كاملة|بدون حذف|full movie|كامل|HD|1080p|4K)\b', '', title, flags=re.IGNORECASE).strip()
        return t, y
    openai.api_key = os.getenv('OPENAI_API_KEY', '')
    prompt = f"Extract real Arabic/English title and 4-digit year if present from: {title}. Return as JSON with keys title and year."
    try:
        resp = openai.ChatCompletion.create(model="gpt-4o-mini", messages=[{"role":"user","content":prompt}], temperature=0.2)
        txt = resp.choices[0].message.content
        obj = json.loads(txt) if txt else {}
        t = str(obj.get('title') or title).strip()
        y = obj.get('year')
        if isinstance(y, str) and y.isdigit():
            y = int(y)
        if isinstance(y, int) and (y < 1900 or y > 2100):
            y = None
        return t, y
    except Exception:
        t = re.sub(r'\(\d{4}\)', '', title).strip()
        return t, None

def contains_any(text: str, words: List[str]) -> bool:
    for w in words:
        if re.search(rf'\b{re.escape(w)}\b', text, flags=re.IGNORECASE):
            return True
    return False

def validate_video(video: Dict[str, Any], target_category: str) -> Tuple[bool, Dict[str, Any]]:
    title = str(video.get('title') or '').strip()
    desc = str(video.get('description') or video.get('webpage_url') or '')
    duration = int(video.get('duration') or 0)
    views = int(video.get('view_count') or 0)
    url = str(video.get('webpage_url') or video.get('url') or '')
    
    # Strict Classification
    detected_category = classify_content_gemini(title, desc)
    if detected_category == 'unknown' or detected_category == 'other':
        detected_category = classify_fallback(title, desc)
    
    # If user asked for specific category, ensure match
    # Mapping some variations
    cat_map = {
        'plays': 'play',
        'golden_era': 'movie',
        'recaps': 'movie', # Recaps are technically about movies
        'movies': 'movie',
        'gaming': 'gaming',
        'programming': 'programming',
        'trending': 'trending',
        'music': 'music'
    }
    
    mapped_target = cat_map.get(target_category, target_category)
    
    # Special handling for recaps (they are movies but specific type)
    if target_category == 'recaps':
        if not contains_any(title, WHITELIST_RECAP):
             return False, {}
        # Relax strict check for recaps as Gemini might classify as 'movie' or 'other'
    elif target_category == 'golden_era':
         if duration < 3000: # 50 mins
             return False, {}
         if detected_category != 'movie':
             return False, {}
    elif target_category == 'plays':
         if duration < 3000:
             return False, {}
         if detected_category != 'play':
             # Fallback if Gemini missed it but title says Masrahiya
             if not contains_any(title, ['مسرحية']):
                 return False, {}
    else:
        if detected_category != mapped_target and mapped_target != 'trending':
            # Allow trending to contain mixed, OR strict? User said "Strict Categorization"
            # "A programming tutorial MUST NOT appear in the movies section"
            return False, {}

    cleaned_title, year = title, None
    if target_category in ('plays', 'golden_era', 'movies'):
        cleaned_title, year = ai_clean_title_year(title)
        
    return True, {'title': cleaned_title, 'year': year, 'duration': duration, 'views': views, 'url': url, 'category': detected_category}

def yt_search(query: str, max_results: int = 25, platform: str = 'youtube') -> List[Dict[str, Any]]:
    if not ytdlp:
        return []
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'extract_flat': True, 
        'simulate': True,
        'noplaylist': True,
        'default_search': 'ytsearch',
        'ignoreerrors': True,
        'nocheckcertificate': True,
        'max_downloads': max_results
    }
    
    # Platform-specific adjustments
    search_query = query
    if platform == 'dailymotion':
        # Dailymotion search often works better with direct search URL or just relying on yt-dlp search if specific prefix exists (usually no direct prefix like ytsearch)
        # But we can try constructing a search URL for Dailymotion if yt-dlp supports it well.
        # Actually, let's try 'dailymotionsearch' prefix if it exists, or fallback to URL.
        # yt-dlp doesn't document 'dailymotionsearch'.
        # Let's try to construct a search URL.
        search_query = f"https://www.dailymotion.com/search/{query}/videos"
        ydl_opts['extract_flat'] = 'in_playlist' # Extract from search results page
    elif platform == 'archive':
        # Archive.org search URL
        search_query = f"https://archive.org/search.php?query={query}&sort=-downloads"
        ydl_opts['extract_flat'] = 'in_playlist'
    else:
        # Default YouTube
        search_query = f"ytsearch{max_results}:{query}"

    # Let's use extract_flat=False to get full metadata including description if needed
    # But for search lists, it might be too slow.
    # However, for accurate classification, we need description.
    # We can fetch minimal info first, then fetch full info for candidates?
    # Or just fetch full info (slow but accurate).
    ydl_opts['extract_flat'] = False 
    
    results = []
    with ytdlp.YoutubeDL(ydl_opts) as ydl:
        try:
            # support direct URLs if query looks like one
            if query.startswith('http'):
                info = ydl.extract_info(query, download=False)
                if 'entries' in info:
                     results.extend(info['entries'])
                else:
                     results.append(info)
            else:
                info = ydl.extract_info(search_query, download=False)
                entries = info.get('entries') or []
                # For Archive.org or Dailymotion search pages, entries might be iterators
                for e in entries:
                    if e:
                        results.append(e)
        except Exception:
            return []
    return results

def upsert_video(sb: Client, row: Dict[str, Any]) -> None:
    tbl = os.getenv('WORKSPACE_TABLE', 'videos')
    rid = row.get('id') or row.get('source_id')
    if rid:
        sb.table(tbl).upsert(row, on_conflict='id').execute()
    else:
        sb.table(tbl).upsert(row).execute()

def aggregate(category: str, queries: List[str] = None) -> List[Dict[str, Any]]:
    sb = supabase_client()
    out = []
    
    # If no queries provided, use defaults based on category
    if not queries:
        queries = SEARCH_QUERIES.get(category, [])
        if not queries:
            # Fallback defaults if not in map
            if category == 'plays':
                queries = ['مسرحية كاملة', 'مسرحيات مصرية قديمة']
            elif category == 'golden_era':
                queries = ['افلام ابيض واسود', 'Old Egyptian movies']
            else:
                queries = ['trending videos']

    # Determine platforms to search based on category
    platforms = ['youtube']
    if category in ['golden_era', 'movies', 'plays']:
        platforms.extend(['dailymotion', 'archive'])
    elif category in ['gaming', 'programming', 'music']:
        # Usually YouTube is best, maybe Dailymotion
        pass

    for platform in platforms:
        for q in queries:
            vids = yt_search(q, max_results=10, platform=platform) # Limit to 10 per query per platform to avoid timeout
            for v in vids:
                keep, data = validate_video(v, category)
                if not keep:
                    continue
                
                # Extract ID safely
                vid_id = v.get('id') or v.get('display_id') or ''
                if not vid_id:
                    continue

                vid = {
                    'id': vid_id,
                    'source': platform, # store platform name as source for now, or refine
                    'source_id': vid_id,
                    'title': data.get('title') or '',
                    'year': data.get('year'),
                    'duration': data.get('duration'),
                    'views': data.get('views'),
                    'url': data.get('url'),
                    'thumbnail': v.get('thumbnail') or '',
                    'channel': v.get('channel') or v.get('uploader') or '',
                    'category': category,
                    'source_platform': platform
                }
                upsert_video(sb, vid)
                out.append(vid)
                time.sleep(0.2)
    return out
def get_trending_keywords() -> List[str]:
    keys: List[str] = []
    if not TrendReq:
        return keys
    pytrends = TrendReq(hl='ar', tz=360)
    for pn in ['egypt', 'saudi-arabia']:
        try:
            df = pytrends.trending_searches(pn=pn)
            for k in df[0].tolist():
                if isinstance(k, str):
                    keys.append(k)
        except Exception:
            continue
    keys = list(dict.fromkeys(keys))
    return keys
def openai_rewrite(title: str, overview: str, trend: str) -> Tuple[str, str]:
    if not openai:
        return f"مشاهدة {title} مترجم - {trend}", (overview or '')[:160]
    openai.api_key = os.getenv('OPENAI_API_KEY', '')
    prompt = f"Rewrite Arabic SEO title and meta description using trend: {trend}. Title: {title}. Overview: {overview}. Return JSON with seo_title and meta_description."
    try:
        resp = openai.ChatCompletion.create(model="gpt-4o-mini", messages=[{"role":"user","content":prompt}], temperature=0.3)
        txt = resp.choices[0].message.content
        obj = json.loads(txt) if txt else {}
        t = str(obj.get('seo_title') or f"مشاهدة {title}").strip()
        d = str(obj.get('meta_description') or overview or '').strip()[:160]
        return t, d
    except Exception:
        return f"مشاهدة {title}", (overview or '')[:160]
def apply_trend_seo() -> List[Dict[str, Any]]:
    sb = supabase_client()
    trends = get_trending_keywords()
    data = sb.table('movies').select('id,title,overview,seo_title,meta_description').execute()
    rows = data.data or []
    updated = []
    for m in rows:
        t = m.get('title') or ''
        ov = m.get('overview') or ''
        hit = None
        for kw in trends:
            if isinstance(kw, str) and (kw in t or kw in ov):
                hit = kw
                break
        if not hit and trends:
            hit = trends[0]
        if not hit:
            continue
        seo_t, seo_d = openai_rewrite(t, ov, hit)
        sb.table('movies').update({'seo_title': seo_t, 'meta_description': seo_d}).eq('id', str(m.get('id'))).execute()
        updated.append({'id': m.get('id'), 'seo_title': seo_t, 'meta_description': seo_d})
    return updated
def update_seo_keywords() -> Dict[str, Any]:
    sb = supabase_client()
    trends = get_trending_keywords()
    kw = ', '.join(trends[:20])
    out = {'movies': 0}
    try:
        sb.table('movies').update({'seo_keywords': kw}).neq('id', '').execute()
        out['movies'] = 1
    except Exception:
        out['movies'] = 0
    return out
def indexnow_ping(urls: List[str]) -> Dict[str, Any]:
    key = os.getenv('INDEXNOW_KEY', '')
    host = os.getenv('SITE_HOST', 'cinma.online')
    key_location = os.getenv('INDEXNOW_KEY_LOCATION', f'https://{host}/{key}.txt') if key else ''
    payload = {'host': host, 'key': key, 'keyLocation': key_location, 'urlList': urls}
    r = requests.post('https://api.indexnow.org/indexnow', json=payload, timeout=10)
    try:
        return {'status': r.status_code, 'data': r.json()}
    except Exception:
        return {'status': r.status_code, 'text': r.text}
def auto_index_new_content(limit: int = 50) -> Dict[str, Any]:
    sb = supabase_client()
    site = os.getenv('SITE_BASE_URL', 'https://cinma.online')
    data = sb.table('movies').select('id').order('created_at', desc=True).limit(limit).execute()
    ids = [str(x['id']) for x in (data.data or [])]
    urls = [f"{site}/movie/{i}" for i in ids]
    return indexnow_ping(urls)
def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['aggregate', 'trend', 'indexnow', 'keywords'])
    p.add_argument('--category', default='plays')
    p.add_argument('--queries', nargs='*', default=[])
    args = p.parse_args()
    if args.cmd == 'aggregate':
        qs = args.queries or (['مسرحية كاملة', 'الزمن الجميل افلام كاملة'] if args.category in ('plays','golden_era') else ['ملخص فيلم', 'تحليل فيلم', 'Minecraft عربي', 'افلام وثائقية'])
        res = aggregate(args.category, qs)
        print(json.dumps({'inserted': len(res)}, ensure_ascii=False))
    elif args.cmd == 'trend':
        res = apply_trend_seo()
        print(json.dumps({'updated': len(res)}, ensure_ascii=False))
    elif args.cmd == 'indexnow':
        out = auto_index_new_content()
        print(json.dumps(out, ensure_ascii=False))
    elif args.cmd == 'keywords':
        out = update_seo_keywords()
        print(json.dumps(out, ensure_ascii=False))
if __name__ == '__main__':
    main()
