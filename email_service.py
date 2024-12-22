```python
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from validate_email import validate_email
import logging

class EmailService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmailService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True

        missing_settings = []

        smtp_server = os.getenv("SMTP_SERVER")
        smtp_port = os.getenv("SMTP_PORT")
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")

        try:
            port_value = int(smtp_port)
            if not (0 <= port_value <= 65535):
                raise ValueError(f"Invalid SMTP port number: {port_value}")
            else:
                self.smtp_port = port_value
        except (TypeError, ValueError) as e:
            missing_settings.append("SMTP_PORT")

        if not smtp_server:
            missing_settings.append("SMTP_SERVER")

        if not smtp_user:
            missing_settings.append("SMTP_USER")

        if not smtp_password:
            missing_settings.append("SMTP_PASSWORD")

        if missing_settings:
            raise ValueError(f"Missing required settings: {', '.join(missing_settings)}")

        self.smtp_server = smtp_server
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password

    def send_daily_summary(
        self, email: str, summary_data: Dict[str, Any]
    ) -> tuple[bool, str]:
        if not email or not validate_email(email):
            return (False, "Invalid email address")

        message = MIMEMultipart("alternative")
        message["Subject"] = "Daily Study Summary"
        message["From"] = self.smtp_user
        message["To"] = email

        text = f"Here is your daily study summary:\n\n{summary_data}"
        part = MIMEText(text, "plain")
        message.attach(part)

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(
                    self.smtp_user, email, message.as_string()
                )
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            return (False, str(e))

        return (True, "Email sent successfully")
```