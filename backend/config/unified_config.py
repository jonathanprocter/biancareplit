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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ConfigurationManager:
    """Unified configuration manager with singleton pattern."""

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
        self.config: Dict[str, Any] = self._load_base_config()

        # Load environment-specific config
        self._load_env_config()
        self._setup_logging()
        self._initialized = True
        logger.info(f"Configuration initialized for environment: {self.env}")

    def _load_base_config(self) -> Dict[str, Any]:
        """Load base configuration with proper validation."""
        try:
            return {
                "ENV": self.env,
                "DEBUG": self.env == "development",
                "TESTING": self.env == "testing",
                "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
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
                "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
                "JWT_ACCESS_TOKEN_EXPIRES": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600")),
                "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "*").split(","),
                "API_TIMEOUT": int(os.getenv("API_TIMEOUT", "30")),
                "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
                "MIDDLEWARE": {
                    "logging": True,
                    "error_handling": True,
                    "performance_tracking": True,
                    "security": True,
                },
            }
        except Exception as e:
            logger.error(f"Failed to load base configuration: {str(e)}")
            raise

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
            log_dir = Path(self.config_dir).parent / "logs"
            log_dir.mkdir(exist_ok=True)

            handlers = [
                logging.StreamHandler(),
                logging.FileHandler(str(log_dir / f"{self.env}.log"))
            ]

            logging.basicConfig(
                level=getattr(logging, log_level),
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                handlers=handlers
            )
            logger.info(f"Logging configured at {log_level} level")
        except Exception as e:
            print(f"Error configuring logging: {e}", file=sys.stderr)
            raise

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default."""
        try:
            return self.config.get(key, default)
        except Exception as e:
            logger.error(f"Error retrieving config key {key}: {str(e)}")
            return default

    def init_app(self, app) -> None:
        """Initialize Flask application with configuration."""
        try:
            if not app:
                raise ValueError("No Flask application instance provided")

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
                    logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
                )
                file_handler.setLevel(logging.INFO)
                app.logger.addHandler(file_handler)
                app.logger.setLevel(logging.INFO)

            logger.info(f"Flask application initialized with {self.env} configuration")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise

# Create singleton instance
config_manager = ConfigurationManager()