"""API handlers for the NCLEX coaching platform."""
from flask import Blueprint, request, jsonify, current_app
import openai
import json
import logging
from database import Content, SubjectCategory, DifficultyLevel, ContentType, db

# Configure logging
logger = logging.getLogger(__name__)

# Initialize blueprint
nursing_api = Blueprint('nursing_api', __name__)

@nursing_api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200

@nursing_api.route('/questions/generate', methods=['POST'])
def generate_question():
    """Generate a single NCLEX-style question."""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['difficulty', 'topic', 'subtopic']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Generate question using OpenAI
        prompt = create_question_prompt(data['difficulty'], data['topic'], data['subtopic'])
        
        # Get OpenAI client from app config
        openai.api_key = current_app.config['OPENAI_API_KEY']
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert NCLEX question writer."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse and validate the response
        question_data = json.loads(response.choices[0].message.content)
        validate_question_format(question_data)
        
        # Create new content
        content = Content(
            type=ContentType.QUIZ,
            category=SubjectCategory[data['topic'].upper()],
            difficulty=DifficultyLevel[data['difficulty'].upper()],
            question=question_data['question'],
            options=[question_data['correct_answer']] + question_data['incorrect_answers'],
            correct=0,  # Correct answer is always first in the options list
            rationale=question_data['explanation'],
            keywords=question_data.get('keywords', []),
            clinical_scenario=question_data['question'] if 'patient' in question_data['question'].lower() else '',
            nursing_interventions=[],
            expected_outcomes=[]
        )
        
        # Save to database
        db.session.add(content)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'question': content.to_dict()
        })
    
    except Exception as e:
        logger.error(f"Error generating question: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def create_question_prompt(difficulty: str, topic: str, subtopic: str) -> str:
    """Create a prompt for generating NCLEX-style questions."""
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

def validate_question_format(question_data: dict) -> None:
    """Validate the format of generated questions."""
    required_fields = ['question', 'correct_answer', 'incorrect_answers', 'explanation']
    
    if not all(field in question_data for field in required_fields):
        raise ValueError('Invalid question format')
    
    if not isinstance(question_data['incorrect_answers'], list):
        raise ValueError('incorrect_answers must be a list')
    
    if len(question_data['incorrect_answers']) != 3:
        raise ValueError('Must have exactly 3 incorrect answers')
