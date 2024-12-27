from flask import Blueprint, jsonify, request
from models import Review, Flashcard, AdaptivePattern, Content
from extensions import db
from datetime import datetime, timedelta
from sqlalchemy import func, case
import logging
from adaptive_learning import AdaptiveLearningSystem, LearningIntegrationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

adaptive_routes = Blueprint("adaptive_routes", __name__)


@adaptive_routes.route("/api/learning-patterns", methods=["GET"])
def get_learning_patterns():
    """Get user's learning patterns"""
    try:
        user_id = 1  # For testing, replace with actual user authentication
        adaptive_system = AdaptiveLearningSystem(db_connection=db)
        patterns = adaptive_system.analyze_student_patterns(user_id)

        # Analyze recent performance trends
        recent_reviews = (
            Review.query.filter_by(user_id=user_id)
            .order_by(Review.created_at.desc())
            .limit(50)
            .all()
        )

        accuracy_trend = []
        time_distribution = {}

        for review in recent_reviews:
            day_key = review.created_at.strftime("%Y-%m-%d")
            if day_key not in time_distribution:
                time_distribution[day_key] = {
                    "total_time": 0,
                    "correct_answers": 0,
                    "total_questions": 0,
                }

            time_distribution[day_key]["total_time"] += review.time_taken
            time_distribution[day_key]["total_questions"] += 1
            if review.is_correct:
                time_distribution[day_key]["correct_answers"] += 1

        # Calculate daily accuracy rates
        for day, stats in time_distribution.items():
            if stats["total_questions"] > 0:
                accuracy = (stats["correct_answers"] / stats["total_questions"]) * 100
                accuracy_trend.append(
                    {
                        "date": day,
                        "accuracy": accuracy,
                        "studyTime": stats["total_time"],
                    }
                )

        return jsonify(
            {
                "currentLevel": patterns.get("learning_level", "Beginner"),
                "preferredStyle": patterns.get("learning_style", "Visual"),
                "insights": [
                    {
                        "title": "Learning Progress",
                        "description": f"Current accuracy rate: {patterns['accuracy_rate']:.1f}%",
                    },
                    {
                        "title": "Study Pattern",
                        "description": f"Average study time: {patterns['study_time_distribution']['average_time']} minutes",
                    },
                ],
                "accuracyTrend": accuracy_trend,
                "weakAreas": patterns.get("weak_areas", []),
                "recommendedTopics": patterns.get("recommended_topics", []),
            }
        )
    except Exception as e:
        logger.error(f"Error getting learning patterns: {str(e)}")
        return jsonify({"error": "Failed to retrieve learning patterns"}), 500


@adaptive_routes.route("/api/performance-data", methods=["GET"])
def get_performance_data():
    """Get user's performance data"""
    try:
        user_id = 1  # For testing, replace with actual user authentication
        adaptive_system = AdaptiveLearningSystem(db_connection=db)
        patterns = adaptive_system.analyze_student_patterns(user_id)

        # Calculate overall progress
        mastered_topics = sum(
            1 for rate in patterns["topic_mastery"].values() if rate >= 80
        )
        total_topics = len(patterns["topic_mastery"]) or 1

        # Calculate study streak
        today = datetime.utcnow().date()
        streak = 0
        current_date = today

        while True:
            activity = (
                db.session.query(Review)
                .filter(
                    Review.user_id == user_id,
                    func.date(Review.created_at) == current_date,
                )
                .first()
            )

            if not activity:
                break

            streak += 1
            current_date -= timedelta(days=1)

        # Get category-specific performance
        category_performance = (
            db.session.query(
                Content.category,
                func.count(Review.id).label("total_attempts"),
                func.sum(case([(Review.is_correct, 1)], else_=0)).label(
                    "correct_answers"
                ),
            )
            .join(Review, Review.content_id == Content.id)
            .filter(Review.user_id == user_id)
            .group_by(Content.category)
            .all()
        )

        category_stats = {}
        for category, attempts, correct in category_performance:
            if attempts > 0:
                accuracy = (correct / attempts) * 100
                category_stats[category] = {
                    "attempts": attempts,
                    "accuracy": accuracy,
                    "mastery": "Mastered" if accuracy >= 80 else "In Progress",
                }

        # Get recent activity data
        recent_activity = (
            db.session.query(
                func.date(Review.created_at).label("date"),
                func.count(Review.id).label("questions_attempted"),
                func.sum(case([(Review.is_correct, 1)], else_=0)).label(
                    "correct_answers"
                ),
                func.sum(Review.time_taken).label("total_time"),
            )
            .filter(
                Review.user_id == user_id,
                Review.created_at >= (datetime.utcnow() - timedelta(days=7)),
            )
            .group_by(func.date(Review.created_at))
            .order_by(func.date(Review.created_at).desc())
            .all()
        )

        activity_data = []
        for date, attempted, correct, time in recent_activity:
            accuracy = (correct / attempted * 100) if attempted > 0 else 0
            activity_data.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "questionsAttempted": attempted,
                    "accuracy": accuracy,
                    "studyTime": time,
                }
            )

        return jsonify(
            {
                "overallProgress": (mastered_topics / total_topics) * 100,
                "masteredTopics": mastered_topics,
                "studyStreak": streak,
                "topicMastery": patterns["topic_mastery"],
                "categoryPerformance": category_stats,
                "recentActivity": activity_data,
                "learningRate": patterns.get("learning_rate", 0),
                "estimatedTimeToMastery": patterns.get("estimated_time_to_mastery", {}),
            }
        )
    except Exception as e:
        logger.error(f"Error getting performance data: {str(e)}")
        return jsonify({"error": "Failed to retrieve performance data"}), 500


