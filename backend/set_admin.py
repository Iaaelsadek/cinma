import os
import sys
import argparse
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

def set_admin(email):
    print(f"Searching for user with email: {email}...")
    
    # 1. Find user in auth.users
    # Note: listing users requires service_role key
    try:
        # Use list_users() from the admin API
        users_response = supabase.auth.admin.list_users()
        
        target_user = None
        # Handle UserList response correctly (it might be a list or object with .users)
        users = users_response if isinstance(users_response, list) else getattr(users_response, 'users', [])
        
        for user in users:
            if user.email and user.email.lower() == email.lower():
                target_user = user
                break
        
        if not target_user:
            print(f"Error: User with email '{email}' not found in Authentication.")
            print("Make sure the user has signed up first.")
            return

        print(f"Found user: {target_user.id}")
        
        # 2. Update profiles table
        print(f"Promoting user {target_user.id} to admin...")
        
        # A. Update auth.users metadata (This is crucial for client-side access without RLS issues)
        try:
            supabase.auth.admin.update_user_by_id(
                target_user.id,
                {"user_metadata": {"role": "admin"}}
            )
            print("Updated auth.users metadata with role='admin'.")
        except Exception as e:
            print(f"Warning: Failed to update auth metadata: {e}")

        # B. Update profiles table
        data = supabase.table("profiles").update({"role": "admin"}).eq("id", target_user.id).execute()
        
        if data.data and len(data.data) > 0:
            print(f"Success! User '{email}' is now an Admin.")
        else:
            print("Warning: User found in Auth but not in 'profiles' table.")
            print("Attempts to create profile...")
            # Try to insert profile if missing
            username = email.split('@')[0]
            try:
                data = supabase.table("profiles").insert({"id": target_user.id, "username": username, "role": "admin"}).execute()
                if data.data and len(data.data) > 0:
                    print("Created profile and set as admin.")
                else:
                    print("Failed to update/create profile.")
            except Exception as e:
                print(f"Failed to create profile: {e}")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backend/set_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    set_admin(email)
