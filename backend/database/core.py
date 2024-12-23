"""Core database initialization and configuration."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from typing import Optional
import os
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()

def init_db(app) -> bool:
    """Initialize database and migrations with enhanced error handling."""
    try:
        # Ensure DATABASE_URL is properly configured
        database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
        if not database_url:
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
        })

        # Initialize extensions
        db.init_app(app)
        migrate.init_app(app, db)

        # Test connection and create tables within app context
        with app.app_context():
            db.session.execute("SELECT 1")
            logger.info("Database connection verified successfully")
            db.create_all()
            logger.info("Database tables created successfully")

        return True

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        if app.debug:
            logger.exception("Detailed error trace:")
        return False

def get_db() -> Optional[SQLAlchemy]:
    """Get database instance with validation."""
    if not db:
        logger.error("Database not initialized - call init_db first")
        return None
    return db

@contextmanager
def session_scope():
    """Provide a transactional scope around a series of operations."""
    session = db.session
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Session error: {str(e)}")
        raise
    finally:
        session.close()

def verify_connection(app) -> bool:
    """Verify database connection is active."""
    try:
        with app.app_context():
            db.session.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database connection verification failed: {str(e)}")
        return False

# Export for use in other modules
__all__ = ['db', 'migrate', 'init_db', 'get_db', 'verify_connection', 'session_scope']