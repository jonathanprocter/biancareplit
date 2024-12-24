"""Unified configuration management for the medical education platform."""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import yaml
from datetime import timedelta

# Load environment variables
load_dotenv()

# Initial basic logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class ConfigurationError(Exception):
    """Custom exception for configuration errors."""
    pass

class ConfigurationManager:
    """Unified configuration manager with singleton pattern and comprehensive validation."""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.env = os.getenv("FLASK_ENV", "development")
        self.config_dir = Path(__file__).parent.parent.parent / "config"
        self.config: Dict[str, Any] = {}

        try:
            self._load_base_config()
            self._load_env_config()
            self._validate_config()
            self._setup_logging() #Added this line to setup logging after config is loaded
            self._initialized = True
            logger.info(f"Configuration initialized for environment: {self.env}")
        except Exception as e:
            logger.error(f"Configuration initialization failed: {str(e)}")
            raise ConfigurationError(f"Failed to initialize configuration: {str(e)}")

    def _load_base_config(self) -> None:
        """Load base configuration with proper validation."""
        required_vars = [
            "DATABASE_URL",
            "SECRET_KEY"
        ]

        # Validate required environment variables
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ConfigurationError(f"Missing required environment variables: {', '.join(missing_vars)}")

        self.config.update({
            "ENV": self.env,
            "DEBUG": self.env == "development",
            "TESTING": self.env == "testing",
            "SECRET_KEY": os.getenv("SECRET_KEY"),
            "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL"),
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "SQLALCHEMY_ENGINE_OPTIONS": {
                "pool_pre_ping": True,
                "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                "pool_recycle": 300,
            },
            "SESSION_TYPE": "filesystem",
            "PERMANENT_SESSION_LIFETIME": timedelta(hours=1),
            "JWT_ACCESS_TOKEN_EXPIRES": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600")),
            "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "*").split(","),
            "API_TIMEOUT": int(os.getenv("API_TIMEOUT", "30")),
            "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
            "MIDDLEWARE": {
                "metrics": {
                    "enabled": True,
                    "namespace": "medical_edu",
                    "buckets": [0.1, 0.5, 1.0, 2.0, 5.0],
                    "exclude_paths": ["/metrics", "/health", "/static"]
                },
                "logging": {
                    "enabled": True,
                    "level": os.getenv("LOG_LEVEL", "INFO"),
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                },
                "error_handling": {
                    "enabled": True,
                    "log_errors": True,
                    "include_traceback": self.env == "development"
                },
                "security": {
                    "enabled": True,
                    "rate_limit": "60/minute",
                    "cors_enabled": True,
                    "jwt_required": True
                }
            }
        })

    def _load_env_config(self) -> None:
        """Load environment-specific configuration."""
        try:
            env_config_path = self.config_dir / f"{self.env}.yaml"
            if env_config_path.exists():
                with env_config_path.open() as f:
                    env_config = yaml.safe_load(f) or {}
                    self.config.update(env_config)
                    logger.info(f"Loaded environment config from {env_config_path}")
        except Exception as e:
            logger.warning(f"Failed to load environment config: {str(e)}, continuing with base configuration")

    def _validate_config(self) -> None:
        """Validate configuration integrity."""
        # Validate middleware configuration
        middleware_config = self.config.get("MIDDLEWARE", {})
        required_middleware = ["metrics", "logging", "error_handling", "security"]

        # Check if required middleware sections exist, create if missing
        for middleware in required_middleware:
            if middleware not in middleware_config:
                logger.warning(f"Missing middleware configuration: {middleware}, using defaults")
                middleware_config[middleware] = self.config["MIDDLEWARE"][middleware]
            elif not isinstance(middleware_config[middleware], dict):
                logger.warning(f"Invalid middleware configuration for: {middleware}, using defaults")
                middleware_config[middleware] = self.config["MIDDLEWARE"][middleware]

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default."""
        if not self._initialized:
            raise ConfigurationError("Configuration manager not initialized")
        return self.config.get(key, default)

    def init_app(self, app) -> None:
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

    def _setup_logging(self) -> None:
        """Configure logging based on environment."""
        try:
            log_level = self.config.get("LOG_LEVEL", "INFO")
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)

            handlers = [
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(str(log_dir / f"{self.env}.log"))
            ]

            logging.basicConfig(
                level=getattr(logging, log_level),
                format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                handlers=handlers,
                force=True
            )
            logger.info(f"Logging configured at {log_level} level")
        except Exception as e:
            logger.error(f"Error configuring logging: {str(e)}")
            raise ConfigurationError(f"Failed to configure logging: {str(e)}")


# Create singleton instance
config_manager = ConfigurationManager()