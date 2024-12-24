"""Core database initialization and configuration."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
from typing import Optional
import os
from contextlib import contextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()

class DatabaseManager:
    """Singleton database manager with robust error handling and connection management."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def init_app(self, app) -> bool:
        """Initialize database and migrations with comprehensive error handling."""
        try:
            if self._initialized:
                return True

            # Configure database URL with proper error handling
            database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
            if not database_url:
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise ValueError("DATABASE_URL environment variable must be set")

            # Handle postgres URLs for compatibility
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            # Configure SQLAlchemy with optimized settings
            app.config["SQLALCHEMY_DATABASE_URI"] = database_url
            app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "pool_pre_ping": True,
                "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                "pool_recycle": 300,  # Recycle connections every 5 minutes
            }

            # Initialize extensions
            db.init_app(app)
            migrate.init_app(app, db)

            # Test connection and create tables if needed
            with app.app_context():
                try:
                    db.session.execute("SELECT 1")
                    logger.info("Database connection verified")

                    # Only create tables in development or if explicitly configured
                    if app.config.get('FLASK_ENV') == 'development' or app.config.get('AUTO_CREATE_TABLES'):
                        db.create_all()
                        logger.info("Database tables created")
                except Exception as e:
                    logger.error(f"Database initialization error: {str(e)}")
                    return False

            self._initialized = True
            return True

        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            if app.debug:
                logger.exception("Detailed error trace:")
            return False

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around operations with proper cleanup."""
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

    def verify_connection(self, app) -> bool:
        """Verify database connection is active and healthy."""
        try:
            with app.app_context():
                db.session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database connection verification failed: {str(e)}")
            return False

    def get_connection_info(self, app) -> dict:
        """Get detailed database connection information for monitoring."""
        try:
            with app.app_context():
                engine = db.engine
                return {
                    "database_url": str(engine.url).replace(
                        engine.url.password or "", "***"
                    ),
                    "pool_size": engine.pool.size(),
                    "pool_timeout": engine.pool.timeout(),
                    "max_overflow": engine.pool.max_overflow,
                }
        except Exception as e:
            logger.error(f"Failed to get connection info: {str(e)}")
            return {"error": str(e)}

# Create singleton instance
db_manager = DatabaseManager()

# Export for use in other modules
__all__ = ['db', 'migrate', 'db_manager']