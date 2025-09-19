# apps/backend/app/main.py

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging
import os
from app.core import supabase
from app.core.config import Settings
from app.core.auth_middleware import AuthMiddleware
from app.core.auth import get_current_user, User
from app.endpoints.registration import router as registration_router
from app.endpoints.magic_link import router as magic_link_router
from app.endpoints.account import router as account_router
from app.endpoints.surveys import router as surveys_router
from app.endpoints.webrtc import router as webrtc_router
from app.endpoints.screenings import router as screenings_router
from app.services.storage_bootstrap import ensure_bucket_exists

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="ANQA ADHD API")

# Configure CORS (load from environment; if unset, default to frontend URL plus common localhost variants)
_raw_allowed = os.getenv("ALLOWED_ORIGINS")
if _raw_allowed and _raw_allowed.strip():
    allowed_origins = [origin.strip() for origin in _raw_allowed.split(",") if origin.strip()]
else:
    settings = Settings()
    # If no ALLOWED_ORIGINS provided, allow the configured frontend public URL
    allowed_origins = [settings.get_frontend_public_url()]
    # In development, also allow localhost and 127.0.0.1 to avoid CORS issues
    if not settings.is_production():
        # Ensure no duplicates
        for extra in ["http://localhost:3000", "http://127.0.0.1:3000"]:
            if extra not in allowed_origins:
                allowed_origins.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach auth middleware to decode JWT and set request.state.user
app.add_middleware(AuthMiddleware)


@app.on_event("startup")
async def on_startup():
    logger.info("🚀 ANQA ADHD API has started.")
    # Ensure recordings bucket exists at boot
    try:
        ensure_bucket_exists()
    except Exception as e:
        logger.warning("Failed to ensure recordings bucket: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("🛑 ANQA ADHD API is shutting down.")


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    url_ok = bool(getattr(supabase, "rest_url", ""))
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/me")
def me(user: User = Depends(get_current_user)) -> User:
    return user


# Routers
app.include_router(registration_router)
app.include_router(magic_link_router)
app.include_router(account_router)
app.include_router(surveys_router)
app.include_router(webrtc_router)
app.include_router(screenings_router)
