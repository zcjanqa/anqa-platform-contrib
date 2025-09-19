import os

import requests
from dotenv import find_dotenv, load_dotenv


class Settings:
    def __init__(self) -> None:
        # Deterministic env loading based on ENVIRONMENT
        # - development: load repo-root .env (../.env relative to infra)
        # - production:  load infra/.env (used by docker compose on servers)
        try:
            from os.path import abspath, dirname, join

            repo_root = abspath(join(dirname(__file__), "..", "..", "..", ".."))
            environment_name = (os.getenv("ENVIRONMENT", "production") or "").lower()

            if environment_name == "development":
                local_env_path = abspath(join(repo_root, ".env"))
                load_dotenv(local_env_path, override=False)
            else:
                infra_env_path = abspath(join(repo_root, "infra", ".env"))
                load_dotenv(infra_env_path, override=False)
        except Exception:
            # Non-fatal if not present or path resolution fails
            pass

    def _get_branch_data(self) -> dict[str, dict[str, str | int]]:
        values = {}
        branch_list = requests.request(
            "GET",
            f"https://api.supabase.com/v1/projects/{self.get_supabase_project_id()}/branches",
            headers={
                "Authorization": "Bearer " + self.get_supabase_rest_key(),
            },
            data={},
        )
        branch_list_data = branch_list.json()
        for branch in branch_list_data:
            if branch["git_branch"] == self.get_git_branch():
                branch_data = requests.request(
                    "GET",
                    f"https://api.supabase.com/v1/branches/{branch['id']}",
                    headers={
                        "Authorization": "Bearer " + self.get_supabase_rest_key(),
                    },
                    data={},
                )
                branch_data_json = branch_data.json()
                values["branch"] = branch_data_json
                keys_data = requests.request(
                    "GET",
                    f"https://api.supabase.com/v1/projects/{branch_data_json['ref']}/api-keys",
                    headers={
                        "Authorization": "Bearer " + self.get_supabase_rest_key(),
                    },
                    data={},
                )
                keys_data_json = keys_data.json()
                for key in keys_data_json:
                    if key["name"] == "service_role":
                        values["key"] = key
        return values

    def get_supabase_project_url(self) -> str:
        value = os.getenv("SUPABASE_PROJECT_URL")
        if value is None:
            value = ""
        if self.is_pull_request():
            branch_data = self._get_branch_data()
            value = "https://" + str(branch_data["branch"]["db_host"])[3:]
        # Reasonable local default if nothing provided and not production
        if not value and not self.is_production():
            # Supabase REST default port when running via `supabase start`
            # Use host.docker.internal so containers can reach host services on macOS/Windows
            value = "http://host.docker.internal:54321"
        return value

    def get_supabase_api_key(self) -> str:
        value = os.getenv("SUPABASE_API_KEY")
        if value is None:
            value = ""
        if self.is_pull_request():
            branch_data = self._get_branch_data()
            value = str(branch_data["key"]["api_key"])
        # Fallbacks for local development with Supabase CLI
        if not value:
            value = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
        return value

    # Dependency helpers
    def provide_supabase_base_and_key(self) -> tuple[str, str]:
        base_url = self.get_supabase_project_url().rstrip("/")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or self.get_supabase_api_key()
        return base_url, service_key

    def get_supabase_rest_key(self) -> str:
        value = os.getenv("SUPABASE_REST_KEY")
        if value is None:
            value = ""
        return value

    def get_supabase_jwt_secret(self) -> str:
        value = os.getenv("SUPABASE_JWT_SECRET")
        if value is None:
            # Fallback to generic JWT secret name used by Supabase CLI
            value = os.getenv("JWT_SECRET")
        if value is None:
            raise ValueError("SUPABASE_JWT_SECRET (or JWT_SECRET) is not set. This is required for authentication.")
        return value

    def get_supabase_project_id(self) -> str:
        value = os.getenv("SUPABASE_PROJECT_ID")
        if value is None:
            value = ""
        return value

    def get_crawler_api_key(self) -> str:
        value = os.getenv("CRAWLER_API_KEY")
        if value is None:
            value = ""
        return value

    def get_openai_api_key(self) -> str:
        value = os.getenv("OPENAI_API_KEY")
        if value is None:
            value = ""
        return value

    def get_brevo_api_key(self) -> str:
        value = os.getenv("BREVO_API_KEY")
        if value is None:
            value = ""
        return value

    def get_email_sender_name(self) -> str:
        return os.getenv("EMAIL_SENDER_NAME", "ANQA")

    def get_email_sender_email(self) -> str:
        return os.getenv("EMAIL_SENDER_EMAIL", "noreply@anqa.cloud")

    def get_frontend_public_url(self) -> str:
        # Preferred explicit override
        value = os.getenv("FRONTEND_PUBLIC_URL")
        if value:
            return value.rstrip("/")

        # Project convention: domain saved in .env as DOMAIN_FRONTEND (without scheme)
        domain_env = os.getenv("DOMAIN_FRONTEND")
        if domain_env:
            domain = domain_env.strip().strip('/')
            # If the value already includes a scheme, respect it
            if domain.startswith("http://") or domain.startswith("https://"):
                return domain.rstrip("/")
            # Otherwise, compose using an appropriate scheme per environment
            scheme = "https" if self.is_production() else "http"
            return f"{scheme}://{domain}"

        # Fallbacks
        if not self.is_production():
            return "http://127.0.0.1:3000"
        # As a last resort use a safe production default
        return "https://anqa.cloud"

    def is_pull_request(self) -> bool:
        value = os.getenv("IS_PULL_REQUEST")
        if value is None:
            value = ""
        return value == "true"

    def get_git_branch(self) -> str:
        """Return current git branch name if available, otherwise empty string.

        Avoids hard dependency on pygit2 in environments where libgit2 is unavailable.
        """
        render = os.getenv("RENDER")
        if render is not None:
            value = os.getenv("RENDER_GIT_BRANCH")
            return value or ""
        try:
            from pygit2 import Repository  # type: ignore

            return Repository(".").head.shorthand
        except Exception:
            return ""

    def get_twitter_api_key(self) -> str:
        value = os.getenv("TWITTER_API_KEY")
        if value is None:
            value = ""
        return value

    def get_disable_auth(self) -> bool:
        value = os.getenv("DISABLE_AUTH")
        if value is None:
            return False
        return value.lower() == "true"

    def is_production(self) -> bool:
        """
        Check if the application is running in a production environment.
        :return: True if in production, False otherwise.
        """
        env_value = os.getenv("ENVIRONMENT", "production")
        return (env_value or "").lower() != "development"

    def get_cohere_api_key(self) -> str:
        value = os.getenv("COHERE_API_KEY")
        if value is None:
            value = ""
        return value
