from flask import Blueprint, request, jsonify
import fitz  # PyMuPDF for PDF
import docx
import os
import openai
import logging
from typing import List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)
content_parsing_blueprint = Blueprint('content_parsing', __name__)

class ContentParsingService:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
            
    def init_app(self, app):
        self.app = app
        self.upload_folder = os.path.join(app.root_path, 'uploads')
        os.makedirs(self.upload_folder, exist_ok=True)
        
    def parse_pdf(self, file_path: str) -> str:
        """Parse PDF content using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except Exception as e:
            logger.error(f"Error parsing PDF: {str(e)}")
            raise
            
    def parse_docx(self, file_path: str) -> str:
        """Parse DOCX content using python-docx"""
        try:
            doc = docx.Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logger.error(f"Error parsing DOCX: {str(e)}")
            raise
            
    def parse_text(self, file_path: str) -> str:
        """Parse plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            logger.error(f"Error parsing text file: {str(e)}")
            raise
            
    async def analyze_content(self, content: str) -> Dict:
        """Analyze content using OpenAI to extract learning materials"""
        try:
            prompt = f"""Analyze the following educational content and extract:
            1. Main topics and subtopics
            2. Key concepts and definitions
            3. Potential quiz questions
            4. Important facts for flashcards
            5. Learning objectives
            6. Difficulty level assessment

            Content:
            {content[:4000]}  # Limit content length for API

            Format the response as JSON:
            {{
                "topics": ["topic1", "topic2"],
                "subtopics": {{"topic1": ["subtopic1", "subtopic2"]}},
                "key_concepts": [
                    {{"concept": "concept1", "definition": "definition1"}},
                ],
                "quiz_questions": [
                    {{
                        "question": "question text",
                        "options": ["option1", "option2", "option3", "option4"],
                        "correct_answer": 0,
                        "explanation": "explanation text",
                        "difficulty": "beginner|intermediate|advanced"
                    }}
                ],
                "flashcards": [
                    {{
                        "front": "question/term",
                        "back": "answer/definition",
                        "topic": "associated topic",
                        "difficulty": "beginner|intermediate|advanced"
                    }}
                ],
                "learning_objectives": ["objective1", "objective2"],
                "difficulty_assessment": {{
                    "overall_level": "beginner|intermediate|advanced",
                    "reasoning": "explanation of assessment"
                }}
            }}
            """
            
            response = await openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert educational content analyzer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error analyzing content: {str(e)}")
            raise
            
    def integrate_content(self, analysis: Dict) -> Dict:
        """Integrate analyzed content into the learning system"""
        try:
            # Create quiz questions
            for question in analysis['quiz_questions']:
                # Add to database using existing quiz service
                pass
                
            # Create flashcards
            for flashcard in analysis['flashcards']:
                # Add to flashcard system
                pass
                
            # Update learning objectives and topics
            # This will be used by the adaptive learning system
            
            return {
                "status": "success",
                "quiz_questions_added": len(analysis['quiz_questions']),
                "flashcards_added": len(analysis['flashcards']),
                "topics_integrated": len(analysis['topics'])
            }
            
        except Exception as e:
            logger.error(f"Error integrating content: {str(e)}")
            raise

@content_parsing_blueprint.route('/upload', methods=['POST'])
async def upload_file():
    """Handle file upload and parsing"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not supported"}), 400
            
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Parse content based on file type
        content = parse_file_content(file_path)
        
        # Analyze content
        analysis = await analyze_content(content)
        
        # Integrate into learning system
        result = integrate_content(analysis)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing file upload: {str(e)}")
        return jsonify({"error": str(e)}), 500

def allowed_file(filename):
    """Check if file type is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx', 'txt'}

def parse_file_content(file_path):
    """Parse file content based on file type"""
    ext = file_path.rsplit('.', 1)[1].lower()
    if ext == 'pdf':
        return parse_pdf(file_path)
    elif ext == 'docx':
        return parse_docx(file_path)
    else:
        return parse_text(file_path)
