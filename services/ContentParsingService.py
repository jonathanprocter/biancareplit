import logging
import os
import json
import asyncio
from typing import Dict, Optional, Union
from pathlib import Path
from datetime import datetime
import magic
import fitz  # PyMuPDF
import docx
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class ContentParsingService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ContentParsingService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the content parsing service as a singleton"""
        if self._initialized:
            return
            
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            logger.error("OpenAI API key not found in environment variables")
            raise ValueError("OpenAI API key not found in environment variables")

        # Initialize OpenAI client
        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
            # do not change this unless explicitly requested by the user
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")
            
            # Verify API connection
            asyncio.create_task(self._verify_api_connection())
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise
            
        self._initialized = True
        logger.info("ContentParsingService initialization completed")
        
    async def _verify_api_connection(self):
        """Verify the API connection is working"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": "API connection test"}],
                max_tokens=5
            )
            logger.info("OpenAI API connection verified successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to verify OpenAI API connection: {str(e)}")
            return False

    async def parse_file(self, file_path: Union[str, Path]) -> str:
        """Parse file content based on file type"""
        if isinstance(file_path, str):
            file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            # Detect file type using python-magic
            mime_type = magic.from_file(str(file_path), mime=True)
            logger.info(f"Detected mime type: {mime_type} for file: {file_path}")

            content = ""
            if mime_type == 'application/pdf':
                content = self._parse_pdf(file_path)
            elif mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
                content = self._parse_docx(file_path)
            elif mime_type.startswith('text/'):
                content = self._parse_text(file_path)
            else:
                raise ValueError(f"Unsupported file type: {mime_type}")

            if not content or not content.strip():
                raise ValueError("No content could be extracted from the file")

            logger.info(f"Successfully parsed content from {file_path}")
            return content

        except Exception as e:
            logger.error(f"Error parsing file {file_path}: {str(e)}")
            raise

    def _parse_pdf(self, file_path: Path) -> str:
        """Parse PDF content using PyMuPDF"""
        try:
            doc = fitz.open(str(file_path))
            text = []
            for page in doc:
                text.append(page.get_text())
            return "\n".join(text)
        except Exception as e:
            logger.error(f"Error parsing PDF: {str(e)}")
            raise
        finally:
            if 'doc' in locals():
                doc.close()

    def _parse_docx(self, file_path: Path) -> str:
        """Parse DOCX content using python-docx"""
        try:
            doc = docx.Document(str(file_path))
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logger.error(f"Error parsing DOCX: {str(e)}")
            raise

    def _parse_text(self, file_path: Path) -> str:
        """Parse plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error parsing text file: {str(e)}")
            raise

    async def analyze_content(self, content: str) -> Dict:
        """Analyze educational content using OpenAI"""
        try:
            prompt = f"""Analyze the following educational content and extract:
            1. Learning objectives
            2. Key concepts and definitions
            3. Important topics and subtopics
            4. Suggested quiz questions
            5. Points for flashcards
            6. Difficulty assessment
            7. Estimated time to complete
            8. Prerequisites (if any)

            Content:
            {content[:4000]}

            Provide the response in JSON format with these keys:
            {{
                "learning_objectives": ["objective1", "objective2", ...],
                "key_concepts": [
                    {{"term": "concept1", "definition": "definition1"}},
                    ...
                ],
                "topics": ["topic1", "topic2", ...],
                "quiz_questions": [
                    {{
                        "question": "question text",
                        "options": ["option1", "option2", "option3", "option4"],
                        "correct_answer": 0,
                        "explanation": "explanation text"
                    }},
                    ...
                ],
                "flashcards": [
                    {{
                        "front": "question/term",
                        "back": "answer/definition"
                    }},
                    ...
                ],
                "difficulty_level": "beginner|intermediate|advanced",
                "estimated_duration_minutes": integer,
                "prerequisites": ["prerequisite1", "prerequisite2", ...]
            }}"""

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert educational content analyzer."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.error(f"Error analyzing content: {str(e)}")
            raise

    async def process_upload(self, file: Dict, metadata: Optional[Dict] = None) -> Dict:
        """Process uploaded educational content"""
        try:
            if not file:
                raise ValueError("No file provided")

            # Check if we have the file path
            temp_file_path = getattr(file, 'tempFilePath', None)
            if not temp_file_path or not os.path.exists(temp_file_path):
                raise ValueError("Invalid or missing temporary file")

            logger.info(f"Processing file from temp path: {temp_file_path}")

            # Validate file type using magic
            try:
                mime_type = magic.from_file(temp_file_path, mime=True)
                allowed_types = [
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain'
                ]
                
                if mime_type not in allowed_types:
                    raise ValueError(f"Unsupported file type detected: {mime_type}")
                
                logger.info(f"File type validated: {mime_type}")
            except Exception as e:
                logger.error(f"File type validation failed: {str(e)}")
                raise ValueError(f"File type validation failed: {str(e)}")

            try:
                # Parse content
                content = await self.parse_file(temp_file_path)
                if not content:
                    raise ValueError("No content could be extracted from the file")
                logger.info("File content parsed successfully")

                # Analyze content
                analysis = await self.analyze_content(content)
                logger.info("Content analysis completed")

                # Add metadata if provided
                if metadata:
                    analysis['metadata'] = metadata
                    logger.info("Metadata added to analysis")

                return {
                    "success": True,
                    "analysis": analysis,
                    "message": "Content processed successfully"
                }

            except Exception as e:
                logger.error(f"Error during content processing: {str(e)}")
                raise ValueError(f"Content processing failed: {str(e)}")

        except Exception as e:
            logger.error(f"Error processing upload: {str(e)}")
            raise ValueError(str(e))