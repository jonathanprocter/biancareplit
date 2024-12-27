from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import mimetypes
import fitz  # PyMuPDF for PDF handling
import docx  # python-docx for DOCX handling
from services.ai_service import AIService
from typing import Optional

instructor_bp = Blueprint("instructor", __name__)
ai_service = AIService()

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt"}
UPLOAD_FOLDER = "uploads/instructor_content"
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_mime_type(file) -> Optional[str]:
    mime_type = mimetypes.guess_type(file.filename)[0]
    if not mime_type:
        return "Unknown file type"

    allowed_mimes = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt'
    }

    if mime_type not in allowed_mimes:
        return f"Invalid file type: {mime_type}"

    return None

def extract_text(filepath: str) -> Optional[str]:
    try:
        ext = filepath.split(".")[-1].lower()

        if ext == "pdf":
            doc = fitz.open(filepath)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text

        if ext == "docx":
            doc = docx.Document(filepath)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text

        if ext == "txt":
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()

    except Exception as e:
        return None

@instructor_bp.route("/api/instructor/upload", methods=["POST"])
def upload_content():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    content_type = request.form.get("type", "general")
    topic = request.form.get("topic", "")

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Check file size
    if len(file.read()) > MAX_CONTENT_LENGTH:
        return jsonify({"error": "File size exceeds 10MB limit"}), 400
    file.seek(0)  # Reset file pointer after reading

    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    # Validate MIME type
    mime_error = validate_mime_type(file)
    if mime_error:
        return jsonify({"error": mime_error}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Extract text from document
        text_content = extract_text(filepath)
        if not text_content:
            os.remove(filepath)  # Clean up file if text extraction fails
            return jsonify({"error": "Failed to extract text from file"}), 400

        # Process with AI based on content type
        try:
            if content_type == "quiz":
                questions = ai_service.generate_questions(text_content, topic or "general")
                return jsonify({
                    "success": True,
                    "message": "Questions generated",
                    "questions": questions
                })

            if content_type == "flashcard":
                flashcards = ai_service.generate_flashcards(text_content, topic or "general")
                return jsonify({
                    "success": True,
                    "message": "Flashcards generated",
                    "flashcards": flashcards
                })
            analysis = ai_service.analyze_content(text_content, topic or "general")
            return jsonify({
                "success": True,
                "message": "Content processed",
                "analysis": analysis
            })

        finally:
            # Clean up the uploaded file after processing
            os.remove(filepath)

    except Exception as e:
        # Clean up file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({
            "error": str(e),
            "message": "Failed to process file"
        }), 500

@instructor_bp.route("/api/instructor/course-overview", methods=["POST"])
def set_course_overview():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        overview = data.get("overview")
        timeframe = data.get("timeframe", "daily")

        if not overview:
            return jsonify({"error": "Overview content required"}), 400

        if timeframe not in ["daily", "weekly"]:
            return jsonify({"error": "Invalid timeframe"}), 400

        # Update AI context with new course overview
        ai_service.update_course_context(overview, timeframe)

        return jsonify({
            "success": True,
            "message": f"{timeframe.capitalize()} overview updated successfully"
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Failed to update course overview"
        }), 500