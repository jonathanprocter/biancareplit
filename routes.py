from flask import Blueprint, request, jsonify, current_app
from models import db
from question_generator import QuestionGenerator
import logging
import openai  # Added import for openai error handling

logger = logging.getLogger(__name__)
bp = Blueprint("nursing", __name__)
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import func, case
from datetime import datetime, date
import logging
import asyncio

# Configure logging
logger = logging.getLogger(__name__)

from sqlalchemy import func, case, text
from datetime import datetime, date, timedelta
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
)  # Added ContentType import
from ai_coach import AICoach

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Blueprint and AI coach
bp = Blueprint("api", __name__)
ai_coach = AICoach()
# Initialize question generator
question_generator = QuestionGenerator()


@bp.route("/status", methods=["GET"])
def status():
    """Test endpoint to verify API is working"""
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@bp.route("/test-json", methods=["GET"])
def test_json():
    """Test endpoint to verify JSON responses"""
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
    """Get analytics dashboard data including performance metrics"""
    try:
        logger.info("Fetching analytics dashboard data")

        # Query performance by category
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

        # Query study time distribution
        study_time = (
            db.session.query(
                StudyMaterial.category,
                func.coalesce(func.sum(StudyMaterial.duration), 0).label(
                    "total_duration"
                ),
            )
            .group_by(StudyMaterial.category)
            .all()
        )

        study_time_data = {
            category.value: int(duration) if duration else 0
            for category, duration in study_time
        }

        # Query recent performance trend
        recent_performance = (
            db.session.query(
                Review.created_at.cast(db.Date).label("date"),
                func.count(Review.id).label("total_reviews"),
                func.sum(case((Review.is_correct == True, 1), else_=0)).label(
                    "correct_reviews"
                ),
            )
            .group_by(Review.created_at.cast(db.Date))
            .order_by(Review.created_at.cast(db.Date).desc())
            .limit(7)
            .all()
        )

        performance_trend = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "accuracy": round((correct / total * 100) if total > 0 else 0, 2),
            }
            for date, total, correct in recent_performance
        ]

        response_data = {
            "success": True,
            "category_performance": category_performance,
            "study_time_distribution": study_time_data,
            "performance_trend": performance_trend,
            "improvements": get_improvement_suggestions(category_performance),
        }

        logger.info("Successfully compiled analytics dashboard data")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error fetching analytics data: {str(e)}", exc_info=True)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to fetch analytics data",
                    "details": str(e) if current_app.debug else "Internal server error",
                }
            ),
            500,
        )


@bp.route("/api/performance/track", methods=["POST"])
def track_performance():
    """Track user performance for a question attempt."""
    try:
        data = request.json
        logger.info(f"Received performance data: {data}")

        if not data:
            return jsonify({"error": "No data provided"}), 400

        required_fields = [
            "question_id",
            "selected_answer",
            "is_correct",
            "category",
            "difficulty",
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return (
                jsonify(
                    {"error": f'Missing required fields: {", ".join(missing_fields)}'}
                ),
                400,
            )

        review = Review(
            content_id=data["question_id"],
            is_correct=data["is_correct"],
            time_taken=data.get("time_taken", 0),
            created_at=datetime.utcnow(),
            rating=data.get("rating", 3),
        )

        db.session.add(review)
        db.session.commit()

        return (
            jsonify({"success": True, "message": "Performance tracked successfully"}),
            201,
        )

    except Exception as e:
        logger.error(f"Error tracking performance: {str(e)}", exc_info=True)
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to track performance",
                    "details": str(e),
                }
            ),
            500,
        )


