import os
from pathlib import Path
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()


class ConfigManager:
    def __init__(self):
        self.config = {
            "ENV": os.getenv("FLASK_ENV", "development"),
            "DEBUG": os.getenv("FLASK_DEBUG", "0") == "1",
            "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
            "SQLALCHEMY_DATABASE_URI": os.getenv(
                "SQLALCHEMY_DATABASE_URI", "sqlite:///app.db"
            ),
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "HOST": os.getenv("HOST", "0.0.0.0"),
            "PORT": int(os.getenv("PORT", "8080")),
        }

    def get(self, key, default=None):
        return self.config.get(key, default)

    def init_app(self, app):
        """Initialize Flask application with configuration"""
        app.config.update(self.config)
        logger.info(
            f"Initialized application config for environment: {self.config['ENV']}"
        )


config_manager = ConfigManager()
