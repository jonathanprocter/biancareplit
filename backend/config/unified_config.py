"""Unified configuration management system for the medical education platform."""

import os
from pathlib import Path
import yaml
import logging
from typing import Dict, Any, Optional
from flask import Flask

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UnifiedConfigManager:
    """Centralized configuration management system."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(UnifiedConfigManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return

        self.env = os.getenv("FLASK_ENV", "development")
        self.config: Dict[str, Any] = {}
        self.base_dir = Path(__file__).parent.parent.parent
        self.config_dir = self.base_dir / "config"

        # Initialize configuration
        self._load_config()
        self._setup_logging()
        self._initialized = True

    def _load_config(self) -> None:
        """Load configuration from multiple sources."""
        try:
            # Base configuration
            self.config.update({
                "ENV": self.env,
                "DEBUG": self.env == "development",
                "TESTING": self.env == "testing",
                "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
                "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL"),
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "SQLALCHEMY_ENGINE_OPTIONS": {
                    "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
                    "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
                    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                    "pool_recycle": 1800,
                },
                "SERVER_NAME": None,  # Allow dynamic port binding
                "HOST": "0.0.0.0",
                "PORT": int(os.getenv("PORT", "5000")),
                "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "*").split(","),
                "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
                "MIDDLEWARE": {
                    "logging": {"enabled": True},
                    "security": {"enabled": True},
                    "metrics": {"enabled": True},
                    "health": {"enabled": True}
                }
            })

            # Load environment-specific config if exists
            env_config_path = self.config_dir / f"{self.env}.yaml"
            if env_config_path.exists():
                with env_config_path.open() as f:
                    env_config = yaml.safe_load(f) or {}
                    self.config.update(env_config)

            logger.info(f"Configuration loaded successfully for environment: {self.env}")

        except Exception as e:
            logger.error(f"Failed to load configuration: {str(e)}")
            raise

    def _setup_logging(self) -> None:
        """Configure logging based on environment."""
        log_level = self.config.get("LOG_LEVEL", "INFO")
        log_dir = self.base_dir / "logs"
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

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        return self.config.get(key, default)

    def init_app(self, app: Flask) -> None:
        """Initialize Flask application with configuration."""
        try:
            # Update Flask configuration
            app.config.update(self.config)

            # Set up logging for Flask app
            if not app.debug:
                log_dir = self.base_dir / "logs"
                log_dir.mkdir(exist_ok=True)

                file_handler = logging.FileHandler(str(log_dir / "flask.log"))
                file_handler.setFormatter(
                    logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
                )
                file_handler.setLevel(logging.INFO)
                app.logger.addHandler(file_handler)
                app.logger.setLevel(logging.INFO)

            logger.info(f"Initialized application config for environment: {self.env}")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise

# Create singleton instance
config_manager = UnifiedConfigManager()