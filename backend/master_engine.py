import schedule
import time
import asyncio
import os
import traceback
import math
import sys
from datetime import datetime
from dotenv import load_dotenv

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

def _safe_print(message: str):
    try:
        print(message)
    except UnicodeEncodeError:
        try:
            print(message.encode('ascii', 'ignore').decode())
        except Exception:
            print("[LOG]")

def _get_supabase():
    from supabase import create_client  # Lazy import to keep module import fast
    if SUPABASE_URL and SUPABASE_KEY:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    return None

def _count_table(client, table: str):
    try:
        resp = client.table(table).select("id", count="exact").limit(1).execute()
        return int(resp.count or 0)
    except Exception:
        return 0

def _get_counts():
    client = _get_supabase()
    if not client:
        return None
    return {
        "movies": _count_table(client, "movies"),
        "tv": _count_table(client, "tv_series"),
        "games": _count_table(client, "games"),
        "software": _count_table(client, "software"),
        "anime": _count_table(client, "anime"),
        "quran": _count_table(client, "quran_reciters")
    }

def _build_summary_email(summary: dict, started_at: str, finished_at: str):
    rows = "".join([
        f"<tr><td>{k}</td><td>{v}</td></tr>"
        for k, v in summary.items()
    ])
    return f"""
    <div style="background:#0f0f0f;color:#e5e5e5;font-family:Arial,sans-serif;padding:24px;">
      <div style="background:#111827;padding:16px 20px;border-radius:12px;font-size:18px;font-weight:bold;">
        Cinema Online
      </div>
      <div style="margin-top:16px;font-size:14px;">
        <div>Started: {started_at}</div>
        <div>Finished: {finished_at}</div>
      </div>
      <table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #2d2d2d;">Category</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #2d2d2d;">New Items</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
    """

def _send_success_report(before_counts, after_counts, started_at: str, finished_at: str):
    from email_notifier import send_admin_email  # Lazy import to avoid side effects on module import
    if not before_counts or not after_counts:
        return
    summary = {
        "New Movies": max(0, after_counts["movies"] - before_counts["movies"]),
        "New Series": max(0, after_counts["tv"] - before_counts["tv"]),
        "New Games": max(0, after_counts["games"] - before_counts["games"]),
        "New Software": max(0, after_counts["software"] - before_counts["software"]),
        "New Anime": max(0, after_counts["anime"] - before_counts["anime"]),
        "New Quran Reciters": max(0, after_counts["quran"] - before_counts["quran"])
    }
    body = _build_summary_email(summary, started_at, finished_at)
    send_admin_email("✅ [Cinema Online] Content Update Successful", body)
