"""Database migration manager."""

import logging

from flask_migrate import Migrate

from backend.database.db_config import db

logger = logging.getLogger(__name__)


def init_migrations(app):
    """Initialize database migrations."""
    try:
        migrate = Migrate(app, db)
        logger.info("Migration manager initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Migration manager initialization failed: {str(e)}")
        return False
