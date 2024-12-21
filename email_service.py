import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class EmailService:
    _instance: Optional["EmailService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmailService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        try:
            # Get SMTP settings with validation
            self.smtp_server = os.getenv("SMTP_SERVER")
            smtp_port = os.getenv("SMTP_PORT")
            self.smtp_username = os.getenv("SMTP_USERNAME")
            self.smtp_password = os.getenv("SMTP_PASSWORD")

            # Validate all required settings
            missing_settings = []
            if not self.smtp_server:
                missing_settings.append("SMTP_SERVER")
            if not smtp_port:
                missing_settings.append("SMTP_PORT")
            if not self.smtp_username:
                missing_settings.append("SMTP_USERNAME")
            if not self.smtp_password:
                missing_settings.append("SMTP_PASSWORD")

            if missing_settings:
                error_msg = f"Email service configuration incomplete - missing: {', '.join(missing_settings)}"
                logger.error(error_msg)
                raise ValueError(error_msg)

            # Validate port number with proper type handling
            try:
                if smtp_port is None:
                    self.smtp_port = 587  # Default to 587 if not set
                else:
                    port_value = int(smtp_port)
                    if not (0 <= port_value <= 65535):
                        raise ValueError(f"Invalid SMTP port number: {port_value}")
                    self.smtp_port = port_value
            except (TypeError, ValueError) as e:
                logger.error(f"Invalid SMTP_PORT value: {smtp_port}")
                raise ValueError(f"Invalid SMTP port configuration: {str(e)}")

            logger.info("Email service initialized successfully")
            self._initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize email service: {str(e)}")
            raise

    def send_daily_summary(
        self, email: str, summary_data: Dict[str, Any]
    ) -> tuple[bool, str]:
        """
        Send a daily study summary email to the specified address.
        Returns a tuple of (success: bool, message: str)
        """
        try:
            if not email:
                return (False, "Email address is required")

            # Basic email format validation
            if not "@" in email or not "." in email:
                return (False, "Invalid email address format")

            if not summary_data:
                return (False, "No summary data available to send")

            # Verify required fields in summary data
            required_fields = ["questionsAttempted", "accuracyRate", "studyTime"]
            missing_fields = [
                field for field in required_fields if field not in summary_data
            ]
            if missing_fields:
                return (
                    False,
                    f"Incomplete summary data: missing {', '.join(missing_fields)}",
                )

            logger.info(f"Preparing daily summary email for {email}")
            msg = MIMEMultipart()
            msg["From"] = f"NCLEX Study Coach <{self.smtp_username}>"
            msg["To"] = email
            msg["Subject"] = "Your Daily NCLEX Study Summary"

            # Format study time
            study_time = summary_data.get("studyTime", 0)
            hours = study_time // 60
            minutes = study_time % 60
            time_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    Daily Study Summary
                </h1>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Questions Attempted:</strong> {summary_data.get('questionsAttempted', 0)}</p>
                    <p><strong>Accuracy Rate:</strong> {summary_data.get('accuracyRate', 0):.1f}%</p>
                    <p><strong>Study Time:</strong> {time_str}</p>
                </div>
                
                <h2 style="color: #2c3e50; margin-top: 20px;">Topics Mastered Today</h2>
                <ul style="list-style-type: none; padding-left: 0;">
                    {(''.join(f'<li style="padding: 5px 0;">✓ {topic}</li>' for topic in summary_data.get('topicsMastered', []))) or '<li>No topics mastered today</li>'}
                </ul>
                
                <h2 style="color: #2c3e50; margin-top: 20px;">Recommendations</h2>
                <ul style="list-style-type: none; padding-left: 0;">
                    {(''.join(f'<li style="padding: 5px 0;">📚 {rec}</li>' for rec in summary_data.get('recommendations', []))) or '<li>No recommendations for today</li>'}
                </ul>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666;">
                    <p><small>This is an automated summary from your NCLEX Study Coach.</small></p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html_body, "html"))

            if not all([self.smtp_server, self.smtp_username, self.smtp_password]):
                error_msg = "SMTP configuration is incomplete"
                logger.error(error_msg)
                return (False, error_msg)

            try:
                with smtplib.SMTP(str(self.smtp_server), self.smtp_port) as server:
                    server.starttls()
                    server.login(str(self.smtp_username), str(self.smtp_password))
                    server.send_message(msg)
                    logger.info(f"Daily summary email sent successfully to {email}")
                    return (True, "Email sent successfully")
            except Exception as e:
                error_msg = f"SMTP error: {str(e)}"
                logger.error(error_msg)
                return (False, error_msg)

        except smtplib.SMTPAuthenticationError:
            error_msg = "Failed to authenticate with SMTP server"
            logger.error(error_msg)
            return (False, error_msg)
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(error_msg)
            return (False, error_msg)
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return (False, error_msg)
