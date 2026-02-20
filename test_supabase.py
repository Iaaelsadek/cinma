
try:
    import supabase
    print("Supabase imported successfully")
    from supabase import create_client
    print("create_client imported successfully")
except Exception as e:
    print(f"Error: {e}")
