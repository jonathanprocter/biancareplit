"""Database configuration and connection management."""

from pathlib import Path
import os
import logging
from typing import Dict, Any, Optional
from contextlib import contextmanager
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

logger = logging.getLogger(__name__)

# Initialize SQLAlchemy
db = SQLAlchemy()
migrate = Migrate()


class DatabaseManager:
    """Database configuration and connection management."""

    def __init__(self):
        """Initialize database manager."""
        self._initialized = False
        self._engine = None

    def init_app(self, app: Flask) -> None:
        """Initialize database with Flask application."""
        try:
            if self._initialized:
                logger.info("Database already initialized")
                return

            # Get database URL from environment
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable not set")

            # Handle Heroku-style postgres:// URLs
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            # Configure SQLAlchemy
            app.config["SQLALCHEMY_DATABASE_URI"] = database_url
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                "pool_recycle": 300,
                "pool_pre_ping": True,
            }

            # Initialize SQLAlchemy with app
            db.init_app(app)
            migrate.init_app(app, db)

            with app.app_context():
                # Verify database connection
                db.create_all()

            self._initialized = True
            logger.info("Database initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise

    @staticmethod
    def check_connection() -> bool:
        """Check database connection health."""
        try:
            db.session.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database connection check failed: {str(e)}")
            return False

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around a series of operations."""
        session = db.session
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {str(e)}")
            raise
        finally:
            session.close()


# Create singleton instance
db_manager = DatabaseManager()
