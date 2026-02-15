import os
import smtplib
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

ADMIN_EMAIL = "cairo.tv@gmail.com"

def send_admin_email(subject: str, body: str, attachment_text: Optional[str] = None):
    user = os.environ.get("EMAIL_HOST_USER")
    password = os.environ.get("EMAIL_HOST_PASSWORD")
    if not user or not password:
        raise ValueError("EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is missing")

    msg = MIMEMultipart()
    msg["From"] = user
    msg["To"] = ADMIN_EMAIL
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    if attachment_text:
        attachment = MIMEText(attachment_text, "plain")
        attachment.add_header("Content-Disposition", "attachment", filename="traceback.txt")
        msg.attach(attachment)

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)
