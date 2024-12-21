"""Study session tracking middleware for NCLEX platform."""

from functools import wraps
from flask import request, g, current_app
import logging
from datetime import datetime, timedelta
from typing import Callable, Dict, Any
from backend.database.config import db_config

logger = logging.getLogger(__name__)


class StudyMetrics:
    """Track study session metrics."""

    def __init__(self):
        self.start_time = datetime.utcnow()
        self.questions_attempted = 0
        self.correct_answers = 0
        self.time_per_question = []
        self.category_performance = {}

    def record_attempt(self, correct: bool, category: str, time_taken: float):
        """Record a question attempt."""
        self.questions_attempted += 1
        if correct:
            self.correct_answers += 1

        self.time_per_question.append(time_taken)

        if category not in self.category_performance:
            self.category_performance[category] = {"attempts": 0, "correct": 0}

        self.category_performance[category]["attempts"] += 1
        if correct:
            self.category_performance[category]["correct"] += 1


def get_db_manager():
    """Get database manager instance"""
    return db_config


def track_study_session(f: Callable) -> Callable:
    """Middleware decorator to track study session metrics."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Initialize study metrics if not exists
        if not hasattr(g, "study_metrics"):
            g.study_metrics = StudyMetrics()

        try:
            # Execute the route handler
            response = f(*args, **kwargs)

            # Calculate session metrics
            current_time = datetime.utcnow()
            duration = (current_time - g.study_metrics.start_time).total_seconds()

            # Get database manager
            db_manager = get_db_manager()

            # Prepare metrics for logging
            metrics = {
                "duration": duration,
                "user_id": getattr(g, "user_id", None),
                "questions_attempted": g.study_metrics.questions_attempted,
                "correct_answers": g.study_metrics.correct_answers,
                "average_time_per_question": (
                    sum(g.study_metrics.time_per_question)
                    / len(g.study_metrics.time_per_question)
                    if g.study_metrics.time_per_question
                    else 0
                ),
                "category_performance": g.study_metrics.category_performance,
                "accuracy_rate": (
                    (
                        g.study_metrics.correct_answers
                        / g.study_metrics.questions_attempted
                        * 100
                    )
                    if g.study_metrics.questions_attempted > 0
                    else 0
                ),
                "endpoint": request.endpoint,
                "session_id": request.headers.get("X-Session-ID"),
            }

            # Log session metrics
            logger.info("Study session metrics", extra=metrics)

            # Store metrics in database if session is ending
            if request.endpoint in ["end_session", "logout"]:
                with db_manager.get_session() as session:
                    # Store detailed metrics in database
                    # Implementation will depend on your database schema
                    pass

            return response

        except Exception as e:
            logger.error(
                f"Error tracking study session: {str(e)}",
                extra={
                    "user_id": getattr(g, "user_id", None),
                    "endpoint": request.endpoint,
                    "error": str(e),
                },
            )
            raise

    return decorated_function


def track_question_attempt(f: Callable) -> Callable:
    """Middleware decorator to track individual question attempts."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        attempt_start = datetime.utcnow()
        question_id = kwargs.get("question_id")

        try:
            # Execute the route handler
            response = f(*args, **kwargs)

            # Record attempt metrics
            attempt_end = datetime.utcnow()
            duration = (attempt_end - attempt_start).total_seconds()

            # Extract response data
            response_data = response.json if hasattr(response, "json") else {}
            is_correct = response_data.get("correct", False)
            category = response_data.get("category", "uncategorized")

            # Update study metrics
            if hasattr(g, "study_metrics"):
                g.study_metrics.record_attempt(
                    correct=is_correct, category=category, time_taken=duration
                )

            # Prepare detailed metrics
            metrics = {
                "duration": duration,
                "user_id": getattr(g, "user_id", None),
                "question_id": question_id,
                "category": category,
                "correct": is_correct,
                "attempt_number": getattr(g, "attempt_number", 1),
                "time_of_day": attempt_start.strftime("%H:%M"),
                "difficulty": response_data.get("difficulty", "medium"),
                "topic_area": response_data.get("topic_area", "general"),
                "response_time_percentile": calculate_response_time_percentile(
                    duration, category
                ),
            }

            # Log detailed metrics
            logger.info("Question attempt metrics", extra=metrics)

            return response

        except Exception as e:
            logger.error(
                f"Error tracking question attempt: {str(e)}",
                extra={
                    "user_id": getattr(g, "user_id", None),
                    "question_id": question_id,
                    "error": str(e),
                },
            )
            raise

    return decorated_function


def calculate_response_time_percentile(duration: float, category: str) -> float:
    """Calculate the response time percentile for a given duration and category."""
    # This is a placeholder implementation
    # In a real application, this would compare against historical data
    baseline_times = {
        "pharmacology": 120,
        "medical-surgical": 90,
        "pediatric": 100,
        "mental-health": 80,
        "uncategorized": 100,
    }

    baseline = baseline_times.get(category, 100)
    if duration <= baseline * 0.5:
        return 90  # Top 10%
    elif duration <= baseline * 0.75:
        return 75  # Top 25%
    elif duration <= baseline:
        return 50  # Median
    elif duration <= baseline * 1.5:
        return 25  # Bottom 25%
    else:
        return 10  # Bottom 10%


def init_study_tracking(app):
    """Initialize study tracking middleware."""

    @app.before_request
    def before_study_request():
        g.study_session_start = datetime.utcnow()
        g.questions_attempted = 0
        g.correct_answers = 0

    logger.info("Study tracking middleware initialized")