@bp.route("/api/analytics/daily-summary", methods=["GET"])
def get_daily_summary():
    """Get daily summary of study progress and performance."""
    try:
        logger.info("Fetching daily summary")
        today = date.today()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())

        # Initialize variables
        questions_attempted = 0
        correct_answers = 0
        study_time = 0
        accuracy_rate = 0

        # Get progress from StudentProgress table
        progress = StudentProgress.query.filter_by(study_date=today).first()

        if progress:
            logger.info(f"Found student progress for today: {progress.id}")
            questions_attempted = progress.questions_attempted
            correct_answers = progress.correct_answers
            study_time = progress.study_time
            accuracy_rate = (
                (correct_answers / questions_attempted * 100)
                if questions_attempted > 0
                else 0
            )
        else:
            # Fallback to Review table
            logger.info("No student progress found, falling back to Review table")
            daily_stats = (
                db.session.query(
                    func.count(Review.id).label("questions_attempted"),
                    func.sum(case((Review.is_correct == True, 1), else_=0)).label(
                        "correct_answers"
                    ),
                    func.sum(Review.study_duration).label("total_time"),
                )
                .filter(Review.created_at.between(start_of_day, end_of_day))
                .first()
            )

            if daily_stats:
                questions_attempted = int(daily_stats[0])
                correct_answers = int(daily_stats[1] or 0)
                study_time = int(daily_stats[2] or 0)
                accuracy_rate = (
                    (correct_answers / questions_attempted * 100)
                    if questions_attempted > 0
                    else 0
                )

        # Query mastered topics
        mastered_topics = (
            db.session.query(
                Content.category,
                func.count().label("total"),
                func.sum(case((Review.is_correct == True, 1), else_=0)).label(
                    "correct"
                ),
            )
            .join(Review, Review.content_id == Content.id)
            .filter(Review.created_at.between(start_of_day, end_of_day))
            .group_by(Content.category)
            .having(
                func.sum(case((Review.is_correct == True, 1), else_=0))
                * 100.0
                / func.count()
                >= 80
            )
            .all()
        )

        mastered_topics_list = (
            [topic[0].value for topic in mastered_topics] if mastered_topics else []
        )

        # Format study time
        hours = int(study_time // 60)
        minutes = int(study_time % 60)
        time_spent = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        formatted_duration = (
            f"{hours} hours and {minutes} minutes"
            if hours > 0
            else f"{minutes} minutes"
        )
        avg_time = (
            round((study_time * 60) / questions_attempted)
            if questions_attempted > 0
            else 0
        )

        # Generate recommendations
        recommendations = generate_recommendations(
            questions_attempted, accuracy_rate, study_time
        )

        summary_data = {
            "success": True,
            "questionsAttempted": questions_attempted,
            "accuracyRate": round(accuracy_rate, 2),
            "studyTime": {
                "total": time_spent,
                "totalMinutes": study_time,
                "averagePerQuestion": avg_time,
                "formattedDuration": formatted_duration,
            },
            "topicsMastered": mastered_topics_list,
            "recommendations": recommendations,
        }

        logger.info(f"Sending daily summary response: {summary_data}")
        return jsonify(summary_data)

    except Exception as e:
        logger.error(f"Error generating daily summary: {str(e)}", exc_info=True)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to generate daily summary",
                    "details": str(e),
                }
            ),
            500,
        )


@bp.route("/api/ai/upload-material", methods=["POST"])
async def upload_study_material():
    """Upload and process study material using AI analysis."""
    try:
        logger.info("Starting study material upload process")

        # Handle both file and direct content upload
        content = None
        form = await request.form
        title = form.get("title", "").strip()
        category = form.get("category", "").strip()

        if request.files:
            file = request.files["file"]
            if file.filename != "":
                content = await file.read()
                content = content.decode("utf-8")
                logger.info(
                    f"Processing file: {file.filename}, size: {len(content)} bytes"
                )
        elif "content" in form:
            content = form.get("content", "").strip()
            logger.info(f"Processing direct content, size: {len(content)} bytes")

        if not content or not title or not category:
            return jsonify({"error": "Content, title, and category are required"}), 400

        # Process content with AI coach
        response = await ai_coach.process_study_material(content)

        if not response.get("success"):
            logger.error(f"AI processing failed: {response.get('error')}")
            return jsonify({"error": response.get("error")}), 500

        # Save study material to database
        study_material = StudyMaterial(
            title=title,
            content=content,
            category=SubjectCategory[category.lower()],
            difficulty=DifficultyLevel.INTERMEDIATE,  # Default, AI can update this
            study_date=date.today(),
            keywords=response["analysis"].get("keywords", []),
            learning_objectives=response["analysis"].get("learning_objectives", []),
            attachments=[],
        )

        db.session.add(study_material)
        db.session.commit()
        logger.info(f"Study material saved with ID: {study_material.id}")

        return jsonify(
            {
                "success": True,
                "message": "Study material processed and saved successfully",
                "analysis": response["analysis"],
                "material_id": study_material.id,
            }
        )

    except Exception as e:
        logger.error(f"Error processing uploaded material: {str(e)}", exc_info=True)
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": "Failed to process study material",
                    "details": str(e) if current_app.debug else "Internal server error",
                }
            ),
            500,
        )


