from flask import Blueprint, request, jsonify
from openai import AsyncOpenAI, OpenAIError
import json
from datetime import datetime
import logging
import os
from extensions import db
from models import Flashcard, DifficultyLevel
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
ai_coach_blueprint = Blueprint('ai_coach', __name__)

# Add CORS support
from flask_cors import CORS
CORS(ai_coach_blueprint)

def handle_openai_error(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except OpenAIError as e:
            logger.error(f"OpenAI API Error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise
    return wrapper

class AICoachService:
    def __init__(self, api_key=None, app=None):
        """Initialize the AI Coach Service with proper API key validation."""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.app = app
        self.study_patterns = {}
        
        if not self.api_key:
            logger.error("OpenAI API key not found")
            raise ValueError("OpenAI API key not configured")
        
        # Initialize OpenAI client
        try:
            # Initialize the OpenAI client
            self.client = AsyncOpenAI(api_key=self.api_key)
            
            # Verify the client initialization
            if not self.client:
                raise ValueError("Failed to initialize OpenAI client")
                
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

    async def generate_motivational_insights(self, user_patterns):
        """Generate personalized motivational insights based on study patterns."""
        try:
            prompt = f"""As a supportive AI study companion, provide personalized motivational insights based on these study patterns:
            - Study streak: {user_patterns.get('studyStreak', 0)} days
            - Topics focused: {', '.join(user_patterns.get('topicsFocused', []))}
            - Strengths: {', '.join(user_patterns.get('strengths', []))}
            - Areas for improvement: {', '.join(user_patterns.get('areasForImprovement', []))}

            Generate a response that includes:
            1. A personalized motivational message
            2. Recognition of achievements
            3. Gentle encouragement for improvement areas
            4. A specific actionable tip

            Format the response as JSON:
            {{
                "message": "Main motivational message",
                "achievements": ["achievement 1", "achievement 2"],
                "encouragement": "Encouraging message for improvement areas",
                "actionable_tip": "Specific study tip for today",
                "study_streak_message": "Message about the study streak"
            }}
            """

            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an empathetic and encouraging study companion focused on medical education."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                max_tokens=1000
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.error(f"Error generating motivational insights: {str(e)}")
            raise
            
        # Set up application context if app is provided
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the service with Flask application context."""
        self.app = app
        
        # Register extension with the app
        with self.app.app_context():
            try:
                # Verify database connection
                db.engine.connect().execute(db.text("SELECT 1"))
                logger.info("Database connection verified successfully")
                # Initialize required database models
                db.create_all()
                logger.info("Database tables created successfully")
            except Exception as e:
                logger.error(f"Failed to verify database connection or create tables: {str(e)}")
                raise
        
    @handle_openai_error
    async def create_flashcard(self, topic, difficulty=None):
        """Generate a flashcard for a given topic using OpenAI."""
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
            
            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Using the latest model
                messages=[
                    {"role": "system", "content": "You are an expert nursing educator creating study materials."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}  # Ensure JSON response
            )
            
            content = response.choices[0].message.content
            flashcard_data = json.loads(content)
            
            # Format the back content for storage
            back_content = f"Answer: {flashcard_data['answer']}\n\nKey Points:\n" + \
                         "\n".join([f"- {point}" for point in flashcard_data['key_points']]) + \
                         "\n\nRelated Concepts:\n" + \
                         "\n".join([f"- {concept}" for concept in flashcard_data['related_concepts']]) + \
                         "\n\nCommon Pitfalls:\n" + \
                         "\n".join([f"- {pitfall}" for pitfall in flashcard_data['common_pitfalls']])
            
            # Format clinical notes
            clinical_notes = []
            if 'clinical_notes' in flashcard_data:
                cn = flashcard_data['clinical_notes']
                sections = [
                    ('Patient Assessment', cn.get('assessment', [])),
                    ('Nursing Interventions', cn.get('interventions', [])),
                    ('Expected Outcomes', cn.get('outcomes', [])),
                    ('Critical Thinking Points', cn.get('critical_thinking', [])),
                    ('Clinical Pearls', cn.get('clinical_pearls', []))
                ]
                for title, points in sections:
                    if points:
                        clinical_notes.append(f"{title}:")
                        clinical_notes.extend([f"• {point}" for point in points])
                        clinical_notes.append("")  # Add spacing between sections
                
                clinical_notes = "\n".join(clinical_notes).strip()
            
            # Create new flashcard in database
            flashcard = Flashcard(
                front=flashcard_data['question'],
                back=back_content,
                difficulty=DifficultyLevel.INTERMEDIATE,
                created_at=datetime.utcnow(),
                clinical_notes=clinical_notes
            )
            
            try:
                db.session.add(flashcard)
                db.session.commit()
                logger.info(f"Created flashcard with ID: {flashcard.id}")
                
                # Return the data in the format expected by frontend
                return {
                    'question': flashcard_data['question'],
                    'answer': flashcard_data['answer'],
                    'key_points': flashcard_data['key_points'],
                    'related_concepts': flashcard_data['related_concepts'],
                    'common_pitfalls': flashcard_data['common_pitfalls'],
                    'flashcard_id': flashcard.id,
                    'saved': True
                }
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error creating flashcard: {str(e)}")
                return {
                    'question': flashcard_data['question'],
                    'answer': flashcard_data['answer'],
                    'key_points': flashcard_data['key_points'],
                    'related_concepts': flashcard_data['related_concepts'],
                    'common_pitfalls': flashcard_data['common_pitfalls'],
                    'saved': False,
                    'save_error': str(e)
                }
            
        except Exception as e:
            logger.error(f"Error creating flashcard: {str(e)}")
            raise
            
    def generate_study_tip(self, topic):
        """Generate a study tip for a specific topic."""
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
            
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert nursing educator providing study guidance."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            tip_data = json.loads(response.choices[0].message.content)
            tip_data.update({
                "topic": topic,
                "created_at": datetime.utcnow().isoformat(),
                "type": "study_tip"
            })
            
            return tip_data
            
        except Exception as e:
            logger.error(f"Error generating study tip: {str(e)}")
            raise

# Create service instance but don't initialize yet
ai_coach_service = AICoachService()

def init_app(app):
    """Initialize the service with the Flask app"""
    ai_coach_service.init_app(app)

@ai_coach_blueprint.route('/flashcard', methods=['POST'])
async def create_flashcard_endpoint():
    """Create a flashcard endpoint that matches frontend expectations."""
    logger.info("Received flashcard creation request")
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received")
            return jsonify({"error": "Request must include JSON data"}), 400
            
        if 'topic' not in data:
            logger.error("No topic provided in request")
            return jsonify({"error": "Topic is required"}), 400
            
        logger.info(f"Creating flashcard for topic: {data['topic']}")
        flashcard_data = await ai_coach_service.create_flashcard(data['topic'])
        
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

@ai_coach_blueprint.route('/study-tip', methods=['POST'])
def generate_study_tip():
    """Generate a study tip for a given topic."""
    try:
        data = request.get_json()
        if not data or 'topic' not in data:
            return jsonify({"error": "Topic is required"}), 400
            
        tip = ai_coach_service.generate_study_tip(data['topic'])
        return jsonify(tip)
        
    except Exception as e:
        logger.error(f"Error in generate_study_tip endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@ai_coach_blueprint.route('/motivation', methods=['POST'])
async def get_motivational_insights():
    """Get personalized motivational insights based on study patterns."""
    try:
        logger.info("Received request for motivational insights")
        data = request.get_json()
        if not data or 'patterns' not in data:
            logger.error("Missing study patterns in request")
            return jsonify({"error": "Study patterns are required"}), 400

        logger.info(f"Generating insights for patterns: {data['patterns']}")
        insights = await ai_coach_service.generate_motivational_insights(data['patterns'])
        logger.info("Successfully generated motivational insights")
        return jsonify(insights)

    except OpenAIError as e:
        logger.error(f"OpenAI API error in motivational insights: {str(e)}")
        return jsonify({"error": "AI service error", "details": str(e)}), 503
    except Exception as e:
        logger.error(f"Unexpected error in get_motivational_insights endpoint: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@ai_coach_blueprint.route('/progress', methods=['POST'])
def update_study_progress():
    """Update and track study patterns."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Study session data is required"}), 400

        # Update study patterns in the service
        ai_coach_service.study_patterns[request.remote_addr] = {
            'lastStudyTime': data.get('timestamp', datetime.utcnow().isoformat()),
            'studyStreak': data.get('studyStreak', 0),
            'topicsFocused': list(set(data.get('topicsFocused', []))),
            'strengths': data.get('strengths', []),
            'areasForImprovement': data.get('areasForImprovement', [])
        }

        return jsonify(ai_coach_service.study_patterns[request.remote_addr])

    except Exception as e:
        logger.error(f"Error in update_study_progress endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Error handlers
@ai_coach_blueprint.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@ai_coach_blueprint.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500

#  The following features need to be implemented to fully address the user's request:
#  - Daily welcome card generation and delivery
#  - Instructor daily email report generation and sending
#  - Adaptive learning algorithm integration
#  - Quiz generation and integration with flashcard creation
#  - Frontend integration for all new features