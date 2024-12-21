from datetime import datetime
from app import db
from . import SubjectCategory, DifficultyLevel


class Flashcard(db.Model):
    __tablename__ = "flashcard"

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
    topic_tags = db.Column(db.JSON, default=list)
    subtopic_tags = db.Column(db.JSON, default=list)
    nclex_category = db.Column(db.String(100))
    difficulty_metrics = db.Column(db.JSON, default=dict)
    answer_stats = db.Column(db.JSON, default=dict)

    # Relationship with StudyMaterial
    study_material = db.relationship("StudyMaterial", back_populates="flashcards")

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
