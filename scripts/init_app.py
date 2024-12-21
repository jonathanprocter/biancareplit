"""Initialize application with proper configuration and database setup."""

import os
import sys
import logging

from backend.database.db_config import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_app():
    """Initialize the application."""
    try:
        # Set required environment variables
        os.environ["FLASK_ENV"] = "development"
        os.environ["DATABASE_URL"] = (
            "postgresql://postgres:postgres@0.0.0.0:5432/app_db"
        )

        # Initialize database
        db.create_all()
        logger.info("Database initialized successfully")

        return True
    except Exception as e:
        logger.error(f"Initialization failed: {str(e)}")
        return False


if __name__ == "__main__":
    if init_app():
        print("Application initialized successfully")
        sys.exit(0)
    else:
        sys.exit(1)