import requests
from typing import Optional


class SupabaseAdmin:
    def __init__(self, *, base_url: str, service_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }

    def find_users_by_email(self, email: str) -> list[dict]:
        resp = requests.get(
            f"{self.base_url}/auth/v1/admin/users",
            headers=self.headers,
            params={"email": email},
            timeout=10,
        )
        if resp.status_code not in (200, 404):
            resp.raise_for_status()
        data = resp.json() if resp.content else {}
        users = data.get("users") if isinstance(data, dict) else []
        # The GoTrue email search may be fuzzy; enforce exact email match (case-insensitive)
        target = (email or "").strip().lower()
        exact = [u for u in (users or []) if str(u.get("email", "")).strip().lower() == target]
        return exact

    def find_user_id_by_email(self, email: str) -> Optional[str]:
        users = self.find_users_by_email(email)
        if not users:
            return None
        # If multiple are returned, pick none; caller should handle explicitly
        if len(users) > 1:
            return None
        return users[0].get("id")

    def create_user(self, *, email: str, password: str) -> str:
        resp = requests.post(
            f"{self.base_url}/auth/v1/admin/users",
            headers=self.headers,
            json={"email": email, "password": password, "email_confirm": False},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json() or {}
        return data.get("id")

    def update_user_password(self, *, user_id: str, password: str) -> None:
        resp = requests.put(
            f"{self.base_url}/auth/v1/admin/users/{user_id}",
            headers=self.headers,
            json={"password": password},
            timeout=10,
        )
        resp.raise_for_status()

    def generate_link(self, *, email: str, link_type: str, redirect_to: str) -> dict:
        resp = requests.post(
            f"{self.base_url}/auth/v1/admin/generate_link",
            headers=self.headers,
            json={"email": email, "type": link_type, "redirect_to": redirect_to},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json() or {}

    def generate_verify_url_from_props(self, *, properties: dict, link_type: str, redirect_to: str) -> Optional[str]:
        token_hash = properties.get("hashed_token") or properties.get("token_hash")
        if not token_hash:
            return None
        verify_type = "signup" if link_type == "signup" else "magiclink"
        from requests.utils import quote

        return f"{self.base_url}/auth/v1/verify?token_hash={token_hash}&type={verify_type}&redirect_to={quote(redirect_to, safe=':/?#&=')}"


