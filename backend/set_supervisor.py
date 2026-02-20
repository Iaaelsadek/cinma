import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use SERVICE_ROLE_KEY to bypass RLS policies
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def set_supervisor(email):
    print(f"Searching for user with email: {email}...")
    
    # 1. Find user in auth.users
    try:
        # Note: listing users requires service role key
        users_response = supabase.auth.admin.list_users()
        
        target_user = None
        for user in users_response:
            if user.email and user.email.lower() == email.lower():
                target_user = user
                break
        
        if not target_user:
            print(f"Error: User with email '{email}' not found in Authentication.")
            print("Make sure the user has signed up first.")
            return

        print(f"Found user: {target_user.id}")
        
        # 2. Update profiles table
        print(f"Promoting user {target_user.id} to Supervisor...")
        
        # Try updating
        data = supabase.table("profiles").update({"role": "supervisor"}).eq("id", target_user.id).execute()
        
        if len(data.data) > 0:
            print(f"Success! User '{email}' is now a Supervisor.")
        else:
            print("Warning: User found in Auth but not in 'profiles' table.")
            # Create profile if not exists (though usually it should)
            print("Attempts to create profile...")
            username = email.split('@')[0]
            data = supabase.table("profiles").insert({
                "id": target_user.id,
                "username": username,
                "role": "supervisor"
            }).execute()
            if len(data.data) > 0:
                print("Created profile and set as Supervisor.")
            else:
                print("Failed to update/create profile. Check if 'supervisor' is a valid role in your database constraint.")
                print("You might need to run: backend/add_supervisor.sql")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_supervisor.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    set_supervisor(email)
