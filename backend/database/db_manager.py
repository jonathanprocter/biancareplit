
"""Database manager module."""
import logging
from contextlib import contextmanager
from typing import Generator
from flask import Flask
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from backend.config.unified_config import config_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create single SQLAlchemy instance
db = SQLAlchemy()
migrate = Migrate()
Base = declarative_base()

class DatabaseManager:
    """Manages database connections and sessions."""
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.logger = logging.getLogger('DatabaseManager')
            self._engine = None
            self._session_factory = None
            self._scoped_session = None
            self._initialized = True

    def init_app(self, app: Flask) -> None:
        """Initialize database with Flask application."""
        try:
            if 'sqlalchemy' not in app.extensions:
                # Initialize SQLAlchemy with app
                db.init_app(app)
                migrate.init_app(app, db)

                # Create engine with configuration
                database_url = app.config['SQLALCHEMY_DATABASE_URI']
                engine_options = app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {})
                self._engine = create_engine(database_url, **engine_options)

                # Create session factory
                self._session_factory = sessionmaker(bind=self._engine)
                self._scoped_session = scoped_session(self._session_factory)

                # Create all tables
                with app.app_context():
                    Base.metadata.create_all(self._engine)
                    
                self.logger.info("Database initialized successfully with connection pooling")
                self.logger.info("Database and migrations initialized successfully with Flask application")
            else:
                self.logger.info("Using existing SQLAlchemy instance")

        except Exception as e:
            self.logger.error(f"Failed to initialize database: {str(e)}")
            raise

    @contextmanager
    def get_session(self) -> Generator:
        """Get database session with context management."""
        if not self._scoped_session:
            raise RuntimeError("Database not initialized. Call init_app first.")
            
        session = self._scoped_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def verify_connection(self, app: Flask) -> bool:
        """Verify database connection."""
        try:
            with app.app_context():
                self._scoped_session.execute(text('SELECT 1'))
                return True
        except Exception as e:
            self.logger.error(f"Database connection failed: {str(e)}")
            return False

    def dispose(self):
        """Dispose of the current engine and sessions."""
        if self._scoped_session:
            self._scoped_session.remove()
        if self._engine:
            self._engine.dispose()

# Create singleton instance
db_manager = DatabaseManager()
