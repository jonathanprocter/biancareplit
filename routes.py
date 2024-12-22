from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import func, case
from datetime import datetime, date
import logging
import asyncio
import json
import os

from models import (
    db,
    Content,
    Review,
    StudyMaterial,
    StudentProgress,
    SubjectCategory,
    DifficultyLevel,
    ContentType,
) 
from ai_coach import AICoach
from question_generator import QuestionGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bp = Blueprint("api", __name__)
ai_coach = AICoach()
question_generator = QuestionGenerator()


@bp.route("/status", methods=["GET"])
def status():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@bp.route("/test-json", methods=["GET"])
def test_json():
    try:
        return jsonify({"success": True, "message": "JSON response test successful"})
    except Exception as e:
        logger.error(f"Error in test_json endpoint: {str(e)}")
        return (
            jsonify(
                {"success": False, "error": "Internal server error", "details": str(e)}
            ),
            500,
        )


@bp.route("/api/analytics/dashboard", methods=["GET"])
def get_analytics_dashboard():
    try:
        logger.info("Fetching analytics dashboard data")

        category_stats = (
            db.session.query(
                Content.category,
                func.count(Review.id).label("total_reviews"),
                func.sum(case((Review.is_correct == True, 1), else_=0)).label(
                    "correct_reviews"
                ),
            )
            .join(Review, Review.content_id == Content.id)
            .group_by(Content.category)
            .all()
        )

        category_performance = {}
        for category, total, correct in category_stats:
            accuracy = round((correct / total * 100) if total > 0 else 0, 2)
            category_performance[category.value] = {
                "total_attempts": total,
                "correct_answers": correct,
                "accuracy": accuracy,
            }

        study_time = (
            db.session.query(
                StudyMaterial.category,
                func.coalesce(func.sum(StudyMaterial.duration), 0).label(
                    "total_duration"
                ),
            )
            .group_by(