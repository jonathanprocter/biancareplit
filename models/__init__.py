from datetime import datetime
from enum import Enum

from flask_sqlalchemy import SQLAlchemy

from .adaptive_pattern import AdaptivePattern
from .content import Content
from .review import Review
from .study_material import StudyMaterial

# Initialize SQLAlchemy
db = SQLAlchemy()


# Define enums first to avoid circular imports
class SubjectCategory(str, Enum):
    PHARMACOLOGY = "PHARMACOLOGY"
    MEDICAL_SURGICAL = "MEDICAL_SURGICAL"
    PEDIATRIC = "PEDIATRIC"
    MATERNAL_NEWBORN = "MATERNAL_NEWBORN"
    MENTAL_HEALTH = "MENTAL_HEALTH"
    COMMUNITY_HEALTH = "COMMUNITY_HEALTH"
    LEADERSHIP = "LEADERSHIP"
    CRITICAL_CARE = "CRITICAL_CARE"
    EMERGENCY = "EMERGENCY"


class DifficultyLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


class ContentType(str, Enum):
    QUIZ = "QUIZ"
    FLASHCARD = "FLASHCARD"
    CASE_STUDY = "CASE_STUDY"
    PRACTICE_QUESTION = "PRACTICE_QUESTION"
    STUDY_NOTE = "STUDY_NOTE"


# Association tables
study_material_questions = db.Table(
    "study_material_questions",
    db.Column(
        "study_material_id",
        db.Integer,
        db.ForeignKey("study_material.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    db.Column(
        "content_id",
        db.Integer,
        db.ForeignKey("content.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# Import models after defining base classes and association tables


def init_models():
    """Initialize model relationships and any required setup"""
    Content.study_materials = db.relationship(
        "StudyMaterial",
        secondary=study_material_questions,
        back_populates="content_items",
    )
    StudyMaterial.content_items = db.relationship(
        "Content", secondary=study_material_questions, back_populates="study_materials"
    )


# Define exports
__all__ = [
    "db",
    "ContentType",
    "SubjectCategory",
    "DifficultyLevel",
    "Content",
    "StudyMaterial",
    "Review",
    "AdaptivePattern",
    "study_material_questions",
    "init_models",
]


class Flashcard(db.Model):
    __tablename__ = "flashcard"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    front = db.Column(db.Text, nullable=False)
    back = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.Enum(DifficultyLevel), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_reviewed = db.Column(db.DateTime)
    next_review = db.Column(db.DateTime)
    interval = db.Column(db.Integer, default=1)
    easiness = db.Column(db.Float, default=2.5)
    consecutive_correct = db.Column(db.Integer, default=0)
    clinical_notes = db.Column(db.Text)
    study_material_id = db.Column(db.Integer, db.ForeignKey("study_material.id"))
    category = db.Column(db.Enum(SubjectCategory))
    card_metadata = db.Column(db.JSON, default=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "front": self.front,
            "back": self.back,
            "difficulty": self.difficulty.value if self.difficulty else None,
            "category": self.category.value if self.category else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_reviewed": (
                self.last_reviewed.isoformat() if self.last_reviewed else None
            ),
            "next_review": self.next_review.isoformat() if self.next_review else None,
            "interval": self.interval,
            "easiness": self.easiness,
            "consecutive_correct": self.consecutive_correct,
            "clinical_notes": self.clinical_notes,
            "metadata": self.card_metadata,
        }


class StudyAnalytics(db.Model):
    __tablename__ = "study_analytics"

    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    duration = db.Column(db.Float, nullable=False)
    status = db.Column(db.Integer)
    user_id = db.Column(db.Integer)
    study_session_id = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "path": self.path,
            "method": self.method,
            "duration": self.duration,
            "status": self.status,
            "user_id": self.user_id,
            "study_session_id": self.study_session_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
