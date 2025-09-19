import os


def render_password_reset_email(action_link: str) -> tuple[str, str]:
    """Return subject and HTML for the password reset email.

    Uses a dedicated password reset template to provide clear instructions.
    """
    template_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "email_templates",
            "password_reset.html",
        )
    )
    with open(template_path, "r", encoding="utf-8") as f:
        template_html = f.read()
    html_body = template_html.replace("{{ .ActionURL }}", action_link)
    subject = os.getenv("EMAIL_SUBJECT_PASSWORD_RESET", "Reset your password | ANQA")
    return subject, html_body