def log_next_run():
    try:
        nxt = schedule.next_run()
    except Exception:
        nxt = None
    if nxt:
        delta = nxt - datetime.now()
        secs = int(delta.total_seconds())
        hrs = max(0, secs // 3600)
        mins = max(0, (secs % 3600) // 60)
        _safe_print(f"[SCHEDULE] التحديث القادم عند: {nxt.strftime('%Y-%m-%d %H:%M:%S')} (بعد ~{hrs}h {mins}m)")
    else:
        _safe_print("[SCHEDULE] لا توجد مهام مجدولة حالياً.")

def _run_tmdb_batches(fetcher, media_type: str, total_items: int, batch_size: int):
    total_items = max(batch_size, total_items)
    batches = int(math.ceil(total_items / batch_size))
    for idx in range(batches):
        page = idx + 1
        _safe_print(f"[FETCH] {media_type} batch {idx + 1}/{batches} (page {page}, size {batch_size})")
        fetcher.fetch_trending(media_type, pages=1, start_page=page, limit_per_page=batch_size)
        time.sleep(1)

def _run_full_sync():
    # Lazy imports to ensure importing this module is fast and side-effect free
    from tmdb_fetcher import TMDBFetcher
    # from db_automator import init_db
    from fetch_anime import main as fetch_anime
    from fetch_games import main as fetch_games
    from fetch_quran import main as fetch_quran
    started_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    _safe_print(f"[ENGINE] بدء المزامنة الكاملة: {started_at}")
    before_counts = _get_counts()
    try:
        _safe_print("[DEBUG] Initializing DB (Skipped)...")
        # init_db()
        _safe_print("[DEBUG] DB Initialized (Skipped).")
        _safe_print("[DEBUG] Initializing TMDBFetcher...")
        fetcher = TMDBFetcher()
        _safe_print("[DEBUG] TMDBFetcher Initialized.")
        batch_size = int(os.environ.get("ENGINE_BATCH_SIZE", "10"))
        total_items = int(os.environ.get("ENGINE_FULL_SYNC_TOTAL", "50"))
        _safe_print(f"[DEBUG] Running movie batches (total={total_items}, batch={batch_size})...")
        _run_tmdb_batches(fetcher, "movie", total_items, batch_size)
        _safe_print("[DEBUG] Running TV batches...")
        _run_tmdb_batches(fetcher, "tv", total_items, batch_size)
        _safe_print("[SYNC] جلب الأنمي...")
        fetch_anime()
        _safe_print("[SYNC] جلب الألعاب...")
        fetch_games()
        _safe_print("[SYNC] جلب القرّاء...")
        fetch_quran()
        after_counts = _get_counts()
        finished_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        try:
            _send_success_report(before_counts, after_counts, started_at, finished_at)
        except Exception as e:
            _safe_print(f"[EMAIL] فشل إرسال تقرير النجاح: {e}")
    except Exception as e:
        _safe_print(f"[ERROR] خطأ أثناء المزامنة الكاملة: {e}")

def run_cycle():
    from tmdb_fetcher import TMDBFetcher
    # from db_automator import init_db
    from embed_builder import build_embed_for_all
    from rank_servers import rank_servers
    started_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    _safe_print(f"[ENGINE] بدء دورة التحديث: {started_at}")
    before_counts = _get_counts()
    try:
        _safe_print("[DB] التحقق من المخطط (Schema) وتهيئته تلقائياً (Skipped)...")
        # init_db()
        _safe_print("[FETCH] جلب أحدث المحتوى من TMDB...")
        fetcher = TMDBFetcher()
        batch_size = int(os.environ.get("ENGINE_BATCH_SIZE", "10"))
        total_items = int(os.environ.get("ENGINE_BATCH_TOTAL", "20"))
        _run_tmdb_batches(fetcher, "movie", total_items, batch_size)
        _run_tmdb_batches(fetcher, "tv", total_items, batch_size)
        _safe_print("[EMBED] بناء روابط التضمين...")
        build_embed_for_all()
        _safe_print("[LINKS] فحص الروابط (Delta)...")
        from link_checker import LinkChecker
        checker = LinkChecker()
        try:
            asyncio.run(checker.check_delta_links())
        except AttributeError:
            try:
                asyncio.run(checker.check_all_links())
            except Exception:
                pass
        _safe_print("[RANK] ترتيب السيرفرات حسب الأداء...")
        rank_servers()
        _safe_print("[ENGINE] اكتملت دورة التحديث.")
        after_counts = _get_counts()
        finished_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        try:
            _send_success_report(before_counts, after_counts, started_at, finished_at)
        except Exception as e:
            _safe_print(f"[EMAIL] فشل إرسال تقرير النجاح: {e}")
    except Exception as e:
        _safe_print(f"[ERROR] خطأ أثناء دورة التحديث: {e}")
        try:
            finished_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            body = f"""
            <div style="background:#0f0f0f;color:#e5e5e5;font-family:Arial,sans-serif;padding:24px;">
              <div style="background:#7f1d1d;padding:16px 20px;border-radius:12px;font-size:18px;font-weight:bold;">
                Cinema Online Error Report
              </div>
              <div style="margin-top:16px;font-size:14px;">
                <div>Started: {started_at}</div>
                <div>Failed: {finished_at}</div>
                <div style="margin-top:12px;">{str(e)}</div>
              </div>
            </div>
            """
            # Lazy import here as well
            from email_notifier import send_admin_email
            send_admin_email("🚨 [Cinema Online] Emergency Error Report", body, traceback.format_exc())
        except Exception as mail_error:
            _safe_print(f"[EMAIL] فشل إرسال تقرير الخطأ: {mail_error}")
    log_next_run()

if __name__ == "__main__":
    _safe_print(f"[ENGINE] Master Content Engine Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if "--once" in sys.argv or "--full-sync" in sys.argv:
        _run_full_sync()
        raise SystemExit(0)
    interval_hours = int(os.environ.get("ENGINE_INTERVAL_HOURS", "6"))
    schedule.every(interval_hours).hours.do(run_cycle)
    extras_enabled = os.environ.get("EXTRAS_FETCH_ENABLED", "1") not in ("0", "false", "False")
    extras_days = int(os.environ.get("EXTRAS_INTERVAL_DAYS", "7"))
    if extras_enabled:
        def _run_extras_wrapper():
            from fill_extras import run as run_extras
            from email_notifier import send_admin_email
            _safe_print("[EXTRAS] بدء مزامنة الألعاب والبرامج")
            try:
                run_extras()
                _safe_print("[EXTRAS] تمت مزامنة الألعاب والبرامج")
            except Exception as e:
                _safe_print(f"[EXTRAS] فشل مزامنة الإضافات: {e}")
                try:
                    body = f"""
                    <div style="background:#0f0f0f;color:#e5e5e5;font-family:Arial,sans-serif;padding:24px;">
                      <div style="background:#7f1d1d;padding:16px 20px;border-radius:12px;font-size:18px;font-weight:bold;">
                        Cinema Online Extras Error
                      </div>
                      <div style="margin-top:16px;font-size:14px;">
                        <div>{str(e)}</div>
                      </div>
                    </div>
                    """
                    send_admin_email("🚨 [Cinema Online] Extras Sync Error", body, traceback.format_exc())
                except Exception as mail_error:
                    _safe_print(f"[EMAIL] فشل إرسال تقرير خطأ الإضافات: {mail_error}")
        schedule.every(extras_days).days.do(_run_extras_wrapper)
        _run_extras_wrapper()
    run_cycle()
    while True:
        schedule.run_pending()
        try:
            secs = getattr(schedule, "idle_seconds", lambda: 60)()
            if secs is None:
                secs = 60
        except Exception:
            secs = 60
        _safe_print("Waiting for next update cycle...")
        time.sleep(max(1, int(secs)))
