"""Database models for analytics."""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

db = SQLAlchemy()

class StudySession(db.Model):
    """Model for tracking study sessions."""
    __tablename__ = 'study_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)
    duration = db.Column(db.Integer, nullable=False)  # Duration in seconds
    category = db.Column(db.String(100))
    topics_covered = db.Column(JSONB)  # List of topics covered in session
    performance_metrics = db.Column(JSONB)  # Session-specific metrics
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)

    def __repr__(self):
        return f'<StudySession {self.id} user={self.user_id}>'

    def to_dict(self):
        """Convert session to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'duration': self.duration,
            'category': self.category,
            'topics_covered': self.topics_covered,
            'performance_metrics': self.performance_metrics,
            'created_at': self.created_at.isoformat(),
            'ended_at': self.ended_at.isoformat() if self.ended_at else None
        }

class QuestionAttempt(db.Model):
    """Model for tracking question attempts."""
    __tablename__ = 'question_attempts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey('study_sessions.id'))
    category = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    time_taken = db.Column(db.Integer)  # Time taken in seconds
    confidence_level = db.Column(db.Integer)  # 1-5 scale
    answer_changes = db.Column(db.Integer, default=0)  # Number of times answer was changed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    question_metadata = db.Column(JSONB)  # Additional question metadata

    def __repr__(self):
        return f'<QuestionAttempt {self.id} user={self.user_id} correct={self.is_correct}>'

    def to_dict(self):
        """Convert attempt to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'category': self.category,
            'topic': self.topic,
            'difficulty': self.difficulty,
            'is_correct': self.is_correct,
            'time_taken': self.time_taken,
            'confidence_level': self.confidence_level,
            'answer_changes': self.answer_changes,
            'created_at': self.created_at.isoformat(),
            'question_metadata': self.question_metadata
        }

class UserProgress(db.Model):
    """Model for tracking user progress."""
    __tablename__ = 'user_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, unique=True)
    total_study_time = db.Column(db.Integer, default=0)  # Total study time in seconds
    questions_attempted = db.Column(db.Integer, default=0)
    correct_answers = db.Column(db.Integer, default=0)
    category_progress = db.Column(JSONB)  # Progress by category
    topic_mastery = db.Column(JSONB)  # Mastery level by topic
    study_streak = db.Column(db.Integer, default=0)  # Consecutive days studied
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    learning_pace = db.Column(db.String(20))  # slow, medium, fast
    preferred_topics = db.Column(JSONB)  # List of topics user performs well in
    areas_for_improvement = db.Column(JSONB)  # Topics needing more focus
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<UserProgress {self.user_id} attempted={self.questions_attempted}>'

    def to_dict(self):
        """Convert progress to dictionary."""
        return {
            'user_id': self.user_id,
            'total_study_time': self.total_study_time,
            'questions_attempted': self.questions_attempted,
            'correct_answers': self.correct_answers,
            'category_progress': self.category_progress,
            'topic_mastery': self.topic_mastery,
            'study_streak': self.study_streak,
            'learning_pace': self.learning_pace,
            'preferred_topics': self.preferred_topics,
            'areas_for_improvement': self.areas_for_improvement,
            'last_active': self.last_active.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
