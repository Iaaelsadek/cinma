import sys
import json
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
db_url = os.environ.get("DATABASE_URL")

if not db_url:
    print(json.dumps({"error": "DATABASE_URL not found in .env. Please add it to use SQL Runner."}))
    sys.exit(0)

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
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # Split statements if multiple? SQLAlchemy execute might handle one.
        # But text() handles it.
        result = conn.execute(text(sql))
        conn.commit()
        
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
