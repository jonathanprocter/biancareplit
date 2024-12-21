import logging
import os
import asyncio
from typing import List, Dict, Optional
from datetime import datetime
from flask import current_app
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class AIService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize the AI service as a singleton"""
        if self._initialized:
            return

        self.api_key = current_app.config.get("OPENAI_API_KEY") or os.getenv(
            "OPENAI_API_KEY"
        )
        if not self.api_key:
            logger.error("OpenAI API key not found")
            raise ValueError("OpenAI API key not found")

        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
            # do not change this unless explicitly requested by the user
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise

        self._initialized = True

    async def generate_questions(
        self, topic: str, difficulty: str, count: int = 5
    ) -> List[Dict]:
        """Generate NCLEX-style questions"""
        try:
            prompt = {
                "role": "system",
                "content": f"""Generate {count} NCLEX-style {difficulty} questions about {topic}.
                Format as JSON array with objects containing:
                - question: string
                - options: array of 4 strings
                - correct_answer: integer (0-3)
                - explanation: string
                - topic: string
                - difficulty: string""",
            }

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[prompt],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            result = response.choices[0].message.content
            logger.info(f"Generated {count} questions for topic: {topic}")
            return result.get("questions", [])

        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            raise

    async def generate_flashcards(self, topic: str, count: int = 5) -> List[Dict]:
        """Generate flashcards for studying"""
        try:
            prompt = {
                "role": "system",
                "content": f"""Create {count} flashcards for studying {topic}.
                Format as JSON array with objects containing:
                - front: string (question/term)
                - back: string (answer/definition)
                - topic: string
                - category: string""",
            }

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[prompt],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            result = response.choices[0].message.content
            logger.info(f"Generated {count} flashcards for topic: {topic}")
            return result.get("flashcards", [])

        except Exception as e:
            logger.error(f"Error generating flashcards: {str(e)}")
            raise

    async def analyze_study_progress(self, user_data: Dict) -> Dict:
        """Analyze study progress and provide insights"""
        try:
            prompt = {
                "role": "system",
                "content": f"""Analyze this study progress data and provide insights.
                Data: {user_data}
                Format response as JSON with:
                - strengths: array of strings
                - weaknesses: array of strings
                - recommendations: array of strings
                - estimated_proficiency: number (0-100)""",
            }

            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[prompt],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            result = response.choices[0].message.content
            logger.info("Generated study progress analysis")
            return result

        except Exception as e:
            logger.error(f"Error analyzing study progress: {str(e)}")
            raise
