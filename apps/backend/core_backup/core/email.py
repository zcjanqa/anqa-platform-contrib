import os
import logging
from typing import Optional

import brevo_python

from app.core.config import Settings

import smtplib
from email.message import EmailMessage


class Email:
    """
    Simple container for an outbound transactional e-mail.
    """

    def __init__(
        self,
        *,
        subject: str,
        html_body: str,
        recipients: list[str],
        text_body: Optional[str] = None,
        sender_name: str = "OpenEU",
        sender_email: str = "noreply@mail.openeu.csee.tech",
        reply_to: Optional[str] = None,
        headers: Optional[dict[str, str]] = None,
    ):
        self.subject = subject
        self.html_body = html_body
        self.text_body = text_body
        self.recipients = recipients
        self.sender_name = sender_name
        self.sender_email = sender_email
        self.reply_to = reply_to
        self.headers = headers or {}


class EmailService:
    logger = logging.getLogger(__name__)
    settings = Settings()
    configuration = brevo_python.Configuration()
    configuration.api_key["api-key"] = settings.get_brevo_api_key()
    client = brevo_python.TransactionalEmailsApi(brevo_python.ApiClient(configuration))
    prevent_email_sending = not settings.is_production()

    @staticmethod
    def _anonymize_email(email: str) -> str:
        if not email or "@" not in email:
            return email

        local_part, domain = email.split("@", 1)
        if len(local_part) <= 2:
            return email

        anonymized_local = local_part[0] + local_part[1] + "*" * (len(local_part) - 2)
        return f"{anonymized_local}@{domain}"

    @staticmethod
    def send_email(email: Email):
        if len(email.recipients) == 0:
            EmailService.logger.warning("No recipients provided for email, doing nothing")
            return

        sender_info = {"name": email.sender_name, "email": email.sender_email}
        env = os.getenv("ENVIRONMENT", "production").lower()
        backend = os.getenv("EMAIL_BACKEND", "brevo").lower()

        # Send using SMTP if explicitly requested in dev
        if backend == "local_dev_only_smtp" and env == "development":
            msg = EmailMessage()
            msg["Subject"] = email.subject
            msg["From"] = email.sender_email
            msg["To"] = ", ".join(email.recipients)
            msg.set_content(email.text_body or "This is a fallback text body")
            msg.add_alternative(email.html_body, subtype="html")
            with smtplib.SMTP(os.getenv("EMAIL_HOST", "localhost"), int(os.getenv("EMAIL_PORT", "1025"))) as smtp:
                smtp.send_message(msg)
            EmailService.logger.info(f"Email sent via SMTP to {email.recipients}")
            return

        # LOGGING ONLY: Dev environment, but not the special SMTP case
        if env == "development":
            for recipient in email.recipients:
                EmailService.logger.info(f"[DEV] Would send email to: {recipient}")
            return

        # Default: Production - Actually send with Brevo
        sender_info = {"name": email.sender_name, "email": email.sender_email}
        for recipient in email.recipients:
            to_field = [{"email": recipient}]
            email_data = brevo_python.SendSmtpEmail(
                sender=sender_info,
                to=to_field,
                subject=email.subject,
                html_content=email.html_body,
                text_content=email.text_body,
                reply_to={"email": email.reply_to} if email.reply_to else None,
                headers=email.headers or None,
            )
            EmailService.client.send_transac_email(email_data)
            anonymized_recipient = EmailService._anonymize_email(recipient)
            EmailService.logger.info(f"Email sent successfully to {anonymized_recipient}")
