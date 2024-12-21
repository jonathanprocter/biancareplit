from datetime import datetime
from extensions import db
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict


class AdaptivePattern(db.Model):
    """Model for storing adaptive learning patterns"""

    __tablename__ = "adaptive_patterns"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    pattern_type = db.Column(
        db.String(50), nullable=False
    )  # 'response', 'time', 'error'
    pattern_data = db.Column(
        MutableDict.as_mutable(JSONB), nullable=False, default=dict
    )
    topic_mastery = db.Column(MutableDict.as_mutable(JSONB), default=dict)
    difficulty_progression = db.Column(MutableDict.as_mutable(JSONB), default=dict)
    recommended_topics = db.Column(MutableDict.as_mutable(JSONB), default=list)
    learning_path = db.Column(MutableDict.as_mutable(JSONB), default=dict)
    learning_style = db.Column(db.String(50))
    confidence_level = db.Column(db.Float)
    accuracy_rate = db.Column(db.Float)
    time_patterns = db.Column(MutableDict.as_mutable(JSONB), default=dict)
    topic_mastery = db.Column(MutableDict.as_mutable(JSONB), default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pattern_type": self.pattern_type,
            "pattern_data": self.pattern_data,
            "learning_style": self.learning_style,
            "confidence_level": self.confidence_level,
            "accuracy_rate": self.accuracy_rate,
            "time_patterns": self.time_patterns,
            "topic_mastery": self.topic_mastery,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def store_pattern(user_id: int, pattern_type: str, pattern_data: dict):
        """Store pattern analysis results in the database"""
        pattern = AdaptivePattern(
            user_id=user_id, pattern_type=pattern_type, pattern_data=pattern_data
        )
        db.session.add(pattern)
        db.session.commit()
        return pattern

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pattern_type": self.pattern_type,
            "pattern_data": self.pattern_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def store_pattern(user_id: int, pattern_type: str, pattern_data: dict):
        """Store pattern analysis results in the database"""
        pattern = AdaptivePattern(
            user_id=user_id, pattern_type=pattern_type, pattern_data=pattern_data
        )
        db.session.add(pattern)
        db.session.commit()
        return pattern
