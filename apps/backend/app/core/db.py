from typing import Optional

from starlette.requests import Request

from app.core.supabase_client import supabase


def postgrest_for_request(request: Request):
    token: Optional[str] = getattr(request.state, "jwt", None)
    if token:
        return supabase.postgrest.auth(token)
    return supabase.postgrest


