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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
            self._setup_logging()
            self._validate_config()
            self._initialized = True
            logger.info(f"Configuration initialized for environment: {self.env}")
        except Exception as e:
            logger.error(f"Configuration initialization failed: {str(e)}")
            raise ConfigurationError(f"Failed to initialize configuration: {str(e)}")

    def _load_base_config(self) -> None:
        """Load base configuration with proper validation."""
        required_vars = [
            "DATABASE_URL",
            "SECRET_KEY",
            "JWT_SECRET_KEY"
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
            "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
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
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "MIDDLEWARE": {
                "logging": True,
                "error_handling": True,
                "performance_tracking": True,
                "security": True,
                "rate_limiting": {
                    "enabled": True,
                    "default_limits": ["200 per day", "50 per hour"]
                }
            },
            "SECURITY": {
                "password_hash_method": "pbkdf2:sha256",
                "password_salt_length": 16,
                "token_expiration": 3600,
                "session_protection": "strong"
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
            logger.error(f"Failed to load environment config: {str(e)}")
            logger.warning("Continuing with base configuration")

    def _setup_logging(self) -> None:
        """Configure logging based on environment."""
        try:
            log_level = self.config.get("LOG_LEVEL", "INFO")
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)

            handlers = [
                logging.StreamHandler(),
                logging.FileHandler(str(log_dir / f"{self.env}.log"))
            ]

            logging.basicConfig(
                level=getattr(logging, log_level),
                format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                handlers=handlers
            )
            logger.info(f"Logging configured at {log_level} level")
        except Exception as e:
            logger.error(f"Error configuring logging: {str(e)}")
            raise ConfigurationError(f"Failed to configure logging: {str(e)}")

    def _validate_config(self) -> None:
        """Validate configuration integrity."""
        required_keys = [
            "SQLALCHEMY_DATABASE_URI",
            "SECRET_KEY",
            "JWT_SECRET_KEY",
            "MIDDLEWARE",
            "SECURITY"
        ]

        missing_keys = [key for key in required_keys if key not in self.config]
        if missing_keys:
            raise ConfigurationError(f"Missing required configuration keys: {', '.join(missing_keys)}")

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
            # Update Flask configuration
            app.config.update(self.config)

            # Set up application paths
            app.instance_path = str(Path(self.config_dir).parent / "instance")
            Path(app.instance_path).mkdir(exist_ok=True)

            # Initialize logging for Flask app
            if not app.debug:
                log_dir = Path("logs")
                log_dir.mkdir(exist_ok=True)

                file_handler = logging.FileHandler("logs/flask.log")
                file_handler.setFormatter(
                    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
                )
                file_handler.setLevel(logging.INFO)
                app.logger.addHandler(file_handler)
                app.logger.setLevel(logging.INFO)

            logger.info(f"Flask application initialized with {self.env} configuration")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise ConfigurationError(f"Failed to initialize application: {str(e)}")

    def __str__(self) -> str:
        """String representation of configuration."""
        return f"ConfigurationManager(env={self.env}, initialized={self._initialized})"

# Create singleton instance
config_manager = ConfigurationManager()