import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import Dict, List
from models.adaptive_learning import AdaptivePattern
from services.ai_service import AIService


class AdaptiveLearningService:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        self.scaler = StandardScaler()
        self.initialized = False

    async def initialize(self):
        if not self.initialized:
            await self.ai_service.initialize()
            self.initialized = True

    async def ensure_initialized(self):
        if not self.initialized:
            await self.initialize()

    async def generate_adaptive_content(
        self, user_id: int, performance_history: List[Dict]
    ) -> Dict:
        # Analyze performance patterns
        performance_metrics = self._calculate_metrics(performance_history)

        # Determine optimal difficulty
        difficulty = self._determine_difficulty(performance_metrics)

        # Generate appropriate content
        content = await self.ai_service.generate_questions(
            topic=performance_metrics["weak_areas"][0], difficulty=difficulty, count=5
        )

        return {
            "content": content,
            "difficulty": difficulty,
            "metrics": performance_metrics,
        }

    def _calculate_metrics(self, history: List[Dict]) -> Dict:
        if not history:
            return {"level": "beginner", "weak_areas": ["fundamentals"]}

        scores = np.array([h["score"] for h in history])
        return {
            "average": float(np.mean(scores)),
            "trend": float(np.polyfit(range(len(scores)), scores, 1)[0]),
            "weak_areas": self._identify_weak_areas(history),
            "level": self._determine_level(scores),
        }

    def _determine_difficulty(self, metrics: Dict) -> str:
        if metrics["average"] > 0.8:
            return "advanced"
        if metrics["average"] > 0.6:
            return "intermediate"
        return "beginner"
