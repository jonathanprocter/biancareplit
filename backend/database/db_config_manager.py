"""Database configuration manager module."""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from typing import Optional
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy and Migrate
db = SQLAlchemy()
migrate = Migrate()


class DatabaseConfigManager:
    """Database configuration manager."""

    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize database with Flask application."""
        try:
            # Configure database URL from environment variables
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                database_url = f"postgresql://{os.getenv('PGUSER', 'postgres')}:{os.getenv('PGPASSWORD', 'postgres')}@{os.getenv('PGHOST', '0.0.0.0')}:{os.getenv('PGPORT', '5432')}/{os.getenv('PGDATABASE', 'neondb')}"

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
            }

            # Initialize extensions
            db.init_app(app)
            migrate.init_app(app, db)

            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise

    def verify_connection(self) -> bool:
        """Verify database connection."""
        try:
            with self.app.app_context():
                db.session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            return False


# Create singleton instance
db_manager = DatabaseConfigManager()
