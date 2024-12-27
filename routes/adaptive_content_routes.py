from flask import Blueprint, jsonify, request
from models import db, Review, Content, AdaptivePattern
from datetime import datetime, timedelta
from sqlalchemy import func
import logging
from typing import Dict, List, Optional, Union, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

adaptive_content_bp = Blueprint("adaptive_content", __name__, url_prefix="/api")


@adaptive_content_bp.route("/learning-patterns", methods=["GET"])
def get_learning_patterns() -> tuple[dict, int]:
    """Get user's learning patterns with proper error handling and type safety"""
    try:
        # Get user's review history with proper limit
        reviews = Review.query.order_by(Review.created_at.desc()).limit(100).all()

        if not reviews:
            return jsonify({
                "currentLevel": "Beginner",
                "preferredStyle": "Visual",
                "weakAreas": [],
                "insights": []
            }), 200

        # Calculate patterns with proper error handling
        patterns = {
            "currentLevel": calculate_current_level(reviews),
            "preferredStyle": determine_learning_style(reviews),
            "weakAreas": identify_weak_areas(reviews),
            "insights": generate_learning_insights(reviews),
        }

        return jsonify(patterns), 200
    except Exception as e:
        logger.error(f"Error getting learning patterns: {str(e)}")
        return jsonify({"error": "Failed to retrieve learning patterns"}), 500


@adaptive_content_bp.route("/performance-data", methods=["GET"])
def get_performance_data() -> tuple[dict, int]:
    """Get user's performance data with proper error handling"""
    try:
        reviews = Review.query.order_by(Review.created_at.desc()).limit(100).all()

        if not reviews:
            return jsonify({
                "overallProgress": 0,
                "masteredTopics": 0,
                "studyStreak": 0,
                "recentPerformance": []
            }), 200

        performance_data = {
            "overallProgress": calculate_overall_progress(reviews),
            "masteredTopics": count_mastered_topics(reviews),
            "studyStreak": calculate_study_streak(),
            "recentPerformance": get_recent_performance(reviews),
        }

        return jsonify(performance_data), 200
    except Exception as e:
        logger.error(f"Error getting performance data: {str(e)}")
        return jsonify({"error": "Failed to retrieve performance data"}), 500


@adaptive_content_bp.route("/adaptive-content/generate", methods=["POST"])
def generate_adaptive_content() -> tuple[dict, int]:
    """Generate adaptive content based on patterns with proper validation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        patterns = data.get("learningPatterns")
        performance = data.get("performanceData")

        if not patterns or not performance:
            return jsonify({"error": "Missing required data"}), 400

        content = {
            "id": generate_content_id(),
            "question": generate_adaptive_question(patterns, performance),
            "options": generate_question_options(),
            "difficulty": determine_optimal_difficulty(patterns),
            "topic": select_next_topic(patterns),
            "tags": generate_content_tags(patterns),
        }

        return jsonify(content), 200
    except Exception as e:
        logger.error(f"Error generating adaptive content: {str(e)}")
        return jsonify({"error": "Failed to generate adaptive content"}), 500


@adaptive_content_bp.route("/adaptive-content/submit-answer", methods=["POST"])
def submit_answer() -> tuple[dict, int]:
    """Submit and process answer with proper validation and error handling"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        content_id = data.get("contentId")
        answer = data.get("answer")
        time_spent = data.get("timeSpent")

        if not all([content_id, answer is not None, time_spent]):
            return jsonify({"error": "Missing required fields"}), 400

        # Process the answer and generate feedback
        result = {
            "correct": evaluate_answer(content_id, answer),
            "feedback": generate_feedback(content_id, answer),
            "patterns": update_learning_patterns(content_id, answer, time_spent),
        }

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({"error": "Failed to process answer"}), 500


def calculate_study_streak() -> int:
    """Calculate the current study streak in days with proper error handling"""
    try:
        today = datetime.utcnow().date()
        streak = 0
        current_date = today

        while True:
            # Check if there was any activity on this date
            activity = (
                db.session.query(Review)
                .filter(func.date(Review.created_at) == current_date)
                .first()
            )

            if not activity:
                break

            streak += 1
            current_date -= timedelta(days=1)

        return streak
    except Exception as e:
        logger.error(f"Error calculating study streak: {str(e)}")
        return 0


