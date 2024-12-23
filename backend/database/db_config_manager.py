"""Database configuration manager module."""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from typing import Optional
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy and Migrate
db = SQLAlchemy()
migrate = Migrate()

class DatabaseConfigManager:
    """Database configuration manager."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.initialized = False

    def init_app(self, app: Flask) -> None:
        """Initialize database with Flask application."""
        try:
            if self.initialized:
                return

            # Configure database URL from environment variables
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable must be set")

            # Handle heroku-style postgres URLs
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            # Configure Flask-SQLAlchemy
            app.config["SQLALCHEMY_DATABASE_URI"] = database_url
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                "pool_recycle": 300,
                "pool_pre_ping": True,
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            }

            # Initialize extensions
            db.init_app(app)
            migrate.init_app(app, db)

            # Test connection
            with app.app_context():
                db.session.execute("SELECT 1")
                db.create_all()
                logger.info("Database initialized successfully")

            self.initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise

    def verify_connection(self, app: Flask) -> bool:
        """Verify database connection."""
        try:
            with app.app_context():
                db.session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            return False

    def get_db(self) -> Optional[SQLAlchemy]:
        """Get database instance."""
        if not self.initialized:
            logger.error("Database not initialized")
            return None
        return db

# Create singleton instance
db_manager = DatabaseConfigManager()