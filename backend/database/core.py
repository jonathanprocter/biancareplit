"""Core database initialization and configuration."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from pathlib import Path
from typing import Optional
import os

logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()

def init_db(app) -> bool:
    """Initialize database and migrations with enhanced error handling."""
    try:
        # Ensure DATABASE_URL is properly configured
        if not app.config.get("SQLALCHEMY_DATABASE_URI"):
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable must be set")

            # Handle heroku-style postgres URLs
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            app.config["SQLALCHEMY_DATABASE_URI"] = database_url

        # Configure SQLAlchemy
        app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
        app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", {
            "pool_pre_ping": True,
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_recycle": 300,
            "echo": app.debug,  # Enable SQL logging in debug mode
        })

        # Initialize extensions
        db.init_app(app)
        migrate.init_app(app, db)

        with app.app_context():
            # Verify database connection
            db.engine.connect()
            logger.info("Database connection verified successfully")

            # Create tables if they don't exist
            db.create_all()
            logger.info("Database tables created/verified successfully")

        return True

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        if app.debug:
            logger.exception("Detailed error trace:")
        return False

def get_db() -> Optional[SQLAlchemy]:
    """Get database instance with validation."""
    if not db.get_app():
        logger.error("Database not initialized - call init_db first")
        return None
    return db