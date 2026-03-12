import argparse
import os
import random
import re
import sys
import time
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv


def load_environment() -> Tuple[str, str, str]:
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv()
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_role = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE")
        or os.getenv("SUPABASE_KEY")
    )
    tmdb_api_key = os.getenv("TMDB_API_KEY") or os.getenv("VITE_TMDB_API_KEY")
    if not supabase_url:
        raise SystemExit("Missing SUPABASE_URL")
    if not service_role:
        raise SystemExit("Missing SUPABASE_SERVICE_ROLE_KEY")
    if not tmdb_api_key:
        raise SystemExit("Missing TMDB_API_KEY")
    return supabase_url, service_role, tmdb_api_key


def as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


class MassAcquisitionEngine:
    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        tmdb_api_key: str,
        target: int,
        min_year: int,
        max_year: int,
        min_vote_count: int,
        batch_size: int,
        request_delay: float,
        max_retries: int,
    ) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.tmdb_api_key = tmdb_api_key
        self.target = target
        self.min_year = min_year
        self.max_year = max_year
        self.min_vote_count = min_vote_count
        self.batch_size = batch_size
        self.request_delay = request_delay
        self.max_retries = max_retries
        self.session = requests.Session()
        self.base_url = "https://api.themoviedb.org/3"
        self.supabase_headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal, resolution=merge-duplicates",
        }
        self.stats = {
            "fetched_movie_items": 0,
            "fetched_tv_items": 0,
            "queued_movies": 0,
            "queued_tv": 0,
            "upserted_movies": 0,
            "upserted_tv": 0,
            "tmdb_requests": 0,
            "tmdb_retries": 0,
            "db_retries": 0,
            "skipped_invalid": 0,
            "deduped_in_run": 0,
            "date_ranges_processed": 0,
        }
        self.movie_buffer: List[Dict[str, Any]] = []
        self.tv_buffer: List[Dict[str, Any]] = []
        self.seen_movie_ids: set[int] = set()
        self.seen_tv_ids: set[int] = set()
        self.missing_columns: Dict[str, set[str]] = {"movies": set(), "tv_series": set()}

    def committed_total(self) -> int:
        return self.stats["upserted_movies"] + self.stats["upserted_tv"]

    def pending_total(self) -> int:
        return len(self.movie_buffer) + len(self.tv_buffer)

    def should_stop(self) -> bool:
        return self.committed_total() + self.pending_total() >= self.target

    def tmdb_get(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        payload = {"api_key": self.tmdb_api_key, **params}
        last_error: Optional[str] = None
        for attempt in range(self.max_retries):
            try:
                self.stats["tmdb_requests"] += 1
                response = self.session.get(url, params=payload, timeout=40)
                if response.status_code == 200:
                    time.sleep(self.request_delay)
                    data = response.json()
                    if not isinstance(data, dict):
                        raise RuntimeError("TMDB returned non-object payload")
                    return data
                if response.status_code in {429, 500, 502, 503, 504}:
                    self.stats["tmdb_retries"] += 1
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        sleep_seconds = max(float(retry_after), self.request_delay)
                    else:
                        sleep_seconds = (2 ** attempt) + random.uniform(0.1, 0.7)
                    last_error = f"TMDB {response.status_code}: {response.text[:220]}"
                    print(
                        f"[TMDB RETRY] endpoint={endpoint} attempt={attempt + 1}/{self.max_retries} wait={sleep_seconds:.2f}s",
                        flush=True,
                    )
                    time.sleep(sleep_seconds)
                    continue
                raise RuntimeError(f"TMDB {response.status_code}: {response.text[:300]}")
            except requests.RequestException as exc:
                self.stats["tmdb_retries"] += 1
                sleep_seconds = (2 ** attempt) + random.uniform(0.1, 0.9)
                last_error = str(exc)
                print(
                    f"[TMDB RETRY] endpoint={endpoint} network_error={exc} attempt={attempt + 1}/{self.max_retries} wait={sleep_seconds:.2f}s",
                    flush=True,
                )
                time.sleep(sleep_seconds)
        raise RuntimeError(f"TMDB request failed for {endpoint}: {last_error or 'unknown error'}")

    def normalize_movie(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        tmdb_id = as_int(item.get("id"), 0)
        if tmdb_id <= 0:
            self.stats["skipped_invalid"] += 1
            return None
        title = str(item.get("title") or "").strip()
        if not title:
            self.stats["skipped_invalid"] += 1
            return None
        release_date = str(item.get("release_date") or "").strip()
        return {
            "id": tmdb_id,
            "title": title,
            "overview": str(item.get("overview") or ""),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": release_date if release_date else None,
            "vote_average": as_float(item.get("vote_average"), 0.0),
            "views": 0,
            "is_active": True,
            "category": "movie",
        }

    def normalize_tv(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        tmdb_id = as_int(item.get("id"), 0)
        if tmdb_id <= 0:
            self.stats["skipped_invalid"] += 1
            return None
        name = str(item.get("name") or "").strip()
        if not name:
            self.stats["skipped_invalid"] += 1
            return None
        first_air_date = str(item.get("first_air_date") or "").strip()
        return {
            "id": tmdb_id,
            "name": name,
            "title": name,
            "overview": str(item.get("overview") or ""),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "first_air_date": first_air_date if first_air_date else None,
            "vote_average": as_float(item.get("vote_average"), 0.0),
            "views": 0,
            "is_active": True,
            "category": "tv",
        }

    def flush_movies(self) -> None:
        if not self.movie_buffer:
            return
        remaining = self.target - self.committed_total()
        if remaining <= 0:
            self.movie_buffer.clear()
            return
        payload = self.movie_buffer[:remaining]
        if not payload:
            return
        self.rest_upsert("movies", payload)
        self.stats["upserted_movies"] += len(payload)
        print(
            f"[UPSERT] table=movies batch={len(payload)} total_movies={self.stats['upserted_movies']}",
            flush=True,
        )
        self.movie_buffer = self.movie_buffer[len(payload):]

    def flush_tv(self) -> None:
        if not self.tv_buffer:
            return
        remaining = self.target - self.committed_total()
        if remaining <= 0:
            self.tv_buffer.clear()
            return
        payload = self.tv_buffer[:remaining]
        if not payload:
            return
        self.rest_upsert("tv_series", payload)
        self.stats["upserted_tv"] += len(payload)
        print(
            f"[UPSERT] table=tv_series batch={len(payload)} total_tv={self.stats['upserted_tv']}",
            flush=True,
        )
        self.tv_buffer = self.tv_buffer[len(payload):]

    def rest_upsert(self, table: str, payload: List[Dict[str, Any]]) -> None:
        if not payload:
            return
        endpoint = f"{self.supabase_url}/rest/v1/{table}?on_conflict=id"
        last_error: Optional[str] = None
        for attempt in range(self.max_retries):
            blocked_cols = self.missing_columns.get(table, set())
            if blocked_cols:
                sanitized_payload = [{k: v for k, v in row.items() if k not in blocked_cols} for row in payload]
            else:
                sanitized_payload = payload
            try:
                response = self.session.post(
                    endpoint,
                    headers=self.supabase_headers,
                    json=sanitized_payload,
                    timeout=60,
                )
                if response.status_code in {200, 201, 204}:
                    return
                if response.status_code == 400:
                    body = response.text
                    missing_col_match = re.search(r"Could not find the '([^']+)' column", body)
                    if missing_col_match:
                        missing_col = missing_col_match.group(1)
                        if missing_col:
                            self.missing_columns.setdefault(table, set()).add(missing_col)
                            print(
                                f"[DB ADAPT] table={table} removed_missing_column={missing_col}",
                                flush=True,
                            )
                            last_error = body[:500]
                            continue
                if response.status_code in {408, 409, 425, 429, 500, 502, 503, 504}:
                    self.stats["db_retries"] += 1
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        wait = max(float(retry_after), 0.5)
                    else:
                        wait = (2 ** attempt) + random.uniform(0.2, 0.8)
                    last_error = f"HTTP {response.status_code}: {response.text[:500]}"
                    print(
                        f"[DB RETRY] table={table} attempt={attempt + 1}/{self.max_retries} wait={wait:.2f}s status={response.status_code}",
                        flush=True,
                    )
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"Supabase REST error {response.status_code}: {response.text[:1000]}")
            except requests.RequestException as exc:
                self.stats["db_retries"] += 1
                wait = (2 ** attempt) + random.uniform(0.2, 0.8)
                last_error = str(exc)
                print(
                    f"[DB RETRY] table={table} attempt={attempt + 1}/{self.max_retries} wait={wait:.2f}s error={exc}",
                    flush=True,
                )
                time.sleep(wait)
        raise RuntimeError(f"Supabase REST upsert failed for {table}: {last_error or 'unknown'}")

    def flush_all(self) -> None:
        self.flush_movies()
        self.flush_tv()

    def enqueue_movie(self, row: Dict[str, Any]) -> None:
        tmdb_id = as_int(row.get("id"), 0)
        if tmdb_id in self.seen_movie_ids:
            self.stats["deduped_in_run"] += 1
            return
        self.seen_movie_ids.add(tmdb_id)
        self.movie_buffer.append(row)
        self.stats["queued_movies"] += 1
        if len(self.movie_buffer) >= self.batch_size:
            self.flush_movies()

    def enqueue_tv(self, row: Dict[str, Any]) -> None:
        tmdb_id = as_int(row.get("id"), 0)
        if tmdb_id in self.seen_tv_ids:
            self.stats["deduped_in_run"] += 1
            return
        self.seen_tv_ids.add(tmdb_id)
        self.tv_buffer.append(row)
        self.stats["queued_tv"] += 1
        if len(self.tv_buffer) >= self.batch_size:
            self.flush_tv()

    def base_discover_params(self, media_type: str, start_date: date, end_date: date) -> Dict[str, Any]:
        if media_type == "movie":
            return {
                "language": "en-US",
                "sort_by": "vote_average.desc",
                "vote_count.gte": self.min_vote_count,
                "include_adult": "false",
                "include_video": "false",
                "primary_release_date.gte": start_date.isoformat(),
                "primary_release_date.lte": end_date.isoformat(),
                "page": 1,
            }
        return {
            "language": "en-US",
            "sort_by": "vote_average.desc",
            "vote_count.gte": self.min_vote_count,
            "include_adult": "false",
            "first_air_date.gte": start_date.isoformat(),
            "first_air_date.lte": end_date.isoformat(),
            "page": 1,
        }

    def process_page_results(self, media_type: str, results: List[Dict[str, Any]]) -> None:
        if media_type == "movie":
            self.stats["fetched_movie_items"] += len(results)
            for item in results:
                if self.should_stop():
                    return
                row = self.normalize_movie(item)
                if row:
                    self.enqueue_movie(row)
        else:
            self.stats["fetched_tv_items"] += len(results)
            for item in results:
                if self.should_stop():
                    return
                row = self.normalize_tv(item)
                if row:
                    self.enqueue_tv(row)

    def process_range(self, media_type: str, start_date: date, end_date: date) -> None:
        if self.should_stop():
            return
        self.stats["date_ranges_processed"] += 1
        endpoint = "/discover/movie" if media_type == "movie" else "/discover/tv"
        params = self.base_discover_params(media_type, start_date, end_date)
        first_page = self.tmdb_get(endpoint, params)
        total_results = as_int(first_page.get("total_results"), 0)
        total_pages = as_int(first_page.get("total_pages"), 1)
        if total_results <= 0:
            print(
                f"[RANGE] type={media_type} {start_date}..{end_date} results=0 pages=0",
                flush=True,
            )
            return
        if total_pages > 500 and start_date < end_date:
            midpoint = start_date + timedelta(days=(end_date - start_date).days // 2)
            if midpoint <= start_date:
                midpoint = start_date + timedelta(days=1)
            if midpoint > end_date:
                midpoint = end_date
            left_end = midpoint - timedelta(days=1)
            if left_end >= start_date:
                print(
                    f"[RANGE SPLIT] type={media_type} {start_date}..{end_date} pages={total_pages} -> {start_date}..{left_end} and {midpoint}..{end_date}",
                    flush=True,
                )
                self.process_range(media_type, start_date, left_end)
                self.process_range(media_type, midpoint, end_date)
                return
        page_limit = min(total_pages, 500)
        print(
            f"[RANGE] type={media_type} {start_date}..{end_date} results={total_results} pages={page_limit}",
            flush=True,
        )
        first_results = first_page.get("results") if isinstance(first_page.get("results"), list) else []
        self.process_page_results(media_type, first_results)
        print(
            f"[PAGE] type={media_type} {start_date}..{end_date} page=1/{page_limit} queued={self.pending_total()} committed={self.committed_total()}",
            flush=True,
        )
        if self.should_stop():
            return
        for page in range(2, page_limit + 1):
            if self.should_stop():
                break
            params["page"] = page
            page_data = self.tmdb_get(endpoint, params)
            results = page_data.get("results") if isinstance(page_data.get("results"), list) else []
            self.process_page_results(media_type, results)
            print(
                f"[PAGE] type={media_type} {start_date}..{end_date} page={page}/{page_limit} queued={self.pending_total()} committed={self.committed_total()}",
                flush=True,
            )

    def run(self) -> None:
        started_at = datetime.utcnow()
        print(
            f"[START] target={self.target} years={self.max_year}..{self.min_year} min_vote_count={self.min_vote_count} batch_size={self.batch_size}",
            flush=True,
        )
        for year in range(self.max_year, self.min_year - 1, -1):
            if self.should_stop():
                break
            year_start = date(year, 1, 1)
            year_end = date(year, 12, 31)
            print(f"[YEAR] {year} begin committed={self.committed_total()} queued={self.pending_total()}", flush=True)
            self.process_range("movie", year_start, year_end)
            if self.should_stop():
                break
            self.process_range("tv", year_start, year_end)
            self.flush_all()
            print(
                f"[YEAR] {year} done committed={self.committed_total()} movies={self.stats['upserted_movies']} tv={self.stats['upserted_tv']}",
                flush=True,
            )
        self.flush_all()
        ended_at = datetime.utcnow()
        elapsed = (ended_at - started_at).total_seconds()
        print(
            "[DONE] "
            + f"committed={self.committed_total()} "
            + f"movies={self.stats['upserted_movies']} "
            + f"tv={self.stats['upserted_tv']} "
            + f"fetched_movie_items={self.stats['fetched_movie_items']} "
            + f"fetched_tv_items={self.stats['fetched_tv_items']} "
            + f"tmdb_requests={self.stats['tmdb_requests']} "
            + f"tmdb_retries={self.stats['tmdb_retries']} "
            + f"db_retries={self.stats['db_retries']} "
            + f"deduped={self.stats['deduped_in_run']} "
            + f"skipped_invalid={self.stats['skipped_invalid']} "
            + f"ranges={self.stats['date_ranges_processed']} "
            + f"elapsed_seconds={elapsed:.2f}",
            flush=True,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, default=100000)
    parser.add_argument("--min-year", type=int, default=1900)
    parser.add_argument("--max-year", type=int, default=date.today().year)
    parser.add_argument("--min-vote-count", type=int, default=2000)
    parser.add_argument("--batch-size", type=int, default=250)
    parser.add_argument("--request-delay", type=float, default=0.35)
    parser.add_argument("--max-retries", type=int, default=6)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.target <= 0:
        raise SystemExit("target must be > 0")
    if args.min_year <= 1800 or args.max_year < args.min_year:
        raise SystemExit("invalid year range")
    if args.min_vote_count < 0:
        raise SystemExit("min-vote-count must be >= 0")
    if args.batch_size <= 0:
        raise SystemExit("batch-size must be > 0")
    if args.request_delay < 0:
        raise SystemExit("request-delay must be >= 0")
    if args.max_retries <= 0:
        raise SystemExit("max-retries must be > 0")
    supabase_url, service_role, tmdb_api_key = load_environment()
    engine = MassAcquisitionEngine(
        supabase_url=supabase_url,
        service_role_key=service_role,
        tmdb_api_key=tmdb_api_key,
        target=args.target,
        min_year=args.min_year,
        max_year=args.max_year,
        min_vote_count=args.min_vote_count,
        batch_size=args.batch_size,
        request_delay=args.request_delay,
        max_retries=args.max_retries,
    )
    engine.run()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("[INTERRUPTED] execution stopped by user", flush=True)
        sys.exit(130)
