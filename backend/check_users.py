import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def check_users():
    print("Checking users and roles...")
    
    # 1. Get all users from Auth
    users_response = supabase.auth.admin.list_users()
    users = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])
    
    # 2. Get all profiles
    profiles_response = supabase.table("profiles").select("*").execute()
    profiles = {p['id']: p for p in profiles_response.data}
    
    print(f"{'Email':<30} | {'Username':<20} | {'Role':<10} | {'ID':<36}")
    print("-" * 100)
    
    for user in users:
        uid = user.id
        email = user.email
        profile = profiles.get(uid, {})
        username = profile.get('username', 'N/A')
        role = profile.get('role', 'N/A')
        
        print(f"{email:<30} | {username:<20} | {role:<10} | {uid:<36}")

if __name__ == "__main__":
    check_users()
