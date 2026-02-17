import os
import time
from supabase import create_client
from dotenv import load_dotenv
from email_notifier import send_admin_email

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def process_reports():
    print("Checking for new error reports...")
    try:
        # Fetch un-notified reports
        response = supabase.table('error_reports').select('*').eq('notified', False).execute()
        reports = response.data
        
        if not reports:
            print("No new reports.")
            return

        for report in reports:
            url = report.get('url')
            count = report.get('count', 1)
            created_at = report.get('created_at')
            
            subject = f"⚠️ Missing Page Report: {url}"
            body = f"""
            <h2>Page Not Found Report</h2>
            <p><strong>URL:</strong> <a href="{url}">{url}</a></p>
            <p><strong>Report Count:</strong> {count}</p>
            <p><strong>First Reported:</strong> {created_at}</p>
            <p>Please check if this page should exist or redirect it.</p>
            """
            
            print(f"Sending email for {url}...")
            try:
                send_admin_email(subject, body)
                
                # Mark as notified
                supabase.table('error_reports').update({'notified': True}).eq('url', url).execute()
                print(f"✓ Marked {url} as notified.")
            except Exception as e:
                print(f"✗ Failed to send email for {url}: {e}")
                
    except Exception as e:
        print(f"Error processing reports: {e}")

if __name__ == "__main__":
    process_reports()
