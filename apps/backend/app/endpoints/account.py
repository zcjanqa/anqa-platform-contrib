from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone
import requests
from app.core.auth import get_current_user, User
from app.core.config import Settings
from app.core.supabase_client import supabase
from pydantic import BaseModel


router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me")
def get_me(user: User = Depends(get_current_user)) -> dict:
    from app.core.supabase_client import supabase
    # Ensure a profile exists; if not, initialize with defaults
    try:
        resp = supabase.from_("profiles").select("id, role, prototype_enabled, deleted").eq("id", user.id).single().execute()
        data = resp.data if hasattr(resp, "data") else resp.get("data")
    except Exception:
        data = None
    role = "patient"
    prototype_enabled = False
    if data and isinstance(data, dict):
        role = data.get("role") or role
        prototype_enabled = bool(data.get("prototype_enabled") or False)
    else:
        # Create minimal profile row with defaults
        try:
            supabase.from_("profiles").upsert({
                "id": user.id,
                "role": role,
                "prototype_enabled": prototype_enabled,
            }, on_conflict="id").execute()
        except Exception:
            pass
    return {
        "id": user.id,
        "email": user.email,
        "role": role,
        "prototype_enabled": prototype_enabled,
    }


class PrototypeToggleRequest(BaseModel):
    user_id: str
    enabled: bool | None = None


@router.post("/admin/prototype-enabled")
def set_or_toggle_prototype_enabled(payload: PrototypeToggleRequest, user: User = Depends(get_current_user)) -> dict:
    # Only admins or moderators may call this
    caller_role = "patient"
    try:
        resp = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
        data = getattr(resp, "data", None) if hasattr(resp, "data") else resp.get("data") if isinstance(resp, dict) else None
        if data and isinstance(data, dict):
            caller_role = (data.get("role") or "patient").lower()
    except Exception:
        caller_role = "patient"
    if caller_role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Admin or moderator role required")

    target_id = (payload.user_id or "").strip()
    if not target_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # Determine new value
    new_enabled: bool = False
    if payload.enabled is None:
        # Toggle based on current value
        current_enabled = False
        try:
            r2 = supabase.table("profiles").select("prototype_enabled").eq("id", target_id).single().execute()
            d2 = getattr(r2, "data", None) if hasattr(r2, "data") else r2.get("data") if isinstance(r2, dict) else None
            current_enabled = bool((d2 or {}).get("prototype_enabled") or False)
        except Exception:
            current_enabled = False
        new_enabled = not current_enabled
    else:
        new_enabled = bool(payload.enabled)

    # Apply change (create row if missing)
    try:
        # Try update first
        supabase.from_("profiles").update({"prototype_enabled": new_enabled}).eq("id", target_id).execute()
    except Exception:
        pass
    # Ensure row exists with defaults if update didn't affect any row
    try:
        r3 = supabase.table("profiles").select("id").eq("id", target_id).single().execute()
        d3 = getattr(r3, "data", None) if hasattr(r3, "data") else r3.get("data") if isinstance(r3, dict) else None
        exists = bool(d3 and d3.get("id"))
    except Exception:
        exists = False
    if not exists:
        try:
            supabase.from_("profiles").insert({
                "id": target_id,
                "role": "patient",
                "prototype_enabled": new_enabled,
            }).execute()
        except Exception:
            # Last resort: upsert to handle race conditions
            try:
                supabase.from_("profiles").upsert({
                    "id": target_id,
                    "role": "patient",
                    "prototype_enabled": new_enabled,
                }, on_conflict="id").execute()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to set prototype_enabled: {e}")

    return {"user_id": target_id, "prototype_enabled": new_enabled}


class AdminUser(BaseModel):
    id: str
    email: str
    role: str | None = None
    prototype_enabled: bool | None = None


