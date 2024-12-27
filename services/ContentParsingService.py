import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

import docx
import fitz  # PyMuPDF
import magic  # python-magic for file type detection
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class MedicalContent(BaseModel):
    """Schema for medical educational content analysis"""

    learning_objectives: List[str] = Field(default_factory=list)
    key_concepts: List[Dict[str, str]] = Field(
        default_factory=list,
        description="List of objects with term and definition keys",
    )
    topics: List[str] = Field(default_factory=list)
    quiz_questions: List[Dict] = Field(default_factory=list)
    flashcards: List[Dict[str, str]] = Field(default_factory=list)
    difficulty_level: str = Field(default="intermediate")
    estimated_duration_minutes: int = Field(default=30)
    prerequisites: List[str] = Field(default_factory=list)


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

        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.error("OpenAI API key not found in environment variables")
            raise ValueError("OpenAI API key not found in environment variables")

        try:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")

            # Verify API connection asynchronously
            asyncio.create_task(self._verify_api_connection())

        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        self._initialized = True
        self.supported_mime_types = {
            "application/pdf": self._parse_pdf,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": self._parse_docx,
            "application/msword": self._parse_docx,
            "text/plain": self._parse_text,
        }
        logger.info("ContentParsingService initialization completed")

    async def _verify_api_connection(self) -> bool:
        """Verify the API connection is working"""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "system", "content": "API connection test"}],
                max_tokens=5,
            )
            logger.info("OpenAI API connection verified successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to verify OpenAI API connection: {str(e)}")
            return False

    async def parse_file(self, file_path: Union[str, Path]) -> str:
        """Parse file content based on file type with enhanced error handling"""
        if isinstance(file_path, str):
            file_path = Path(file_path)

        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            mime_type = magic.from_file(str(file_path), mime=True)
            logger.info(f"Detected mime type: {mime_type} for file: {file_path}")

            if mime_type not in self.supported_mime_types:
                raise ValueError(f"Unsupported file type: {mime_type}")

            content = await self.supported_mime_types[mime_type](file_path)

            if not content or not content.strip():
                raise ValueError("No content could be extracted from the file")

            logger.info(f"Successfully parsed content from {file_path}")
            return content

        except Exception as e:
            logger.error(f"Error parsing file {file_path}: {str(e)}")
            raise

    @staticmethod
    async def _parse_pdf(file_path: Path) -> str:
        """Parse PDF content using PyMuPDF with enhanced error handling"""
        doc = None
        try:
            doc = fitz.open(str(file_path))
            text = []
            for page_num, page in enumerate(doc, 1):
                try:
                    page_text = page.get_text()
                    text.append(page_text)
                    logger.debug(f"Successfully parsed page {page_num}")
                except Exception as e:
                    logger.warning(f"Error parsing page {page_num}: {str(e)}")
                    continue
            return "\n".join(text)
        except Exception as e:
            logger.error(f"Error parsing PDF: {str(e)}")
            raise
        finally:
            if doc:
                doc.close()

    @staticmethod
    async def _parse_docx(file_path: Path) -> str:
        """Parse DOCX content using python-docx"""
        try:
            doc = docx.Document(str(file_path))
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logger.error(f"Error parsing DOCX: {str(e)}")
            raise

    @staticmethod
    async def _parse_text(file_path: Path) -> str:
        """Parse plain text file with encoding handling"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback to alternative encoding if UTF-8 fails
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error parsing text file: {str(e)}")
            raise

    async def analyze_content(self, content: str) -> MedicalContent:
        """Analyze educational content using OpenAI with enhanced validation"""
        try:
            prompt = f"""Analyze the following medical educational content and provide a structured JSON response following this exact format:
{{
    "learning_objectives": ["objective 1", "objective 2"],
    "key_concepts": [
        {{"term": "concept1", "definition": "definition1"}},
        {{"term": "concept2", "definition": "definition2"}}
    ],
    "topics": ["topic1", "topic2"],
    "quiz_questions": [
        {{
            "question": "Question text",
            "options": ["option1", "option2", "option3", "option4"],
            "correct_answer": 0,
            "explanation": "Explanation for the correct answer"
        }}
    ],
    "flashcards": [
        {{"front": "Term or question", "back": "Definition or answer"}}
    ],
    "difficulty_level": "intermediate",
    "estimated_duration_minutes": 30,
    "prerequisites": ["prerequisite1", "prerequisite2"]
}}

Content to analyze:
{content[:4000]}

Remember: 
- All keys must be present
- key_concepts must have both term and definition for each item
- difficulty_level must be one of: beginner, intermediate, advanced
- estimated_duration_minutes must be a number
- Return only the JSON object, no other text
"""

            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical education content analyzer. Always respond with valid JSON matching the exact schema specified.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2000,
            )

            try:
                analysis_dict = json.loads(response.choices[0].message.content)
                # Ensure key_concepts format is correct
                if "key_concepts" in analysis_dict:
                    for concept in analysis_dict["key_concepts"]:
                        if (
                            not isinstance(concept, dict)
                            or "term" not in concept
                            or "definition" not in concept
                        ):
                            raise ValueError("Invalid key_concepts format")

                # Create and validate the model
                return MedicalContent(**analysis_dict)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
                raise ValueError("Invalid response format from OpenAI")
            except Exception as e:
                logger.error(f"Failed to validate response against schema: {str(e)}")
                raise ValueError("Response did not match expected schema")

        except Exception as e:
            logger.error(f"Error analyzing content: {str(e)}")
            raise

    async def process_upload(self, file: Dict, metadata: Optional[Dict] = None) -> Dict:
        """Process uploaded educational content with comprehensive validation"""
        try:
            if not file:
                raise ValueError("No file provided")

            temp_file_path = getattr(file, "tempFilePath", None)
            if not temp_file_path or not os.path.exists(temp_file_path):
                raise ValueError("Invalid or missing temporary file")

            logger.info(f"Processing file from temp path: {temp_file_path}")

            # Validate file type
            mime_type = magic.from_file(temp_file_path, mime=True)
            if mime_type not in self.supported_mime_types:
                raise ValueError(f"Unsupported file type detected: {mime_type}")

            logger.info(f"File type validated: {mime_type}")

            # Parse and analyze content
            content = await self.parse_file(temp_file_path)
            if not content:
                raise ValueError("No content could be extracted from the file")

            logger.info("File content parsed successfully")

            analysis = await self.analyze_content(content)
            logger.info("Content analysis completed")

            result = {
                "success": True,
                "analysis": analysis.dict(),
                "message": "Content processed successfully",
            }

            if metadata:
                result["analysis"]["metadata"] = metadata
                logger.info("Metadata added to analysis")

            return result

        except Exception as e:
            logger.error(f"Error processing upload: {str(e)}")
            raise ValueError(str(e))
