"""Database middleware for handling database operations and migrations."""

import logging
from typing import Dict, Any, Optional
from flask import Flask, g, request
from sqlalchemy.exc import SQLAlchemyError
from ..database.core import db_manager
from ..database.migration_manager import MigrationManager
from ..config.unified_config import config_manager, ConfigurationError

logger = logging.getLogger(__name__)

class DatabaseMiddleware:
    """Handles database operations and migrations in middleware layer."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._setup_logging()
        self.migration_manager = None
        self._app = None

    def _setup_logging(self) -> None:
        """Initialize logging configuration."""
        self.logger.setLevel(logging.INFO)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

    def init_app(self, app: Flask) -> None:
        """Initialize database middleware with Flask application."""
        try:
            self._app = app

            # Get database configuration from unified config
            db_config = config_manager.get("SQLALCHEMY_DATABASE_URI")
            if not db_config:
                db_config = app.config.get("SQLALCHEMY_DATABASE_URI")
                if not db_config:
                    raise ConfigurationError("Database URL not configured")

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

                    # Initialize migration manager if needed
                    if app.config.get("ENABLE_MIGRATIONS", True):
                        self.migration_manager = MigrationManager()
                        self.migration_manager.init_app(app)
                        logger.info("Migration manager initialized")

                except Exception as e:
                    logger.error(f"Database initialization error: {str(e)}")
                    return

            # Register request handlers
            @app.before_request
            def before_request():
                g.db = db_manager.session

            @app.teardown_request
            def teardown_request(exception=None):
                db = g.pop("db", None)
                if db is not None:
                    db.close()

            # Register error handler for database errors
            @app.errorhandler(SQLAlchemyError)
            def handle_db_error(error):
                self.logger.error(f"Database error occurred: {str(error)}")
                return {"error": "Database error occurred"}, 500

            self.logger.info("Database middleware initialized successfully")

        except Exception as e:
            self.logger.error(f"Database middleware initialization failed: {str(e)}")
            if hasattr(app, 'debug') and app.debug:
                self.logger.exception("Detailed error trace:")

    def verify_database_state(self) -> Dict[str, Any]:
        """Verify database and migration state."""
        status = {
            "database_initialized": False,
            "migrations_initialized": False,
            "connection_valid": False,
            "migration_status": None,
        }

        try:
            if not self._app:
                return status

            status["database_initialized"] = db_manager.verify_connection(self._app)

            if self.migration_manager:
                migration_health = self.migration_manager.run_health_check()
                status["migrations_initialized"] = migration_health.get("overall_health", False)
                status["migration_status"] = migration_health

            status["connection_valid"] = db_manager.verify_connection(self._app)

            return status

        except Exception as e:
            self.logger.error(f"Database state verification failed: {str(e)}")
            return status

    def get_migration_status(self) -> Optional[Dict[str, Any]]:
        """Get current migration status."""
        try:
            if self.migration_manager:
                return self.migration_manager.run_health_check()
            return None
        except Exception as e:
            self.logger.error(f"Failed to get migration status: {str(e)}")
            return None

# Create singleton instance
database_middleware = DatabaseMiddleware()