
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import fitz  # PyMuPDF for PDF handling
import docx  # python-docx for DOCX handling
from services.ai_service import AIService

instructor_bp = Blueprint('instructor', __name__)
ai_service = AIService()

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
UPLOAD_FOLDER = 'uploads/instructor_content'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text(filepath):
    ext = filepath.split('.')[-1].lower()
    
    if ext == 'pdf':
        doc = fitz.open(filepath)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    
    elif ext == 'docx':
        doc = docx.Document(filepath)
        text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        return text
    
    elif ext == 'txt':
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

@instructor_bp.route('/api/instructor/upload', methods=['POST'])
def upload_content():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    content_type = request.form.get('type', 'general')  # general, quiz, flashcard
    topic = request.form.get('topic', '')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Extract text from document
        text_content = extract_text(filepath)
        
        # Process with AI based on content type
        if content_type == 'quiz':
            questions = ai_service.generate_questions(text_content, topic)
            return jsonify({'message': 'Questions generated', 'questions': questions})
            
        elif content_type == 'flashcard':
            flashcards = ai_service.generate_flashcards(text_content, topic)
            return jsonify({'message': 'Flashcards generated', 'flashcards': flashcards})
            
        else:
            study_material = ai_service.process_study_material(text_content, topic)
            return jsonify({'message': 'Content processed', 'study_material': study_material})
            
    return jsonify({'error': 'Invalid file type'}), 400

@instructor_bp.route('/api/instructor/course-overview', methods=['POST'])
def set_course_overview():
    data = request.json
    overview = data.get('overview', '')
    timeframe = data.get('timeframe', 'daily')  # daily or weekly
    
    if not overview:
        return jsonify({'error': 'Overview content required'}), 400
        
    # Update AI context with new course overview
    ai_service.update_course_context(overview, timeframe)
    
    return jsonify({'message': f'{timeframe.capitalize()} overview updated successfully'})
