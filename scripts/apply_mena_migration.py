import os
import psycopg2
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Try to construct it if not present, but usually it should be in .env
    # Fallback to direct connection string if user provided one in previous context, but better to rely on env
    print("Error: DATABASE_URL not found in .env")
    exit(1)

def apply_migration():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        migration_file = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20240523000000_add_mena_tags.sql')
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print(f"Applying migration from {migration_file}...")
        cur.execute(sql)
        print("Migration applied successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
