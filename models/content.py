from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlalchemy.orm import relationship

from app import db


class ContentType(str, Enum):
    QUIZ = "QUIZ"
    FLASHCARD = "FLASHCARD"
    CASE_STUDY = "CASE_STUDY"
    PRACTICE_QUESTION = "PRACTICE_QUESTION"
    STUDY_NOTE = "STUDY_NOTE"


class DifficultyLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


class Content(db.Model):
    __tablename__ = "content"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    content_type = db.Column(db.Enum(ContentType), nullable=False)
    difficulty = db.Column(db.Enum(DifficultyLevel), nullable=False)
    question = db.Column(db.Text)
    correct_answer = db.Column(db.Text)
    options = db.Column(db.JSON)  # Store answer options as JSON
    explanation = db.Column(db.Text)
    rationale = db.Column(db.Text)
    key_points = db.Column(db.JSON, default=list)
    related_concepts = db.Column(db.JSON, default=list)
    study_resources = db.Column(db.JSON, default=list)
    clinical_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    total_attempts = db.Column(db.Integer, default=0)
    correct_attempts = db.Column(db.Integer, default=0)

    # Relationships
    study_materials = relationship(
        "StudyMaterial",
        secondary="study_material_questions",
        back_populates="content_items",
    )

    def calculate_difficulty(self) -> float:
        """Calculate difficulty based on user performance"""
        if self.total_attempts == 0:
            return 0.5  # Default medium difficulty
        return 1 - (self.correct_attempts / self.total_attempts)

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "content_type": self.content_type.value if self.content_type else None,
            "difficulty": self.difficulty.value if self.difficulty else None,
            "question": self.question,
            "options": self.options,
            "explanation": self.explanation,
            "rationale": self.rationale,
            "key_points": self.key_points,
            "clinical_notes": self.clinical_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "total_attempts": self.total_attempts,
            "success_rate": (
                (self.correct_attempts / self.total_attempts * 100)
                if self.total_attempts > 0
                else 0
            ),
        }

    def __repr__(self) -> str:
        return f"<Content {self.id}: {self.title[:30]}...>"
