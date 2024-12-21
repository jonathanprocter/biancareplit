from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
from flask_cors import cross_origin
from backend.models.analytics import StudySession, QuestionAttempt, UserProgress
from backend.database.config import db
import openai
import os
from typing import Dict, List, Optional
import json
import logging
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


def handle_error(error):
    """Global error handler for the blueprint."""
    response = {"error": str(error), "status": getattr(error, "code", 500)}
    return jsonify(response), response["status"]


nclex_routes = Blueprint("nclex_routes", __name__)

# NCLEX categories and difficulty levels
NCLEX_CATEGORIES = {
    "SAFE_CARE": "Safe and Effective Care Environment",
    "HEALTH_PROMOTION": "Health Promotion and Maintenance",
    "PSYCHOSOCIAL": "Psychosocial Integrity",
    "PHYSIOLOGICAL": "Physiological Integrity",
}

DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"]


@nclex_routes.route("/api/nclex-coach/study-session", methods=["POST"])
def start_study_session():
    """Start a new study session."""
    try:
        data = request.json
        user_id = data.get("userId")
        category = data.get("category")

        session = StudySession(
            user_id=user_id,
            category=category,
            duration=0,  # Will be updated when session ends
            created_at=datetime.utcnow(),
        )
        db.session.add(session)
        db.session.commit()

        return jsonify(
            {"sessionId": session.id, "startTime": session.created_at.isoformat()}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nclex_routes.route("/api/nclex-coach/performance", methods=["GET"])
def get_user_performance():
    """Get user's performance analytics."""
    try:
        user_id = request.args.get("userId")

        # Get user progress
        progress = UserProgress.query.filter_by(user_id=user_id).first()

        # Get recent question attempts
        recent_attempts = (
            QuestionAttempt.query.filter_by(user_id=user_id)
            .order_by(QuestionAttempt.created_at.desc())
            .limit(50)
            .all()
        )

        # Calculate metrics
        total_attempts = len(recent_attempts)
        if total_attempts == 0:
            return jsonify(
                {
                    "metrics": {
                        "averageScore": 0,
                        "timePerQuestion": 0,
                        "totalStudyTime": 0,
                        "questionsAttempted": 0,
                    },
                    "categories": {},
                    "weakestTopics": [],
                }
            )

        correct_attempts = sum(1 for attempt in recent_attempts if attempt.is_correct)
        avg_score = correct_attempts / total_attempts
        avg_time = (
            sum(attempt.time_taken for attempt in recent_attempts) / total_attempts
        )

        # Category performance
        category_performance = {}
        for category in NCLEX_CATEGORIES.values():
            category_attempts = [a for a in recent_attempts if a.category == category]
            if category_attempts:
                category_correct = sum(1 for a in category_attempts if a.is_correct)
                category_performance[category] = category_correct / len(
                    category_attempts
                )
            else:
                category_performance[category] = 0

        # Find weakest topics
        weakest_topics = sorted(category_performance.items(), key=lambda x: x[1])[:3]

        return jsonify(
            {
                "metrics": {
                    "averageScore": avg_score,
                    "timePerQuestion": avg_time,
                    "totalStudyTime": progress.total_study_time if progress else 0,
                    "questionsAttempted": (
                        progress.questions_attempted if progress else 0
                    ),
                },
                "categories": category_performance,
                "weakestTopics": [topic for topic, _ in weakest_topics],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nclex_routes.route("/api/nclex-coach/question", methods=["POST"])
def generate_question():
    """Generate an NCLEX-style question using AI."""
    try:
        data = request.json
        topic = data.get("topic")
        category = data.get("category")
        difficulty = data.get("difficulty", "intermediate")

        if not all([topic, category]) or difficulty not in DIFFICULTY_LEVELS:
            return jsonify({"error": "Invalid parameters"}), 400

        # Initialize OpenAI client
        client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        # Generate question using GPT-4
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert NCLEX question writer. Create challenging but fair questions that test nursing knowledge accurately.",
                },
                {
                    "role": "user",
                    "content": f"Create an NCLEX-style {difficulty} level question about {topic} related to {category}. Include 4 options, the correct answer, and a detailed explanation.",
                },
            ],
            temperature=0.7,
        )

        # Parse the response and format question
        question_text = response.choices[0].message.content

        return jsonify(
            {
                "question": question_text,
                "metadata": {
                    "topic": topic,
                    "category": category,
                    "difficulty": difficulty,
                    "generatedAt": datetime.utcnow().isoformat(),
                },
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nclex_routes.route("/api/nclex-coach/submit-answer", methods=["POST"])
def submit_answer():
    """Submit an answer for a question attempt."""
    try:
        data = request.json
        user_id = data.get("userId")
        is_correct = data.get("isCorrect")
        time_taken = data.get("timeTaken")
        category = data.get("category")

        # Record the attempt
        attempt = QuestionAttempt(
            user_id=user_id,
            category=category,
            is_correct=is_correct,
            time_taken=time_taken,
            created_at=datetime.utcnow(),
        )
        db.session.add(attempt)

        # Update user progress
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        if not progress:
            progress = UserProgress(user_id=user_id)
            db.session.add(progress)

        progress.questions_attempted += 1
        if is_correct:
            progress.correct_answers += 1
        progress.total_study_time += time_taken
        progress.last_active = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "attemptId": attempt.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
