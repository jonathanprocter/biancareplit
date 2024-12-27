from flask import current_app
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import logging
from models import User, DailyProgress, QuizAttempt
from sqlalchemy import func
from extensions import db

logger = logging.getLogger(__name__)


class InstructorReportingService:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        self.app = app

    @staticmethod
    def generate_student_report(student_id, date=None):
        """Generate a detailed report for a specific student."""
        if date is None:
            date = datetime.utcnow().date()

        try:
            # Get student data
            student = User.query.get(student_id)
            if not student:
                raise ValueError(f"Student with ID {student_id} not found")

            # Get daily progress
            progress = DailyProgress.query.filter(
                DailyProgress.userId == student_id,
                func.date(DailyProgress.date) == date,
            ).first()

            # Get quiz attempts
            attempts = QuizAttempt.query.filter(
                QuizAttempt.userId == student_id,
                func.date(QuizAttempt.createdAt) == date,
            ).all()

            # Calculate statistics
            total_attempts = len(attempts)
            correct_answers = sum(1 for a in attempts if a.isCorrect)
            accuracy = (
                (correct_answers / total_attempts * 100) if total_attempts > 0 else 0
            )

            report = {
                "student_name": student.username,
                "date": date.strftime("%Y-%m-%d"),
                "questions_attempted": total_attempts,
                "correct_answers": correct_answers,
                "accuracy_rate": round(accuracy, 2),
                "time_spent": progress.timeSpent if progress else 0,
                "topics_studied": progress.topicsStudied if progress else [],
                "strength_areas": progress.strengthAreas if progress else [],
                "weak_areas": progress.weakAreas if progress else [],
            }

            return report
        except Exception as e:
            logger.error(f"Error generating student report: {str(e)}")
            raise

    def send_instructor_email(self, instructor_id, student_reports):
        """Send daily email report to instructor."""
        try:
            instructor = User.query.get(instructor_id)
            if not instructor or instructor.role != "instructor":
                raise ValueError(f"Invalid instructor ID: {instructor_id}")

            # Create email content
            msg = MIMEMultipart()
            msg["Subject"] = (
                f'Daily Student Progress Report - {datetime.now().strftime("%Y-%m-%d")}'
            )
            msg["From"] = current_app.config["MAIL_DEFAULT_SENDER"]
            msg["To"] = instructor.email

            # Generate HTML content
            html_content = self._generate_email_html(student_reports)
            msg.attach(MIMEText(html_content, "html"))

            # Send email
            with smtplib.SMTP(
                current_app.config["MAIL_SERVER"], current_app.config["MAIL_PORT"]
            ) as server:
                if current_app.config["MAIL_USE_TLS"]:
                    server.starttls()
                if current_app.config["MAIL_USERNAME"]:
                    server.login(
                        current_app.config["MAIL_USERNAME"],
                        current_app.config["MAIL_PASSWORD"],
                    )
                server.send_message(msg)

            logger.info(f"Sent daily report to instructor {instructor.email}")
            return True
        except Exception as e:
            logger.error(f"Error sending instructor email: {str(e)}")
            raise

    @staticmethod
    def _generate_email_html(student_reports):
        """Generate HTML content for the email."""
        html = """
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .student-report { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
                .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                .highlight { color: #2563eb; }
                .warning { color: #dc2626; }
            </style>
        </head>
        <body>
            <h1>Daily Student Progress Report</h1>
            <p>Here's a summary of your students' progress for {date}</p>
        """.format(
            date=datetime.now().strftime("%Y-%m-%d")
        )

        for report in student_reports:
            html += """
            <div class="student-report">
                <h2>{student_name}</h2>
                <div class="stats">
                    <div>
                        <strong>Questions Attempted:</strong> {questions}
                        <br>
                        <strong>Accuracy Rate:</strong> {accuracy}%
                        <br>
                        <strong>Study Time:</strong> {time} minutes
                    </div>
                    <div>
                        <strong>Topics Studied:</strong>
                        <ul>
                            {topics}
                        </ul>
                    </div>
                </div>
                <div>
                    <h3>Strengths</h3>
                    <ul>
                        {strengths}
                    </ul>
                    <h3>Areas Needing Improvement</h3>
                    <ul>
                        {weaknesses}
                    </ul>
                </div>
            </div>
            """.format(
                student_name=report["student_name"],
                questions=report["questions_attempted"],
                accuracy=report["accuracy_rate"],
                time=report["time_spent"],
                topics="".join(
                    f"<li>{topic}</li>" for topic in report["topics_studied"]
                ),
                strengths="".join(
                    f"<li>{area}</li>" for area in report["strength_areas"]
                ),
                weaknesses="".join(f"<li>{area}</li>" for area in report["weak_areas"]),
            )

        html += """
        </body>
        </html>
        """
        return html

    def schedule_daily_reports(self):
        """Schedule daily reports for all instructors."""
        try:
            instructors = User.query.filter_by(role="instructor").all()
            for instructor in instructors:
                # Get all students assigned to this instructor
                students = User.query.filter_by(
                    role="student"
                ).all()  # TODO: Add proper instructor-student relationship

                if not students:
                    continue

                # Generate reports for each student
                student_reports = []
                for student in students:
                    report = self.generate_student_report(student.id)
                    student_reports.append(report)

                # Send email to instructor
                self.send_instructor_email(instructor.id, student_reports)

            return True
        except Exception as e:
            logger.error(f"Error scheduling daily reports: {str(e)}")
            raise
