"""Database models initialization."""
from datetime import datetime
import logging
from typing import Any, Dict, Optional, Type, TypeVar
from contextlib import contextmanager
from sqlalchemy import Column, Integer, DateTime, JSON, String
from sqlalchemy.orm import Session
from ..core import db

# Setup logging
logger = logging.getLogger(__name__)

T = TypeVar('T', bound='BaseModel')

class BaseModel(db.Model):
    """Abstract base model with common fields and methods"""
    __abstract__ = True

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @classmethod
    @contextmanager
    def safe_session(cls, session: Session):
        """Context manager for safe database operations"""
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database operation failed: {str(e)}")
            raise
        finally:
            session.close()

    @classmethod
    def create(cls: Type[T], session: Session, **kwargs) -> Optional[T]:
        """Create new instance with error handling"""
        try:
            with cls.safe_session(session) as safe_session:
                instance = cls(**kwargs)
                safe_session.add(instance)
                safe_session.flush()
                return instance
        except Exception as e:
            logger.error(f"Failed to create {cls.__name__}: {str(e)}")
            return None

    @classmethod
    def get_by_id(cls: Type[T], session: Session, id: int) -> Optional[T]:
        """Get instance by ID with error handling"""
        try:
            return session.query(cls).filter(cls.id == id).first()
        except Exception as e:
            logger.error(f"Failed to get {cls.__name__} by id: {str(e)}")
            return None

    def update(self, session: Session, **kwargs) -> bool:
        """Update instance with error handling"""
        try:
            with self.safe_session(session) as safe_session:
                for key, value in kwargs.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
                return True
        except Exception as e:
            logger.error(f"Failed to update {self.__class__.__name__}: {str(e)}")
            return False

    def delete(self, session: Session) -> bool:
        """Delete instance with error handling"""
        try:
            with self.safe_session(session) as safe_session:
                safe_session.delete(self)
                return True
        except Exception as e:
            logger.error(f"Failed to delete {self.__class__.__name__}: {str(e)}")
            return False

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result

class AuditLog(BaseModel):
    """Audit log for tracking model changes"""
    __tablename__ = 'audit_logs'

    action = Column(String(50), nullable=False)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    changes = Column(JSON, nullable=True)
    user_id = Column(Integer, nullable=True)

    @classmethod
    def log_change(cls, session: Session, action: str, model: BaseModel, user_id: Optional[int] = None) -> Optional['AuditLog']:
        """Log model changes"""
        try:
            with cls.safe_session(session) as safe_session:
                log = cls(
                    action=action,
                    table_name=model.__tablename__,
                    record_id=model.id,
                    user_id=user_id,
                    changes=model.to_dict()
                )
                safe_session.add(log)
                return log
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            return None

# Only export base classes initially
__all__ = ['BaseModel', 'AuditLog']

# Delayed import of specific models to avoid circular dependencies
def init_models():
    """Initialize all models after database setup"""
    try:
        from .nclex import Question, Answer, Student, Progress
        global __all__
        __all__ = [
            'BaseModel',
            'AuditLog',
            'Question',
            'Answer',
            'Student',
            'Progress'
        ]
    except ImportError as e:
        logger.warning(f"Could not import some models: {str(e)}")
