from flask import Blueprint, request, jsonify
from services.ai_service import AIService
from services.email_service import EmailService
from datetime import datetime
import logging

analytics_bp = Blueprint("analytics", __name__)
logger = logging.getLogger(__name__)


@analytics_bp.route("/api/daily-summary", methods=["POST"])
def generate_daily_summary():
    try:
        data = request.json
        if not data or "email" not in data:
            return jsonify({"error": "Email is required"}), 400

        ai_service = AIService()
        email_service = EmailService()

        # Generate summary using AI
        user_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "study_time": data.get("study_time", 0),
            "questions_attempted": data.get("questions_attempted", 0),
            "accuracy_rate": data.get("accuracy_rate", 0),
            "topics_covered": data.get("topics_covered", []),
        }

        summary = ai_service.generate_daily_summary(user_data)
        email_service.send_daily_summary(data["email"], summary)

        return jsonify({"success": True, "message": "Daily summary sent successfully"})

    except Exception as e:
        logger.error(f"Error generating daily summary: {str(e)}")
        return jsonify({"error": str(e)}), 500


@analytics_bp.route("/api/morning-greeting", methods=["GET"])
async def get_morning_greeting():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        greeting_service = MorningGreetingService()
        greeting_data = await greeting_service.generate_morning_greeting(user_id)

        return jsonify({"success": True, "data": greeting_data})

    except Exception as e:
        logger.error(f"Error getting morning greeting: {str(e)}")
        return jsonify({"error": str(e)}), 500
