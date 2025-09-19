# apps/backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging
import os
from app.core import supabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="ANQA ADHD API")

# Configure CORS (load from environment for flexibility)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    logger.info("🚀 ANQA ADHD API has started.")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("🛑 ANQA ADHD API is shutting down.")


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    # Optional: touch supabase client to ensure envs are present at runtime
    url_ok = bool(getattr(supabase, "rest_url", ""))
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat(), "supabase": url_ok}
