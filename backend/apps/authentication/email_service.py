import os
import logging
import threading
import requests
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email_direct(to_email: str, subject: str, message: str) -> bool:
    """
    Sends an email using the best available provider.
    - If RESEND_API_KEY is configured: Uses Resend REST API over HTTPS (Port 443).
      * THIS IS REQUIRED ON RENDER FREE TIER because Render blocks raw SMTP ports 25, 465, and 587.
    - If BREVO_API_KEY is configured: Uses Brevo REST API over HTTPS (Port 443).
    - Otherwise: Falls back to Django standard send_mail (SMTP / Console).
    """
    resend_key = os.getenv('RESEND_API_KEY', '').strip()
    if resend_key:
        try:
            from_email = os.getenv('RESEND_FROM', 'LightVote <onboarding@resend.dev>')
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'from': from_email,
                    'to': [to_email],
                    'subject': subject,
                    'text': message,
                },
                timeout=10,
            )
            if response.status_code in (200, 201):
                logger.info("Successfully sent email via Resend to %s", to_email)
                return True
            else:
                logger.warning("Resend API responded with error %s: %s", response.status_code, response.text)
        except Exception as err:
            logger.error("Failed to send via Resend API: %s", err)

    brevo_key = os.getenv('BREVO_API_KEY', '').strip()
    if brevo_key:
        try:
            sender_email = os.getenv('BREVO_SENDER_EMAIL', 'noreply@lightvote.org')
            response = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'sender': {'name': 'LightVote Election Commission', 'email': sender_email},
                    'to': [{'email': to_email}],
                    'subject': subject,
                    'textContent': message,
                },
                timeout=10,
            )
            if response.status_code in (200, 201):
                logger.info("Successfully sent email via Brevo to %s", to_email)
                return True
            else:
                logger.warning("Brevo API responded with error %s: %s", response.status_code, response.text)
        except Exception as err:
            logger.error("Failed to send via Brevo API: %s", err)

    # Standard Django fallback
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
        logger.info("Sent email via Django default backend to %s", to_email)
        return True
    except Exception as err:
        logger.warning("Could not deliver email to %s via Django backend: %s", to_email, err)
        return False


def send_email_async(to_email: str, subject: str, message: str):
    """Dispatches the email in a non-blocking background daemon thread."""
    thread = threading.Thread(
        target=send_email_direct,
        args=(to_email, subject, message),
        daemon=True,
    )
    thread.start()