def calculate_current_level(reviews: List[Review]) -> str:
    """Calculate user's current level based on performance metrics"""
    if not reviews:
        return "Beginner"

    try:
        correct_answers = sum(1 for r in reviews if r.score >= 0.8)
        accuracy = correct_answers / len(reviews)

        if accuracy >= 0.8:
            return "Advanced"
        if accuracy >= 0.6:
            return "Intermediate"
        return "Beginner"
    except Exception as e:
        logger.error(f"Error calculating current level: {str(e)}")
        return "Beginner"


def determine_learning_style(reviews: List[Review]) -> str:
    """Determine user's learning style based on historical performance"""
    if not reviews:
        return "Visual"

    try:
        # Implement learning style detection based on review patterns
        styles = ["Visual", "Auditory", "Reading/Writing", "Kinesthetic"]
        # Add actual implementation based on your learning style detection logic
        return "Visual"  # Default for now
    except Exception as e:
        logger.error(f"Error determining learning style: {str(e)}")
        return "Visual"


def identify_weak_areas(reviews: List[Review]) -> List[str]:
    """Identify areas where the user needs improvement"""
    if not reviews:
        return []

    try:
        # Group reviews by topic and calculate success rate
        topic_performance = {}
        for review in reviews:
            topic = review.topic
            if topic not in topic_performance:
                topic_performance[topic] = {"total": 0, "correct": 0}
            topic_performance[topic]["total"] += 1
            if review.score >= 0.8:
                topic_performance[topic]["correct"] += 1

        # Identify topics with success rate below 60%
        weak_areas = []
        for topic, stats in topic_performance.items():
            if (stats["correct"] / stats["total"]) < 0.6:
                weak_areas.append(topic)

        return weak_areas
    except Exception as e:
        logger.error(f"Error identifying weak areas: {str(e)}")
        return []


def generate_learning_insights(reviews: List[Review]) -> List[Dict[str, str]]:
    """Generate personalized learning insights based on user's performance"""
    if not reviews:
        return []

    try:
        insights = []

        # Time-based performance analysis
        time_performance = analyze_time_performance(reviews)
        if time_performance:
            insights.append({
                "title": "Optimal Study Time",
                "description": f"You perform best during {time_performance} hours"
            })

        # Topic mastery progress
        mastery_insight = analyze_topic_mastery(reviews)
        if mastery_insight:
            insights.append(mastery_insight)

        return insights
    except Exception as e:
        logger.error(f"Error generating learning insights: {str(e)}")
        return []


def analyze_time_performance(reviews: List[Review]) -> Optional[str]:
    """Analyze when the user performs best"""
    try:
        time_scores = {}
        for review in reviews:
            hour = review.created_at.hour
            if hour not in time_scores:
                time_scores[hour] = []
            time_scores[hour].append(review.score)

        best_hour = max(time_scores.items(), key=lambda x: sum(x[1])/len(x[1]))[0]
        if 5 <= best_hour < 12:
            return "morning"
        if 12 <= best_hour < 17:
            return "afternoon"
        return "evening"
    except Exception as e:
        logger.error(f"Error analyzing time performance: {str(e)}")
        return None


def analyze_topic_mastery(reviews: List[Review]) -> Optional[Dict[str, str]]:
    """Analyze topic mastery progress"""
    try:
        recent_reviews = sorted(reviews, key=lambda x: x.created_at, reverse=True)[:20]
        improvement_rate = sum(1 for r in recent_reviews if r.score > 0.8) / len(recent_reviews)

        if improvement_rate >= 0.8:
            return {
                "title": "Mastery Progress",
                "description": "You're showing excellent mastery of recent topics!"
            }
        if improvement_rate >= 0.6:
            return {
                "title": "Steady Progress",
                "description": "You're making steady progress in your learning journey."
            }
        return {
            "title": "Learning Opportunity",
            "description": "Focus on reviewing challenging topics to improve mastery."
        }
    except Exception as e:
        logger.error(f"Error analyzing topic mastery: {str(e)}")
        return None


def calculate_overall_progress(reviews: List[Review]) -> int:
    if not reviews:
        return 0
    # Calculate progress percentage
    return 65


def count_mastered_topics(reviews: List[Review]) -> int:
    if not reviews:
        return 0
    # Count mastered topics
    return 3


