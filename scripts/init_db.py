#!/usr/bin/env python3
"""Initialize database and migrations."""
import os
import sys
from pathlib import Path
import logging
from flask import Flask
from flask_migrate import init as init_migrations
from flask_migrate import migrate as create_migration
from flask_migrate import upgrade as apply_migration
from sqlalchemy import text

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_app():
    """Create Flask application."""
    app = Flask(__name__)

    from backend.database.db_config import DatabaseConfig, db

    # Initialize database config
    db_config = DatabaseConfig()
    db_config.init_app(app)

    return app


def initialize_database():
    """Initialize fresh database and migrations"""
    try:
        app = create_app()

        with app.app_context():
            # Initialize migrations directory if it doesn't exist
            migrations_dir = Path("migrations")
            if not migrations_dir.exists():
                init_migrations()
                logger.info("Initialized migrations directory")

            # Create initial migration
            create_migration(directory="migrations", message="Initial migration")
            logger.info("Created initial migration")

            # Apply migration
            upgrade()
            logger.info("Applied initial migration")

            # Create all tables
            db.create_all()
            logger.info("Database tables created successfully")

            # Verify database connection
            db.session.execute(text("SELECT 1"))
            db.session.commit()
            logger.info("Database connection verified")

        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False


if __name__ == "__main__":
    if initialize_database():
        logger.info("Database initialization completed successfully")
        sys.exit(0)
    else:
        logger.error("Database initialization failed")
        sys.exit(1)
