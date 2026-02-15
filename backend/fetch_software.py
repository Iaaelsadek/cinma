import os
import zlib
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_KEY")
)

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase credentials missing")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def deterministic_id(title: str) -> int:
    return int(zlib.crc32(title.lower().encode("utf-8")) & 0xffffffff)

def catalog() -> List[Dict[str, Any]]:
    items = [
        {"title": "Google Chrome", "poster_url": "https://www.google.com/chrome/static/images/favicons/apple-touch-icon-180x180.png", "rating": 9.2, "year": 2008, "download_url": "https://www.google.com/chrome/", "category": "PC", "description": "متصفح سريع وآمن من جوجل"},
        {"title": "Mozilla Firefox", "poster_url": "https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-md.55a1e92c45ae.png", "rating": 9.0, "release_year": 2004, "download_url": "https://www.mozilla.org/firefox/new/", "category": "PC", "description": "متصفح مجاني مفتوح المصدر"},
        {"title": "Brave", "poster_url": "https://brave.com/static-assets/images/press/brave-icon.png", "rating": 8.5, "release_year": 2016, "download_url": "https://brave.com/download/", "category": "PC", "description": "متصفح خصوصية مبني على كروميوم"},
        {"title": "VLC Media Player", "poster_url": "https://www.videolan.org/images/favicon_vlc.png", "rating": 9.5, "release_year": 2001, "download_url": "https://www.videolan.org/vlc/", "category": "PC", "description": "مشغل وسائط مجاني متعدد المنصات"},
        {"title": "PotPlayer", "poster_url": "https://potplayer.daum.net/common/img/favicon-192x192.png", "rating": 8.8, "release_year": 2008, "download_url": "https://potplayer.daum.net/", "category": "PC", "description": "مشغل فيديو خفيف مع خصائص متقدمة"},
        {"title": "7-Zip", "poster_url": "https://www.7-zip.org/img/logo.png", "rating": 9.3, "release_year": 1999, "download_url": "https://www.7-zip.org/download.html", "category": "PC", "description": "أداة مجانية لفك وضغط الملفات"},
        {"title": "WinRAR", "poster_url": "https://www.win-rar.com/pictures/winrar-logo.png", "rating": 8.7, "release_year": 1995, "download_url": "https://www.win-rar.com/download.html", "category": "PC", "description": "أداة ضغط وفتح أرشيفات شعبية"},
        {"title": "qBittorrent", "poster_url": "https://www.qbittorrent.org/img/qbittorrent-logo.png", "rating": 9.1, "release_year": 2006, "download_url": "https://www.qbittorrent.org/download", "category": "PC", "description": "مدير تورنت خفيف ومفتوح المصدر"},
        {"title": "Internet Download Manager", "poster_url": "https://www.internetdownloadmanager.com/favicon.ico", "rating": 8.9, "release_year": 2005, "download_url": "https://www.internetdownloadmanager.com/download.html", "category": "PC", "description": "مدير تحميلات سريع وداعم للاستكمال"},
        {"title": "Discord", "poster_url": "https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico", "rating": 9.0, "release_year": 2015, "download_url": "https://discord.com/download", "category": "PC", "description": "دردشة صوتية ومرئية ومجتمعات للألعاب"},
        {"title": "Steam", "poster_url": "https://store.steampowered.com/favicon.ico", "rating": 9.4, "release_year": 2003, "download_url": "https://store.steampowered.com/about/", "category": "PC", "description": "منصة ألعاب وتوزيع رقمي"},
        {"title": "Epic Games Launcher", "poster_url": "https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico", "rating": 8.3, "release_year": 2018, "download_url": "https://store.epicgames.com/download", "category": "PC", "description": "مشغل متجر Epic للألعاب"},
        {"title": "Visual Studio Code", "poster_url": "https://code.visualstudio.com/favicon.ico", "rating": 9.6, "release_year": 2015, "download_url": "https://code.visualstudio.com/Download", "category": "PC", "description": "محرر كود مجاني من مايكروسوفت"},
        {"title": "PyCharm Community", "poster_url": "https://resources.jetbrains.com/storage/products/company/brand/logos/PyCharm_icon.png", "rating": 8.7, "release_year": 2010, "download_url": "https://www.jetbrains.com/pycharm/download/", "category": "PC", "description": "بيئة تطوير بايثون مجانية"},
        {"title": "Node.js", "poster_url": "https://nodejs.org/static/images/favicons/favicon-32x32.png", "rating": 9.0, "release_year": 2009, "download_url": "https://nodejs.org/en/download", "category": "PC", "description": "بيئة تشغيل جافاسكريبت على الخادم"},
        {"title": "Git", "poster_url": "https://git-scm.com/favicon.ico", "rating": 9.2, "release_year": 2005, "download_url": "https://git-scm.com/download/win", "category": "PC", "description": "نظام التحكم بالإصدارات الموزع"},
        {"title": "Docker Desktop", "poster_url": "https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png", "rating": 8.8, "release_year": 2013, "download_url": "https://www.docker.com/products/docker-desktop/", "category": "PC", "description": "حاويات للتطوير والتشغيل"},
        {"title": "Postman", "poster_url": "https://www.postman.com/_next/static/images/favicon-3acb7a2a16-32x32.png", "rating": 8.9, "release_year": 2014, "download_url": "https://www.postman.com/downloads/", "category": "PC", "description": "أداة لاختبار واجهات REST"},
        {"title": "Figma", "poster_url": "https://static.figma.com/app/icon/1/favicon.ico", "rating": 9.1, "release_year": 2016, "download_url": "https://www.figma.com/downloads/", "category": "PC", "description": "تصميم واجهات ومخططات"},
        {"title": "Adobe Photoshop", "poster_url": "https://www.adobe.com/content/dam/cc/icons/photoshop-mobile.svg", "rating": 9.0, "release_year": 1990, "download_url": "https://www.adobe.com/products/photoshop.html", "category": "PC", "description": "تحرير صور احترافي"},
        {"title": "Adobe Acrobat Reader", "poster_url": "https://acrobat.adobe.com/etc.clientlibs/adobe/clientlibs/clientlib-base/resources/images/favicon_180x180.png", "rating": 8.5, "release_year": 1993, "download_url": "https://get.adobe.com/reader/", "category": "PC", "description": "قارئ ملفات PDF"},
        {"title": "GIMP", "poster_url": "https://www.gimp.org/images/wilber-512.png", "rating": 8.6, "release_year": 1996, "download_url": "https://www.gimp.org/downloads/", "category": "PC", "description": "بديل مفتوح المصدر لبرامج تحرير الصور"},
        {"title": "Blender", "poster_url": "https://download.blender.org/branding/blender_logo_socket.png", "rating": 9.0, "release_year": 1998, "download_url": "https://www.blender.org/download/", "category": "PC", "description": "نمذجة وتحريك ثلاثي الأبعاد"},
        {"title": "OBS Studio", "poster_url": "https://obsproject.com/assets/images/new_icon_small.png", "rating": 9.2, "release_year": 2012, "download_url": "https://obsproject.com/download", "category": "PC", "description": "بث وتسجيل مفتوح المصدر"},
        {"title": "Notion", "poster_url": "https://www.notion.so/images/favicon.ico", "rating": 8.7, "release_year": 2016, "download_url": "https://www.notion.so/desktop", "category": "PC", "description": "ملاحظات وإدارة مشاريع"},
        {"title": "Obsidian", "poster_url": "https://obsidian.md/favicon-32x32.png", "rating": 8.8, "release_year": 2020, "download_url": "https://obsidian.md/download", "category": "PC", "description": "ملاحظات وروابط معرفية"},
        {"title": "Telegram Desktop", "poster_url": "https://telegram.org/img/t_logo.svg", "rating": 8.4, "release_year": 2013, "download_url": "https://desktop.telegram.org/", "category": "PC", "description": "مراسلة سريعة وآمنة"},
        {"title": "WhatsApp Desktop", "poster_url": "https://static.whatsapp.net/rsrc.php/yv/r/6v0fGwNnTzY.svg", "rating": 8.0, "release_year": 2016, "download_url": "https://www.whatsapp.com/download", "category": "PC", "description": "واتساب لسطح المكتب"},
        {"title": "Microsoft PowerToys", "poster_url": "https://learn.microsoft.com/favicon.ico", "rating": 8.3, "release_year": 2019, "download_url": "https://learn.microsoft.com/windows/powertoys/", "category": "PC", "description": "أدوات إنتاجية لنظام ويندوز"},
        {"title": "Everything Search", "poster_url": "https://www.voidtools.com/Everything-1.5a.png", "rating": 8.6, "release_year": 2008, "download_url": "https://www.voidtools.com/downloads/", "category": "PC", "description": "بحث فوري عن الملفات"},
        {"title": "PuTTY", "poster_url": "https://www.chiark.greenend.org.uk/~sgtatham/putty/latest/x86/putty.ico", "rating": 8.0, "release_year": 1999, "download_url": "https://www.putty.org/", "category": "PC", "description": "عميل SSH/Telnet خفيف"},
        {"title": "WinSCP", "poster_url": "https://winscp.net/favicon-32x32.png", "rating": 8.1, "release_year": 2000, "download_url": "https://winscp.net/eng/download.php", "category": "PC", "description": "عميل SFTP وFTP آمن"}
    ]
    for it in items:
        it["id"] = deterministic_id(it["title"])
        # Normalize field name and category fallback
        if "year" not in it and "release_year" in it:
            it["year"] = it.pop("release_year")
        it["category"] = it.get("category") or "Others"
    return items

def upsert_software(rows: List[Dict[str, Any]]):
    sb = get_supabase()
    batch = []
    for i, row in enumerate(rows, 1):
        batch.append(row)
        if len(batch) >= 50 or i == len(rows):
            try:
                sb.table("software").upsert(batch).execute()
            except Exception as e:
                if "year" in str(e) and "column" in str(e):
                    fallback = []
                    for r in batch:
                        r2 = dict(r)
                        if "year" in r2:
                            r2["release_year"] = r2.pop("year")
                        fallback.append(r2)
                    sb.table("software").upsert(fallback).execute()
                else:
                    raise
            batch = []

def main():
    try:
        rows = catalog()
        upsert_software(rows)
        print(f"Inserted/updated {len(rows)} software items")
    except Exception as e:
        print(f"fetch_software error: {e}")

if __name__ == "__main__":
    main()
