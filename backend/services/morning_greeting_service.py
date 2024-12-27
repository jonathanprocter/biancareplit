from typing import Dict, Any
from datetime import datetime
from threading import Lock


class MorningGreetingService:
    def __init__(self):
        self.cache = {}
        self.lock = Lock()

    async def generate_morning_greeting(self, user_id: str) -> Dict[str, Any]:
        with self.lock:
            if user_id in self.cache:
                return self.cache[user_id]

            greeting = {
                "date": datetime.now().isoformat(),
                "performance": {
                    "correct_answers": 85,
                    "total_questions": 100,
                    "study_time": "2.5 hours",
                },
                "ai_coach_interactions": 5,
                "nclex_predictions": {
                    "overall": 0.85,
                    "by_topic": {"pharmacology": 0.82, "medical_surgical": 0.88},
                },
            }

            self.cache[user_id] = greeting
            return greeting
