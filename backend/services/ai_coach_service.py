import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

from openai import OpenAI


class AICoachService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.logger = logging.getLogger(__name__)
        self.active_sessions = {}
        self.context_window = 10

    async def initialize_session(
        self, user_id: str, session_id: Optional[str] = None
    ) -> Dict:
        try:
            user_context = await self._get_user_context(user_id)
            welcome_message = await self._generate_welcome_message(user_context)
            session_id = (
                session_id or f"coach_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            self.active_sessions[session_id] = {
                "messages": [],
                "context": user_context,
                "start_time": datetime.now().isoformat(),
            }
            return {
                "session_id": session_id,
                "welcome_message": welcome_message,
                "initial_context": user_context,
            }
        except Exception as e:
            self.logger.error(f"Session initialization error: {str(e)}")
            raise

    async def generate_response(
        self, user_id: str, message: str, context: Optional[Dict] = None
    ) -> Dict:
        try:
            conversation_context = self._prepare_conversation_context(context)
            response = await self.client.chat.create(
                model="text-davinci-002",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert NCLEX tutor and coach. Provide clear, accurate explanations and strategic study advice.",
                    },
                    *conversation_context,
                    {"role": "user", "content": message},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            ai_message = response.choices[0].message.content
            metadata = await self._generate_response_metadata(
                message, ai_message, context
            )
            return {
                "response": ai_message,
                "metadata": metadata,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            self.logger.error(f"Response generation error: {str(e)}")
            raise

    async def _generate_welcome_message(self, context: Dict) -> str:
        try:
            prompt = f"""Generate a welcoming message for an NCLEX study session.
            Student Level: {context.get('level', 'beginner')}
            Recent Topics: {', '.join(context.get('recent_topics', []))}
            Areas for Improvement: {', '.join(context.get('weak_areas', []))}
            """
            response = await self.client.chat.create(
                model="text-davinci-002",
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a welcoming and encouraging message for an NCLEX student.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=200,
            )
            return response.choices[0].message.content
        except Exception as e:
            self.logger.error(f"Welcome message generation error: {str(e)}")
            return "Welcome to your NCLEX study session. Let's work together to improve your understanding."

    @staticmethod
    async def _get_user_context(user_id: str) -> Dict:
        return {
            "level": "intermediate",
            "recent_topics": ["Pharmacology", "Patient Care"],
            "weak_areas": ["Critical Thinking", "Prioritization"],
            "study_preferences": {
                "session_length": 25,
                "preferred_topics": ["Medical-Surgical", "Pediatrics"],
            },
        }

    @staticmethod
    def _prepare_conversation_context(context: Optional[Dict]) -> List[Dict]:
        if not context:
            return []
        return [
            {
                "role": "system",
                "content": f"""Current session context:
                Topic: {context.get('current_topic', 'General')}
                Recent Performance: {context.get('performance', 'N/A')}
                Focus Areas: {', '.join(context.get('focus_areas', []))}
                """,
            }
        ]

    async def _generate_response_metadata(
        self, user_message: str, ai_message: str, context: Optional[Dict]
    ) -> Dict:
        try:
            analysis_prompt = f"""Analyze this NCLEX coaching interaction:
            Student: {user_message}
            Coach: {ai_message}
            
            Provide:
            1. Main topics covered
            2. Key learning points
            3. Suggested follow-up questions
            """
            analysis = await self.client.chat.create(
                model="text-davinci-002",
                messages=[
                    {
                        "role": "system",
                        "content": "Analyze NCLEX coaching interactions.",
                    },
                    {"role": "user", "content": analysis_prompt},
                ],
                temperature=0.3,
                max_tokens=300,
            )
            analysis_text = analysis.choices[0].message.content
            return {
                "topics": self._extract_topics(analysis_text),
                "learning_points": self._extract_learning_points(analysis_text),
                "suggestions": self._extract_suggestions(analysis_text),
                "confidence": 0.85,
            }
        except Exception as e:
            self.logger.error(f"Metadata generation error: {str(e)}")
            return {}

    @staticmethod
    def _extract_topics(analysis: str) -> List[str]:
        return ["Pharmacology", "Patient Care"]

    @staticmethod
    def _extract_learning_points(analysis: str) -> List[str]:
        return ["Medication administration", "Patient safety"]

    @staticmethod
    def _extract_suggestions(analysis: str) -> List[str]:
        return ["Review medication calculations", "Practice prioritization scenarios"]