@bp.route("/api/nursing/questions/<category>", methods=["GET"])
async def get_questions_by_category(category):
    """Get or generate NCLEX questions for a specific category with proper validation and error handling."""
    try:
        logger.info(f"Loading questions for category: {category}")
        difficulty = request.args.get("difficulty", "INTERMEDIATE").upper()
        force_generate = request.args.get("generate", "false").lower() == "true"
        count = int(request.args.get("count", "5"))

        logger.info(
            f"Request parameters - Category: {category}, Difficulty: {difficulty}, Force Generate: {force_generate}, Count: {count}"
        )

        try:
            # Get all valid categories for reference
            valid_categories = [c.name for c in SubjectCategory]

            # Convert category to uppercase and normalize
            category_normalized = category.strip().upper().replace(" ", "_")
            if category_normalized not in valid_categories:
                logger.error(
                    f"Invalid category: {category}. Valid categories: {valid_categories}"
                )
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Invalid category: {category}",
                            "valid_categories": valid_categories,
                        }
                    ),
                    400,
                )

            # Get the enum value and query questions
            category_enum = SubjectCategory[category_normalized]

            # Only query existing questions if we're not forcing generation
            questions = (
                []
                if force_generate
                else Content.query.filter_by(
                    category=category_enum, difficulty=DifficultyLevel[difficulty]
                ).all()
            )

            # Generate questions if none found or if generation is forced
            if not questions or force_generate:
                logger.info(
                    f"{'Forcing new question generation' if force_generate else 'No questions found'} for {category}"
                )
                try:
                    # Generate questions asynchronously
                    questions_data = await question_generator.generate_questions(
                        category=category_normalized, difficulty=difficulty, count=10
                    )

                    if not questions_data:
                        logger.error("No questions were generated by the AI")
                        return (
                            jsonify(
                                {
                                    "success": False,
                                    "error": "Failed to generate questions",
                                    "details": "No questions were generated by the AI service",
                                }
                            ),
                            500,
                        )

                    logger.info(
                        f"Successfully generated {len(questions_data)} questions from AI"
                    )

                    # Convert generated questions to Content objects
                    new_questions = []
                    for q in questions_data:
                        try:
                            content = Content(
                                type=ContentType.QUIZ,
                                category=SubjectCategory[category_normalized],
                                difficulty=DifficultyLevel[difficulty],
                                question=q["question"],
                                options=q["options"],
                                correct=q["correct"],
                                rationale=q["rationale"],
                                keywords=q["keywords"],
                                clinical_scenario=(
                                    q["question"]
                                    if "patient" in q["question"].lower()
                                    else ""
                                ),
                                nursing_interventions=[],
                                expected_outcomes=[],
                            )
                            new_questions.append(content)
                            logger.info(
                                f"Created content object for question: {q['question'][:50]}..."
                            )
                        except Exception as e:
                            logger.error(f"Error creating content object: {str(e)}")
                            continue

                    if not new_questions:
                        logger.error(
                            "Failed to create content objects from generated questions"
                        )
                        return (
                            jsonify(
                                {
                                    "success": False,
                                    "error": "Failed to process generated questions",
                                    "details": "Could not create content objects",
                                }
                            ),
                            500,
                        )

                    logger.info(f"Created {len(new_questions)} content objects")

                    # Save to database
                    try:
                        for q in new_questions:
                            db.session.add(q)
                        db.session.commit()
                        questions = new_questions
                        logger.info(
                            f"Successfully saved {len(questions)} new questions to database"
                        )
                    except Exception as db_error:
                        logger.error(
                            f"Database error while saving questions: {str(db_error)}"
                        )
                        db.session.rollback()
                        return (
                            jsonify(
                                {
                                    "success": False,
                                    "error": "Failed to save generated questions",
                                    "details": str(db_error),
                                }
                            ),
                            500,
                        )

                except Exception as e:
                    logger.error(f"Error generating questions: {str(e)}")
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": "Failed to generate questions",
                                "details": str(e),
                            }
                        ),
                        500,
                    )
        except KeyError:
            logger.error(f"Invalid category value: {category}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Invalid category: {category}",
                        "valid_categories": [c.value for c in SubjectCategory],
                    }
                ),
                400,
            )

        if not questions:
            logger.info(f"No questions found for category: {category}")
            return jsonify(
                {
                    "success": True,
                    "questions": [],
                    "message": f"No questions available for {category}",
                }
            )

        questions_data = [
            {
                "id": q.id,
                "question": q.question,
                "options": q.options,
                "difficulty": q.difficulty.value,
                "category": q.category.value,
            }
            for q in questions
        ]

        logger.info(
            f"Successfully loaded {len(questions_data)} questions for category: {category}"
        )
        return jsonify({"success": True, "questions": questions_data})

    except KeyError:
        logger.error(f"Invalid category requested: {category}")
        return (
            jsonify({"success": False, "error": f"Invalid category: {category}"}),
            400,
        )
    except Exception as e:
        logger.error(
            f"Error loading questions for category {category}: {str(e)}", exc_info=True
        )
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to load questions",
                    "details": str(e) if current_app.debug else None,
                }
            ),
            500,
        )


