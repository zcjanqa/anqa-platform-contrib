import os
from app.core.config import Settings
from supabase.client import Client, create_client

settings = Settings()

project_url = settings.get_supabase_project_url()
# Prefer service role for server-side operations (uploads, admin)
api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or settings.get_supabase_api_key()

if not project_url or not api_key:
    # Defer failure to usage sites but warn early for easier diagnostics
    import logging

    logging.getLogger(__name__).warning(
        "Supabase client initialized with missing URL or API key. Check environment variables."
    )

supabase: Client = create_client(project_url, api_key)
