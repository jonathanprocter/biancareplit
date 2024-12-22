from datetime import datetime
from typing import Dict, Any, List
import logging
from extensions import db

class NCLEXAnalytics(db.Model):
    __tablename__ = "nclex_analytics"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    analysis_type = db.Column(
        db.String(50), nullable=False
    )  # 'performance', 'coverage', 'prediction'
    analysis_data = db.Column(db.JSON, nullable=False)
    topic_performance = db.Column(db.JSON, default=dict)
    difficulty_distribution = db.Column(db.JSON, default=dict)
    learning_patterns = db.Column(db.JSON, default=dict)
    adaptive_recommendations = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def predict_nclex_performance(self, topic_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict NCLEX performance for specific topics"""
        try:
            # Calculate topic-specific prediction
            correct_ratio = topic_data.get("correct_answers", 0) / max(
                topic_data.get("total_attempts", 1), 1
            )
            difficulty_factor = topic_data.get("avg_difficulty", 1)
            consistency_score = topic_data.get("consistency_score", 0.5)

            # Weighted prediction calculation
            base_score = correct_ratio * 0.6 + consistency_score * 0.4
            adjusted_score = base_score * (1 + (difficulty_factor - 1) * 0.1)

            # Calculate confidence interval
            confidence_factor = min(topic_data.get("total_attempts", 0) / 10, 1)

            return {
                "predicted_score": round(adjusted_score * 100, 2),
                "confidence_level": round(confidence_factor * 100, 2),
                "improvement_needed": adjusted_score < 0.65,
                "recommended_focus_areas": self.get_focus_areas(topic_data),
                "topic_mastery_level": self.calculate_mastery_level(adjusted_score),
            }
        except Exception as e:
            logging.error(f"Error in prediction calculation: {str(e)}")
            return {"error": "Failed to calculate prediction"}

    def calculate_mastery_level(self, score: float) -> str:
        """Calculate mastery level based on score"""
        if score >= 0.85:
            return "Advanced"
        elif score >= 0.65:
            return "Proficient"
        elif score >= 0.45:
            return "Developing"
        return "Needs Improvement"

    def get_focus_areas(self, topic_data: Dict[str, Any]) -> List[str]:
        """Get areas that need focus based on performance"""
        weak_areas = []
        for subtopic, stats in topic_data.get("subtopic_stats", {}).items():
            if stats.get("success_rate", 0) < 0.65:
                weak_areas.append(subtopic)
        return weak_areas

    def to_dict(self) -> Dict[str, Any]:
        """Convert analytics to dictionary representation"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "analysis_type": self.analysis_type,
            "analysis_data": self.analysis_data,
            "topic_performance": self.topic_performance,
            "difficulty_distribution": self.difficulty_distribution,
            "learning_patterns": self.learning_patterns,
            "adaptive_recommendations": self.adaptive_recommendations,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def store_analysis(user_id: int, analysis_type: str, analysis_data: dict):
        """Store analysis results in the database"""
        analytics = NCLEXAnalytics(
            user_id=user_id, analysis_type=analysis_type, analysis_data=analysis_data
        )
        db.session.add(analytics)
        db.session.commit()
        return analytics