@bp.route("/api/import-questions-from-files", methods=["POST"])
def import_questions_from_files():
    """Import questions from predefined text files."""
    try:
        logger.info("Starting question import from files")
        imported_count = 0

        # Define question files with full paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        files = [
            ("questions_1_25.txt", DifficultyLevel.BEGINNER),
            ("questions_26_50.txt", DifficultyLevel.INTERMEDIATE),
            ("questions_51_75.txt", DifficultyLevel.ADVANCED),
        ]

        for file_name, difficulty_level in files:
            file_path = os.path.join(current_dir, file_name)
            if not os.path.exists(file_path):
                logger.error(f"Question file not found: {file_path}")
                continue

            try:
                with open(file_path, "r") as file:
                    content = file.read()
                    logger.info(f"Successfully read file: {file_path}")

                    # Split into question blocks
                    question_blocks = content.split("\n\nQuestion")

                    # Process each question block
                    for block in question_blocks:
                        if not block.strip():
                            continue

                        try:
                            # Add "Question" back if it was removed by split
                            if not block.startswith("Question"):
                                block = "Question" + block

                            # Split into lines and clean up
                            lines = [
                                line.strip()
                                for line in block.split("\n")
                                if line.strip()
                            ]

                            # Extract category from the header line
                            category_line = next(
                                (line for line in lines if "NCLEX Category:" in line),
                                "",
                            )
                            category_text = (
                                category_line.split("NCLEX Category:")[-1].strip()
                                if category_line
                                else ""
                            )

                            # Map category text to enum
                            category_map = {
                                "PHARMACOLOGICAL": SubjectCategory.PHARMACOLOGY,
                                "MEDICAL SURGICAL": SubjectCategory.MEDICAL_SURGICAL,
                                "PEDIATRIC": SubjectCategory.PEDIATRIC,
                                "MATERNAL": SubjectCategory.MATERNAL_NEWBORN,
                                "MENTAL HEALTH": SubjectCategory.MENTAL_HEALTH,
                                "COMMUNITY": SubjectCategory.COMMUNITY_HEALTH,
                                "LEADERSHIP": SubjectCategory.LEADERSHIP,
                                "CRITICAL CARE": SubjectCategory.CRITICAL_CARE,
                                "EMERGENCY": SubjectCategory.EMERGENCY,
                            }

                            category_enum = SubjectCategory.PHARMACOLOGY  # Default
                            for key, value in category_map.items():
                                if key in category_text.upper():
                                    category_enum = value
                                    break

                            # Find the actual question text
                            question_text = ""
                            options = []
                            correct_answer = None
                            rationale = ""

                            for i, line in enumerate(lines):
                                if line.startswith(("A)", "B)", "C)", "D)")):
                                    # If we haven't found the question text yet, it's everything before the first option
                                    if not question_text and i > 0:
                                        # Skip header lines
                                        start_idx = next(
                                            (
                                                j
                                                for j, l in enumerate(lines)
                                                if not l.startswith("Question")
                                            ),
                                            0,
                                        )
                                        question_text = " ".join(
                                            lines[start_idx:i]
                                        ).strip()
                                    options.append(line[3:].strip())
                                elif line.startswith("Correct Answer:"):
                                    answer_letter = line.replace(
                                        "Correct Answer:", ""
                                    ).strip()
                                    correct_answer = {
                                        "A": 0,
                                        "B": 1,
                                        "C": 2,
                                        "D": 3,
                                    }.get(answer_letter, 0)
                                elif line.startswith("Rationale:"):
                                    rationale = " ".join(lines[i + 1 :]).strip()

                            # Validate required fields
                            if (
                                question_text
                                and len(options) == 4
                                and correct_answer is not None
                                and rationale
                            ):
                                content = Content(
                                    type=ContentType.QUIZ,
                                    category=category_enum,
                                    difficulty=difficulty_level,
                                    question=question_text,
                                    options=options,
                                    correct=correct_answer,
                                    rationale=rationale,
                                    keywords=[
                                        category_enum.value.lower(),
                                        difficulty_level.value.lower(),
                                    ],
                                    clinical_scenario=(
                                        question_text
                                        if "patient" in question_text.lower()
                                        else ""
                                    ),
                                    nursing_interventions=[],
                                    expected_outcomes=[],
                                )

                                db.session.add(content)
                                imported_count += 1
                                logger.info(
                                    f"Successfully parsed question {imported_count}"
                                )
                            else:
                                logger.warning(
                                    "Skipped invalid question - missing required fields"
                                )

                        except Exception as e:
                            logger.error(f"Error parsing question block: {str(e)}")
                            continue

                    db.session.commit()
                    logger.info(f"Successfully imported questions from {file_name}")

            except Exception as e:
                logger.error(f"Error processing file {file_name}: {str(e)}")
                db.session.rollback()
                continue

        if imported_count > 0:
            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Successfully imported {imported_count} questions",
                        "imported_count": imported_count,
                    }
                ),
                201,
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No questions were imported",
                        "details": "Check logs for parsing errors",
                    }
                ),
                400,
            )

    except Exception as e:
        logger.error(f"Error importing questions: {str(e)}")
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to import questions",
                    "details": str(e),
                }
            ),
            500,
        )


