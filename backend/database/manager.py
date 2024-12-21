"""Database management module."""

from contextlib import contextmanager
import logging
from flask import current_app
from .extensions import db

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database management and utilities"""

    @staticmethod
    def verify_connection():
        """Verify database connection"""
        try:
            # Execute simple query to verify connection
            from sqlalchemy import text

            with current_app.app_context():
                db.session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logging.error(f"Database connection verification failed: {e}")
            raise

    @staticmethod
    def get_connection_status():
        """Get detailed connection status"""
        try:
            with current_app.app_context():
                # Get database info
                result = db.session.execute("SELECT version();")
                version = result.scalar()

                # Get connection pool info
                engine = db.engine
                pool_size = engine.pool.size()
                overflow = engine.pool.overflow()

                return {
                    "connected": True,
                    "version": version,
                    "pool_size": pool_size,
                    "overflow": overflow,
                }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    @staticmethod
    @contextmanager
    def session_scope():
        """Provide a transactional scope around a series of operations."""
        session = db.session
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            session.close()

    @staticmethod
    def reset_db(app):
        """Reset database - use with caution."""
        try:
            with app.app_context():
                db.drop_all()
                db.create_all()
                logger.info("Database reset successfully")
            return True
        except Exception as e:
            logger.error(f"Database reset failed: {e}")
            return False
