"""Core database initialization and configuration."""

import logging
import os
from typing import Optional, Dict, Any
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError, OperationalError, ProgrammingError
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()

class DatabaseError(Exception):
    """Base exception for database-related errors."""
    pass

class ConnectionError(DatabaseError):
    """Exception raised for database connection issues."""
    pass

class DatabaseManager:
    """Database manager with robust error handling and connection management."""

    _instance = None
    _initialized = False

    def __new__(cls) -> 'DatabaseManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def init_app(self, app: Flask) -> bool:
        """Initialize database with comprehensive error handling."""
        if self._initialized:
            logger.info("Database manager already initialized")
            return True

        try:
            # Get database URL with proper error handling
            database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
            if not database_url:
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise ConnectionError("DATABASE_URL environment variable must be set")
                logger.info("Using DATABASE_URL from environment")

            # Handle postgres URL format
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            # Configure SQLAlchemy
            app.config.update({
                "SQLALCHEMY_DATABASE_URI": database_url,
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "SQLALCHEMY_ENGINE_OPTIONS": {
                    "pool_pre_ping": True,
                    "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                    "pool_recycle": 300
                }
            })

            # Initialize SQLAlchemy
            db.init_app(app)
            logger.info("SQLAlchemy initialized")

            # Initialize migrations
            migrate.init_app(app, db)
            logger.info("Migrations initialized")

            # Test database connection
            with app.app_context():
                db.session.execute(text('SELECT 1'))
                db.session.commit()
                logger.info("Database connection verified")

                # Create tables in development mode
                if app.config.get('FLASK_ENV') == 'development':
                    db.create_all()
                    logger.info("Database tables created in development mode")

            self._initialized = True
            return True

        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            return False

    @property
    def session(self):
        """Get current database session."""
        if not self._initialized:
            raise DatabaseError("Database manager not initialized")
        return db.session

    @contextmanager
    def session_scope(self):
        """Provide transactional scope."""
        session = self.session
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {str(e)}")
            raise
        finally:
            session.close()

    def verify_connection(self, app: Flask) -> bool:
        """Verify database connection."""
        try:
            with app.app_context():
                db.session.execute(text('SELECT 1'))
                db.session.commit()
                return True
        except Exception as e:
            logger.error(f"Connection verification failed: {str(e)}")
            return False

    def get_connection_info(self, app: Flask) -> Dict[str, Any]:
        """Get database connection information."""
        try:
            with app.app_context():
                engine = db.engine
                pool = engine.pool
                return {
                    "database_url": str(engine.url).replace(
                        engine.url.password or "", "***"
                    ),
                    "pool_size": pool.size(),
                    "pool_timeout": pool.timeout(),
                    "pool_connections": pool.status()
                }
        except Exception as e:
            logger.error(f"Failed to get connection info: {str(e)}")
            return {"error": str(e)}

    def cleanup(self) -> None:
        """Cleanup database resources."""
        try:
            if hasattr(self, 'session'):
                self.session.remove()
            self._initialized = False
            logger.info("Database cleanup completed")
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")

# Create singleton instance
db_manager = DatabaseManager()

# Export for use in other modules
__all__ = ['db', 'migrate', 'db_manager']