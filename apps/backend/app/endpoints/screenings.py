from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user, User
from app.core.supabase_client import supabase


router = APIRouter(prefix="/screenings", tags=["screenings"])


@router.get("")
def list_my_screenings(user: User = Depends(get_current_user)) -> dict:
    data = (
        supabase.table("screenings")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", desc=True)
        .limit(25)
        .execute()
        .data
        or []
    )
    return {"items": data}


@router.get("/{screening_id}/artifacts")
def get_screening_artifacts(screening_id: str, user: User = Depends(get_current_user)) -> dict:
    # Fetch row to ensure ownership and get storage keys
    res = (
        supabase.table("screenings")
        .select("storage_recording_key, storage_audio_key, user_id")
        .eq("id", screening_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    row = res[0]
    if str(row.get("user_id") or "") != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    bucket = "recordings"
    recording_key: Optional[str] = row.get("storage_recording_key")
    audio_key: Optional[str] = row.get("storage_audio_key")

    def sign(key: Optional[str]) -> Optional[str]:
        if not key:
            return None
        # one hour expiry
        try:
            signed = supabase.storage.from_(bucket).create_signed_url(key, int(timedelta(hours=1).total_seconds()))
            return (signed or {}).get("signedURL") or (signed or {}).get("signed_url") or None
        except Exception:
            return None

    return {
        "recording_url": sign(recording_key),
        "audio_url": sign(audio_key),
    }


