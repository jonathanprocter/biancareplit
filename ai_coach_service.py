from flask import Blueprint, request, jsonify
from openai import OpenAI, OpenAIError
import json
from datetime import datetime
import logging
import os
from extensions import db
from models import Flashcard, DifficultyLevel
from functools import wraps
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ai_coach_blueprint = Blueprint("ai_coach", __name__)
CORS(ai_coach_blueprint)


def handle_openai_error(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except OpenAIError as e:
            logger.error(f"OpenAI API Error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise

    return wrapper


class AICoachService:
    def __init__(self, api_key=None, app=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.app = app
        self.study_patterns = {}

        if not self.api_key:
            logger.error("OpenAI API key not found")
            raise ValueError("OpenAI API key not configured")

        try:
            self.client = OpenAI(api_key=self.api_key)

            if not self.client:
                raise ValueError("Failed to initialize OpenAI client")

            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        self.app = app

        with self.app.app_context():
            try:
                db.engine.connect().execute(db.text("SELECT 1"))
                logger.info("Database connection verified successfully")
                db.create_all()
                logger.info("Database tables created successfully")
            except Exception as e:
                logger.error(
                    f"Failed to verify database connection or create tables: {str(e)}"
                )
                raise

    @handle_openai_error
    def create_flashcard(self, topic, difficulty=None):
        try:
            prompt = f"""Create a comprehensive NCLEX-style flashcard about {topic} at {difficulty if difficulty else 'intermediate'} level. Include:
            1. A clear, concise question that tests {topic} knowledge
            2. A detailed answer with rationale
            3. Key points to remember (3-5 points)
            4. Related concepts (2-3 concepts)
            5. Common pitfalls to avoid (2-3 pitfalls)
            6. Clinical application notes:
               - Patient assessment considerations
               - Key nursing interventions
               - Expected outcomes
               - Critical thinking points
               - Clinical pearls
            7. Categorization:
               - Main topic category (e.g., Pharmacology, Medical-Surgical, Pediatric)
               - Specific subtopic
               - Cognitive level (Knowledge, Application, Analysis)
               - NCLEX test plan category

            Format the response as JSON:
            {{
                "question": "The question text",
                "answer": "The detailed answer with rationale",
                "key_points": ["point 1", "point 2", "point 3"],
                "related_concepts": ["concept 1", "concept 2"],
                "common_pitfalls": ["pitfall 1", "pitfall 2"],
                "clinical_notes": {{
                    "assessment": ["assessment point 1", "assessment point 2"],
                    "interventions": ["intervention 1", "intervention 2"],
                    "outcomes": ["outcome 1", "outcome 2"],
                    "critical_thinking": ["critical point 1", "critical point 2"],
                    "clinical_pearls": ["pearl 1", "pearl 2"]
                }},
                "categorization": {{
                    "main_topic": "The main nursing topic category",
                    "subtopic": "Specific subtopic within the main category",
                    "cognitive_level": "Knowledge|Application|Analysis",
                    "nclex_category": "The NCLEX test plan category",
                    "difficulty": "beginner|intermediate|advanced"
                }}
            }}
            """

            response = self.client.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert nursing educator creating study materials.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )

            content = response.choices[0].message.content
            flashcard_data = json.loads(content)

            back_content = (
                f"Answer: {flashcard_data['answer']}\n\nKey Points:\n"
                + "\n".join([f"- {point}" for point in flashcard_data["key_points"]])
                + "\n\nRelated Concepts:\n"
                + "\n".join(
                    [f"- {concept}" for concept in flashcard_data["related_concepts"]]
                )
                + "\n\nCommon Pitfalls:\n"
                + "\n".join(
                    [f"- {pitfall}" for pitfall in flashcard_data["common_pitfalls"]]
                )
            )

            clinical_notes = []
            if "clinical_notes" in flashcard_data:
                cn = flashcard_data["clinical_notes"]
                sections = [
                    ("Patient Assessment", cn.get("assessment", [])),
                    ("Nursing Interventions", cn.get("interventions", [])),
                    ("Expected Outcomes", cn.get("outcomes", [])),
                    ("Critical Thinking Points", cn.get("critical_thinking", [])),
                    ("Clinical Pearls", cn.get("clinical_pearls", [])),
                ]
                for title, points in sections:
                    if points:
                        clinical_notes.append(f"{title}:")
                        clinical_notes.extend([f"• {point}" for point in points])
                        clinical_notes.append("")

                clinical_notes = "\n".join(clinical_notes).strip()

            flashcard = Flashcard(
                front=flashcard_data["question"],
                back=back_content,
                difficulty=DifficultyLevel.INTERMEDIATE,
                created_at=datetime.utcnow(),
                clinical_notes=clinical_notes,
            )

            try:
                db.session.add(flashcard)
                db.session.commit()
                logger.info(f"Created flashcard with ID: {flashcard.id}")

                return {
                    "question": flashcard_data["question"],
                    "answer": flashcard_data["answer"],
                    "key_points": flashcard_data["key_points"],
                    "related_concepts": flashcard_data["related_concepts"],
                    "common_pitfalls": flashcard_data["common_pitfalls"],
                    "flashcard_id": flashcard.id,
                    "saved": True,
                }

            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error creating flashcard: {str(e)}")
                return {
                    "question": flashcard_data["question"],
                    "answer": flashcard_data["answer"],
                    "key_points": flashcard_data["key_points"],
                    "related_concepts": flashcard_data["related_concepts"],
                    "common_pitfalls": flashcard_data["common_pitfalls"],
                    "saved": False,
                    "save_error": str(e),
                }

        except Exception as e:
            logger.error(f"Error creating flashcard: {str(e)}")
            raise

    def generate_study_tip(self, topic):
        try:
            prompt = f"""Create a helpful study tip for understanding {topic} in nursing. Include:
            1. The main tip
            2. Why it's important
            3. How to apply it
            4. An example

            Format the response as JSON:
            {{
                "tip": "The main study tip",
                "importance": "Why this tip is important",
                "application": "How to apply this tip",
                "example": "A specific example"
            }}
            """

            response = self.client.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert nursing educator providing study guidance.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )

            tip_data = json.loads(response.choices[0].message.content)
            tip_data.update(
                {
                    "topic": topic,
                    "created_at": datetime.utcnow().isoformat(),
                    "type": "study_tip",
                }
            )

            return tip_data

        except Exception as e:
            logger.error(f"Error generating study tip: {str(e)}")
            raise


ai_coach_service = AICoachService()


def init_app(app):
    ai_coach_service.init_app(app)


@ai_coach_blueprint.route("/flashcard", methods=["POST"])
@handle_openai_error
def create_flashcard_endpoint():
    logger.info("Received flashcard creation request")
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received")
            return jsonify({"error": "Request must include JSON data"}), 400

        if "topic" not in data:
            logger.error("No topic provided in request")
            return jsonify({"error": "Topic is required"}), 400

        logger.info(f"Creating flashcard for topic: {data['topic']}")
        flashcard_data = ai_coach_service.create_flashcard(data["topic"])

        if not flashcard_data:
            logger.error("Failed to create flashcard")
            return jsonify({"error": "Failed to generate flashcard content"}), 500

        logger.info("Successfully created flashcard")
        return jsonify(flashcard_data)

    except json.JSONDecodeError as je:
        logger.error(f"JSON decode error: {str(je)}")
        return jsonify({"error": "Invalid JSON in response", "details": str(je)}), 500
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return jsonify({"error": str(ve)}), 400
    except OpenAIError as oe:
        logger.error(f"OpenAI API error: {str(oe)}")
        return jsonify({"error": "AI service error", "details": str(oe)}), 503
    except Exception as e:
        logger.error(f"Error in create_flashcard endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@ai_coach_blueprint.route("/study-tip", methods=["POST"])
def generate_study_tip():
    try:
        data = request.get_json()
        if not data or "topic" not in data:
            return jsonify({"error": "Topic is required"}), 400

        tip = ai_coach_service.generate_study_tip(data["topic"])
        return jsonify(tip)

    except Exception as e:
        logger.error(f"Error in generate_study_tip endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ai_coach_blueprint.route("/progress", methods=["POST"])
def update_study_progress():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Study session data is required"}), 400

        ai_coach_service.study_patterns[request.remote_addr] = {
            "lastStudyTime": data.get("timestamp", datetime.utcnow().isoformat()),
            "studyStreak": data.get("studyStreak", 0),
            "topicsFocused": list(set(data.get("topicsFocused", []))),
            "strengths": data.get("strengths", []),
            "areasForImprovement": data.get("areasForImprovement", []),
        }

        return jsonify(ai_coach_service.study_patterns[request.remote_addr])

    except Exception as e:
        logger.error(f"Error in update_study_progress endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500


@ai_coach_blueprint.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404


@ai_coach_blueprint.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500
