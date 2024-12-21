"""Core configuration manager."""

import os
import logging
from flask import Flask

logger = logging.getLogger(__name__)


class CoreConfigManager:
    def __init__(self):
        self.config = {}
        self.env = os.getenv("FLASK_ENV", "development")
        self._initialized = False

    def init_app(self, app: Flask) -> None:
        """Initialize Flask application with configuration."""
        try:
            app.config.update(
                {
                    "ENV": self.env,
                    "DEBUG": self.env == "development",
                    "TESTING": self.env == "testing",
                    "SQLALCHEMY_DATABASE_URI": os.getenv(
                        "DATABASE_URL", "sqlite:///app.db"
                    ),
                    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                    "SECRET_KEY": os.getenv(
                        "SECRET_KEY", "dev-key-change-in-production"
                    ),
                    "SERVER_NAME": os.getenv("SERVER_NAME", "0.0.0.0:8082"),
                }
            )

            self._initialized = True
            logger.info("Core configuration initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize configuration: {str(e)}")
            raise


config_manager = CoreConfigManager()
