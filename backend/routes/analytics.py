"""Analytics routes for the medical education platform."""

import logging
import time
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from prometheus_client import generate_latest
from sqlalchemy import text

from backend.monitoring.metrics import (
    REGISTRY,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    STUDY_SESSION_DURATION,
    ANALYTICS_ERRORS,
)
from backend.models.analytics import db

# Configure route-specific logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize blueprint
analytics_bp = Blueprint("analytics", __name__)

# Define constants
PROMETHEUS_AVAILABLE = True
try:
    from prometheus_client import generate_latest  # noqa: F811
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("Prometheus client not available. Metrics collection disabled.")


@analytics_bp.route("/study-session", methods=["POST"])
def record_study_session():
    """Record a study session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        session_data = {
            "user_id": data.get("userId"),
            "start_time": datetime.fromisoformat(data.get("startTime")),
            "end_time": datetime.fromisoformat(data.get("endTime")),
            "category": data.get("category", "general"),
            "questions_attempted": data.get("questionsAttempted", 0),
            "questions_correct": data.get("questionsCorrect", 0),
        }

        # Record metrics if Prometheus is available
        if PROMETHEUS_AVAILABLE:
            duration = (
                session_data["end_time"] - session_data["start_time"]
            ).total_seconds()
            STUDY_SESSION_DURATION.labels(
                user_id=session_data["user_id"], category=session_data["category"]
            ).observe(duration)

        logger.info(f"Study session recorded for user {session_data['user_id']}")
        return (
            jsonify(
                {"status": "success", "message": "Study session recorded successfully"}
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error recording study session: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="study_session_recording").inc()
        return (
            jsonify({"status": "error", "message": "Failed to record study session"}),
            500,
        )


@analytics_bp.route("/performance", methods=["GET"])
def get_performance_metrics():
    """Get user performance metrics."""
    try:
        user_id = request.args.get("userId", "default_user")
        if not user_id:
            logger.warning("No userId provided, using default user")
        logger.info(f"Processing analytics request for user: {user_id}")
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")

        try:
            start_date = (
                datetime.fromisoformat(start_date)
                if start_date
                else datetime.now() - timedelta(days=30)
            )
            end_date = datetime.fromisoformat(end_date) if end_date else datetime.now()
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid date format"}), 400

        performance_data = {
            "totalStudyTime": 0,
            "questionsAttempted": 0,
            "correctAnswers": 0,
            "categoryBreakdown": {},
            "weakestCategories": [],
            "strongestCategories": [],
        }

        return jsonify({"status": "success", "data": performance_data}), 200

    except Exception as e:
        logger.error(f"Error retrieving performance metrics: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="performance_metrics").inc()
        return (
            jsonify(
                {"status": "error", "message": "Failed to retrieve performance metrics"}
            ),
            500,
        )


@analytics_bp.route("/report", methods=["GET"])
def generate_analytics_report():
    """Generate an analytics report with actual data from database."""
    try:
        user_id = request.args.get("userId", "default_user")
        if not user_id:
            logger.warning("No userId provided, using default user")
        logger.info(f"Processing analytics request for user: {user_id}")
        report_type = request.args.get("type", "summary")
        period = request.args.get("period", "30")

        try:
            period_days = int(period)
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid period format"}), 400

        start_date = datetime.now() - timedelta(days=period_days)

        with db.session.begin():
            study_stats = db.session.execute(
                text(
                    """
                    SELECT
                        COALESCE(SUM(duration) / 3600.0, 0) as total_hours,
                        COUNT(DISTINCT DATE(created_at)) as study_days
                    FROM study_sessions
                    WHERE user_id = :user_id
                    AND created_at >= :start_date
                """
                ),
                {"user_id": user_id, "start_date": start_date},
            ).first()

            question_stats = db.session.execute(
                text(
                    """
                    SELECT
                        COUNT(*) as total_questions,
                        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
                        AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100 as accuracy,
                        COUNT(DISTINCT category) as categories_studied
                    FROM question_attempts
                    WHERE user_id = :user_id
                    AND created_at >= :start_date
                """
                ),
                {"user_id": user_id, "start_date": start_date},
            ).first()

            improvement = (
                db.session.execute(
                    text(
                        """
                        WITH weekly_stats AS (
                            SELECT
                                date_trunc('week', created_at) as week,
                                AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100
                                as weekly_accuracy
                            FROM question_attempts
                            WHERE user_id = :user_id
                            AND created_at >= :start_date
                            GROUP BY date_trunc('week', created_at)
                            ORDER BY week
                        )
                        SELECT COALESCE(
                            (LAST_VALUE(weekly_accuracy) OVER (ORDER BY week) -
                            FIRST_VALUE(weekly_accuracy) OVER (ORDER BY week)),
                            0
                        ) as improvement
                        FROM weekly_stats
                    """
                    ),
                    {"user_id": user_id, "start_date": start_date},
                ).scalar()
                or 0
            )

        report_data = {
            "userId": user_id,
            "generatedAt": datetime.now().isoformat(),
            "reportType": report_type,
            "period": f"Last {period} days",
            "summary": {
                "totalStudyHours": round(study_stats[0], 1),
                "studyDays": study_stats[1],
                "questionsAnswered": question_stats[0],
                "correctAnswers": question_stats[1],
                "averageAccuracy": round(question_stats[2], 1),
                "categoriesStudied": question_stats[3],
                "improvement": round(improvement, 1),
            },
        }

        if PROMETHEUS_AVAILABLE:
            REQUEST_COUNT.labels(
                method="GET", endpoint="/analytics/report", status=200
            ).inc()

        return jsonify({"status": "success", "data": report_data}), 200

    except Exception as e:
        logger.error(f"Error generating analytics report: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="report_generation").inc()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to generate analytics report",
                    "error": str(e) if current_app.debug else None,
                }
            ),
            500,
        )


@analytics_bp.route("/daily-summary", methods=["GET"])
def get_daily_summary():
    """Get daily study summary with actual metrics."""
    try:
        user_id = request.args.get("userId", "default_user")
        if not user_id:
            logger.warning("No userId provided, using default user")
        logger.info(f"Processing analytics request for user: {user_id}")
        date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))

        try:
            query_date = datetime.strptime(date_str, "%Y-%m-%d")
            next_date = query_date + timedelta(days=1)
        except ValueError:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Invalid date format. Use YYYY-MM-DD",
                    }
                ),
                400,
            )

        start_time = time.time()

        try:
            with db.session.begin():
                study_time_result = db.session.execute(
                    text(
                        """
                        SELECT COALESCE(SUM(duration), 0) as total_time
                        FROM study_sessions
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                        AND created_at < :end_date
                        """
                    ),
                    {
                        "user_id": user_id,
                        "start_date": query_date,
                        "end_date": next_date,
                    },
                ).first()

                question_stats = db.session.execute(
                    text(
                        """
                        SELECT
                            category,
                            COUNT(*) as attempts,
                            SUM(CASE
                                WHEN is_correct THEN 1
                                ELSE 0
                            END) as correct_answers
                        FROM question_attempts
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                        AND created_at < :end_date
                        GROUP BY category
                        """
                    ),
                    {
                        "user_id": user_id,
                        "start_date": query_date,
                        "end_date": next_date,
                    },
                ).fetchall()

                performance_trend = db.session.execute(
                    text(
                        """
                        SELECT
                            category,
                            AVG(CASE
                                WHEN is_correct THEN 1
                                ELSE 0
                            END) as avg_score,
                            COUNT(*) as total_attempts
                        FROM question_attempts
                        WHERE user_id = :user_id
                        AND created_at >= :start_date - INTERVAL '7 days'
                        AND created_at < :end_date
                        GROUP BY category
                        HAVING COUNT(*) >= 5
                        ORDER BY avg_score DESC
                        """
                    ),
                    {
                        "user_id": user_id,
                        "start_date": query_date,
                        "end_date": next_date,
                    },
                ).fetchall()

        except Exception as db_error:
            logger.error(f"Database error in daily summary: {str(db_error)}")
            if PROMETHEUS_AVAILABLE:
                ANALYTICS_ERRORS.labels(error_type="database_error").inc()
            raise

        total_study_time = study_time_result[0] if study_time_result else 0

        categories = {}
        total_attempts = 0
        total_correct = 0

        for category, attempts, correct in question_stats:
            categories[category] = {
                "attempts": attempts,
                "correctAnswers": correct,
                "accuracy": (correct / attempts * 100) if attempts > 0 else 0,
            }
            total_attempts += attempts
            total_correct += correct

        recommendations = []
        if performance_trend:
            weak_categories = sorted(performance_trend, key=lambda x: x[1])[:2]

            for category, avg_score, attempts in weak_categories:
                if avg_score < 0.7:
                    recommendations.append(
                        {
                            "category": category,
                            "message": (
                                f"Focus on {category} - current accuracy is "
                                f"{avg_score*100:.1f}%"
                            ),
                            "priority": "high" if avg_score < 0.5 else "medium",
                        }
                    )

        summary_data = {
            "date": date_str,
            "studyTime": total_study_time,
            "questionsAttempted": total_attempts,
            "correctAnswers": total_correct,
            "accuracy": (
                (total_correct / total_attempts * 100) if total_attempts > 0 else 0
            ),
            "categories": categories,
            "recommendations": recommendations,
        }

        if PROMETHEUS_AVAILABLE:
            REQUEST_COUNT.labels(
                method="GET", endpoint="/analytics/daily-summary", status=200
            ).inc()
            REQUEST_LATENCY.labels(endpoint="/analytics/daily-summary").observe(
                time.time() - start_time
            )

        return jsonify({"status": "success", "data": summary_data}), 200

    except Exception as e:
        logger.error(f"Error retrieving daily summary: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="daily_summary_retrieval").inc()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to retrieve daily summary",
                    "error": str(e) if current_app.debug else None,
                }
            ),
            500,
        )


@analytics_bp.route("/metrics", methods=["GET"])
def metrics():
    """Expose Prometheus metrics."""
    if not PROMETHEUS_AVAILABLE:
        logger.warning("Metrics endpoint called but Prometheus is not available")
        return (
            jsonify(
                {"status": "error", "message": "Metrics collection is not available"}
            ),
            503,
        )

    try:
        metrics_data = generate_latest(REGISTRY)
        logger.info("Metrics generated successfully")
        return (
            metrics_data,
            200,
            {
                "Content-Type": "text/plain; version=0.0.4",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        )
    except Exception as e:
        logger.error(f"Error generating metrics: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="metrics_generation").inc()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to generate metrics",
                    "error": str(e),
                }
            ),
            500,
        )


@analytics_bp.route("/dashboard", methods=["GET"])
def get_analytics_dashboard():
    """Get analytics dashboard data with actual metrics."""
    try:
        user_id = request.args.get("userId", "default_user")
        if not user_id:
            logger.warning("No userId provided, using default user")
        logger.info(f"Processing analytics request for user: {user_id}")
        start_time = time.time()

        try:
            thirty_days_ago = datetime.now() - timedelta(days=30)

            with db.session.begin():
                study_time_result = db.session.execute(
                    text(
                        """
                        SELECT COALESCE(SUM(duration), 0) as total_time
                        FROM study_sessions
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                    """
                    ),
                    {"user_id": user_id, "start_date": thirty_days_ago},
                ).first()

                question_stats = db.session.execute(
                    text(
                        """
                        SELECT
                            COUNT(*) as total_questions,
                            SUM(CASE
                                WHEN is_correct THEN 1
                                ELSE 0
                            END) as correct_answers
                        FROM question_attempts
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                    """
                    ),
                    {"user_id": user_id, "start_date": thirty_days_ago},
                ).first()

                category_performance = db.session.execute(
                    text(
                        """
                        SELECT
                            category,
                            COUNT(*) as attempts,
                            (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::float /
                             COUNT(*)) as success_rate
                        FROM question_attempts
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                        GROUP BY category
                        ORDER BY success_rate DESC
                    """
                    ),
                    {"user_id": user_id, "start_date": thirty_days_ago},
                ).fetchall()

                daily_progress = db.session.execute(
                    text(
                        """
                        SELECT
                            DATE(created_at) as study_date,
                            COUNT(*) as questions_attempted,
                            SUM(CASE
                                WHEN is_correct THEN 1
                                ELSE 0
                            END) as correct_answers
                        FROM question_attempts
                        WHERE user_id = :user_id
                        AND created_at >= :start_date
                        GROUP BY DATE(created_at)
                        ORDER BY study_date DESC
                        LIMIT 7
                    """
                    ),
                    {
                        "user_id": user_id,
                        "start_date": datetime.now() - timedelta(days=7),
                    },
                ).fetchall()

        except Exception as db_error:
            logger.error(f"Database error in dashboard retrieval: {str(db_error)}")
            if PROMETHEUS_AVAILABLE:
                ANALYTICS_ERRORS.labels(error_type="database_error").inc()
            raise

        total_study_time = study_time_result[0] if study_time_result else 0
        total_questions = question_stats[0] if question_stats else 0
        correct_answers = question_stats[1] if question_stats else 0
        average_score = (
            (correct_answers / total_questions * 100) if total_questions > 0 else 0
        )

        strengths = (
            [
                {"category": cat, "success_rate": rate}
                for cat, _, rate in category_performance[:3]
            ]
            if category_performance
            else []
        )

        weaknesses = (
            [
                {"category": cat, "success_rate": rate}
                for cat, _, rate in reversed(category_performance[-3:])
            ]
            if category_performance
            else []
        )

        dashboard_data = {
            "summary": {
                "totalStudyTime": total_study_time,
                "questionsAnswered": total_questions,
                "averageScore": round(average_score, 2),
                "mastery": round(average_score / 20, 2),
            },
            "progress": {
                "daily": [
                    {
                        "date": row[0].strftime("%Y-%m-%d"),
                        "attempted": row[1],
                        "correct": row[2],
                    }
                    for row in daily_progress
                ],
                "weekly": [],
                "monthly": [],
            },
            "categories": {
                "strengths": strengths,
                "weaknesses": weaknesses,
                "improvement": [],
            },
        }

        if PROMETHEUS_AVAILABLE:
            REQUEST_COUNT.labels(
                method="GET", endpoint="/analytics/dashboard", status=200
            ).inc()

            REQUEST_LATENCY.labels(endpoint="/analytics/dashboard").observe(
                time.time() - start_time
            )

        return jsonify({"status": "success", "data": dashboard_data}), 200

    except Exception as e:
        logger.error(f"Error retrieving dashboard data: {str(e)}")
        if PROMETHEUS_AVAILABLE:
            ANALYTICS_ERRORS.labels(error_type="dashboard_retrieval").inc()
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to retrieve dashboard data",
                    "error": str(e) if current_app.debug else None,
                }
            ),
            500,
        )

