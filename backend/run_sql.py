import sys
import json
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
db_url = os.environ.get("DATABASE_URL")

if not db_url:
    # Try to construct from individual vars if DATABASE_URL is missing
    # This adds robustness similar to other scripts
    user = os.environ.get("POSTGRES_USER") or "postgres"
    password = os.environ.get("POSTGRES_PASSWORD")
    host = os.environ.get("POSTGRES_HOST") or "db.lhpuwupbhpcqkwqugkhh.supabase.co"
    port = os.environ.get("POSTGRES_PORT") or "5432"
    dbname = os.environ.get("POSTGRES_DB") or "postgres"
    
    if password:
        db_url = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
    else:
        print(json.dumps({"error": "DATABASE_URL not found in .env and could not be constructed."}))
        sys.exit(1)

if len(sys.argv) < 2:
    print(json.dumps({"error": "No SQL file provided"}))
    sys.exit(1)

sql_file = sys.argv[1]
try:
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()
except Exception as e:
    print(json.dumps({"error": f"Failed to read SQL file: {e}"}))
    sys.exit(1)

try:
    # Use execution_options to force autocommit behavior for non-transactional statements
    engine = create_engine(db_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        # Split statements if multiple? SQLAlchemy execute might handle one.
        # But text() handles it.
        
        # Simple split by ';' for basic multi-statement support if needed, 
        # but usually text(sql) handles blocks well in Postgres.
        # We will trust text(sql) for now, but handle potential empty results.
        
        result = conn.execute(text(sql))
        # No need to commit if AUTOCOMMIT is set, but keeping it explicit doesn't hurt for some drivers
        # conn.commit() 
        
        if result.returns_rows:
            rows = [dict(row._mapping) for row in result]
            # Serialize
            def json_serial(obj):
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat()
                return str(obj)
                
            print(json.dumps(rows, default=json_serial))
        else:
            print(json.dumps({"status": "success", "rows_affected": result.rowcount}))
            
except Exception as e:
    print(json.dumps({"error": str(e)}))