@router.get("/admin/users")
def list_users(user: User = Depends(get_current_user), settings: Settings = Depends(Settings)) -> dict:
    # Authorization
    caller_role = "patient"
    try:
        resp = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
        data = getattr(resp, "data", None) if hasattr(resp, "data") else resp.get("data") if isinstance(resp, dict) else None
        if data and isinstance(data, dict):
            caller_role = (data.get("role") or "patient").lower()
    except Exception:
        caller_role = "patient"
    if caller_role not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Admin or moderator role required")

    # Fetch all users from GoTrue
    base_url, service_key = settings.provide_supabase_base_and_key()
    if not base_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials are not configured")

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }

    users: list[dict] = []
    page = 1
    per_page = 1000
    while True:
        resp = requests.get(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            params={"page": page, "per_page": per_page},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json() or {}
        batch = data.get("users") or []
        users.extend(batch)
        if len(batch) < per_page:
            break
        page += 1

    # Fetch profiles for users in one query
    user_ids = [u.get("id") for u in users if u.get("id")]
    profiles_map: dict[str, dict] = {}
    if user_ids:
        # Chunk to avoid URL limits
        chunk_size = 1000
        for i in range(0, len(user_ids), chunk_size):
            chunk = user_ids[i:i+chunk_size]
            pr = supabase.table("profiles").select("id, role, prototype_enabled").in_("id", chunk).execute()
            pdata = getattr(pr, "data", None) if hasattr(pr, "data") else pr.get("data") if isinstance(pr, dict) else None
            for row in (pdata or []):
                profiles_map[row.get("id")] = row

    # Merge
    result: list[AdminUser] = []
    for u in users:
        uid = u.get("id")
        p = profiles_map.get(uid) or {}
        result.append(AdminUser(
            id=uid,
            email=u.get("email"),
            role=p.get("role"),
            prototype_enabled=p.get("prototype_enabled"),
        ))

    return {"users": [r.dict() for r in result]}

@router.post("/delete")
def delete_account(request: Request, user: User = Depends(get_current_user), settings: Settings = Depends(Settings)) -> dict:
    user_id = user.id
    # Mark profile as deleted and record timestamp (best effort)
    now = datetime.now(timezone.utc).isoformat()
    email = user.email
    try:
        resp = supabase.from_("profiles").update({
            "deleted": True,
            "deleted_at": now,
            "original_email": email,
        }).eq("id", user_id).execute()
        # Some drivers return dict-like response; we only act on hard failures here
    except Exception:
        # If the table doesn't exist or the update fails, we will still proceed with auth.users tombstoning below
        pass

    # Also tombstone the auth.users email and optionally ban the account to prevent accidental reuse.
    try:
        base_url, service_key = settings.provide_supabase_base_and_key()
        if not base_url or not service_key:
            raise RuntimeError("Supabase admin credentials not configured")

        # Build tombstone email from original email
        local, _, domain = (email or "").partition("@")
        if not local or not domain:
            # Fallback tombstone domain if parsing fails
            domain = "tombstone.local"
            local = email or "user"
        ts = int(datetime.now(timezone.utc).timestamp())
        tombstone_email = f"{local}+deleted.{ts}.{user_id}@{domain}"

        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }
        # Use GoTrue admin update: support 'email' and 'ban_duration' (e.g., '100y')
        resp = requests.put(
            f"{base_url}/auth/v1/admin/users/{user_id}",
            headers=headers,
            json={
                "email": tombstone_email,
                "ban_duration": "8760h",
                "email_confirm": True,
                "user_metadata": {
                    "deleted": True,
                    "deleted_at": now,
                    "original_email": email,
                },
            },
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to tombstone auth user: {e}")

    # Sign out session is handled client-side; the account appears deleted to the user.
    return {"ok": True}


@router.post("/password-reset")
def send_password_reset(request: Request, user: User = Depends(get_current_user), settings: Settings = Depends(Settings)) -> dict:
    """Send a password reset email via Brevo with a Supabase recovery verify link.

    We use the admin generate_link API with type=recovery and emailConfirm to produce
    a 'verify' link that, once clicked, redirects to the provided redirect URL.
    """
    email = user.email
    base_url, service_key = settings.provide_supabase_base_and_key()
    if not base_url or not service_key:
        raise HTTPException(status_code=500, detail="Supabase credentials are not configured")

    # Determine redirect_to dynamically if not provided: infer scheme/host from request
    redirect_to = request.query_params.get("redirectTo")
    if not redirect_to:
        # Always prefer configured FRONTEND_PUBLIC_URL
        base = settings.get_frontend_public_url()
        redirect_to = f"{base}/auth/set-password"

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }

    # Generate recovery link
    try:
        resp = requests.post(
            f"{base_url}/auth/v1/admin/generate_link",
            headers=headers,
            json={
                "email": email,
                "type": "recovery",
                "redirect_to": redirect_to,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json() or {}
        props = data.get("properties", {}) if isinstance(data, dict) else {}
        action_link = data.get("action_link") or props.get("action_link")
        # Prefer a verify URL if token_hash is provided (implicit flow)
        token_hash = props.get("hashed_token") or props.get("token_hash")
        if token_hash:
            from requests.utils import quote

            action_link = f"{base_url}/auth/v1/verify?token_hash={token_hash}&type=recovery&redirect_to={quote(redirect_to, safe=':/?#&=')}"
        if not action_link:
            raise RuntimeError("No recovery link returned")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate recovery link: {e}")

    # Send via Brevo with ANQA branding
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

    return {"ok": True}


