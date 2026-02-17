
import os
import psycopg2
from dotenv import load_dotenv

# Load .env from project root
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print(f"Error: DATABASE_URL not found in {env_path}")
    # Try manual parsing if load_dotenv fails
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    if key.strip() == 'DATABASE_URL':
                        DATABASE_URL = value.strip()
                        break
    except Exception as e:
        print(f"Error reading .env manually: {e}")

if not DATABASE_URL:
    print("CRITICAL: Could not find DATABASE_URL. Exiting.")
    exit(1)

def apply_migration():
    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        migration_file = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20260217_manual_fix.sql')
        
        if not os.path.exists(migration_file):
            print(f"Error: Migration file not found at {migration_file}")
            return

        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print(f"Applying migration from {os.path.basename(migration_file)}...")
        cur.execute(sql)
        print("Migration applied successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