def get_improvement_suggestions(performance_data):
    """Generate improvement suggestions based on performance data."""
    improvements = []
    for category, data in performance_data.items():
        if data["accuracy"] < 70:
            improvements.append(
                {
                    "category": category,
                    "mastery": data["accuracy"],
                    "recommendation": f"Focus on {category} topics. Review materials and practice more questions.",
                }
            )
    return improvements


def generate_recommendations(questions_attempted, accuracy_rate, study_time):
    """Generate study recommendations based on performance metrics."""
    recommendations = []

    if questions_attempted < 10:
        recommendations.append(
            "Try to attempt more practice questions to improve your understanding"
        )

    if accuracy_rate < 70:
        recommendations.append(
            "Review your incorrect answers and create flashcards for challenging topics"
        )

    if study_time < 30:
        recommendations.append(
            "Consider increasing your daily study time for better retention"
        )

    if not recommendations:
        recommendations.append(
            "Great work today! Consider trying some advanced topics to challenge yourself"
        )

    return recommendations


@bp.route("/api/email/daily-summary", methods=["POST"])
def send_daily_summary_email():
    """Send daily summary email to the specified address."""
    try:
        data = request.get_json()
        if not data or "email" not in data:
            return jsonify({"error": "Email address is required"}), 400

        email = data["email"]
        logger.info(f"Preparing daily summary email for {email}")

        # Get daily summary data
        today = date.today()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())

        # Get progress from StudentProgress table
        progress = StudentProgress.query.filter_by(study_date=today).first()
        logger.info(f"Retrieved progress data for {today}")

        summary_data = {
            "questionsAttempted": 0,
            "accuracyRate": 0,
            "studyTime": 0,
            "topicsMastered": [],
            "recommendations": [],
        }

        if progress:
            summary_data.update(
                {
                    "questionsAttempted": progress.questions_attempted,
                    "accuracyRate": (
                        (progress.correct_answers / progress.questions_attempted * 100)
                        if progress.questions_attempted > 0
                        else 0
                    ),
                    "studyTime": progress.study_time,
                    "topicsMastered": [],
                }
            )
            logger.info(f"Updated summary data with progress: {summary_data}")

        try:
            # Get mastered topics
            mastered_topics = (
                db.session.query(Content.category)
                .join(Review, Review.content_id == Content.id)
                .filter(Review.created_at.between(start_of_day, end_of_day))
                .group_by(Content.category)
                .having(
                    func.sum(case((Review.is_correct == True, 1), else_=0))
                    * 100.0
                    / func.count()
                    >= 80
                )
                .all()
            )

            summary_data["topicsMastered"] = (
                [topic[0].value for topic in mastered_topics] if mastered_topics else []
            )
            logger.info(f"Retrieved mastered topics: {summary_data['topicsMastered']}")

        except Exception as db_error:
            logger.error(
                f"Database error while fetching mastered topics: {str(db_error)}"
            )
            summary_data["topicsMastered"] = []

        # Generate recommendations
        summary_data["recommendations"] = generate_recommendations(
            summary_data["questionsAttempted"],
            summary_data["accuracyRate"],
            summary_data["studyTime"],
        )
        logger.info("Generated recommendations for daily summary")

        try:
            try:
                # Initialize and send email with proper error handling
                from email_service import EmailService

                email_service = EmailService()
                success, message = email_service.send_daily_summary(email, summary_data)

                if success:
                    logger.info(f"Successfully sent daily summary email to {email}")
                    return jsonify(
                        {
                            "success": True,
                            "message": "Daily summary email sent successfully",
                        }
                    )
                else:
                    logger.error(f"Failed to send email to {email}: {message}")
                    return jsonify({"success": False, "error": message}), 400
            except ValueError as e:
                # Handle configuration errors
                logger.error(f"Email service configuration error: {str(e)}")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Email service configuration error",
                            "details": str(e),
                        }
                    ),
                    500,
                )
            except Exception as e:
                # Handle unexpected errors
                logger.exception(f"Unexpected error sending email: {e}")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "An unexpected error occurred while sending the email",
                            "details": str(e) if current_app.debug else None,
                        }
                    ),
                    500,
                )

        except ValueError as ve:
            # Handle configuration errors
            error_msg = str(ve)
            logger.error(f"Email configuration error: {error_msg}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Email service configuration error",
                        "details": error_msg,
                    }
                ),
                500,
            )

        except Exception as e:
            # Handle unexpected errors
            logger.exception(f"Unexpected error sending email: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "An unexpected error occurred while sending the email",
                        "details": str(e) if current_app.debug else None,
                    }
                ),
                500,
            )

    except Exception as e:
        logger.error(f"Error sending daily summary email: {str(e)}", exc_info=True)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Internal server error",
                    "details": str(e) if current_app.debug else None,
                }
            ),
            500,
        )


