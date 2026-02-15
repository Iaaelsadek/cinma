import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def rank_servers():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials missing.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("Starting server ranking...")
        
        # Get all sources
        sources_resp = supabase.table('embed_sources').select('name').execute()
        sources = [s['name'] for s in sources_resp.data]
        
        for source in sources:
            # Get checks from the last 7 days
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            checks_resp = supabase.table('link_checks') \
                .select('status_code, response_time_ms') \
                .eq('source_name', source) \
                .gte('checked_at', week_ago) \
                .execute()
                
            checks = checks_resp.data
            if not checks:
                print(f"No data for {source}, skipping.")
                continue
                
            total = len(checks)
            successes = [c for c in checks if c['status_code'] in [200, 301, 302]]
            success_count = len(successes)
            
            if success_count == 0:
                avg_response = 0
                success_rate = 0
            else:
                avg_response = sum(c['response_time_ms'] for c in successes) / success_count
                success_rate = success_count / total
            
            # Simple ranking logic:
            # Priority 1 (Highest): Success rate > 90%, Avg response < 1000ms
            # Priority 2: Success rate > 80%, Avg response < 2000ms
            # Priority 3: Success rate > 70%
            # Priority 4: Success rate > 50%
            # Priority 5 (Lowest): Others
            
            priority = 5
            if success_rate > 0.9 and avg_response < 1000:
                priority = 1
            elif success_rate > 0.8 and avg_response < 2000:
                priority = 2
            elif success_rate > 0.7:
                priority = 3
            elif success_rate > 0.5:
                priority = 4
                
            print(f"Source: {source} | Rate: {success_rate:.2f} | Avg: {avg_response:.0f}ms | Priority: {priority}")
            
            supabase.table('embed_sources').update({
                'priority': priority,
                'response_time_ms': int(avg_response),
                'last_checked': datetime.now().isoformat()
            }).eq('name', source).execute()
            
        print("Server ranking completed.")
            
    except Exception as e:
        print(f"Error ranking servers: {e}")

if __name__ == "__main__":
    rank_servers()
