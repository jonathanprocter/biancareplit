"""Unified configuration management for the medical education platform."""

import os
import sys
import logging
from typing import Dict, Any, Optional, List, Union, TypeVar, Type
from datetime import timedelta

# Initial basic logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

T = TypeVar('T')

class ConfigurationError(Exception):
    """Base exception for configuration errors."""
    pass

class ConfigurationManager:
    """Unified configuration manager with singleton pattern."""

    _instance: Optional["ConfigurationManager"] = None
    _initialized: bool = False

    def __new__(cls) -> "ConfigurationManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self.env: str = os.getenv("FLASK_ENV", "development")
        self.config: Dict[str, Any] = {}

        try:
            self._load_base_config()
            self._setup_logging()
            self._initialized = True
            logger.info(f"Configuration initialized for environment: {self.env}")
        except Exception as e:
            logger.error(f"Configuration initialization failed: {str(e)}")
            if self.env == "development":
                logger.exception("Detailed error trace:")
            raise

    def _load_base_config(self) -> None:
        """Load base configuration with proper validation."""
        try:
            # Get database URL with proper error handling
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ConfigurationError("DATABASE_URL environment variable must be set")

            # Handle postgres URL format
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)

            self.config.update({
                "ENV": self.env,
                "DEBUG": self.env == "development",
                "TESTING": self.env == "testing",
                "SECRET_KEY": os.getenv("SECRET_KEY", "dev"),
                "SQLALCHEMY_DATABASE_URI": database_url,
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "SQLALCHEMY_ENGINE_OPTIONS": {
                    "pool_pre_ping": True,
                    "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                    "pool_recycle": 300,
                },
                "SESSION_TYPE": "filesystem",
                "PERMANENT_SESSION_LIFETIME": timedelta(hours=1),
                "API_TIMEOUT": int(os.getenv("API_TIMEOUT", "30")),
                "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
            })

            logger.info("Base configuration loaded successfully")
        except ValueError as e:
            raise ConfigurationError(f"Invalid environment variable value: {str(e)}")
        except Exception as e:
            raise ConfigurationError(f"Error loading base configuration: {str(e)}")

    def _setup_logging(self) -> None:
        """Configure logging with proper format."""
        try:
            log_level = self.config.get("LOG_LEVEL", "INFO")
            root_logger = logging.getLogger()
            root_logger.setLevel(getattr(logging, log_level))

            # Remove existing handlers to prevent duplication
            for handler in root_logger.handlers[:]:
                root_logger.removeHandler(handler)

            # Add stdout handler
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
            )
            handler.setFormatter(formatter)
            root_logger.addHandler(handler)

            logger.info(f"Logging configured at {log_level} level")
        except Exception as e:
            logger.error(f"Error configuring logging: {str(e)}")
            if self.env == "development":
                logger.exception("Detailed error trace:")
            raise ConfigurationError(f"Failed to configure logging: {str(e)}")

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default."""
        if not self._initialized:
            raise ConfigurationError("Configuration manager not initialized")
        return self.config.get(key, default)

    def init_app(self, app: Any) -> None:
        """Initialize Flask application with configuration."""
        if not self._initialized:
            raise ConfigurationError("Configuration manager not initialized")

        try:
            app.config.update(self.config)
            logger.info(f"Flask application initialized with {self.env} configuration")
        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise ConfigurationError(f"Failed to initialize application: {str(e)}")

    def __str__(self) -> str:
        """String representation of configuration."""
        return f"ConfigurationManager(env={self.env}, initialized={self._initialized})"

# Create singleton instance
config_manager = ConfigurationManager()