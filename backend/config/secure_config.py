"""Secure configuration management for the application."""

import os
import secrets
from typing import Dict, Any, Optional, List, Union
from dotenv import load_dotenv
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class SecureConfigManager:
    """Manages secure configuration for the application."""

    def __init__(self):
        """Initialize the configuration manager."""
        self.config = {}
        self.initialized = False
        self.load_base_config()

    def _validate_secret_key(self, key: str) -> None:
        """Validate the secret key."""
        if not key or len(key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")

    def _validate_database_url(self, url: str) -> None:
        """Validate the database URL."""
        if not url:
            raise ValueError("DATABASE_URL must be set")

    def _validate_jwt_key(self, key: str) -> None:
        """Validate the JWT secret key."""
        if not key or len(key) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")

    def _parse_cors_origins(self, origins: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins configuration value."""
        if isinstance(origins, list):
            return origins
        if isinstance(origins, str):
            if origins == "*":
                return ["*"]
            return [origin.strip() for origin in origins.split(",")]
        return ["*"]  # Default to allow all origins if invalid value provided

    def load_base_config(self) -> None:
        """Load base configuration settings."""
        try:
            logger.info("Loading base configuration...")
            self.config = {
                # Database Configuration
                "DATABASE": {
                    "URL": os.getenv("DATABASE_URL", "sqlite:///app.db"),
                    "POOL_SIZE": int(os.getenv("DB_POOL_SIZE", "10")),
                    "MAX_OVERFLOW": int(os.getenv("DB_MAX_OVERFLOW", "20")),
                    "POOL_TIMEOUT": int(os.getenv("DB_POOL_TIMEOUT", "30")),
                    "POOL_RECYCLE": int(os.getenv("DB_POOL_RECYCLE", "1800")),
                    "TRACK_MODIFICATIONS": False,
                    "ECHO": os.getenv("FLASK_ENV") == "development",
                },
                # Redis Configuration
                "REDIS": {
                    "URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
                    "PASSWORD": os.getenv("REDIS_PASSWORD", None),
                    "TIMEOUT": int(os.getenv("REDIS_TIMEOUT", "5")),
                    "RETRY_ON_TIMEOUT": True,
                    "MAX_CONNECTIONS": int(os.getenv("REDIS_MAX_CONNECTIONS", "10")),
                    "SOCKET_KEEPALIVE": True,
                },
                # Security Configuration
                "SECURITY": {
                    "SECRET_KEY": os.getenv("SECRET_KEY", secrets.token_hex(32)),
                    "JWT_SECRET_KEY": os.getenv(
                        "JWT_SECRET_KEY", secrets.token_hex(32)
                    ),
                    "PASSWORD_SALT": os.getenv("PASSWORD_SALT", secrets.token_hex(32)),
                    "SESSION_COOKIE_SECURE": True,
                    "REMEMBER_COOKIE_SECURE": True,
                    "SESSION_COOKIE_HTTPONLY": True,
                    "REMEMBER_COOKIE_HTTPONLY": True,
                    "CORS_ENABLED": True,
                },
                # Cache Configuration
                "CACHE": {
                    "TYPE": "redis",
                    "DEFAULT_TIMEOUT": int(os.getenv("CACHE_TIMEOUT", "300")),
                    "KEY_PREFIX": "nclex_prep_",
                    "THRESHOLD": 10000,
                    "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
                },
                # Middleware Configuration
                "MIDDLEWARE": {
                    "RATE_LIMIT": os.getenv("RATE_LIMIT", "200 per day"),
                    "CORS_ORIGINS": self._parse_cors_origins(
                        os.getenv("CORS_ORIGINS", "*")
                    ),
                    "MAX_CONTENT_LENGTH": int(
                        os.getenv("MAX_CONTENT_LENGTH", "16777216")
                    ),
                    "LOGGING": {
                        "ENABLED": True,
                        "LEVEL": os.getenv("LOG_LEVEL", "INFO"),
                        "FORMAT": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    },
                    "PERFORMANCE": {
                        "ENABLED": True,
                        "WARNING_THRESHOLD": 1000,  # ms
                        "CRITICAL_THRESHOLD": 3000,  # ms
                    },
                },
                # API Configuration
                "API": {
                    "PREFIX": "/api/v1",
                    "VERSION": "1.0.0",
                    "RATE_LIMIT": os.getenv("API_RATE_LIMIT", "100 per minute"),
                    "ENVIRONMENT": os.getenv("FLASK_ENV", "development"),
                },
            }
            logger.info("Base configuration loaded successfully")
            self.initialized = True
        except Exception as e:
            logger.error(f"Failed to load base configuration: {str(e)}")
            raise

    def get_config(self) -> Dict[str, Any]:
        """Get configuration dictionary."""
        if not self.initialized:
            self.load_base_config()

        try:
            config = {
                # Security settings
                "SECRET_KEY": self.config["SECURITY"]["SECRET_KEY"],
                "JWT_SECRET_KEY": self.config["SECURITY"]["JWT_SECRET_KEY"],
                # Database settings
                "SQLALCHEMY_DATABASE_URI": self.config["DATABASE"]["URL"],
                "SQLALCHEMY_TRACK_MODIFICATIONS": self.config["DATABASE"][
                    "TRACK_MODIFICATIONS"
                ],
                "SQLALCHEMY_ENGINE_OPTIONS": {
                    "pool_size": self.config["DATABASE"]["POOL_SIZE"],
                    "max_overflow": self.config["DATABASE"]["MAX_OVERFLOW"],
                    "pool_timeout": self.config["DATABASE"]["POOL_TIMEOUT"],
                    "pool_recycle": self.config["DATABASE"]["POOL_RECYCLE"],
                },
                "SQLALCHEMY_ECHO": self.config["DATABASE"]["ECHO"],
                # Application settings
                "DEBUG": os.getenv("FLASK_ENV") == "development",
                "TESTING": False,
                "SESSION_TYPE": "sqlalchemy",
                # API settings
                "API_PREFIX": self.config["API"]["PREFIX"],
                "API_VERSION": self.config["API"]["VERSION"],
                "RATE_LIMIT": self.config["MIDDLEWARE"]["RATE_LIMIT"],
                # CORS settings
                "CORS_ENABLED": self.config["SECURITY"]["CORS_ENABLED"],
                "CORS_ORIGINS": self.config["MIDDLEWARE"]["CORS_ORIGINS"],
                # Environment
                "ENVIRONMENT": self.config["API"]["ENVIRONMENT"],
                # Cache settings
                "CACHE_TYPE": self.config["CACHE"]["TYPE"],
                "CACHE_DEFAULT_TIMEOUT": self.config["CACHE"]["DEFAULT_TIMEOUT"],
                "CACHE_REDIS_URL": self.config["CACHE"]["REDIS_URL"],
                # Middleware settings
                "MIDDLEWARE_CONFIG": {
                    "logging": self.config["MIDDLEWARE"]["LOGGING"],
                    "performance": self.config["MIDDLEWARE"]["PERFORMANCE"],
                },
            }

            logger.info("Configuration retrieved successfully")
            return config

        except Exception as e:
            logger.error(f"Error retrieving configuration: {str(e)}")
            raise

    def is_initialized(self) -> bool:
        """Check if the configuration manager is initialized."""
        return self.initialized

    def get_middleware_config(self) -> Dict[str, Any]:
        """Get middleware-specific configuration."""
        if not self.initialized:
            self.load_base_config()
        return self.config.get("MIDDLEWARE", {})

    def get_security_config(self) -> Dict[str, Any]:
        """Get security-specific configuration."""
        if not self.initialized:
            self.load_base_config()
        return self.config.get("SECURITY", {})

    def get_database_config(self) -> Dict[str, Any]:
        """Get database-specific configuration."""
        if not self.initialized:
            self.load_base_config()
        return self.config.get("DATABASE", {})


# Create singleton instance
config_manager = SecureConfigManager()
