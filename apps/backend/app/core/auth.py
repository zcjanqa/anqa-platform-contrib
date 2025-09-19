from typing import Optional

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from jose.utils import base64url_decode
from pydantic import BaseModel
import time
import requests
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

from app.core.config import Settings
from app.core.supabase_client import supabase

oauth2_scheme = HTTPBearer()
settings = Settings()


class User(BaseModel):
    id: str
    email: str


_JWKS_CACHE: dict[str, object] = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 60 * 60  # 1 hour


def _get_expected_issuer() -> str:
    base = settings.get_supabase_project_url().rstrip("/")
    return f"{base}/auth/v1"


def _get_jwks() -> list[dict]:
    now = time.time()
    keys = _JWKS_CACHE.get("keys")
    fetched_at = _JWKS_CACHE.get("fetched_at") or 0
    if keys and isinstance(fetched_at, (int, float)) and (now - float(fetched_at) < _JWKS_TTL_SECONDS):
        return keys  # type: ignore[return-value]
    # Fetch JWKS from Supabase GoTrue
    keys_url = settings.get_supabase_project_url().rstrip("/") + "/auth/v1/keys"
    response = requests.get(keys_url, timeout=5)
    response.raise_for_status()
    data = response.json()
    keys = data.get("keys", []) if isinstance(data, dict) else []
    _JWKS_CACHE["keys"] = keys
    _JWKS_CACHE["fetched_at"] = now
    return keys


def _rsa_public_pem_from_jwk(jwk_data: dict) -> bytes:
    n_b = base64url_decode(jwk_data["n"].encode("utf-8"))
    e_b = base64url_decode(jwk_data["e"].encode("utf-8"))
    n_int = int.from_bytes(n_b, "big")
    e_int = int.from_bytes(e_b, "big")
    public_numbers = RSAPublicNumbers(e_int, n_int)
    public_key = public_numbers.public_key(default_backend())
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return pem


def decode_supabase_jwt(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        alg = str(header.get("alg") or "")
        issuer = _get_expected_issuer()
        audience = "authenticated"

        if alg == "RS256":
            kid = header.get("kid")
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing key id (kid) in token header.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            keys = _get_jwks()
            jwk_for_kid = next((k for k in keys if k.get("kid") == kid), None)
            if not jwk_for_kid:
                # Refresh once in case of rotation
                _JWKS_CACHE["fetched_at"] = 0.0
                keys = _get_jwks()
                jwk_for_kid = next((k for k in keys if k.get("kid") == kid), None)
            if not jwk_for_kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unknown signing key.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            public_pem = _rsa_public_pem_from_jwk(jwk_for_kid)
            payload = jwt.decode(
                token,
                public_pem,
                algorithms=["RS256"],
                audience=audience,
                issuer=issuer,
            )
            return payload

        # Default to HS256 (legacy/shared secret)
        payload = jwt.decode(
            token,
            settings.get_supabase_jwt_secret(),
            algorithms=["HS256"],
            audience=audience,
            issuer=issuer,
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to retrieve JWKS: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during token decoding: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


def get_current_user(request: Request) -> User:
    user = request.state.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def check_request_user_id(request: Request, user_id: str | None):
    if settings.get_disable_auth():
        return
    user = get_current_user(request)

    if not user or user.id != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID does not match with authentication",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


def get_name_fields(user_id: str) -> Optional[dict]:
    try:
        metadata = supabase.auth.admin.get_user_by_id(user_id).user.user_metadata
        if "first_name" in metadata and "last_name" in metadata:
            return metadata
        if "name" in metadata:
            name_parts = metadata.get("name", "").split()
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            return {
                "first_name": first_name,
                "last_name": last_name,
            }
        return None
    except Exception:
        # If Supabase lookup fails or metadata is malformed, return None
        return None


def get_optional_user(request: Request) -> Optional[User]:
    """Return the authenticated user if present, otherwise None.

    This is useful for routes that should work for both authenticated and
    unauthenticated users without raising 401.
    """
    user = request.state.user
    return user if user else None


