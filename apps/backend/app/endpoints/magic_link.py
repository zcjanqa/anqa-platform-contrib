from fastapi import APIRouter, HTTPException, Body, Depends, Request
import requests
from app.core.config import Settings
from app.core.email import Email, EmailService
from app.services.email.signup_mail import render_signup_email
from app.services.supabase_admin import SupabaseAdmin
from app.schemas.auth import MagicLinkRequest, SimpleOkResponse, PasswordResetRequest
from app.services.rate_limiter import SlidingWindowRateLimiter


router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = SlidingWindowRateLimiter()


@router.post("/send-magic-link", response_model=SimpleOkResponse)
def send_magic_link(payload: MagicLinkRequest, request: Request, settings: Settings = Depends(Settings)) -> SimpleOkResponse:
    email = str(payload.email)
    redirect_to = payload.redirectTo or "http://127.0.0.1:3000/auth/callback"
    # Rate limit: 10 per IP and 5 per email per hour
    ip = request.client.host if request.client else "unknown"
    if not _limiter.allow(f"magic:ip:{ip}", max_events=10, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many requests from this IP. Please try again later.")
    if not _limiter.allow(f"magic:email:{email}", max_events=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many requests for this email. Please try again later.")

    base_url, service_key = settings.provide_supabase_base_and_key()
    if not base_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials are not configured")

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }

    admin = SupabaseAdmin(base_url=base_url, service_key=service_key)
    def _generate_link(link_type: str) -> str:
        data = admin.generate_link(email=email, link_type=link_type, redirect_to=redirect_to)
        return data.get("action_link") or data.get("properties", {}).get("action_link") or ""

    try:
        action_link_type = "magiclink"
        try:
            action_link = _generate_link(action_link_type)
        except Exception:
            action_link_type = "signup"
            action_link = _generate_link(action_link_type)

        try:
            data2 = admin.generate_link(email=email, link_type=action_link_type, redirect_to=redirect_to)
            props = data2.get("properties", {}) if isinstance(data2, dict) else {}
            verify_url = admin.generate_verify_url_from_props(properties=props, link_type=action_link_type, redirect_to=redirect_to)
            if verify_url:
                action_link = verify_url
        except Exception:
            pass
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate link: {e}")

    # email
    try:
        subject, html_body = render_signup_email(action_link)
        EmailService.send_email(
            Email(
                subject=subject,
                html_body=html_body,
                recipients=[email],
                text_body=f"Open this link to continue: {action_link}",
                sender_name=settings.get_email_sender_name(),
                sender_email=settings.get_email_sender_email(),
            )
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {e}")

    return SimpleOkResponse(ok=True)



@router.post("/password-reset", response_model=SimpleOkResponse)
def send_password_reset(payload: PasswordResetRequest, request: Request, settings: Settings = Depends(Settings)) -> SimpleOkResponse:
    email = str(payload.email)
    redirect_to = payload.redirectTo or f"{settings.get_frontend_public_url().rstrip('/')}/auth/set-password"

    # Rate limit: 5 per IP and 3 per email per hour
    ip = request.client.host if request.client else "unknown"
    if not _limiter.allow(f"reset:ip:{ip}", max_events=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many requests from this IP. Please try again later.")
    if not _limiter.allow(f"reset:email:{email}", max_events=3, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many requests for this email. Please try again later.")

    base_url, service_key = settings.provide_supabase_base_and_key()
    if not base_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials are not configured")

    from app.services.supabase_admin import SupabaseAdmin
    admin = SupabaseAdmin(base_url=base_url, service_key=service_key)

    # Generate recovery link and prefer verify URL if available
    try:
        data = admin.generate_link(email=email, link_type="recovery", redirect_to=redirect_to)
        props = data.get("properties", {}) if isinstance(data, dict) else {}
        token_hash = props.get("hashed_token") or props.get("token_hash")
        if token_hash:
            from requests.utils import quote

            action_link = f"{base_url}/auth/v1/verify?token_hash={token_hash}&type=recovery&redirect_to={quote(redirect_to, safe=':/?#&=')}"
        else:
            action_link = data.get("action_link") or props.get("action_link")
        if not action_link:
            raise RuntimeError("No recovery link returned")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate recovery link: {e}")

    # Send via Brevo using branded template
    try:
        from app.core.email import Email, EmailService
        from app.services.email.password_reset_mail import render_password_reset_email

        subject, html_body = render_password_reset_email(action_link)
        EmailService.send_email(
            Email(
                subject=subject,
                html_body=html_body,
                recipients=[email],
                text_body=f"Open this link to reset your password: {action_link}",
                sender_name=settings.get_email_sender_name(),
                sender_email=settings.get_email_sender_email(),
            )
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send recovery email: {e}")

    return SimpleOkResponse(ok=True)

