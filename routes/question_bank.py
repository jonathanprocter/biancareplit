import logging

from flask import Blueprint, jsonify, request

from ai_coach_service import AICoachService
from extensions import db
from models import Content, Flashcard

# Configure logging
logger = logging.getLogger(__name__)

question_bank = Blueprint("question_bank", __name__)

ai_coach_service = AICoachService()


class LearningIntegrationService:
    def __init__(self, db_session):
        self.db = db_session

    def convert_missed_question(self, missed_question):
        flashcard = Flashcard(
            front=missed_question["question"],
            back=f"Correct Answer: {missed_question['correct_answer']}\nExplanation: {missed_question.get('explanation', '')}",
            difficulty=missed_question["difficulty"],
            category=missed_question["category"],
            tags=missed_question.get("tags", []),
        )
        return flashcard


@question_bank.route("/api/questions/initialize", methods=["POST"])
async def initialize_question_bank():
    try:
        # Generate base questions for each category and difficulty
        await ai_coach_service.generate_base_questions()

        # Fetch all questions from database
        questions = Content.query.all()

        # Format questions for frontend
        formatted_questions = [
            {
                "id": q.id,
                "category": q.category.name,
                "difficulty": q.difficulty.name,
                "question": q.question,
                "options": q.options,
                "correct": q.correct,
                "rationale": q.rationale,
                "keywords": q.keywords,
            }
            for q in questions
        ]

        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Question bank initialized successfully",
                    "questions": formatted_questions,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@question_bank.route("/api/flashcards/missed-question", methods=["POST"])
async def create_flashcard_from_missed():
    try:
        data = request.get_json()
        question_id = data.get("questionId")

        if not question_id:
            return jsonify({"error": "Question ID is required"}), 400

        flashcard = await ai_coach_service.create_flashcard_from_missed_question(
            question_id
        )

        if flashcard:
            return (
                jsonify(
                    {
                        "status": "success",
                        "message": "Flashcard created successfully",
                        "flashcard": {
                            "id": flashcard.id,
                            "front": flashcard.front,
                            "back": flashcard.back,
                            "difficulty": flashcard.difficulty.name,
                            "nextReview": (
                                flashcard.next_review.isoformat()
                                if flashcard.next_review
                                else None
                            ),
                        },
                    }
                ),
                200,
            )

        return jsonify({"error": "Failed to create flashcard"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Example of how the submit_answer function might be updated (assuming 'content' is fetched elsewhere)
def submit_answer(content, answer):
    is_correct = answer == content.correct

    if not is_correct:
        integration_service = LearningIntegrationService(db)
        flashcard = integration_service.convert_missed_question(
            {
                "question": content.question,
                "correct_answer": content.correct,
                "difficulty": content.difficulty,
                "explanation": content.explanation,
                "category": content.category,
                "tags": content.tags,
            }
        )
        db.session.add(flashcard)
        db.session.commit()
