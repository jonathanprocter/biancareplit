"""Database initialization module."""

from backend.database.core import DatabaseManager

# Export for backward compatibility
database_manager = DatabaseManager()


def init_db(app):
    """Initialize database with Flask application."""
    database_manager.init_app(app)
