import os

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MAIL_SERVER = "smtp.gmail.com"
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")

"""Configuration management for the NCLEX coaching platform."""
import os
from pathlib import Path
from typing import Dict, Any
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class BaseConfig:
    """Base configuration with common settings."""

    # Base directory
    BASE_DIR = Path(__file__).parent

    # Core Flask settings
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-this-in-production")
    DEBUG = False
    TESTING = False

    # Application Settings
    APP_NAME = "NCLEX Coaching Platform"
    APP_VERSION = "1.0.0"

    # Database settings
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }

    # API settings
    API_VERSION = "1.0"
    API_PREFIX = "/api"

    # Security settings
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    def __init__(self):
        """Initialize logging and validate configuration."""
        self._setup_logging()
        self.validate()

    def _setup_logging(self):
        """Set up logging configuration."""
        logging.basicConfig(
            level=getattr(logging, self.LOG_LEVEL), format=self.LOG_FORMAT
        )

    def validate(self) -> bool:
        """Validate configuration settings."""
        if not self.SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL must be set")
        return True


class DevelopmentConfig(BaseConfig):
    """Development configuration."""

    DEBUG = True
    TESTING = False

    def __init__(self):
        super().__init__()
        self.SESSION_COOKIE_SECURE = False
        self.REMEMBER_COOKIE_SECURE = False


class ProductionConfig(BaseConfig):
    """Production configuration."""

    DEBUG = False
    TESTING = False

    def __init__(self):
        super().__init__()
        if self.SECRET_KEY == "dev-key-change-this-in-production":
            raise ValueError("SECRET_KEY must be changed in production")


class TestingConfig(BaseConfig):
    """Testing configuration."""

    DEBUG = False
    TESTING = True

    def __init__(self):
        super().__init__()
        self.SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
        self.SESSION_COOKIE_SECURE = False
        self.REMEMBER_COOKIE_SECURE = False


def get_config():
    """Get configuration based on environment."""
    env = os.getenv("FLASK_ENV", "development").lower()
    configs = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    config_class = configs.get(env, DevelopmentConfig)
    return config_class()
