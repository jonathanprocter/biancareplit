"""Database migration setup script."""

import logging
import os
import shutil
import sys
from pathlib import Path

from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - " "%(name)s - " "%(levelname)s - " "%(message)s",
)
logger = logging.getLogger(__name__)


def clean_migrations():
    """Remove existing migrations directory"""
    migrations_dir = Path("migrations")
    if migrations_dir.exists():
        shutil.rmtree(migrations_dir)
        logger.info("Removed existing migrations directory")


def init_migrations():
    """Initialize fresh migrations"""
    try:
        # Create minimal Flask application
        app = Flask(__name__)
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        # Initialize extensions
        db = SQLAlchemy(app)
        migrate = Migrate(app, db)

        # Initialize migrations with migrate instance
        with app.app_context():
            migrate.init_app(app, db)
            os.system("flask db init")
            logger.info("Initialized new migrations directory")

        return True
    except Exception as e:
        logger.error(f"Migration initialization failed: {e}")
        return False


def setup_migrations():
    """Set up migrations from scratch"""
    try:
        # Clean existing migrations
        clean_migrations()

        # Initialize new migrations
        if not init_migrations():
            raise Exception("Failed to initialize migrations")

        logger.info("Migration setup completed successfully")
        return True
    except Exception as e:
        logger.error(f"Migration setup failed: {e}")
        return False


if __name__ == "__main__":
    if setup_migrations():
        logger.info("Migration setup completed successfully!")
    else:
        logger.error("Migration setup failed!")
        sys.exit(1)
