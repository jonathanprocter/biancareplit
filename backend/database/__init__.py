"""Database initialization module."""

import os
import logging
from flask import Flask
from flask_migrate import Migrate
from .core import db

# Setup logging
logger = logging.getLogger(__name__)

# Create migrate instance
migrate = Migrate()


def init_db(app: Flask) -> bool:
    """Initialize database with Flask application."""
    try:
        # Ensure database URL is set
        if not app.config.get("SQLALCHEMY_DATABASE_URI"):
            app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")

        if not app.config.get("SQLALCHEMY_DATABASE_URI"):
            raise ValueError("DATABASE_URL environment variable must be set")

        # Configure SQLAlchemy
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 300,
        }

        # Initialize extensions
        db.init_app(app)
        migrate.init_app(app, db)

        # Create all tables
        with app.app_context():
            from .models import init_models

            init_models()  # Initialize all models
            db.create_all()
            db.session.execute(db.text("SELECT 1"))

        logger.info("Database initialized successfully")
        return True

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False


def init_app(app: Flask) -> bool:
    """Backwards compatibility for init_app."""
    return init_db(app)


__all__ = ["db", "migrate", "init_db", "init_app"]
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    db.init_app(app)
    migrate.init_app(app, db)
