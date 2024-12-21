"""Database module for the NCLEX coaching platform."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from contextlib import contextmanager
from datetime import datetime
from enum import Enum
import logging

# Initialize SQLAlchemy and Migrate instances
db = SQLAlchemy()
migrate = Migrate()
logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self, app=None):
        self.app = app
        self.db = db  # Expose SQLAlchemy instance
        self.logger = logging.getLogger("DatabaseManager")
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize database with application"""
        try:
            self.db.init_app(app)
            migrate.init_app(app, self.db)
            self.app = app
            self.logger.info("Database initialized successfully")
        except Exception as e:
            self.logger.error(f"Database initialization failed: {str(e)}")
            raise

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around a series of operations."""
        session = db.session
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            self.logger.error(f"Session error: {str(e)}")
            raise
        finally:
            session.close()

    def reset_migrations(self):
        """Reset migration repository"""
        try:
            with self.app.app_context():
                db.drop_all()
                db.create_all()
                self.logger.info("Migrations reset successfully")
            return True
        except Exception as e:
            self.logger.error(f"Migration reset failed: {str(e)}")
            return False


# Enums
class ContentType(str, Enum):
    """Types of content available in the platform."""

    QUIZ = "QUIZ"
    CASE_STUDY = "CASE_STUDY"
    FLASHCARD = "FLASHCARD"


class SubjectCategory(str, Enum):
    """Nursing subject categories."""

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
    """Content difficulty levels."""

    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


def init_db(app):
    """Initialize the database with the Flask app context."""
    try:
        db.init_app(app)
        migrate.init_app(app, db)
        logger.info("Database and migrations initialized successfully")

        with app.app_context():
            # Create tables if they don't exist
            db.create_all()
            logger.info("Database tables created successfully")

        return db
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise


# Models
class BaseModel(db.Model):
    """Base model with common fields."""

    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Content(BaseModel):
    """Content model for storing all types of study materials."""

    __tablename__ = "content"

    type = db.Column(db.Enum(ContentType), nullable=False)
    category = db.Column(db.Enum(SubjectCategory), nullable=False)
    difficulty = db.Column(db.Enum(DifficultyLevel), nullable=False)
    question = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON)
    correct = db.Column(db.Integer)
    rationale = db.Column(db.Text)
    keywords = db.Column(db.JSON)
    clinical_scenario = db.Column(db.Text)
    nursing_interventions = db.Column(db.JSON)
    expected_outcomes = db.Column(db.JSON)

    def to_dict(self):
        """Convert model to dictionary representation."""
        return {
            "id": self.id,
            "type": self.type.value,
            "category": self.category.value,
            "difficulty": self.difficulty.value,
            "question": self.question,
            "options": self.options,
            "rationale": self.rationale,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
