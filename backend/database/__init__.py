"""Database initialization module."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize SQLAlchemy and Migrate instances
db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initialize database with Flask application."""
    db.init_app(app)
    migrate.init_app(app, db)