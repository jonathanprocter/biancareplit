"""Application context management system."""

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from flask import Flask, current_app
from sqlalchemy import text
from sqlalchemy.orm import scoped_session, sessionmaker

from backend.database.db_config import db


class ApplicationContextError(Exception):
    """Custom exception for application context errors."""

    pass


class ApplicationContextManager:
    """Manages application context and database sessions."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.logger = self._setup_logger()
        self.app = None
        self.db_session = None
        self._initialized = True

    @staticmethod
    def _setup_logger() -> logging.Logger:
        """Setup logging configuration."""
        logger = logging.getLogger("AppContextManager")
        logger.setLevel(logging.INFO)

        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        handler = logging.FileHandler("logs/app_context.log")
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def init_app(self, app: Flask) -> None:
        """Initialize application context."""
        if not isinstance(app, Flask):
            raise ApplicationContextError("Invalid Flask application instance")

        self.app = app
        self.logger = self._setup_logger()

        # Set up database configuration
        if not hasattr(app, "config"):
            raise ApplicationContextError("Flask application config not initialized")

        if "SQLALCHEMY_DATABASE_URI" not in app.config:
            app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        # Initialize with app context
        with app.app_context():
            db.init_app(app)
            self.db_session = scoped_session(sessionmaker(bind=db.engine))
            self._setup_database()
            self.logger.info("Application context initialized successfully")

    def _setup_database(self) -> None:
        """Setup database connection."""
        if not self.app:
            raise ApplicationContextError("Application not initialized")

        db.init_app(self.app)
        self.db_session = scoped_session(sessionmaker(bind=db.engine))
        self.logger.info("Database session setup completed")

    @contextmanager
    def app_context(self) -> Generator[Flask, None, None]:
        """Provide application context."""
        if not self.app:
            raise ApplicationContextError("Application not initialized")

        # Use existing context if available
        if current_app and current_app._get_current_object() is self.app:
            yield self.app
        else:
            ctx = self.app.app_context()
            ctx.push()
            try:
                yield self.app
            finally:
                ctx.pop()

    @contextmanager
    def db_session_context(self) -> Generator[scoped_session, None, None]:
        """Provide database session context."""
        if not self.db_session:
            raise ApplicationContextError("Database session not initialized")

        # Ensure we're in an application context
        with self.app_context():
            # Create a new session for this context
            session = self.db_session()
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()

    def verify_database(self) -> bool:
        """Verify database connection within application context."""
        with self.app_context(), self.db_session_context() as session:
            session.execute(text("SELECT 1"))
            self.logger.info("Database verification successful")
            return True


# Create singleton instance
context_manager = ApplicationContextManager()
