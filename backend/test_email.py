from email_notifier import send_admin_email

def main():
    body = """
    <div style="background:#0f0f0f;color:#e5e5e5;font-family:Arial,sans-serif;padding:24px;">
      <div style="background:#111827;padding:16px 20px;border-radius:12px;font-size:18px;font-weight:bold;">
        Cinema Online
      </div>
      <div style="margin-top:16px;font-size:14px;">
        System Connection Verified
      </div>
    </div>
    """
    send_admin_email("System Connection Verified", body)
    print("Test email sent")

if __name__ == "__main__":
    main()
