"""Core database initialization and configuration."""

import logging
import os
from typing import Optional, Dict, Any, NoReturn
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError, OperationalError, ProgrammingError
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize core database objects
db = SQLAlchemy()
migrate = Migrate()

class DatabaseError(Exception):
    """Base exception for database-related errors."""
    pass

class ConnectionError(DatabaseError):
    """Exception raised for database connection issues."""
    pass

class DatabaseManager:
    """Singleton database manager with robust error handling and connection management."""

    _instance = None
    _initialized = False

    def __new__(cls) -> 'DatabaseManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def init_app(self, app: Flask) -> bool:
        """Initialize database and migrations with comprehensive error handling."""
        if self._initialized:
            logger.info("Database manager already initialized")
            return True

        try:
            # Configure database URL with proper error handling
            database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
            if not database_url:
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise ConnectionError("DATABASE_URL environment variable must be set")
                logger.info("[Database] Using DATABASE_URL from environment")

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
                "pool_use_lifo": True,  # Use LIFO to minimize number of concurrent connections
                "echo": app.debug,  # Enable SQL query logging in debug mode
            }

            # Initialize extensions
            db.init_app(app)
            migrate.init_app(app, db)

            # Verify database connection and schema
            with app.app_context():
                self._verify_database_connection()
                logger.info("[Database] Connection test successful")

                # Only create tables in development
                if app.config.get('FLASK_ENV') == 'development':
                    db.create_all()
                    logger.info("[Database] Tables created in development mode")

            self._initialized = True
            return True

        except ConnectionError as e:
            logger.error(f"[Database] Connection error: {str(e)}")
            if app.debug:
                logger.exception("[Database] Detailed connection error trace:")
            return False
        except SQLAlchemyError as e:
            logger.error(f"[Database] SQLAlchemy error: {str(e)}")
            if app.debug:
                logger.exception("[Database] Detailed SQLAlchemy error trace:")
            return False
        except Exception as e:
            logger.error(f"[Database] Initialization error: {str(e)}")
            if app.debug:
                logger.exception("[Database] Detailed error trace:")
            return False

    def _verify_database_connection(self) -> None:
        """Verify database connection with detailed error checking."""
        try:
            # Test basic connectivity
            db.session.execute(text("SELECT 1"))
            db.session.commit()
        except OperationalError as e:
            raise ConnectionError(f"Failed to connect to database: {str(e)}")
        except ProgrammingError as e:
            raise DatabaseError(f"Database schema error: {str(e)}")
        except Exception as e:
            raise DatabaseError(f"Unexpected database error: {str(e)}")

    @property
    def session(self):
        """Get the current database session with validation."""
        if not self._initialized:
            raise DatabaseError("Database manager not initialized")
        return db.session

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around operations with proper cleanup."""
        session = self.session
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"[Database] Session error: {str(e)}")
            raise
        finally:
            session.close()

    def verify_connection(self, app: Flask) -> bool:
        """Verify database connection is active and healthy."""
        try:
            with app.app_context():
                self._verify_database_connection()
                return True
        except Exception as e:
            logger.error(f"[Database] Connection verification failed: {str(e)}")
            return False

    def get_connection_info(self, app: Flask) -> Dict[str, Any]:
        """Get detailed database connection information for monitoring."""
        try:
            with app.app_context():
                engine = db.engine
                pool = engine.pool
                return {
                    "database_url": str(engine.url).replace(
                        engine.url.password or "", "***"
                    ),
                    "pool_size": pool.size(),
                    "pool_timeout": pool.timeout(),
                    "max_overflow": pool.max_overflow,
                    "pool_overflow": pool.overflow(),
                    "pool_checked_out": pool.checkedout(),
                }
        except Exception as e:
            logger.error(f"[Database] Failed to get connection info: {str(e)}")
            return {"error": str(e)}

    def cleanup(self) -> None:
        """Cleanup database resources."""
        try:
            if hasattr(self, 'session'):
                self.session.remove()
            self._initialized = False
        except Exception as e:
            logger.error(f"[Database] Cleanup error: {str(e)}")

# Create singleton instance
db_manager = DatabaseManager()

# Export for use in other modules
__all__ = ['db', 'migrate', 'db_manager']