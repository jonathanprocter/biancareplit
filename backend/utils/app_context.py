"""Application context management for Flask."""

from flask import Flask, current_app
from contextlib import contextmanager
from typing import Optional, Generator, Any, Dict, Tuple
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


class ApplicationContextManager:
    """Manages Flask application contexts and database sessions."""

    def __init__(self, app: Flask):
        self.app = app
        self.initialized = False

    def initialize(self) -> bool:
        """Initialize the application context manager."""
        if self.initialized:
            return True

        try:
            # Verify database connection
            with self.app_context():
                with self.db_session_context() as session:
                    session.execute(text("SELECT 1"))
                    logger.info("Database connection verified")

            self.initialized = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize application context: {str(e)}")
            return False

    @contextmanager
    def app_context(self) -> Generator[Flask, None, None]:
        """Provide a transactional scope around a series of operations."""
        with self.app.app_context() as ctx:
            try:
                yield self.app
            except Exception as e:
                logger.error(f"Error in application context: {str(e)}")
                raise

    @contextmanager
    def db_session_context(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around database operations."""
        if not hasattr(current_app, "db"):
            raise RuntimeError("Database not initialized on application")

        session = current_app.db.session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Error in database session: {str(e)}")
            raise
        finally:
            session.close()


class SystemVerification:
    """System verification utilities."""

    def __init__(self, context_manager: ApplicationContextManager):
        self.context_manager = context_manager

    def verify_system(self) -> Dict[str, bool]:
        """Verify the system state."""
        results = {
            "app_initialized": False,
            "db_connected": False,
            "migrations_exist": False,
        }

        try:
            # Verify app initialization
            results["app_initialized"] = self.context_manager.initialized

            # Verify database connection
            with self.context_manager.app_context():
                with self.context_manager.db_session_context() as session:
                    session.execute(text("SELECT 1"))
                    results["db_connected"] = True

            # Check migrations directory
            from flask_migrate import Migrate

            if (
                hasattr(current_app, "extensions")
                and "migrate" in current_app.extensions
            ):
                results["migrations_exist"] = True

            return results
        except Exception as e:
            logger.error(f"System verification failed: {str(e)}")
            return results


def create_app() -> Tuple[Flask, ApplicationContextManager]:
    """Create and configure the Flask application."""
    from backend.config.config_manager import config_manager

    try:
        app = Flask(__name__)

        # Initialize configuration
        if not config_manager.is_initialized():
            config_manager.initialize_config()

        # Configure application
        config = config_manager.get_config()
        app.config.update(config)

        # Initialize context manager
        context_manager = ApplicationContextManager(app)
        if not context_manager.initialize():
            raise RuntimeError("Failed to initialize application context")

        return app, context_manager
    except Exception as e:
        logger.error(f"Failed to create application: {str(e)}")
        raise
