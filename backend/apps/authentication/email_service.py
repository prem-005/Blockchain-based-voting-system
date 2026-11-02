import os
import logging
import threading
import requests
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

_CACHED_BREVO_SENDER = None


def get_brevo_sender_email(brevo_key: str) -> str:
    """Detects or returns the verified sender email for Brevo."""
    global _CACHED_BREVO_SENDER
    if _CACHED_BREVO_SENDER:
        return _CACHED_BREVO_SENDER

    custom_sender = os.getenv('BREVO_SENDER_EMAIL', '').strip().strip('\'"')
    if custom_sender:
        _CACHED_BREVO_SENDER = custom_sender
        return custom_sender

    try:
        res = requests.get(
            'https://api.brevo.com/v3/senders',
            headers={'api-key': brevo_key, 'accept': 'application/json'},
            timeout=5,
        )
        if res.status_code == 200:
            senders = res.json().get('senders', [])
            active_senders = [s for s in senders if s.get('active', True)]
            if active_senders:
                _CACHED_BREVO_SENDER = active_senders[0]['email']
                logger.info("Auto-detected Brevo verified sender: %s", _CACHED_BREVO_SENDER)
                return _CACHED_BREVO_SENDER
        else:
            logger.warning("Brevo /v3/senders check returned HTTP %s: %s", res.status_code, res.text)
    except Exception as err:
        logger.warning("Could not auto-fetch Brevo senders: %s", err)

    return 'noreply@lightvote.org'


def format_otp_html(subject: str, message: str) -> str:
    otp_display = subject.split(":")[-1].strip() if ":" in subject else "OTP"
    return (
        f'<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">'
        f'<div style="text-align: center; margin-bottom: 20px;">'
        f'<h2 style="color: #102a56; margin: 0;">LightVote Election Commission</h2>'
        f'<p style="color: #64748b; font-size: 13px; margin-top: 4px;">Electronic Voting & Security Verification</p>'
        f'</div>'
        f'<div style="background: #f8fafc; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">'
        f'<span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">One-Time Security Code</span>'
        f'<div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #2563eb; margin: 8px 0; font-family: monospace;">'
        f'{otp_display}'
        f'</div>'
        f'<span style="font-size: 11px; color: #94a3b8;">Valid for 5 minutes - single-use only</span>'
        f'</div>'
        f'<p style="color: #334155; font-size: 13px; line-height: 1.6;">{message.replace(chr(10), "<br/>")}</p>'
        f'<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />'
        f'<p style="font-size: 11px; color: #94a3b8; text-align: center;">If you did not request this verification, please disregard this email.</p>'
        f'</div>'
    )


