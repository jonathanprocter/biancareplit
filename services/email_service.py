
from flask_mail import Mail, Message
from flask import current_app
from datetime import datetime

mail = Mail()

class EmailService:
    @staticmethod
    def send_daily_summary(email: str, summary: str):
        msg = Message(
            f"Daily Study Summary - {datetime.now().strftime('%Y-%m-%d')}",
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        msg.body = summary
        mail.send(msg)
