import logging
import os
from typing import Any

import requests

from app.core.supabase_client import supabase
from app.core.config import Settings


def get_recordings_bucket_name() -> str:
    return os.getenv("SUPABASE_RECORDINGS_BUCKET", "recordings").strip() or "recordings"


def ensure_bucket_exists(bucket_name: str | None = None, *, public: bool = False) -> None:
    name = (bucket_name or get_recordings_bucket_name()).strip()
    try:
        existing = supabase.storage.list_buckets() or []  # type: ignore[attr-defined]
        if any((b or {}).get("name") == name for b in existing):
            return
    except Exception:
        # If listing fails (older SDK), try to create blindly
        pass

    # Fallback: direct HTTP call to Storage API to avoid SDK signature issues
    try:
        settings = Settings()
        base_url = settings.get_supabase_project_url().rstrip("/")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or settings.get_supabase_api_key()
        if not base_url or not service_key:
            raise RuntimeError("Missing Supabase base URL or service key for bucket creation")

        url = f"{base_url}/storage/v1/bucket"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/json",
        }
        resp = requests.post(url, headers=headers, json={"name": name, "public": public}, timeout=10)

        # Treat 2xx as success
        if resp.status_code in (200, 201, 202, 204):
            return

        # Be idempotent: 409 Conflict indicates the bucket already exists. Some deployments
        # return 409 in the JSON body while using a different HTTP status code. Handle both.
        body: Any = {}
        try:
            body = resp.json() if resp.content else {}
        except Exception:
            body = {}

        status_in_body = str((body or {}).get("statusCode", "")).strip()
        is_duplicate_msg = str((body or {}).get("error", "")).lower() == "duplicate" or "exists" in str((body or {}).get("message", "")).lower()

        if resp.status_code == 409 or status_in_body == "409" or is_duplicate_msg:
            # Already exists: treat as success without noise
            return

        logging.getLogger(__name__).warning(
            "Failed to create bucket '%s': %s", name, body if body else resp.status_code
        )
    except Exception as e:
        logging.getLogger(__name__).warning("Failed to create bucket '%s': %s", name, e)


