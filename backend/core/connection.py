"""Connection management system for the NCLEX coaching platform."""
import os
import socket
import logging
from typing import Dict, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages system connections and health checks."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self._connections: Dict[str, bool] = {}
            self._engine = None
            self.initialized = True
            self._setup_logging()
    
    def _setup_logging(self) -> None:
        """Configure connection manager logging."""
        self.logger = logging.getLogger(__name__)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def init_app(self, app) -> None:
        """Initialize with Flask application."""
        try:
            database_url = app.config.get('SQLALCHEMY_DATABASE_URI') or os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("Database URL not configured")
                
            # Handle Heroku-style postgres:// URLs
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
                
            self._engine = create_engine(
                database_url,
                pool_size=app.config.get('SQLALCHEMY_POOL_SIZE', 5),
                max_overflow=app.config.get('SQLALCHEMY_MAX_OVERFLOW', 10),
                pool_timeout=app.config.get('SQLALCHEMY_POOL_TIMEOUT', 30),
                pool_recycle=300,
                pool_pre_ping=True
            )
            
            # Verify database connection
            if not self._check_database():
                raise RuntimeError("Failed to verify database connection")
            
            self.logger.info("Connection manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize connection manager: {str(e)}")
            raise

    def check_connections(self) -> Dict[str, bool]:
        """Check all system connections."""
        try:
            results = {
                'database': self._check_database(),
                'api_server': self._check_api_server(),
                'cache': self._check_cache(),
                'static_files': self._check_static_files()
            }
            
            # Update stored connection states
            self._connections = results
            
            # Log connection status
            for service, status in results.items():
                log_level = logging.INFO if status else logging.WARNING
                self.logger.log(
                    log_level,
                    f"Connection check - {service}: {'healthy' if status else 'unhealthy'}"
                )
            
            return results
            
        except Exception as e:
            error_msg = f"Connection check failed: {str(e)}"
            self.logger.error(error_msg)
            return {'error': str(e)}

    def _check_database(self) -> bool:
        """Check database connection."""
        try:
            if not self._engine:
                return False
                
            with self._engine.connect() as conn:
                # Execute simple query to verify connection
                conn.execute(text('SELECT 1'))
            return True
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database connection failed: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected database error: {str(e)}")
            return False

    def _check_api_server(self) -> bool:
        """Check API server connection."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5.0)  # Set timeout to 5 seconds
            result = sock.connect_ex(('0.0.0.0', 8082))
            sock.close()
            return result == 0
            
        except Exception as e:
            self.logger.error(f"API server check failed: {str(e)}")
            return False

    def _check_cache(self) -> bool:
        """Check cache connection."""
        try:
            if not current_app.config.get('CACHE_TYPE'):
                return True
                
            cache = current_app.extensions.get('cache')
            if not cache:
                self.logger.warning("Cache extension not configured")
                return False
                
            # Try to set and get a test value
            test_key = '_connection_test'
            test_value = 'test'
            cache.set(test_key, test_value, timeout=5)
            result = cache.get(test_key) == test_value
            cache.delete(test_key)
            return result
            
        except Exception as e:
            self.logger.error(f"Cache check failed: {str(e)}")
            return False
            
    def _check_static_files(self) -> bool:
        """Check static files access."""
        try:
            static_folder = current_app.static_folder
            if not static_folder:
                self.logger.warning("Static folder not configured")
                return False
                
            return os.path.isdir(static_folder) and os.access(static_folder, os.R_OK)
        except Exception as e:
            self.logger.error(f"Static files check failed: {str(e)}")
            return False
            
    def get_engine(self):
        """Get SQLAlchemy engine."""
        if not self._engine:
            raise RuntimeError("Database engine not initialized")
        return self._engine

    def dispose(self):
        """Dispose of all connections."""
        try:
            if self._engine:
                self._engine.dispose()
                self._engine = None
            self._connections.clear()
            self.logger.info("All connections disposed successfully")
        except Exception as e:
            self.logger.error(f"Error disposing connections: {str(e)}")
            raise

    @contextmanager
    def get_db_session(self):
        """Get a database session context."""
        from sqlalchemy.orm import sessionmaker
        if not self._engine:
            raise RuntimeError("Database engine not initialized")
            
        Session = sessionmaker(bind=self._engine)
        session = Session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def verify_all_connections(self) -> bool:
        """Verify all system connections are healthy."""
        connection_status = self.check_connections()
        middleware_status = self._check_middleware_connections()
        frontend_status = self._check_frontend_connections()
        
        is_healthy = all([
            all(status for name, status in connection_status.items() if isinstance(status, bool)),
            middleware_status,
            frontend_status
        ])
        
        self.logger.info(f"Connection verification complete - Healthy: {is_healthy}")
        return is_healthy
        
    def _check_middleware_connections(self) -> bool:
        """Verify middleware connections."""
        try:
            from ..middleware.registry import middleware_registry
            return all(middleware.is_initialized() for middleware in middleware_registry.get_all())
        except Exception as e:
            self.logger.error(f"Middleware connection check failed: {e}")
            return False
            
    def _check_frontend_connections(self) -> bool:
        """Verify frontend API endpoints."""
        try:
            endpoints = ['/api/health', '/api/v1/status']
            for endpoint in endpoints:
                response = self._request_with_retry('GET', endpoint)
                if not response.ok:
                    return False
            return True
        except Exception as e:
            self.logger.error(f"Frontend connection check failed: {e}")
            return False
        
        if is_healthy:
            self.logger.info("All system connections verified successfully")
        else:
            unhealthy = [
                name for name, status in connection_status.items()
                if isinstance(status, bool) and not status
            ]
            self.logger.warning(f"Unhealthy connections: {', '.join(unhealthy)}")
            
        return is_healthy

# Create singleton instance
connection_manager = ConnectionManager()
