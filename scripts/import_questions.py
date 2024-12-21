"""Import questions from text files."""

import logging
import os
import re
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configure project root path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Application imports
from app import create_app  # noqa: E402
from models import (  # noqa: E402
    Content,
    ContentType,
    DifficultyLevel,
    SubjectCategory,
    db,
)


def clean_text(text):
    """Clean and standardize text input"""
    if not text:
        return ""
    cleaned = text.strip().replace("\r\n", "\n").replace("\r", "\n")
    cleaned = " ".join(cleaned.split())
    cleaned = cleaned.replace("\u2019", "'").replace("\u2018", "'")
    return cleaned


def parse_question_block(text):
    """Parse a single question block into its components"""
    lines = text.strip().split("\n")
    result = {
        "question": "",
        "options": [],
        "correct": None,
        "rationale": "",
        "difficulty": "INTERMEDIATE",  # Default to intermediate
        "category": "PHARMACOLOGY",  # Default to pharmacology
    }

    current_section = "question"
    question_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith("Question"):
            # Extract difficulty and category from question header
            pattern = (
                r"Question\s+\d+\s*\((\w+)[^)]*;\s*" r"NCLEX\s+Category:\s*([\w\s-]+)"
            )
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                difficulty = match.group(1).upper()
                category = match.group(2).strip().upper()

                # Map difficulty levels
                difficulty_map = {
                    "BEGINNER": "BEGINNER",
                    "INTERMEDIATE": "INTERMEDIATE",
                    "ADVANCED": "ADVANCED",
                }
                result["difficulty"] = difficulty_map.get(difficulty, "INTERMEDIATE")

                # Map categories
                category_map = {
                    "PHARMACOLOGICAL AND PARENTERAL THERAPIES": "PHARMACOLOGY",
                    "MEDICAL SURGICAL": "MEDICAL_SURGICAL",
                    "MEDICAL-SURGICAL": "MEDICAL_SURGICAL",
                    "PEDIATRIC": "PEDIATRIC",
                    "MATERNAL NEWBORN": "MATERNAL_NEWBORN",
                    "MATERNAL-NEWBORN": "MATERNAL_NEWBORN",
                    "MENTAL HEALTH": "MENTAL_HEALTH",
                    "COMMUNITY HEALTH": "COMMUNITY_HEALTH",
                    "LEADERSHIP": "LEADERSHIP",
                    "CRITICAL CARE": "CRITICAL_CARE",
                    "EMERGENCY": "EMERGENCY",
                }

                result["category"] = category_map.get(category, "PHARMACOLOGY")
            continue

        if re.match(r"^[A-D][.)]", line):
            current_section = "options"
            option_text = re.sub(r"^[A-D][.)]", "", line).strip()
            if option_text:
                result["options"].append(clean_text(option_text))
        elif line.startswith(("Correct Answer:", "Best Answer:")):
            current_section = "answer"
            answer_match = re.search(r"[A-D]", line)
            if answer_match:
                result["correct"] = ord(answer_match.group(0)) - ord("A")
        elif line.startswith("Rationale:"):
            current_section = "rationale"
            rationale_text = line.split(":", 1)[1].strip()
            if rationale_text:
                result["rationale"] = clean_text(rationale_text)
        else:
            if current_section == "question":
                question_lines.append(line)
            elif current_section == "rationale":
                result["rationale"] += " " + clean_text(line)

    result["question"] = clean_text(" ".join(question_lines))
    return result


def import_questions():
    """Import questions from text files"""
    app = create_app()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = [
        os.path.join(base_dir, "questions_1_25.txt"),
        os.path.join(base_dir, "questions_26_50.txt"),
        os.path.join(base_dir, "questions_51_75.txt"),
    ]

    with app.app_context():
        total_imported = 0

        for file_path in files:
            try:
                logger.info(f"Processing file: {file_path}")

                if not os.path.exists(file_path):
                    logger.error(f"File not found: {file_path}")
                    continue

                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Split content into question blocks
                question_blocks = re.split(r"\n\s*\n(?=Question\s+\d+)", content)

                for block in question_blocks:
                    if not block.strip() or block.startswith("["):
                        continue  # Skip headers

                    try:
                        question_data = parse_question_block(block)

                        if (
                            not question_data["question"]
                            or not question_data["options"]
                        ):
                            logger.warning(
                                "Skipping question with missing required fields"
                            )
                            continue

                        logger.info(
                            "Importing question: " "Category=%s, Difficulty=%s",
                            question_data["category"],
                            question_data["difficulty"],
                        )

                        # Create content entry
                        content = Content(
                            type=ContentType.QUIZ,
                            category=SubjectCategory[question_data["category"]],
                            difficulty=DifficultyLevel[
                                question_data["difficulty"].upper()
                            ],
                            question=question_data["question"],
                            options=question_data["options"],
                            correct=question_data["correct"],
                            rationale=question_data["rationale"],
                            keywords=[question_data["category"].lower()],
                            nursing_interventions=[],
                            expected_outcomes=[],
                        )

                        db.session.add(content)
                        total_imported += 1

                    except Exception as e:
                        logger.error(f"Error processing question block: {str(e)}")
                        continue

                db.session.commit()
                logger.info(f"Successfully imported {total_imported} questions")

            except Exception as e:
                logger.error(f"Error processing file {file_path}: {str(e)}")
                db.session.rollback()
                continue


if __name__ == "__main__":
    logging.info("Starting question import process")
    try:
        import_questions()
        logging.info("Question import completed successfully")
    except Exception as e:
        logger.error(f"Failed to import questions: {str(e)}")
        sys.exit(1)
