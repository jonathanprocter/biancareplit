import os
import logging
import openai
from models import Content, SubjectCategory, DifficultyLevel, ContentType
from typing import List, Dict, Any, Optional
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        openai.api_key = self.api_key

    def _validate_question(self, question: Dict[str, Any]) -> bool:
        """Validate that a question has all required fields and proper format."""
        try:
            # Check required fields
            if not question.get('question') or len(question.get('question', '').strip()) < 10:
                logger.error("Question text missing or too short")
                return False
                
            if not question.get('options') or len(question.get('options', [])) != 4:
                logger.error("Must have exactly 4 options")
                return False
                
            if not isinstance(question.get('correct'), int) or not (0 <= question.get('correct', -1) <= 3):
                logger.error("Invalid or missing correct answer index")
                return False
                
            if not question.get('rationale') or len(question.get('rationale', '').strip()) < 20:
                logger.error("Rationale missing or too short")
                return False
                
            # Validate option content
            if any(not opt or len(str(opt).strip()) < 3 for opt in question['options']):
                logger.error("One or more options are empty or too short")
                return False
                
            # Check for duplicate options
            if len(set(question['options'])) != len(question['options']):
                logger.error("Duplicate options found")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error validating question: {str(e)}")
            return False

    def generate_prompt(self, category: str, difficulty: str, count: int = 5) -> str:
        """Generate a prompt for creating NCLEX-style questions."""
        return f"""Create {count} high-cognitive level NCLEX-style questions focusing on analysis, synthesis, or evaluation with the following criteria:
    Difficulty: {difficulty}
    Topic: {category}
    
    Format each question following this exact structure:
    
    Question: [Clinical scenario with patient information]
    A) [First option]
    B) [Second option]
    C) [Third option]
    D) [Fourth option]
    Correct: [Letter of correct answer (A, B, C, or D)]
    Rationale: [Detailed explanation including:
    - Why the correct answer is right
    - Why other options are incorrect
    - Related nursing concepts and interventions]
    Keywords: [Comma-separated list of relevant medical terms]

    Requirements:
    1. Each question must be a realistic nursing scenario
    2. Include vital signs, lab values, or assessment findings when relevant
    3. Focus on clinical judgment and critical thinking
    4. All answer options must be plausible but only one clearly correct
    5. Reference current evidence-based nursing practices
    6. Include priority-setting and delegation scenarios
    7. Incorporate safety considerations when applicable

    Separate each question with three newlines.
    
    Begin generating exactly {count} questions now:"""

    async def generate_questions(self, category: str, difficulty: str, count: int = 5) -> List[Dict[str, Any]]:
        """Generate NCLEX-style questions using OpenAI API."""
        try:
            logger.info(f"Starting question generation for category: {category}, difficulty: {difficulty}")
            
            # Validate inputs
            if not category or not difficulty:
                raise ValueError("Category and difficulty are required")
            
            prompt = self.generate_prompt(category, difficulty, count)
            
            try:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are an expert NCLEX question writer."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4000
                )
                
                if not response.choices:
                    logger.error("No response from OpenAI API")
                    return []
                
                content = response.choices[0].message.content
                
            except Exception as e:
                logger.error(f"OpenAI API error: {str(e)}")
                return []
            
            # Parse questions
            questions = []
            current_question = None
            
            for line in content.split('\n'):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    if line.lower().startswith('question:'):
                        if current_question and self._validate_question(current_question):
                            questions.append(current_question)
                        current_question = {
                            'question': line.split(':', 1)[1].strip(),
                            'options': [],
                            'correct': None,
                            'rationale': '',
                            'keywords': []
                        }
                    elif current_question:
                        if line.startswith(('A)', 'B)', 'C)', 'D)')):
                            option_text = line[3:].strip()
                            if option_text:
                                current_question['options'].append(option_text)
                        elif line.lower().startswith('correct:'):
                            answer = line.split(':', 1)[1].strip().upper()
                            if answer in ['A', 'B', 'C', 'D']:
                                current_question['correct'] = ord(answer) - ord('A')
                        elif line.lower().startswith('rationale:'):
                            current_question['rationale'] = line.split(':', 1)[1].strip()
                        elif line.lower().startswith('keywords:'):
                            keywords = line.split(':', 1)[1].strip()
                            current_question['keywords'] = [k.strip() for k in keywords.split(',')]
                        elif current_question.get('rationale'):
                            current_question['rationale'] += ' ' + line
                except Exception as e:
                    logger.error(f"Error parsing line: {str(e)}")
                    continue
            
            # Add the last question if valid
            if current_question and self._validate_question(current_question):
                questions.append(current_question)
            
            valid_questions = [q for q in questions if self._validate_question(q)]
            logger.info(f"Generated {len(valid_questions)} valid questions")
            
            return valid_questions
            
        except Exception as e:
            logger.error(f"Error in generate_questions: {str(e)}")
            return []

    def create_content_objects(self, questions, category, difficulty):
        """Convert generated questions into Content objects"""
        content_objects = []
        
        try:
            logger.info(f"Starting content object creation with {len(questions)} questions")
            logger.info(f"Using category: {category}, difficulty: {difficulty}")
            
            # Validate category and difficulty before processing
            try:
                category_enum = SubjectCategory[category.upper()]
                difficulty_enum = DifficultyLevel[difficulty.upper()]
            except KeyError as ke:
                logger.error(f"Invalid category or difficulty value: {ke}")
                return []
            
            for q in questions:
                try:
                    question_text = q.get('question', '')
                    logger.info(f"Creating content object for question: {question_text[:50]}...")
                    
                    # Validate required fields
                    required_fields = ['question', 'options', 'correct', 'rationale']
                    missing_fields = [field for field in required_fields if field not in q]
                    if missing_fields:
                        logger.error(f"Missing required fields: {missing_fields}")
                        continue
                    
                    try:
                        content = Content(
                            type=ContentType.QUIZ,  # Using the proper enum value
                            category=category_enum,
                            difficulty=difficulty_enum,
                            question=question_text,
                            options=q['options'],
                            correct=q['correct'],
                            rationale=q['rationale'],
                            keywords=q.get('keywords', []),
                            clinical_scenario=q.get('clinical_scenario', ''),
                            nursing_interventions=q.get('nursing_interventions', []),
                            expected_outcomes=q.get('expected_outcomes', [])
                        )
                        logger.info(f"Created content object: {content.question[:50]}...")
                    except Exception as e:
                        logger.error(f"Error creating content object: {str(e)}")
                        continue
                    
                    # Validate content object before adding
                    if content.question and content.options:
                        content_objects.append(content)
                        logger.info(f"Successfully created content object for question {len(content_objects)}")
                    else:
                        logger.error("Invalid content object - missing required fields")
                        
                except Exception as e:
                    logger.error(f"Error creating content object: {str(e)}")
                    continue
            
            logger.info(f"Successfully created {len(content_objects)} content objects")
            return content_objects
            
        except Exception as e:
            logger.error(f"Fatal error in create_content_objects: {str(e)}")
            return []