import os
import logging
import threading
import requests
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

_CACHED_BREVO_SENDER = None


def _clean(val: str) -> str:
    """Strip whitespace and accidental quotes from env var values."""
    return val.strip().strip('\'"')


def format_otp_html(subject: str, message: str) -> str:
    otp_display = subject.split(":")[-1].strip() if ":" in subject else "OTP"
    return (
        f'<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">'
        f'<div style="text-align: center; margin-bottom: 20px;">'
        f'<h2 style="color: #102a56; margin: 0;">LightVote Election Commission</h2>'
        f'<p style="color: #64748b; font-size: 13px; margin-top: 4px;">Electronic Voting &amp; Security Verification</p>'
        f'</div>'
        f'<div style="background: #f8fafc; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">'
        f'<span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">One-Time Security Code</span>'
        f'<div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2563eb; margin: 12px 0; font-family: monospace;">'
        f'{otp_display}'
        f'</div>'
        f'<span style="font-size: 11px; color: #94a3b8;">Valid for 5 minutes &bull; Single-use only</span>'
        f'</div>'
        f'<p style="color: #334155; font-size: 13px; line-height: 1.6;">{message.replace(chr(10), "<br/>")}</p>'
        f'<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />'
        f'<p style="font-size: 11px; color: #94a3b8; text-align: center;">If you did not request this verification, please disregard this email.</p>'
        f'</div>'
    )


def _try_sendgrid(to_email: str, subject: str, message: str, html: str) -> bool:
    """Send via SendGrid REST API (key starts with SG.)"""
    sg_key = _clean(os.getenv('SENDGRID_API_KEY', ''))
    sg_from = _clean(os.getenv('SENDGRID_FROM', '')) or _clean(os.getenv('EMAIL_FROM', ''))
    if not sg_key or not sg_from:
        return False
    try:
        resp = requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            headers={
                'Authorization': f'Bearer {sg_key}',
                'Content-Type': 'application/json',
            },
            json={
                'personalizations': [{'to': [{'email': to_email}]}],
                'from': {'email': sg_from, 'name': 'LightVote Election Commission'},
                'subject': subject,
                'content': [
                    {'type': 'text/plain', 'value': message},
                    {'type': 'text/html', 'value': html},
                ],
            },
            timeout=10,
        )
        if resp.status_code == 202:
            logger.info("Sent email via SendGrid to %s", to_email)
            return True
        else:
            logger.warning("SendGrid error %s: %s", resp.status_code, resp.text)
    except Exception as err:
        logger.error("SendGrid exception: %s", err)
    return False


