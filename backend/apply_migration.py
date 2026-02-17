import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

def apply_migration():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        with open(os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20250217_create_reports_table.sql'), 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print("Applying migration...")
        # Execute the whole block.
        cur.execute(sql)
        print("Migration applied successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