def get_recent_performance(reviews: List[Review]) -> List[Dict[str, Union[datetime, float]]]:
    if not reviews:
        return []
    # Get recent performance data
    return [{"date": r.created_at, "score": r.score} for r in reviews[:5]]


def generate_content_id() -> float:
    return datetime.utcnow().timestamp()


def generate_adaptive_question(patterns: Dict[str, Any], performance: Dict[str, Any]) -> str:
    # Generate question based on patterns
    return "What is the primary function of the adaptive learning system?"


def generate_question_options() -> List[str]:
    # Generate options
    return [
        "Pattern recognition",
        "Content adaptation",
        "Performance tracking",
        "All of the above",
    ]


def determine_optimal_difficulty(patterns: Dict[str, Any]) -> str:
    # Determine difficulty
    return "Intermediate"


def select_next_topic(patterns: Dict[str, Any]) -> str:
    # Select topic
    return "Adaptive Learning Systems"


def generate_content_tags(patterns: Dict[str, Any]) -> List[str]:
    # Generate tags
    return ["adaptive", "learning", "patterns"]


def evaluate_answer(content_id: Any, answer: Any) -> bool:
    """Evaluate the correctness of an answer"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")

        # Compare answer with correct answer from content
        is_correct = (
            str(answer).strip().lower() == str(content.correct_answer).strip().lower()
        )

        # Update content metrics
        content.total_attempts = (content.total_attempts or 0) + 1
        content.correct_attempts = (content.correct_attempts or 0) + (
            1 if is_correct else 0
        )
        db.session.commit()

        return is_correct
    except Exception as e:
        logger.error(f"Error evaluating answer: {str(e)}")
        return False


def generate_feedback(content_id: Any, answer: Any) -> Dict[str, Any]:
    """Generate detailed feedback for the answer"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")

        is_correct = evaluate_answer(content_id, answer)

        feedback = {
            "correct": is_correct,
            "message": (
                "Correct! Excellent work!"
                if is_correct
                else "Not quite right. Let's review this."
            ),
            "explanation": (
                content.explanation if content.explanation else content.rationale
            ),
            "keyPoints": content.key_points if hasattr(content, "key_points") else [],
            "relatedConcepts": (
                content.related_concepts if hasattr(content, "related_concepts") else []
            ),
            "suggestedResources": [],
        }

        # Add suggested resources if answer was incorrect
        if not is_correct and hasattr(content, "study_resources"):
            feedback["suggestedResources"] = content.study_resources

        return feedback
    except Exception as e:
        logger.error(f"Error generating feedback: {str(e)}")
        return {
            "message": "Error generating feedback",
            "explanation": "Please try again or contact support if the issue persists.",
        }


def update_learning_patterns(content_id: Any, answer: Any, time_spent: Any) -> Dict[str, Any]:
    """Update learning patterns based on user interaction"""
    try:
        content = Content.query.get(content_id)
        if not content:
            raise ValueError("Content not found")

        is_correct = evaluate_answer(content_id, answer)

        # Get or create adaptive pattern record
        pattern = AdaptivePattern.query.filter_by(
            category=content.category
        ).first() or AdaptivePattern(category=content.category)

        # Update pattern metrics
        pattern.total_questions = (pattern.total_questions or 0) + 1
        pattern.correct_answers = (pattern.correct_answers or 0) + (
            1 if is_correct else 0
        )
        pattern.total_time = (pattern.total_time or 0) + time_spent

        # Calculate average time and accuracy
        pattern.avg_time_per_question = pattern.total_time / pattern.total_questions
        pattern.accuracy_rate = (
            pattern.correct_answers / pattern.total_questions
        ) * 100

        # Determine current level based on accuracy
        if pattern.accuracy_rate >= 80:
            current_level = "Advanced"
        elif pattern.accuracy_rate >= 60:
            current_level = "Intermediate"
        else:
            current_level = "Beginner"

        # Save pattern updates
        db.session.add(pattern)
        db.session.commit()

        return {
            "currentLevel": current_level,
            "preferredStyle": determine_learning_style([pattern]),
            "weakAreas": identify_weak_areas([pattern]),
            "recommendedDifficulty": (
                "Advanced" if pattern.accuracy_rate > 80 else "Intermediate"
            ),
        }
    except Exception as e:
        logger.error(f"Error updating learning patterns: {str(e)}")
        raise