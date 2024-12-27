"""Unified configuration management for the medical education platform."""

import os
import logging
from typing import Dict, Any, Optional
from flask import Flask
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ConfigManager:
    """Unified configuration manager with singleton pattern."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return

        self.config = {
            "ENV": os.getenv("FLASK_ENV", "development"),
            "DEBUG": os.getenv("FLASK_DEBUG", "0") == "1",
            "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
            "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL"),
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "HOST": os.getenv("HOST", "0.0.0.0"),
            "PORT": int(os.getenv("PORT", "5000")),
            "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "*").split(","),
            "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
        }
        self._initialized = True
        self._setup_logging()

    def _setup_logging(self):
        """Configure logging based on environment."""
        log_level = getattr(logging, self.config["LOG_LEVEL"])
        logging.basicConfig(
            level=log_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        logger.info(f"Logging configured at {self.config['LOG_LEVEL']} level")

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        return self.config.get(key, default)

    def init_app(self, app: Flask) -> None:
        """Initialize Flask application with configuration."""
        try:
            # Update Flask configuration
            app.config.update(self.config)

            # Set additional Flask-specific settings
            app.config["SERVER_NAME"] = f"{self.config['HOST']}:{self.config['PORT']}"

            # Initialize logging for Flask app
            if not app.debug:
                if not os.path.exists("logs"):
                    os.makedirs("logs")
                file_handler = logging.FileHandler("logs/application.log")
                file_handler.setLevel(logging.INFO)
                app.logger.addHandler(file_handler)
                app.logger.setLevel(logging.INFO)

            logger.info(f"Initialized application config for environment: {self.config['ENV']}")

        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise

config_manager = ConfigManager()