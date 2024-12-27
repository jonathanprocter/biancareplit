from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np
from sqlalchemy.dialects.postgresql import JSON
from transformers import GPT2LMHeadModel, GPT2Tokenizer

from extensions import db


@dataclass
class ContentParameters:
    """Defines the parameters for content generation"""

    difficulty_level: float
    cognitive_level: str
    focus_topics: List[str]
    learning_style: str
    content_type: str
    time_allocation: int


class AdaptiveContent(db.Model):
    __tablename__ = "adaptive_content"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    content_type = db.Column(
        db.String(50), nullable=False
    )  # 'question', 'explanation', 'example'
    content_data = db.Column(JSON, nullable=False)
    parameters = db.Column(JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def store_content(
        user_id: int, content_type: str, content_data: dict, parameters: dict
    ):
        content = AdaptiveContent(
            user_id=user_id,
            content_type=content_type,
            content_data=content_data,
            parameters=parameters,
        )
        db.session.add(content)
        db.session.commit()
        return content


class AdaptiveContentGenerator:
    def __init__(self, model_path: str = "gpt2"):
        self.model = GPT2LMHeadModel.from_pretrained(model_path)
        self.tokenizer = GPT2Tokenizer.from_pretrained(model_path)

    def generate_adaptive_content(
        self, student_profile: Dict, learning_patterns: Dict, performance_data: Dict
    ) -> Dict:
        """Generate personalized content adapted to student's needs"""
        content_params = self._determine_content_parameters(
            student_profile, learning_patterns, performance_data
        )

        base_content = self._generate_base_content(content_params)
        optimized_content = self._optimize_content_presentation(
            base_content, learning_patterns["learning_style"]
        )

        return {
            "content": optimized_content,
            "parameters": content_params,
            "recommendations": self._generate_usage_recommendations(content_params),
        }

    def _determine_content_parameters(
        self, profile: Dict, patterns: Dict, performance: Dict
    ) -> ContentParameters:
        """Determine optimal content parameters based on student data"""
        difficulty = self._calculate_optimal_difficulty(performance)
        cognitive_level = self._determine_cognitive_level(
            performance.get("cognitive_assessments", []),
            patterns.get("comprehension_depth", 0.7),
        )

        return ContentParameters(
            difficulty_level=difficulty,
            cognitive_level=cognitive_level,
            focus_topics=self._identify_focus_topics(performance, patterns),
            learning_style=patterns.get("learning_style", "visual"),
            content_type=self._select_content_type(patterns),
            time_allocation=self._calculate_optimal_time(patterns),
        )

    def _generate_base_content(self, params: ContentParameters) -> Dict:
        """Generate initial content based on parameters"""
        prompt = self._create_content_prompt(params)
        inputs = self.tokenizer(prompt, return_tensors="pt")

        outputs = self.model.generate(
            **inputs, max_length=200, num_return_sequences=1, temperature=0.7
        )

        content = self.tokenizer.decode(outputs[0])
        return {
            "text": content,
            "type": params.content_type,
            "difficulty": params.difficulty_level,
            "cognitive_level": params.cognitive_level,
        }

    def _optimize_content_presentation(
        self, content: Dict, learning_style: str
    ) -> Dict:
        """Optimize content presentation based on learning style"""
        optimized = content.copy()

        if learning_style == "visual":
            optimized = self._add_visual_elements(optimized)
        elif learning_style == "verbal":
            optimized = self._enhance_verbal_explanations(optimized)
        elif learning_style == "kinesthetic":
            optimized = self._add_interactive_elements(optimized)

        return optimized

    @staticmethod
    def _calculate_optimal_difficulty(performance: Dict) -> float:
        """Calculate optimal difficulty level based on performance"""
        base_difficulty = performance.get("average_score", 0.7)
        recent_trend = performance.get("improvement_trend", 0.0)
        return min(1.0, max(0.1, base_difficulty + recent_trend * 0.2))

    @staticmethod
    def _determine_cognitive_level(assessments: List, comprehension: float) -> str:
        """Determine appropriate cognitive level"""
        if comprehension > 0.8:
            return "analysis"
        if comprehension > 0.6:
            return "application"
        return "comprehension"

    @staticmethod
    def _identify_focus_topics(performance: Dict, patterns: Dict) -> List[str]:
        """Identify topics that need focus"""
        weak_areas = performance.get("weak_areas", [])
        gaps = patterns.get("learning_gaps", [])
        return list(set(weak_areas + gaps))

    @staticmethod
    def _select_content_type(patterns: Dict) -> str:
        """Select appropriate content type based on patterns"""
        effectiveness = patterns.get("content_effectiveness", {})
        return max(effectiveness.items(), key=lambda x: x[1])[0]

    @staticmethod
    def _calculate_optimal_time(patterns: Dict) -> int:
        """Calculate optimal time allocation"""
        attention_span = patterns.get("attention_span", 30)
        return max(15, min(60, attention_span))

    @staticmethod
    def _create_content_prompt(params: ContentParameters) -> str:
        """Create prompt for content generation"""
        return (
            f"Generate a {params.content_type} about {', '.join(params.focus_topics)} "
            f"at {params.difficulty_level} difficulty level for {params.cognitive_level} "
            f"cognitive level, optimized for {params.learning_style} learning style."
        )

    @staticmethod
    def _add_visual_elements(content: Dict) -> Dict:
        """Add visual elements to content"""
        content["visual_aids"] = True
        return content

    @staticmethod
    def _enhance_verbal_explanations(content: Dict) -> Dict:
        """Enhance verbal explanations"""
        content["enhanced_explanations"] = True
        return content

    @staticmethod
    def _add_interactive_elements(content: Dict) -> Dict:
        """Add interactive elements"""
        content["interactive_elements"] = True
        return content

    def _generate_usage_recommendations(self, params: ContentParameters) -> Dict:
        """Generate recommendations for content usage"""
        return {
            "study_duration": params.time_allocation,
            "review_frequency": self._calculate_review_frequency(params),
            "practice_suggestions": self._generate_practice_suggestions(params),
        }

    @staticmethod
    def _calculate_review_frequency(params: ContentParameters) -> int:
        """Calculate optimal review frequency"""
        return max(1, min(7, int(10 - params.difficulty_level * 5)))

    @staticmethod
    def _generate_practice_suggestions(params: ContentParameters) -> List[str]:
        """Generate practice suggestions"""
        return [
            f"Focus on {topic} for {params.time_allocation} minutes"
            for topic in params.focus_topics
        ]
