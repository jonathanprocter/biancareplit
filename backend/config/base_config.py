"""Base configuration management for the NCLEX coaching platform."""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List
from dotenv import load_dotenv
import logging
from logging.config import dictConfig
from datetime import timedelta

# Load environment variables
load_dotenv()


class BaseConfig:
    """Base configuration with common settings."""

    # Application Settings
    APP_NAME = "NCLEX Coaching Platform"
    APP_VERSION = "1.0.0"
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    TESTING = os.getenv("FLASK_TESTING", "False").lower() == "true"

    # Paths
    PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
    LOGS_DIR = PROJECT_ROOT / "logs"
    INSTANCE_PATH = PROJECT_ROOT / "instance"

    # Ensure critical directories exist
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    INSTANCE_PATH.mkdir(parents=True, exist_ok=True)

    # Flask Settings
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SESSION_TYPE = "filesystem"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    # Database Settings
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        "pool_recycle": 1800,
    }

    # API Settings
    API_VERSION = "1.0"
    API_PREFIX = "/api"
    API_TIMEOUT = int(os.getenv("API_TIMEOUT", "30"))

    # Security Settings
    CSRF_ENABLED = True
    CSRF_SESSION_KEY = os.getenv("CSRF_SESSION_KEY")
    PASSWORD_SALT = os.getenv("PASSWORD_SALT")

    # Middleware Settings
    MIDDLEWARE_CONFIG = {
        "logging": {
            "enabled": True,
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "performance": {
            "enabled": True,
            "warning_threshold_ms": int(os.getenv("PERF_WARNING_THRESHOLD", "1000")),
            "critical_threshold_ms": int(os.getenv("PERF_CRITICAL_THRESHOLD", "3000")),
            "profiling_enabled": os.getenv("ENABLE_PROFILING", "false").lower()
            == "true",
        },
        "security": {
            "enabled": True,
            "rate_limit": os.getenv("API_RATE_LIMIT", "100 per minute"),
            "allowed_hosts": os.getenv("ALLOWED_HOSTS", "*").split(","),
            "cors_enabled": os.getenv("ENABLE_CORS", "true").lower() == "true",
            "cors_origins": os.getenv("CORS_ORIGINS", "*").split(","),
        },
        "analytics": {
            "enabled": True,
            "sampling_rate": float(os.getenv("ANALYTICS_SAMPLING_RATE", "1.0")),
            "tracking_enabled": os.getenv("ENABLE_TRACKING", "true").lower() == "true",
        },
    }

    @classmethod
    def get_required_env_vars(cls) -> List[str]:
        """Get list of required environment variables."""
        return ["SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL"]

    @staticmethod
    def get_logging_config() -> Dict[str, Any]:
        """Get logging configuration dictionary."""
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        log_file = BaseConfig.LOGS_DIR / "application.log"

        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                },
                "detailed": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": log_level,
                    "stream": sys.stdout,
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": str(log_file),
                    "formatter": "detailed",
                    "level": log_level,
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                },
            },
            "root": {"level": log_level, "handlers": ["console", "file"]},
        }

    def __init__(self):
        """Initialize configuration and validate settings."""
        self.logger = logging.getLogger(__name__)
        self.setup_logging()
        self.validate_config()

    def validate_config(self):
        """Validate critical configuration settings."""
        missing_vars = []
        for var in self.get_required_env_vars():
            if not os.getenv(var):
                missing_vars.append(var)

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

        if not self.SQLALCHEMY_DATABASE_URI:
            # Try to construct from individual params
            db_params = {
                "user": os.getenv("PGUSER"),
                "password": os.getenv("PGPASSWORD"),
                "host": os.getenv("PGHOST"),
                "port": os.getenv("PGPORT"),
                "database": os.getenv("PGDATABASE"),
            }
            if all(db_params.values()):
                self.SQLALCHEMY_DATABASE_URI = f"postgresql://{db_params['user']}:{db_params['password']}@{db_params['host']}:{db_params['port']}/{db_params['database']}"
            else:
                raise ValueError(
                    "Database connection parameters are not properly configured"
                )

        # Validate middleware configuration
        if not isinstance(self.MIDDLEWARE_CONFIG, dict):
            raise ValueError("Invalid middleware configuration format")

        required_middleware = ["logging", "performance", "security"]
        for section in required_middleware:
            if section not in self.MIDDLEWARE_CONFIG:
                raise ValueError(f"Missing required middleware section: {section}")

        # Validate performance thresholds
        perf_config = self.MIDDLEWARE_CONFIG["performance"]
        if perf_config["warning_threshold_ms"] >= perf_config["critical_threshold_ms"]:
            raise ValueError(
                "Performance warning threshold must be less than critical threshold"
            )

    def setup_logging(self):
        """Configure logging based on environment."""
        try:
            logging_config = self.get_logging_config()
            dictConfig(logging_config)
            self.logger.info(f"Logging configured for {self.APP_NAME}")
        except Exception as e:
            print(f"Error configuring logging: {e}", file=sys.stderr)
            raise

    @classmethod
    def init_app(cls, app):
        """Initialize Flask application with configuration."""
        if not app:
            raise ValueError("No Flask application instance provided")

        # Initialize configuration
        app.config.from_object(cls)

        # Set up application paths
        app.instance_path = str(cls.INSTANCE_PATH)

        # Initialize logging
        if not app.debug:
            # Add file handler for production
            if not os.path.exists("logs"):
                os.makedirs("logs")
            file_handler = logging.FileHandler("logs/application.log")
            file_handler.setFormatter(
                logging.Formatter(
                    "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
                )
            )
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info("Application startup")

        # Ensure application context is available
        with app.app_context():
            logging.info(f"Initialized {cls.__name__} configuration")
