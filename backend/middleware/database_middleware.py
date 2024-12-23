"""Database middleware for handling database operations and migrations."""

import logging
from typing import Dict, Any, Optional
from flask import Flask, g, request
from sqlalchemy.exc import SQLAlchemyError
from ..database.core import db_manager
from ..database.migration_manager import MigrationManager


class DatabaseMiddleware:
    """Handles database operations and migrations in middleware layer."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._setup_logging()
        self.migration_manager = None

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

            from ..models.analytics import db

            with app.app_context():
                try:
                    db.session.execute("SELECT 1")
                    self.logger.info("Database connection verified successfully")

                    self.migration_manager = MigrationManager(db)
                    if not self.migration_manager.init_app(app):
                        self.logger.error("Failed to initialize migration manager")
                        return

                except Exception as e:
                    self.logger.error(
                        f"Database connection verification failed: {str(e)}"
                    )
                    return

            @app.before_request
            def before_request():
                g.db = db_manager.session

            @app.teardown_request
            def teardown_request(exception=None):
                db = g.pop("db", None)
                if db is not None:
                    db.close()

            @app.errorhandler(SQLAlchemyError)
            def handle_db_error(error):
                self.logger.error(f"Database error occurred: {str(error)}")
                return {"error": "Database error occurred"}, 500

            self.logger.info("Database middleware initialized successfully")

        except Exception as e:
            self.logger.error(f"Database middleware initialization failed: {str(e)}")

    def verify_database_state(self) -> Dict[str, Any]:
        """Verify database and migration state."""
        status = {
            "database_initialized": False,
            "migrations_initialized": False,
            "connection_valid": False,
            "migration_status": None,
        }

        try:
            status["database_initialized"] = db_manager.verify_connection()

            if self.migration_manager:
                migration_health = self.migration_manager.run_health_check()
                status["migrations_initialized"] = migration_health["overall_health"]
                status["migration_status"] = migration_health

            status["connection_valid"] = db_manager.verify_connection()

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


database_middleware = DatabaseMiddleware()
