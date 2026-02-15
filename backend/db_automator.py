import os
from typing import List
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, MetaData, Table, Column,
    BigInteger, Text, Integer, Numeric, DateTime, text, inspect
)
from sqlalchemy.sql import func
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from urllib.parse import quote

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

REQUIRED_TABLES: List[str] = ["games", "software", "movies", "series"]

def _sanitize_db_url(url: str) -> str:
    try:
        if url.startswith("postgresql://") and url.count("@") > 1:
            prefix = "postgresql://"
            rest = url[len(prefix):]
            last_at = rest.rfind("@")
            creds = rest[:last_at]
            host = rest[last_at + 1 :]
            if ":" in creds:
                user, pwd = creds.split(":", 1)
                enc_pwd = quote(pwd, safe="")
                return f"{prefix}{user}:{enc_pwd}@{host}"
    except Exception:
        pass
    return url

def _get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is missing in environment")
    url = _sanitize_db_url(url)
    # Ensure SSL for Supabase; handle legacy URLs without query params
    connect_args = {"sslmode": "require"}
    try:
        engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
        return engine
    except Exception as e:
        raise RuntimeError(f"Failed to build engine from DATABASE_URL: {e}")

def _define_table(metadata: MetaData, name: str) -> Table:
    return Table(
        name, metadata,
        Column("id", BigInteger, primary_key=True),
        Column("title", Text, nullable=False),
        Column("poster_url", Text, nullable=True),
        Column("rating", Numeric(3, 1), nullable=True),
        Column("year", Integer, nullable=True),
        Column("description", Text, nullable=True),
        Column("download_url", Text, nullable=True),
        Column("category", Text, nullable=True),  # No CHECK constraint for flexibility
        Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
        Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

def _ensure_columns(engine, table_name: str):
    insp = inspect(engine)
    if not insp.has_table(table_name):
        return
    existing_cols = {c["name"] for c in insp.get_columns(table_name)}
    needed = {
        "title": "TEXT",
        "poster_url": "TEXT",
        "rating": "NUMERIC(3,1)",
        "year": "INTEGER",
        "description": "TEXT",
        "download_url": "TEXT",
        "category": "TEXT",
        "created_at": "TIMESTAMPTZ",
        "updated_at": "TIMESTAMPTZ",
    }

    with engine.begin() as conn:
        # Add missing columns
        for col, typ in needed.items():
            if col not in existing_cols:
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col}" {typ}'))
                if col in ("created_at", "updated_at"):
                    conn.execute(text(f'ALTER TABLE "{table_name}" ALTER COLUMN "{col}" SET DEFAULT now()'))

        # If legacy column 'release_year' exists but 'year' is missing, copy values
        # or if both exist and 'year' is null, backfill
        legacy_cols = existing_cols
        if "release_year" in legacy_cols:
            conn.execute(text(f'UPDATE "{table_name}" SET year = release_year WHERE year IS NULL'))

def init_db():
    try:
        engine = _get_engine()
        metadata = MetaData()
        insp = inspect(engine)

        # Create missing tables
        created = []
        for t in REQUIRED_TABLES:
            if not insp.has_table(t):
                tbl = _define_table(metadata, t)
                metadata.create_all(engine, tables=[tbl])
                created.append(t)

        # Ensure columns exist / backfill 'year'
        for t in REQUIRED_TABLES:
            _ensure_columns(engine, t)

        # Enable RLS and public read policy on games/software (idempotent)
        with engine.begin() as conn:
            for t in ("games", "software"):
                conn.execute(text(f'ALTER TABLE IF EXISTS "{t}" ENABLE ROW LEVEL SECURITY'))
                try:
                    conn.execute(text(f'CREATE POLICY IF NOT EXISTS "{t}_read_all" ON "{t}" FOR SELECT TO anon, authenticated USING (true)'))
                except Exception:
                    # Fallback for older Postgres without IF NOT EXISTS
                    try:
                        conn.execute(text(f'CREATE POLICY "{t}_read_all" ON "{t}" FOR SELECT TO anon, authenticated USING (true)'))
                    except Exception:
                        pass
                conn.execute(text(f'GRANT SELECT ON "{t}" TO anon, authenticated'))

        if created:
            print(f"[DB] Tables created: {', '.join(created)}")
        else:
            print("[DB] Tables already exist; schema verified.")
        return True
    except OperationalError as e:
        print(f"[DB] Connection failed: {e}. Check your password or DATABASE_URL (SSL required).")
        return False
    except SQLAlchemyError as e:
        print(f"[DB] SQL error: {e}")
        return False
    except Exception as e:
        print(f"[DB] Unexpected error: {e}")
        return False

def ensure_schema():
    """Create tables and RLS policies via raw SQL for full automation (idempotent)."""
    try:
        engine = _get_engine()
        ddl = """
        create table if not exists public.games (
          id bigint primary key,
          title text not null,
          poster_url text,
          rating numeric(3,1),
          year int,
          description text,
          download_url text,
          category text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        create table if not exists public.software (
          id bigint primary key,
          title text not null,
          poster_url text,
          rating numeric(3,1),
          year int,
          description text,
          download_url text,
          category text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        create table if not exists public.movies (
          id bigint primary key,
          title text not null,
          poster_url text,
          rating numeric(3,1),
          year int,
          description text,
          download_url text,
          category text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        create table if not exists public.series (
          id bigint primary key,
          title text not null,
          poster_url text,
          rating numeric(3,1),
          year int,
          description text,
          download_url text,
          category text,
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        """
        with engine.begin() as conn:
            conn.execute(text(ddl))
            for t in ("games", "software"):
                conn.execute(text(f'ALTER TABLE IF EXISTS "{t}" ENABLE ROW LEVEL SECURITY'))
                try:
                    conn.execute(text(f'CREATE POLICY IF NOT EXISTS "{t}_read_all" ON "{t}" FOR SELECT TO anon, authenticated USING (true)'))
                except Exception:
                    try:
                        conn.execute(text(f'CREATE POLICY "{t}_read_all" ON "{t}" FOR SELECT TO anon, authenticated USING (true)'))
                    except Exception:
                        pass
                conn.execute(text(f'GRANT SELECT ON "{t}" TO anon, authenticated'))
        print("[DB] Tables created or verified via SQL.")
        return True
    except OperationalError as e:
        print(f"[DB] Connection failed: {e}. Check your password or DATABASE_URL (SSL required).")
        return False
    except SQLAlchemyError as e:
        print(f"[DB] SQL error: {e}")
        return False
    except Exception as e:
        print(f"[DB] Unexpected error: {e}")
        return False

if __name__ == "__main__":
    init_db()
