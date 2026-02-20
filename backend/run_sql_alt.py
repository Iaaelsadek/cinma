# SQL Runner Alternative - Uses Service Role Key
import sys
import json
import os
from supabase import create_client, Client

# Configuration
SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8"

def run_sql_file(sql_file):
    """Run SQL file using Supabase service role"""
    try:
        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        
        # Read SQL file
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        print(f"📖 Reading SQL file: {sql_file}")
        print(f"📝 SQL content length: {len(sql)} characters")
        
        # Since we can't execute raw SQL directly through Supabase client,
        # we'll use the RPC approach or log the SQL for manual execution
        
        # For now, let's log the SQL and provide instructions
        print("\n🔧 SQL Content:")
        print("=" * 50)
        print(sql)
        print("=" * 50)
        
        # Try to execute via RPC if available
        try:
            # This would require a stored procedure on the database
            result = supabase.rpc('exec_sql', {'query': sql})
            print("\n✅ SQL executed successfully via RPC")
            print(json.dumps({"status": "success", "message": "SQL logged for manual execution"}))
        except Exception as e:
            print(f"\n⚠️  Could not execute via RPC: {e}")
            print("\n📋 Manual Execution Instructions:")
            print("1. Copy the SQL above")
            print("2. Go to Supabase Dashboard")
            print("3. Open SQL Editor")
            print("4. Paste and execute the SQL")
            
            print(json.dumps({
                "status": "logged", 
                "message": "SQL logged for manual execution",
                "sql": sql[:500] + "..." if len(sql) > 500 else sql
            }))
            
    except FileNotFoundError:
        print(json.dumps({"error": f"SQL file not found: {sql_file}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No SQL file provided"}))
        sys.exit(1)
    
    sql_file = sys.argv[1]
    run_sql_file(sql_file)