@bp.route("/api/generate-questions", methods=["POST"])
async def generate_questions():
    """Generate NCLEX questions using AI for specified category and difficulty"""
    logger.info("Received request to generate questions")

    if not request.is_json:
        logger.error("Request must be JSON")
        return jsonify({"success": False, "error": "Request must be JSON"}), 400
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        category = data.get("category", "PHARMACOLOGY").upper()
        difficulty = data.get("difficulty", "INTERMEDIATE").upper()
        count = min(int(data.get("count", 25)), 25)  # Limit to 25 questions max

        logger.info(f"Generating {count} {difficulty} questions for {category}")

        if not hasattr(SubjectCategory, category):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Invalid category: {category}",
                        "valid_categories": [c.name for c in SubjectCategory],
                    }
                ),
                400,
            )

        if not hasattr(DifficultyLevel, difficulty):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Invalid difficulty: {difficulty}",
                        "valid_difficulties": [d.name for d in DifficultyLevel],
                    }
                ),
                400,
            )

        logger.info(f"Generating {count} {difficulty} questions for {category}")

        # Initialize question generator
        try:
            question_generator = QuestionGenerator()
            logger.info("Question generator initialized successfully")
        except ValueError as e:
            error_msg = f"Failed to initialize question generator: {e}"
            logger.error(error_msg)
            return (
                jsonify({"success": False, "error": error_msg, "details": str(e)}),
                500,
            )

        # Generate questions
        try:
            logger.info(
                f"Attempting to generate {count} {difficulty} questions for {category}"
            )
            questions = await question_generator.generate_questions(
                category=category, difficulty=difficulty, count=count
            )
            logger.info(f"Successfully generated {len(questions)} questions")

        except ValueError as e:
            logger.error(f"Validation error during question generation: {str(e)}")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": str(e),
                        "error_type": "validation_error",
                    }
                ),
                400,
            )

        except openai.error.AuthenticationError:
            logger.error("OpenAI API authentication failed")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "OpenAI API authentication failed. Please check your API key.",
                        "error_type": "auth_error",
                    }
                ),
                401,
            )

        except Exception as e:
            logger.error(
                f"Unexpected error during question generation: {str(e)}", exc_info=True
            )
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "An unexpected error occurred while generating questions",
                        "error_type": "internal_error",
                        "details": str(e) if current_app.debug else None,
                    }
                ),
                500,
            )

        if not questions:
            return (
                jsonify({"success": False, "error": "No questions were generated"}),
                500,
            )

        # Convert to Content objects and save to database
        content_objects = question_generator.create_content_objects(
            questions=questions, category=category, difficulty=difficulty
        )

        if not content_objects:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to create content objects from generated questions",
                    }
                ),
                500,
            )

        # Save to database
        try:
            for content in content_objects:
                db.session.add(content)
            db.session.commit()

            logger.info(
                f"Successfully generated and saved {len(content_objects)} questions"
            )

            return jsonify(
                {
                    "success": True,
                    "message": f"Successfully generated {len(content_objects)} questions",
                    "questions": [
                        {
                            "id": c.id,
                            "question": c.question,
                            "options": c.options,
                            "difficulty": c.difficulty.value,
                            "category": c.category.value,
                        }
                        for c in content_objects
                    ],
                }
            )
        except Exception as e:
            logger.error(f"Database error while saving questions: {e}")
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Failed to save generated questions to database",
                        "details": str(e) if current_app.debug else None,
                    }
                ),
                500,
            )

    except Exception as e:
        logger.error(f"Unexpected error in generate_questions: {e}", exc_info=True)
        if "db" in locals():
            db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "error": "An unexpected error occurred",
                    "details": str(e) if current_app.debug else None,
                }
            ),
            500,
        )
