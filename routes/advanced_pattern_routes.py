from flask import Blueprint, jsonify, request
from models.advanced_pattern_recognition import (
    AdvancedPatternRecognition,
    AdvancedPatternModel,
)
from datetime import datetime

advanced_pattern_routes = Blueprint("advanced_pattern_routes", __name__)
pattern_recognizer = AdvancedPatternRecognition()


@advanced_pattern_routes.route("/api/advanced-patterns/analyze", methods=["POST"])
def analyze_patterns():
    """Analyze learning patterns using advanced recognition"""
    try:
        user_id = request.json.get("user_id", 1)  # Default user_id for testing
        user_data = request.json.get("user_data", {})

        # Perform comprehensive pattern analysis
        analysis = pattern_recognizer.analyze_learning_patterns(user_data)

        # Store the analysis results
        for pattern_type, pattern_data in analysis.items():
            AdvancedPatternModel.store_pattern(
                user_id=user_id, pattern_type=pattern_type, pattern_data=pattern_data
            )

        return jsonify({"status": "success", "analysis": analysis})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@advanced_pattern_routes.route(
    "/api/advanced-patterns/user/<int:user_id>", methods=["GET"]
)
def get_user_patterns(user_id):
    """Get stored pattern analysis for a user"""
    try:
        patterns = (
            AdvancedPatternModel.query.filter_by(user_id=user_id)
            .order_by(AdvancedPatternModel.created_at.desc())
            .limit(10)
            .all()
        )

        return jsonify({"patterns": [pattern.pattern_data for pattern in patterns]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@advanced_pattern_routes.route(
    "/api/advanced-patterns/recommendations/<int:user_id>", methods=["GET"]
)
def get_recommendations(user_id):
    """Get personalized learning recommendations based on pattern analysis"""
    try:
        # Get latest patterns
        latest_pattern = (
            AdvancedPatternModel.query.filter_by(user_id=user_id)
            .order_by(AdvancedPatternModel.created_at.desc())
            .first()
        )

        if not latest_pattern:
            return jsonify(
                {
                    "recommendations": {
                        "difficulty_adjustment": 0,
                        "focus_areas": ["comprehension"],
                        "learning_pace": "maintain",
                    }
                }
            )

        return jsonify(
            {
                "recommendations": latest_pattern.pattern_data.get(
                    "deep_patterns", {}
                ).get("recommended_adjustments", {})
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