def _try_brevo(to_email: str, subject: str, message: str, html: str) -> bool:
    """Send via Brevo REST API (key starts with xkeysib-)"""
    global _CACHED_BREVO_SENDER
    brevo_key = _clean(os.getenv('BREVO_API_KEY', ''))
    if not brevo_key:
        return False

    # Resolve verified sender email
    sender_email = _clean(os.getenv('BREVO_SENDER_EMAIL', ''))
    if not sender_email:
        if _CACHED_BREVO_SENDER:
            sender_email = _CACHED_BREVO_SENDER
        else:
            try:
                res = requests.get(
                    'https://api.brevo.com/v3/senders',
                    headers={'api-key': brevo_key, 'accept': 'application/json'},
                    timeout=5,
                )
                if res.status_code == 200:
                    senders = res.json().get('senders', [])
                    active = [s for s in senders if s.get('active', True)]
                    if active:
                        _CACHED_BREVO_SENDER = active[0]['email']
                        sender_email = _CACHED_BREVO_SENDER
            except Exception as err:
                logger.warning("Could not fetch Brevo senders: %s", err)
        if not sender_email:
            sender_email = 'noreply@lightvote.org'

    try:
        resp = requests.post(
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
                'htmlContent': html,
                'textContent': message,
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            logger.info("Sent email via Brevo to %s", to_email)
            return True
        else:
            logger.warning("Brevo error %s: %s", resp.status_code, resp.text)
    except Exception as err:
        logger.error("Brevo exception: %s", err)
    return False


def _try_resend(to_email: str, subject: str, message: str, html: str) -> bool:
    """Send via Resend REST API (key starts with re_)"""
    resend_key = _clean(os.getenv('RESEND_API_KEY', ''))
    from_email = _clean(os.getenv('RESEND_FROM', 'LightVote <onboarding@resend.dev>'))
    if not resend_key:
        return False
    try:
        resp = requests.post(
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
                'html': html,
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            logger.info("Sent email via Resend to %s", to_email)
            return True
        else:
            logger.warning("Resend error %s: %s", resp.status_code, resp.text)
    except Exception as err:
        logger.error("Resend exception: %s", err)
    return False


def send_email_direct(to_email: str, subject: str, message: str) -> bool:
    """
    Sends OTP email using the best available provider (all use HTTPS port 443).
    Priority order:
      1. SendGrid  (SENDGRID_API_KEY + SENDGRID_FROM)
      2. Brevo     (BREVO_API_KEY)
      3. Resend    (RESEND_API_KEY)
      4. Django default mail backend (fallback)
    """
    html = format_otp_html(subject, message)

    if _try_sendgrid(to_email, subject, message, html):
        return True
    if _try_brevo(to_email, subject, message, html):
        return True
    if _try_resend(to_email, subject, message, html):
        return True

    # Last resort: Django default mail backend
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
        logger.warning("Django mail backend failed for %s: %s", to_email, err)
        return False


def test_email_service(to_email: str) -> dict:
    """Detailed live diagnostic of all configured email providers."""
    sg_key = _clean(os.getenv('SENDGRID_API_KEY', ''))
    sg_from = _clean(os.getenv('SENDGRID_FROM', '')) or _clean(os.getenv('EMAIL_FROM', ''))
    brevo_key = _clean(os.getenv('BREVO_API_KEY', ''))
    brevo_sender_env = _clean(os.getenv('BREVO_SENDER_EMAIL', ''))
    resend_key = _clean(os.getenv('RESEND_API_KEY', ''))

    result = {
        'target_email': to_email,
        'providers_configured': {
            'sendgrid': bool(sg_key and sg_from),
            'brevo': bool(brevo_key),
            'resend': bool(resend_key),
        },
        'sendgrid': {
            'key_configured': bool(sg_key),
            'key_prefix': (sg_key[:5] + '...') if sg_key else None,
            'is_sg_format': sg_key.startswith('SG.') if sg_key else False,
            'from_configured': bool(sg_from),
            'from_value': sg_from or None,
        },
        'brevo': {
            'key_configured': bool(brevo_key),
            'key_prefix': (brevo_key[:10] + '...') if brevo_key else None,
            'is_v3_format': brevo_key.startswith('xkeysib-') if brevo_key else False,
            'sender_env': brevo_sender_env or None,
        },
        'resend': {
            'key_configured': bool(resend_key),
            'key_prefix': (resend_key[:6] + '...') if resend_key else None,
        },
        'success': False,
    }

    # Validate SendGrid key format
    if sg_key and not sg_key.startswith('SG.'):
        result['sendgrid']['warning'] = "SENDGRID_API_KEY must start with 'SG.' — you may have the wrong key type."

    # Validate Brevo key format
    if brevo_key and not brevo_key.startswith('xkeysib-'):
        result['brevo']['warning'] = (
            "BREVO_API_KEY must start with 'xkeysib-'. "
            "In Brevo: Profile -> SMTP & API -> API Keys tab (NOT SMTP tab) -> Generate new key."
        )

    html = format_otp_html('LightVote Test OTP: 849201', 'This is a live email test from LightVote.')

    # --- Try SendGrid ---
    if sg_key and sg_from:
        try:
            resp = requests.post(
                'https://api.sendgrid.com/v3/mail/send',
                headers={'Authorization': f'Bearer {sg_key}', 'Content-Type': 'application/json'},
                json={
                    'personalizations': [{'to': [{'email': to_email}]}],
                    'from': {'email': sg_from, 'name': 'LightVote Election Commission'},
                    'subject': 'LightVote Test OTP: 849201',
                    'content': [
                        {'type': 'text/plain', 'value': 'LightVote test code: 849201'},
                        {'type': 'text/html', 'value': html},
                    ],
                },
                timeout=10,
            )
            result['sendgrid']['http_status'] = resp.status_code
            result['sendgrid']['response'] = resp.text or '(empty — 202 means success)'
            if resp.status_code == 202:
                result['success'] = True
                result['provider_used'] = 'SendGrid'
                result['message'] = f'✅ Email sent via SendGrid to {to_email}! Check your inbox and spam folder.'
                return result
            else:
                result['sendgrid']['status'] = 'failed'
                if resp.status_code == 401:
                    result['sendgrid']['diagnosis'] = "Invalid SendGrid API key. Regenerate it at app.sendgrid.com -> Settings -> API Keys."
                elif resp.status_code == 403:
                    result['sendgrid']['diagnosis'] = "Forbidden. Verify your sender email at app.sendgrid.com -> Settings -> Sender Authentication."
        except Exception as e:
            result['sendgrid']['exception'] = str(e)

    # --- Try Brevo ---
    if brevo_key:
        # Check senders
        try:
            senders_resp = requests.get(
                'https://api.brevo.com/v3/senders',
                headers={'api-key': brevo_key, 'accept': 'application/json'},
                timeout=5,
            )
            result['brevo']['senders_status'] = senders_resp.status_code
            if senders_resp.status_code == 200:
                senders = senders_resp.json().get('senders', [])
                result['brevo']['detected_senders'] = [s.get('email') for s in senders]
                sender_email = brevo_sender_env or (senders[0]['email'] if senders else 'noreply@lightvote.org')
            else:
                result['brevo']['senders_error'] = senders_resp.text
                sender_email = brevo_sender_env or 'noreply@lightvote.org'
        except Exception as e:
            result['brevo']['senders_exception'] = str(e)
            sender_email = brevo_sender_env or 'noreply@lightvote.org'

        result['brevo']['used_sender'] = sender_email
        try:
            send_resp = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={'api-key': brevo_key, 'Content-Type': 'application/json', 'accept': 'application/json'},
                json={
                    'sender': {'name': 'LightVote Election Commission', 'email': sender_email},
                    'to': [{'email': to_email}],
                    'subject': 'LightVote Test OTP: 849201',
                    'htmlContent': html,
                    'textContent': 'LightVote test code: 849201',
                },
                timeout=10,
            )
            result['brevo']['send_status'] = send_resp.status_code
            result['brevo']['send_response'] = send_resp.text
            if send_resp.status_code in (200, 201):
                result['success'] = True
                result['provider_used'] = 'Brevo'
                result['message'] = f'✅ Email sent via Brevo to {to_email}! Check your inbox and spam folder.'
                return result
            else:
                result['brevo']['status'] = 'failed'
                if send_resp.status_code == 401:
                    result['brevo']['diagnosis'] = (
                        "Brevo 401: Key not found. The BREVO_API_KEY is invalid or is an SMTP password, not a v3 API key. "
                        "Go to Brevo -> Profile -> SMTP & API -> API Keys tab -> Generate new key (starts with xkeysib-)."
                    )
        except Exception as e:
            result['brevo']['send_exception'] = str(e)

    # --- Try Resend ---
    if resend_key:
        from_email = _clean(os.getenv('RESEND_FROM', 'LightVote <onboarding@resend.dev>'))
        try:
            res_resp = requests.post(
                'https://api.resend.com/emails',
                headers={'Authorization': f'Bearer {resend_key}', 'Content-Type': 'application/json'},
                json={
                    'from': from_email,
                    'to': [to_email],
                    'subject': 'LightVote Test OTP: 849201',
                    'text': 'LightVote test code: 849201',
                    'html': html,
                },
                timeout=10,
            )
            result['resend']['send_status'] = res_resp.status_code
            result['resend']['send_response'] = res_resp.text
            if res_resp.status_code in (200, 201):
                result['success'] = True
                result['provider_used'] = 'Resend'
                result['message'] = f'✅ Email sent via Resend to {to_email}!'
                return result
            else:
                result['resend']['status'] = 'failed'
        except Exception as e:
            result['resend']['send_exception'] = str(e)

    result['message'] = '❌ All email providers failed. See per-provider diagnostics above.'
    return result


def send_email_async(to_email: str, subject: str, message: str):
    """Dispatches the email in a non-blocking background daemon thread."""
    thread = threading.Thread(
        target=send_email_direct,
        args=(to_email, subject, message),
        daemon=True,
    )
    thread.start()
