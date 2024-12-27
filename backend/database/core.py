"""Core database initialization and configuration."""

import logging
import os
from typing import Any, Dict, Optional

from flask import Flask, current_app
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import scoped_session, sessionmaker

logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()


class DatabaseManager:
    """Database manager with robust error handling and connection management."""

    _instance = None
    _initialized = False

    def __new__(cls) -> "DatabaseManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def init_app(self, app: Flask) -> bool:
        """Initialize database with proper configuration."""
        if self._initialized:
            logger.info("Database manager already initialized")
            return True

        try:
            # Initialize SQLAlchemy
            db.init_app(app)
            logger.info("SQLAlchemy initialized successfully")

            # Initialize migrations
            migrate.init_app(app, db)
            logger.info("Migrations initialized successfully")

            # Verify database connection and initialize schema
            with app.app_context():
                try:
                    # Test connection
                    db.session.execute(text("SELECT 1"))
                    db.session.commit()
                    logger.info("Database connection verified successfully")

                    # Create all tables in development mode
                    if app.config.get("ENV") == "development":
                        db.create_all()
                        logger.info("Database tables created successfully")

                    self._initialized = True
                    return True
                except Exception as e:
                    logger.error(f"Database connection verification failed: {str(e)}")
                    if app.debug:
                        logger.exception("Detailed error trace:")
                    return False

        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            return False

    @property
    def session(self):
        """Get current database session."""
        if not self._initialized:
            raise RuntimeError("Database manager not initialized")
        return db.session

    def verify_connection(self, app: Flask) -> bool:
        """Verify database connection."""
        try:
            with app.app_context():
                db.session.execute(text("SELECT 1"))
                db.session.commit()
                return True
        except Exception as e:
            logger.error(f"Connection verification failed: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            return False

    def get_connection_info(self, app: Flask) -> Dict[str, Any]:
        """Get database connection information."""
        try:
            with app.app_context():
                engine = db.engine
                return {
                    "database_url": str(engine.url).replace(
                        engine.url.password or "", "***"
                    ),
                    "pool_size": engine.pool.size(),
                    "pool_timeout": engine.pool.timeout(),
                }
        except Exception as e:
            logger.error(f"Failed to get connection info: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            return {"error": str(e)}

    def cleanup(self) -> None:
        """Cleanup database resources."""
        try:
            if hasattr(self, "session"):
                self.session.remove()
            self._initialized = False
            logger.info("Database cleanup completed")
        except Exception as e:
            logger.error(f"Database cleanup failed: {str(e)}")


# Create singleton instance
db_manager = DatabaseManager()
