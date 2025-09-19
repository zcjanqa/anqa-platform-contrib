import os


def render_signup_email(action_link: str) -> tuple[str, str]:
    """Return subject and HTML for the signup confirmation email.

    Reads the HTML template from the email templates directory and injects the action_link.
    """
    template_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "email_templates",
            "magic_link.html",
        )
    )
    with open(template_path, "r", encoding="utf-8") as f:
        template_html = f.read()
    html_body = template_html.replace("{{ .ConfirmationURL }}", action_link)
    subject = os.getenv("EMAIL_SUBJECT_SIGNUP", "Confirm your signup | ANQA")
    return subject, html_body


