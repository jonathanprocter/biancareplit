
"""Core context management for application state."""
import logging
from contextlib import contextmanager
from typing import Generator, Optional, Dict, Any
from flask import current_app
from backend.database.db_config import DatabaseConfig

logger = logging.getLogger(__name__)

class ApplicationContext:
    """Manages application-wide context and state."""
    
    def __init__(self):
        self.db_config: Optional[DatabaseConfig] = None
        self.settings: Dict[str, Any] = {}
        self._initialized = False

    def initialize(self, env: str = 'development') -> bool:
        """Initialize application context with configuration."""
        try:
            if self._initialized:
                return True
                
            self.db_config = DatabaseConfig(env)
            self.settings = {
                'environment': env,
                'debug': env == 'development',
                'initialized_at': None
            }
            self._initialized = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize application context: {e}")
            return False

    @contextmanager
    def session_scope(self) -> Generator:
        """Provide a transactional scope around a series of operations."""
        try:
            yield
            if current_app.db.session.is_active:
                current_app.db.session.commit()
        except Exception as e:
            if current_app.db.session.is_active:
                current_app.db.session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            if current_app.db.session.is_active:
                current_app.db.session.close()

app_context = ApplicationContext()
