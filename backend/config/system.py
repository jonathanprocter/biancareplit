import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(handler)


class ConfigurationManager:
    """Manage all application configurations"""

    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.env = os.getenv("FLASK_ENV", "production")
        self.config = {}
        self._load_config()

    def _load_config(self):
        """Load configuration based on environment"""
        try:
            self.config.update(
                {
                    # Database Configuration
                    "SQLALCHEMY_DATABASE_URI": os.getenv("DATABASE_URL"),
                    "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                    "SQLALCHEMY_ENGINE_OPTIONS": {
                        "pool_pre_ping": True,
                        "pool_size": int(os.getenv("SQLALCHEMY_POOL_SIZE", "5")),
                        "max_overflow": int(os.getenv("SQLALCHEMY_MAX_OVERFLOW", "10")),
                        "pool_timeout": int(os.getenv("SQLALCHEMY_POOL_TIMEOUT", "30")),
                        "pool_recycle": 300,
                    },
                    # Application Configuration
                    "SECRET_KEY": os.getenv("SECRET_KEY", os.urandom(24).hex()),
                    "PORT": int(os.getenv("PORT", 5000)),
                    # CORS Configuration
                    "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "*").split(","),
                    # Logging Configuration
                    "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
                    "LOG_FORMAT": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    # Custom Application Settings
                    "ENABLE_ANALYTICS": os.getenv("ENABLE_ANALYTICS", "false").lower()
                    == "true",
                    "MAX_CONTENT_LENGTH": int(
                        os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)
                    ),  # 16MB max-limit
                }
            )
            logger.info("Configuration loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            raise

    def get(self, key, default=None):
        """Get configuration value"""
        return self.config.get(key, default)

    def update(self, updates):
        """Update configuration values"""
        if isinstance(updates, dict):
            self.config.update(updates)


# Create singleton instance
config_manager = ConfigurationManager()