@adaptive_routes.route("/api/adaptive-content/generate", methods=["POST"])
def generate_adaptive_content():
    """Generate adaptive content based on patterns"""
    try:
        data = request.json
        user_id = 1  # For testing, replace with actual user authentication
        adaptive_system = AdaptiveLearningSystem(db_connection=db)

        # Get user's learning patterns
        patterns = adaptive_system.analyze_student_patterns(user_id)

        # Calculate optimal difficulty based on recent performance
        recent_performance = (
            Review.query.filter_by(user_id=user_id)
            .order_by(Review.created_at.desc())
            .limit(10)
            .all()
        )

        correct_answers = sum(1 for review in recent_performance if review.is_correct)
        total_questions = len(recent_performance)

        if total_questions > 0:
            recent_accuracy = (correct_answers / total_questions) * 100

            # Adjust difficulty based on performance
            if recent_accuracy > 80:
                target_difficulty = "Advanced"
            elif recent_accuracy > 60:
                target_difficulty = "Intermediate"
            else:
                target_difficulty = "Beginner"
        else:
            target_difficulty = "Beginner"

        # Identify weak areas to focus on
        weak_areas = patterns.get("weak_areas", [])

        # Generate content focusing on weak areas with appropriate difficulty
        content = adaptive_system.generate_adaptive_content(
            user_id, difficulty=target_difficulty, preferred_categories=weak_areas
        )

        if not content:
            return jsonify({"error": "No suitable content found"}), 404

        # Calculate estimated time based on user's learning patterns
        avg_question_time = (
            db.session.query(func.avg(Review.time_taken))
            .filter_by(user_id=user_id)
            .scalar()
            or 60
        )  # Default to 60 seconds if no data

        return jsonify(
            {
                "id": content.id,
                "question": content.question,
                "options": content.options,
                "difficulty": content.difficulty.value,
                "topic": content.category.value,
                "tags": content.keywords,
                "estimatedTime": int(avg_question_time),
                "learningObjectives": content.learning_objectives,
                "prerequisites": content.prerequisites,
                "relatedConcepts": content.related_concepts,
                "adaptiveHints": [
                    hint
                    for hint in content.hints
                    if hint["difficulty"] <= patterns.get("current_level", 1)
                ],
            }
        )
    except Exception as e:
        logger.error(f"Error generating adaptive content: {str(e)}")
        return jsonify({"error": "Failed to generate adaptive content"}), 500


@adaptive_routes.route("/api/adaptive-content/submit-answer", methods=["POST"])
def submit_answer():
    """Submit and process answer"""
    try:
        data = request.json
        user_id = 1  # For testing, replace with actual user authentication
        content_id = data.get("contentId")
        answer = data.get("answer")
        time_spent = data.get("timeSpent", 0)

        content = Content.query.get_or_404(content_id)
        is_correct = answer == content.correct

        # Create review
        review = Review(
            content_id=content_id,
            user_id=user_id,
            is_correct=is_correct,
            time_taken=time_spent,
        )
        db.session.add(review)

        # Track response pattern
        adaptive_system = AdaptiveLearningSystem(db_connection=db)
        adaptive_system.track_response_patterns(
            user_id,
            {
                "is_correct": is_correct,
                "time_taken": time_spent,
                "content_id": content_id,
            },
        )

        db.session.commit()

        return jsonify(
            {
                "correct": is_correct,
                "feedback": {
                    "correct": is_correct,
                    "message": "Correct!" if is_correct else "Incorrect.",
                    "explanation": content.rationale,
                },
            }
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({"error": "Failed to process answer"}), 500


@adaptive_routes.route("/api/flashcard/review", methods=["POST"])
def review_flashcard():
    data = request.json
    card_id = data.get("card_id")
    quality = data.get("quality", 0)  # 0-5 rating of response quality

    card = Flashcard.query.get_or_404(card_id)
    integration_service = LearningIntegrationService(db)

    # Update next review time using spaced repetition
    card.next_review = integration_service.calculate_next_review(card, quality)

    # Update adaptive pattern data
    pattern = AdaptivePattern.query.filter_by(user_id=data.get("user_id")).first()
    if pattern:
        pattern.accuracy_rate = (
            pattern.accuracy_rate * pattern.pattern_data.get("total_reviews", 0)
            + (quality >= 3)
        ) / (pattern.pattern_data.get("total_reviews", 0) + 1)
        pattern.pattern_data["total_reviews"] = (
            pattern.pattern_data.get("total_reviews", 0) + 1
        )

    db.session.commit()

    return jsonify(
        {"next_review": card.next_review.isoformat(), "interval": card.interval}
    )
