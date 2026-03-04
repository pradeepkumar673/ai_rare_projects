"""
Notification utilities (email stub).
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def notify_user(user_id: str, message: str) -> None:
    """
    Send email to user. In production, fetch user email from DB.
    """
    # This is a stub; implement with proper email config
    db = current_app.db
    user = db.users.find_one({'_id': user_id})
    if not user or not user.get('email'):
        return
    email = user['email']
    subject = "Rare Disease Diagnostic Update"
    send_email(email, subject, message)

def notify_doctor(doctor_id: str, message: str) -> None:
    """
    Send email to doctor.
    """
    db = current_app.db
    doctor = db.users.find_one({'_id': doctor_id})
    if not doctor or not doctor.get('email'):
        return
    email = doctor['email']
    subject = "Rare Disease Diagnostic: New Case"
    send_email(email, subject, message)

def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Send email via SMTP (configured in app config).
    """
    smtp_host = current_app.config.get('SMTP_HOST')
    smtp_port = current_app.config.get('SMTP_PORT')
    smtp_user = current_app.config.get('SMTP_USER')
    smtp_password = current_app.config.get('SMTP_PASSWORD')

    if not smtp_host:
        # Silently fail in development
        return

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        # Log error
        current_app.logger.error(f"Email failed: {e}")