from fastapi import APIRouter, HTTPException, Depends, Request
import requests
from app.core.config import Settings
from app.core.email import Email, EmailService
from app.services.email.signup_mail import render_signup_email
from app.services.supabase_admin import SupabaseAdmin
from app.services.rate_limiter import SlidingWindowRateLimiter
from app.schemas.auth import RegisterRequest, SimpleOkResponse


router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = SlidingWindowRateLimiter()


@router.post("/register", response_model=SimpleOkResponse)
def register_user(payload: RegisterRequest, request: Request, settings: Settings = Depends(Settings)) -> SimpleOkResponse:
    email = payload.email
    password = payload.password
    redirect_to = payload.redirectTo or "http://127.0.0.1:3000/auth/callback"
    # Rate limit: 5 signups per IP per 24h; 3 per email per 24h
    ip = request.client.host if request.client else "unknown"
    if not _limiter.allow(f"register:ip:{ip}", max_events=5, window_seconds=24*3600):
        raise HTTPException(status_code=429, detail="Too many signup attempts from this IP. Please try again later.")
    if not _limiter.allow(f"register:email:{email}", max_events=3, window_seconds=24*3600):
        raise HTTPException(status_code=429, detail="Too many signup attempts for this email. Please try again later.")

    base_url, service_key = settings.provide_supabase_base_and_key()
    if not base_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials are not configured")

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }

    admin = SupabaseAdmin(base_url=base_url, service_key=service_key)
    # Enforce single-account-per-email
    users = admin.find_users_by_email(email)
    if len(users) > 1:
        raise HTTPException(status_code=409, detail="Multiple accounts exist for this email. Please contact support.")
    user_id = users[0].get("id") if users else None

    # create/update password
    try:
        if user_id:
            admin.update_user_password(user_id=user_id, password=password)
        else:
            # If an account already exists (even soft-deleted scenarios), do not create duplicates
            # Supabase normally enforces email uniqueness; we double-check defensively
            if users:
                raise HTTPException(status_code=409, detail="An account already exists for this email.")
            user_id = admin.create_user(email=email, password=password)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to set password: {e}")

    # confirmation link
    try:
        data = admin.generate_link(email=email, link_type="signup", redirect_to=redirect_to)
        props = data.get("properties", {}) if isinstance(data, dict) else {}
        action_link = data.get("action_link") or props.get("action_link")
        verify_url = admin.generate_verify_url_from_props(properties=props, link_type="signup", redirect_to=redirect_to)
        if verify_url:
            action_link = verify_url
        if not action_link:
            raise RuntimeError("No confirmation link returned")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate confirmation link: {e}")

    # email via Brevo
    try:
        subject, html_body = render_signup_email(action_link)
        EmailService.send_email(
            Email(
                subject=subject,
                html_body=html_body,
                recipients=[email],
                text_body=f"Open this link to confirm your email: {action_link}",
                sender_name=settings.get_email_sender_name(),
                sender_email=settings.get_email_sender_email(),
            )
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send confirmation email: {e}")

    # Best-effort: set user metadata and ensure profile with defaults
    try:
        user_id_final = user_id or admin.find_user_id_by_email(email)
        if user_id_final:
            # Determine default role based on payload and special-case admin email
            requested_role = (payload.role or "").strip().lower()
            normalized_role = requested_role if requested_role in ("patient", "clinician") else "patient"
            is_default_admin = str(email).strip().lower() == "julius@anqa.cloud"
            final_role = "admin" if is_default_admin else normalized_role

            # Update user metadata
            requests.put(
                f"{base_url}/auth/v1/admin/users/{user_id_final}",
                headers=headers,
                json={
                    "user_metadata": {
                        "signup_ip": ip,
                        "role": final_role,
                        "prototype_enabled": False,
                    }
                },
                timeout=10,
            )

            # Ensure profile row exists with defaults
            from app.core.supabase_client import supabase
            try:
                supabase.from_("profiles").upsert(
                    {
                        "id": user_id_final,
                        "role": final_role,
                        "prototype_enabled": False,
                    },
                    on_conflict="id",
                ).execute()
            except Exception:
                pass
    except Exception:
        pass

    return SimpleOkResponse(ok=True)


