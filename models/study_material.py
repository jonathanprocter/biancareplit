from datetime import datetime, date
from extensions import db
from . import SubjectCategory, DifficultyLevel
from sqlalchemy.dialects.postgresql import JSONB

class StudyMaterial(db.Model):
    __tablename__ = 'study_material'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.Enum(SubjectCategory), nullable=False)
    difficulty = db.Column(db.Enum(DifficultyLevel), nullable=False)
    study_date = db.Column(db.Date, nullable=False, default=date.today)
    duration = db.Column(db.Integer, nullable=False, server_default='0')
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # Enhanced metadata fields using JSONB for better performance
    keywords = db.Column(JSONB, nullable=False, default=list)
    attachments = db.Column(JSONB, nullable=False, default=list)
    learning_objectives = db.Column(JSONB, nullable=False, default=list)
    config = db.Column(JSONB, nullable=False, default=dict)  # Configuration management
    
    # Study progress fields
    completed = db.Column(db.Boolean, default=False)
    cards_reviewed = db.Column(db.Integer, default=0)
    correct_answers = db.Column(db.Integer, default=0)
    last_update = db.Column(db.DateTime)
    
    # Relationships
    flashcards = db.relationship('Flashcard', backref='study_material', lazy='dynamic',
                               cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super(StudyMaterial, self).__init__(**kwargs)
        if 'config' not in kwargs:
            self.config = {
                'version': '1.0',
                'spaced_repetition_enabled': True,
                'auto_generate_flashcards': True,
                'difficulty_adjustment': True,
                'analytics_tracking': True
            }
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'category': self.category.value if self.category else None,
            'difficulty': self.difficulty.value if self.difficulty else None,
            'study_date': self.study_date.isoformat() if self.study_date else None,
            'duration': self.duration,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'keywords': self.keywords,
            'learning_objectives': self.learning_objectives,
            'config': self.config,
            'completed': self.completed,
            'cards_reviewed': self.cards_reviewed,
            'correct_answers': self.correct_answers,
            'last_update': self.last_update.isoformat() if self.last_update else None
        }

    def update_config(self, new_config):
        """Update configuration while preserving existing values"""
        self.config = {**self.config, **new_config}
