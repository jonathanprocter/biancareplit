"""Database middleware for handling database operations and migrations."""

import logging
from typing import Any, Dict, Optional

from flask import Flask, g
from sqlalchemy.exc import SQLAlchemyError

from ..config.unified_config import ConfigurationError, config_manager
from ..database.core import db_manager

logger = logging.getLogger(__name__)


class DatabaseMiddleware:
    """Handles database operations and migrations in middleware layer."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._setup_logging()
        self._app = None
        self._initialized = False

    def _setup_logging(self) -> None:
        """Initialize logging configuration."""
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def init_app(self, app: Flask) -> None:
        """Initialize database middleware with Flask application."""
        if self._initialized:
            self.logger.warning("Database middleware already initialized")
            return

        try:
            self._app = app

            # Get database configuration from unified config
            db_config = config_manager.get("SQLALCHEMY_DATABASE_URI")
            if not db_config:
                db_config = app.config.get("SQLALCHEMY_DATABASE_URI")
                if not db_config:
                    raise ConfigurationError("Database URL not configured")

            # Validate and set database configuration
            self._validate_db_config(db_config)
            app.config["SQLALCHEMY_DATABASE_URI"] = db_config
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

            with app.app_context():
                try:
                    # Initialize database manager
                    if not db_manager.init_app(app):
                        logger.error("Failed to initialize database manager")
                        return

                    # Verify database connection
                    if not db_manager.verify_connection(app):
                        logger.error("Failed to verify database connection")
                        return

                except Exception as e:
                    logger.error(f"Database initialization error: {str(e)}")
                    if app.debug:
                        logger.exception("Detailed error trace:")
                    return

            # Register request handlers
            @app.before_request
            def before_request():
                if not hasattr(g, "db_connections"):
                    g.db_connections = []
                g.db = db_manager.session
                g.db_connections.append(g.db)

            @app.teardown_request
            def teardown_request(exception=None):
                if hasattr(g, "db_connections"):
                    for db_session in g.db_connections:
                        try:
                            if exception:
                                db_session.rollback()
                            db_session.close()
                        except Exception as e:
                            logger.error(f"Error closing database session: {str(e)}")

            # Register error handler for database errors
            @app.errorhandler(SQLAlchemyError)
            def handle_db_error(error):
                self.logger.error(f"Database error occurred: {str(error)}")
                if app.debug:
                    self.logger.exception("Detailed error trace:")
                return {"error": "Database error occurred"}, 500

            self._initialized = True
            self.logger.info("Database middleware initialized successfully")

        except Exception as e:
            self.logger.error(f"Database middleware initialization failed: {str(e)}")
            if hasattr(app, "debug") and app.debug:
                self.logger.exception("Detailed error trace:")
            raise

    def _validate_db_config(self, db_url: str) -> None:
        """Validate database configuration."""
        if not db_url:
            raise ConfigurationError("Database URL cannot be empty")

        if db_url.startswith("sqlite"):
            self.logger.warning("SQLite is not recommended for production use")

    def verify_database_state(self) -> Dict[str, Any]:
        """Verify database and migration state."""
        status = {
            "database_initialized": False,
            "connection_valid": False,
        }

        try:
            if not self._app or not self._initialized:
                return status

            status["database_initialized"] = db_manager.verify_connection(self._app)
            status["connection_valid"] = db_manager.verify_connection(self._app)

            return status

        except Exception as e:
            self.logger.error(f"Database state verification failed: {str(e)}")
            if self._app and self._app.debug:
                self.logger.exception("Detailed error trace:")
            return status

    def cleanup(self) -> None:
        """Cleanup database resources."""
        try:
            if hasattr(g, "db_connections"):
                for db_session in g.db_connections:
                    try:
                        db_session.close()
                    except Exception as e:
                        self.logger.error(
                            f"Error closing database session during cleanup: {str(e)}"
                        )
            self._initialized = False
        except Exception as e:
            self.logger.error(f"Database cleanup failed: {str(e)}")
            if self._app and self._app.debug:
                self.logger.exception("Detailed error trace:")


# Create singleton instance
database_middleware = DatabaseMiddleware()
