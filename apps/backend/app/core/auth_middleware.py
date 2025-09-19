from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.auth import decode_supabase_jwt, User


def _extract_bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    if not authorization_header:
        return None
    parts = authorization_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        token = _extract_bearer_token(request.headers.get("authorization"))
        request.state.user = None
        request.state.jwt = None
        if token:
            try:
                payload = decode_supabase_jwt(token)
                user_id = str(payload.get("sub") or payload.get("user_id") or "")
                email = str(payload.get("email") or "")
                if user_id:
                    request.state.user = User(id=user_id, email=email)
                    request.state.jwt = token
            except Exception:
                # Leave user as None on any failure; protected routes will enforce auth
                pass
        return await call_next(request)


