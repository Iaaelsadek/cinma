import os
from supabase import create_client, Client
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class ContentManager:
    def __init__(self):
        if SUPABASE_URL and SUPABASE_KEY:
            self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.supabase = None
            print("Warning: Supabase credentials missing")

    def smart_upsert(self, table, data, unique_key='id'):
        """Insert or update preserving valuable existing data."""
        if not self.supabase: return

        try:
            # Check existence
            existing = self.supabase.table(table).select('*').eq(unique_key, data[unique_key]).execute()
            
            if existing.data:
                old = existing.data[0]
                updated_data = {}
                
                # Preserve AI summary if new one is missing
                if old.get('ai_summary') and not data.get('ai_summary'):
                    updated_data['ai_summary'] = old['ai_summary']
                
                # Preserve existing valid links
                if old.get('embed_links'):
                    # Merge links: new ones overwrite old ones if key exists, but keep old unique keys
                    current_links = old['embed_links'] or {}
                    new_links = data.get('embed_links') or {}
                    merged_links = {**current_links, **new_links}
                    updated_data['embed_links'] = merged_links
                else:
                    if data.get('embed_links'):
                        updated_data['embed_links'] = data['embed_links']

                # Update other fields
                for key, value in data.items():
                    if key not in ['embed_links', 'ai_summary']: # Handled above
                        if value is not None or key in ['last_checked', 'updated_at']:
                            updated_data[key] = value
                
                self.supabase.table(table).update(updated_data).eq(unique_key, data[unique_key]).execute()
                print(f"✓ Smart Updated: {data.get('title') or data.get(unique_key)}")
            else:
                # New insert
                self.supabase.table(table).insert(data).execute()
                print(f"✓ Inserted New: {data.get('title') or data.get(unique_key)}")
                
        except Exception as e:
            print(f"✗ Error in smart_upsert: {e}")

    def rank_servers(self):
        """Rank servers based on performance stats."""
        if not self.supabase: return

        print("Ranking servers based on performance...")
        try:
            # Fetch last 1000 checks
            checks = self.supabase.table('link_checks').select('*').limit(1000).order('checked_at', desc=True).execute()
            
            server_stats = {}
            for check in checks.data:
                source = check['source_name']
                if source not in server_stats:
                    server_stats[source] = {'total': 0, 'success': 0, 'total_time': 0}
                
                stats = server_stats[source]
                stats['total'] += 1
                if check['status_code'] in [200, 301, 302]:
                    stats['success'] += 1
                if check.get('response_time_ms'):
                    stats['total_time'] += check['response_time_ms']
            
            # Calculate metrics
            ranked_list = []
            for source, stats in server_stats.items():
                if stats['total'] > 0:
                    success_rate = (stats['success'] / stats['total']) * 100
                    avg_time = stats['total_time'] / stats['total']
                else:
                    success_rate = 0
                    avg_time = 999999
                
                ranked_list.append({
                    'name': source,
                    'success_rate': success_rate,
                    'avg_time': avg_time
                })
            
            # Sort: High success rate first, then low latency
            ranked_list.sort(key=lambda x: (-x['success_rate'], x['avg_time']))
            
            # Update embed_sources table
            for priority, item in enumerate(ranked_list, 1):
                self.supabase.table('embed_sources').update({
                    'priority': priority,
                    'response_time_ms': int(item['avg_time']),
                    # 'success_rate': item['success_rate'] # Assuming column exists or we add it
                }).eq('name', item['name']).execute()
                print(f"Updated {item['name']}: Rank #{priority}, Success: {item['success_rate']:.1f}%, Time: {int(item['avg_time'])}ms")
                
        except Exception as e:
            print(f"Error ranking servers: {e}")

if __name__ == "__main__":
    manager = ContentManager()
    manager.rank_servers()