def send_email_direct(to_email: str, subject: str, message: str) -> bool:
    """
    Sends an email using the best available provider.
    1. BREVO_API_KEY (Recommended on Render free tier - sends to ANY voter Gmail over Port 443).
    2. RESEND_API_KEY (Port 443).
    3. Django standard send_mail fallback.
    """
    formatted_html = format_otp_html(subject, message)

    # 1. Brevo REST API (HTTPS Port 443 - works to ANY voter email)
    brevo_key = os.getenv('BREVO_API_KEY', '').strip().strip('\'"')
    if brevo_key:
        if not brevo_key.startswith('xkeysib-'):
            logger.warning(
                "BREVO_API_KEY does not start with 'xkeysib-'. "
                "Ensure you generated a v3 API Key in Brevo under SMTP & API -> API Keys tab, not an SMTP key."
            )
        sender_email = get_brevo_sender_email(brevo_key)
        try:
            response = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                },
                json={
                    'sender': {'name': 'LightVote Election Commission', 'email': sender_email},
                    'to': [{'email': to_email}],
                    'subject': subject,
                    'htmlContent': formatted_html,
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

    # 2. Resend REST API (HTTPS Port 443)
    resend_key = os.getenv('RESEND_API_KEY', '').strip().strip('\'"')
    if resend_key:
        from_email = os.getenv('RESEND_FROM', 'LightVote <onboarding@resend.dev>').strip().strip('\'"')
        try:
            response = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'LightVote-Elections/1.0',
                },
                json={
                    'from': from_email,
                    'to': [to_email],
                    'subject': subject,
                    'text': message,
                    'html': formatted_html,
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

    # 3. Standard Django fallback
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


def test_email_service(to_email: str) -> dict:
    """Detailed live diagnosis of configured email providers for the test endpoint."""
    brevo_key = os.getenv('BREVO_API_KEY', '').strip().strip('\'"')
    resend_key = os.getenv('RESEND_API_KEY', '').strip().strip('\'"')
    brevo_sender = os.getenv('BREVO_SENDER_EMAIL', '').strip().strip('\'"')

    result = {
        'target_email': to_email,
        'brevo': {
            'configured': bool(brevo_key),
            'key_prefix': (brevo_key[:10] + '...') if brevo_key else None,
            'is_v3_format': brevo_key.startswith('xkeysib-') if brevo_key else False,
            'sender_email': brevo_sender or None,
        },
        'resend': {
            'configured': bool(resend_key),
            'key_prefix': (resend_key[:8] + '...') if resend_key else None,
        },
    }

    if brevo_key:
        if not brevo_key.startswith('xkeysib-'):
            result['brevo']['warning'] = (
                "Your BREVO_API_KEY does not start with 'xkeysib-'. "
                "In Brevo, go to SMTP & API -> click the 'API Keys' tab (NOT SMTP) -> Generate a new API key. "
                "The key must start with 'xkeysib-'."
            )

        # Check senders endpoint
        try:
            acc_resp = requests.get(
                'https://api.brevo.com/v3/senders',
                headers={'api-key': brevo_key, 'accept': 'application/json'},
                timeout=5,
            )
            result['brevo']['senders_api_status'] = acc_resp.status_code
            if acc_resp.status_code == 200:
                senders = acc_resp.json().get('senders', [])
                result['brevo']['detected_senders'] = [s.get('email') for s in senders]
            else:
                result['brevo']['senders_api_error'] = acc_resp.text
        except Exception as e:
            result['brevo']['senders_api_exception'] = str(e)

        # Send test email
        formatted_html = format_otp_html('LightVote Test OTP: 849201', 'This is a test OTP verification from LightVote.')
        sender_email = get_brevo_sender_email(brevo_key)
        result['brevo']['used_sender'] = sender_email
        try:
            send_resp = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                },
                json={
                    'sender': {'name': 'LightVote Election Commission', 'email': sender_email},
                    'to': [{'email': to_email}],
                    'subject': 'LightVote Test OTP: 849201',
                    'htmlContent': formatted_html,
                    'textContent': 'This is a test OTP verification from LightVote. Code: 849201',
                },
                timeout=10,
            )
            result['brevo']['send_http_status'] = send_resp.status_code
            result['brevo']['send_response'] = send_resp.text
            if send_resp.status_code in (200, 201):
                result['success'] = True
                result['message'] = f'Successfully sent test email via Brevo to {to_email}! Check your Gmail inbox and spam folder.'
                return result
            else:
                result['brevo']['status'] = 'failed'
                if send_resp.status_code == 401:
                    result['brevo']['diagnosis'] = (
                        "Brevo returned 401 Unauthorized ('Key not found'). "
                        "This means the key in Render environment variable BREVO_API_KEY is invalid, revoked, or an SMTP key instead of an API key. "
                        "Please go to Brevo -> SMTP & API -> API Keys tab -> Generate a new API key (starts with 'xkeysib-') and update BREVO_API_KEY on Render."
                    )
        except Exception as e:
            result['brevo']['send_exception'] = str(e)

    # Try Resend fallback
    if resend_key:
        from_email = os.getenv('RESEND_FROM', 'LightVote <onboarding@resend.dev>').strip().strip('\'"')
        formatted_html = format_otp_html('LightVote Test OTP: 849201', 'This is a test OTP verification from LightVote.')
        try:
            res_resp = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'LightVote-Elections/1.0',
                },
                json={
                    'from': from_email,
                    'to': [to_email],
                    'subject': 'LightVote Test OTP: 849201',
                    'text': 'This is a test OTP verification from LightVote. Code: 849201',
                    'html': formatted_html,
                },
                timeout=10,
            )
            result['resend']['send_http_status'] = res_resp.status_code
            result['resend']['send_response'] = res_resp.text
            if res_resp.status_code in (200, 201):
                result['success'] = True
                result['message'] = f'Successfully sent test email via Resend to {to_email}!'
                return result
            else:
                result['resend']['status'] = 'failed'
        except Exception as e:
            result['resend']['send_exception'] = str(e)

    result['success'] = False
    result['message'] = 'Email dispatch failed. See provider diagnostics in this response.'
    return result


def send_email_async(to_email: str, subject: str, message: str):
    """Dispatches the email in a non-blocking background daemon thread."""
    thread = threading.Thread(
        target=send_email_direct,
        args=(to_email, subject, message),
        daemon=True,
    )
    thread.start()
