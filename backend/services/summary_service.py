import os
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from models import QuestionAttempt, StudySession


class SummaryService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")

    @staticmethod
    async def generate_daily_summary(user_id: str):
        yesterday = datetime.now() - timedelta(days=1)

        # Get study sessions
        sessions = await StudySession.query.filter(
            StudySession.user_id == user_id, StudySession.created_at >= yesterday
        ).all()

        # Get question attempts
        attempts = await QuestionAttempt.query.filter(
            QuestionAttempt.user_id == user_id, QuestionAttempt.created_at >= yesterday
        ).all()

        correct_attempts = sum(1 for a in attempts if a.is_correct)
        accuracy = (correct_attempts / len(attempts)) * 100 if attempts else 0

        summary = f"""
        Daily Study Summary ({yesterday.strftime('%Y-%m-%d')})
        
        Study Sessions: {len(sessions)}
        Total Questions Attempted: {len(attempts)}
        Accuracy: {accuracy:.1f}%
        """

        return summary

    async def send_email(self, to_email: str, summary: str):
        msg = MIMEMultipart()
        msg["From"] = self.smtp_username
        msg["To"] = to_email
        msg["Subject"] = f"Daily Study Summary - {datetime.now().strftime('%Y-%m-%d')}"

        msg.attach(MIMEText(summary, "plain"))

        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
