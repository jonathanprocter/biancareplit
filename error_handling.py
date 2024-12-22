from functools import wraps
from flask import jsonify
from openai import OpenAI, RateLimitError, APIError
import time
import logging
import random
from datetime import datetime
import json
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class QuestionGenerationError(Exception):
    pass


def handle_openai_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                return f(*args, **kwargs)

            except RateLimitError as e:
                retry_count += 1
                if retry_count == max_retries:
                    logger.error(f"Rate limit exceeded after {max_retries} retries")
                    return (
                        jsonify(
                            {
                                "error": "Rate limit exceeded",
                                "details": str(e),
                                "success": False,
                            }
                        ),
                        429,
                    )

                # Exponential backoff
                wait_time = (2**retry_count) + random.uniform(0, 1)
                time.sleep(wait_time)

            except APIError as e:
                retry_count += 1
                if retry_count == max_retries:
                    logger.error(
                        f"OpenAI API error after {max_retries} retries: {str(e)}"
                    )
                    return (
                        jsonify(
                            {
                                "error": "OpenAI API error",
                                "details": str(e),
                                "success": False,
                            }
                        ),
                        502,
                    )
                time.sleep(1)

            except Exception as e:
                logger.error(f"Unexpected error in question generation: {str(e)}")
                return (
                    jsonify(
                        {
                            "error": "Failed to generate questions",
                            "details": str(e),
                            "success": False,
                        }
                    ),
                    500,
                )

    return decorated_function


@handle_openai_errors
def generate_single_question(difficulty, topic, subtopic):
    prompt = create_question_prompt(difficulty, topic, subtopic)

    response = client.chat.models.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert NCLEX question writer."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=1000,
        presence_penalty=0.6,
        frequency_penalty=0.3,
    )

    question_data = json.loads(response.choices[0].message.content)
    validate_question_format(question_data)

    question_data.update(
        {
            "difficulty": difficulty,
            "topic": topic,
            "subtopic": subtopic,
            "generated_at": datetime.utcnow().isoformat(),
        }
    )

    return question_data


def create_question_prompt(difficulty, topic, subtopic):
    return f"""Create a high-cognitive level NCLEX-style question (focusing on analysis, synthesis, or evaluation) with the following criteria:
    Difficulty: {difficulty}
    Topic: {topic}
    Subtopic: {subtopic}
    
    The question should:
    1. Test clinical judgment and critical thinking
    2. Require analysis of complex scenarios
    3. Challenge students to apply multiple concepts
    4. Be at an appropriate difficulty level ({difficulty})
    
    Format the response as a JSON object with:
    {{
        "question": "question text",
        "correct_answer": "correct answer",
        "incorrect_answers": ["wrong1", "wrong2", "wrong3"],
        "explanation": "detailed explanation of the correct answer and why other options are incorrect",
        "cognitive_level": "analysis|synthesis|evaluation",
        "keywords": ["relevant", "topic", "keywords"]
    }}"""


def validate_question_format(question_data):
    required_fields = ["question", "correct_answer", "incorrect_answers", "explanation"]

    if not all(field in question_data for field in required_fields):
        raise ValueError("Invalid question format")

    if not isinstance(question_data["incorrect_answers"], list):
        raise ValueError("incorrect_answers must be a list")

    if len(question_data["incorrect_answers"]) != 3:
        raise ValueError("Must have exactly 3 incorrect answers")
