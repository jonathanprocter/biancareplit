from datetime import datetime
from app import db
from typing import Dict, Any, Optional
from sqlalchemy.dialects.postgresql import JSONB

class AdaptivePattern(db.Model):
    __tablename__ = "adaptive_patterns"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    total_questions = db.Column(db.Integer, default=0)
    correct_answers = db.Column(db.Integer, default=0)
    total_time = db.Column(db.Float, default=0.0)  # Total time spent in seconds
    avg_time_per_question = db.Column(db.Float)
    accuracy_rate = db.Column(db.Float)
    learning_style_weights = db.Column(JSONB)  # Store learning style preferences
    difficulty_preference = db.Column(db.String(20))
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    pattern_metadata = db.Column(JSONB)  # Store additional pattern data

    def update_metrics(self, time_spent: float, is_correct: bool) -> None:
        """Update pattern metrics after each question attempt"""
        self.total_questions += 1
        self.total_time += time_spent
        if is_correct:
            self.correct_answers += 1

        # Update averages
        self.avg_time_per_question = self.total_time / self.total_questions
        self.accuracy_rate = (self.correct_answers / self.total_questions) * 100
        self.last_activity = datetime.utcnow()

    def get_recommended_difficulty(self) -> str:
        """Get recommended difficulty level based on performance"""
        if not self.accuracy_rate:
            return "BEGINNER"
        if self.accuracy_rate >= 80:
            return "ADVANCED"
        if self.accuracy_rate >= 60:
            return "INTERMEDIATE"
        return "BEGINNER"

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'accuracy_rate': round(self.accuracy_rate, 2) if self.accuracy_rate else 0,
            'avg_time_per_question': round(self.avg_time_per_question, 2) if self.avg_time_per_question else 0,
            'total_questions': self.total_questions,
            'learning_style_weights': self.learning_style_weights,
            'difficulty_preference': self.difficulty_preference,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }

    def __repr__(self) -> str:
        return f'<AdaptivePattern {self.id}: {self.category} - {self.accuracy_rate:.1f}% accuracy>'
