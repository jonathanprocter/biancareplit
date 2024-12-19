from contextlib import contextmanager
from .core import db
import logging

logger = logging.getLogger(__name__)

@contextmanager
def transaction():
    """Transaction context manager"""
    try:
        yield
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Transaction error: {str(e)}")
        raise
    finally:
        db.session.remove()

def init_db():
    """Initialize database"""
    db.create_all()

def reset_db():
    """Reset database"""
    db.drop_all()
    db.create_all()

def bulk_save_objects(objects):
    """Efficiently save multiple objects"""
    try:
        db.session.bulk_save_objects(objects)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Bulk save error: {str(e)}")
        raise
