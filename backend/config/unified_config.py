"""Unified configuration management for the medical education platform."""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Union, TypeVar, Type
import yaml
from datetime import timedelta
from logging.handlers import RotatingFileHandler

# Initial basic logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

T = TypeVar('T')

class ConfigurationError(Exception):
    """Base exception for configuration errors."""
    pass

class EnvironmentConfigError(ConfigurationError):
    """Exception raised for environment-specific configuration errors."""
    pass

class ValidationError(ConfigurationError):
    """Exception raised for configuration validation errors."""
    pass

class ConfigurationManager:
    """Unified configuration manager with singleton pattern and comprehensive validation."""

    _instance: Optional["ConfigurationManager"] = None
    _initialized: bool = False

    def __new__(cls) -> "ConfigurationManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self.env: str = os.getenv("FLASK_ENV", "development")
        self.config_dir: Path = Path(__file__).parent.parent.parent / "config"
        self.config: Dict[str, Any] = {}

        try:
            self._load_base_config()
            self._load_env_config()
            self._validate_config()
            self._setup_logging()
            self._initialized = True
            logger.info(f"Configuration initialized for environment: {self.env}")
        except ConfigurationError as e:
            logger.error(f"Configuration initialization failed: {str(e)}")
            if self.env == "development":
                logger.exception("Detailed error trace:")
            raise

    def _load_base_config(self) -> None:
        """Load base configuration with proper validation."""
        required_vars: List[str] = [
            "DATABASE_URL",
            "SECRET_KEY"
        ]

        # Validate required environment variables
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ConfigurationError(f"Missing required environment variables: {', '.join(missing_vars)}")

        try:
            self.config.update({
                "ENV": self.env,
                "DEBUG": self.env == "development",
                "TESTING": self.env == "testing",
                "SECRET_KEY": os.getenv("SECRET_KEY"),
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
                "MIDDLEWARE": {
                    "metrics": {
                        "enabled": True,
                        "namespace": "medical_edu",
                        "buckets": [0.1, 0.5, 1.0, 2.0, 5.0],
                        "exclude_paths": ["/metrics", "/health", "/static"]
                    },
                    "logging": {
                        "enabled": True,
                        "level": os.getenv("LOG_LEVEL", "INFO"),
                        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                        "rotation": {
                            "max_bytes": 10485760,  # 10MB
                            "backup_count": 5
                        }
                    },
                    "error_handling": {
                        "enabled": True,
                        "log_errors": True,
                        "include_traceback": self.env == "development"
                    },
                    "health": {
                        "enabled": True,
                        "endpoint": "/health",
                        "detailed": self.env == "development"
                    },
                    "security": {
                        "enabled": True,
                        "rate_limit": "60/minute",
                        "cors_enabled": True,
                        "jwt_required": True,
                        "allowed_origins": os.getenv("CORS_ORIGINS", "*").split(",")
                    }
                }
            })
        except ValueError as e:
            raise ValidationError(f"Invalid environment variable value: {str(e)}")
        except Exception as e:
            raise ConfigurationError(f"Error loading base configuration: {str(e)}")

    def _load_env_config(self) -> None:
        """Load environment-specific configuration with enhanced error handling."""
        try:
            env_config_path = self.config_dir / f"{self.env}.yaml"
            if env_config_path.exists():
                with env_config_path.open() as f:
                    env_config = yaml.safe_load(f) or {}
                    self._validate_env_config(env_config)
                    self.config.update(env_config)
                    logger.info(f"Loaded environment config from {env_config_path}")
        except yaml.YAMLError as e:
            raise EnvironmentConfigError(f"Invalid YAML in environment config: {str(e)}")
        except Exception as e:
            logger.warning(f"Failed to load environment config: {str(e)}, continuing with base configuration")

    def _validate_env_config(self, config: Dict[str, Any]) -> None:
        """Validate environment-specific configuration with type checking."""
        if not isinstance(config, dict):
            raise ValidationError("Environment configuration must be a dictionary")

        # Validate critical sections with type checking
        critical_sections = {
            "SQLALCHEMY_DATABASE_URI": str,
            "SECRET_KEY": str,
            "JWT_SECRET_KEY": str,
            "API_TIMEOUT": int,
            "LOG_LEVEL": str
        }

        for section, expected_type in critical_sections.items():
            if section in config:
                value = config[section]
                if not isinstance(value, expected_type):
                    raise ValidationError(
                        f"Invalid type for {section} in environment configuration. "
                        f"Expected {expected_type.__name__}, got {type(value).__name__}"
                    )

    def _validate_config(self) -> None:
        """Validate configuration integrity with comprehensive checks."""
        # Validate middleware configuration
        middleware_config = self.config.get("MIDDLEWARE", {})
        required_middleware = ["metrics", "logging", "error_handling", "security", "health"]

        # Check if required middleware sections exist and are properly configured
        for middleware in required_middleware:
            if middleware not in middleware_config:
                logger.warning(f"Missing middleware configuration: {middleware}, using defaults")
                middleware_config[middleware] = self.config["MIDDLEWARE"][middleware]
            elif not isinstance(middleware_config[middleware], dict):
                logger.warning(f"Invalid middleware configuration for: {middleware}, using defaults")
                middleware_config[middleware] = self.config["MIDDLEWARE"][middleware]

            # Validate enabled flag exists
            if "enabled" not in middleware_config[middleware]:
                middleware_config[middleware]["enabled"] = True

            # Validate specific middleware configurations
            if middleware == "logging":
                self._validate_logging_config(middleware_config[middleware])

    def _validate_logging_config(self, config: Dict[str, Any]) -> None:
        """Validate logging configuration specifically."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if config.get("level") not in valid_levels:
            logger.warning(f"Invalid log level: {config.get('level')}, defaulting to INFO")
            config["level"] = "INFO"

        rotation = config.get("rotation", {})
        if not isinstance(rotation.get("max_bytes", 0), int):
            logger.warning("Invalid rotation max_bytes, using default")
            rotation["max_bytes"] = 10485760
        if not isinstance(rotation.get("backup_count", 0), int):
            logger.warning("Invalid rotation backup_count, using default")
            rotation["backup_count"] = 5

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default."""
        if not self._initialized:
            raise ConfigurationError("Configuration manager not initialized")
        return self.config.get(key, default)

    def init_app(self, app: Any) -> None:
        """Initialize Flask application with configuration."""
        if not self._initialized:
            raise ConfigurationError("Configuration manager not initialized")

        try:
            app.config.update(self.config)
            logger.info(f"Flask application initialized with {self.env} configuration")
        except Exception as e:
            logger.error(f"Failed to initialize application configuration: {str(e)}")
            raise ConfigurationError(f"Failed to initialize application: {str(e)}")

    def _setup_logging(self) -> None:
        """Configure logging with rotation and proper error handling."""
        try:
            log_level = self.config.get("LOG_LEVEL", "INFO")
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)

            # Create handlers with proper error handling
            handlers = []

            # Always add stdout handler for visibility
            stdout_handler = logging.StreamHandler(sys.stdout)
            stdout_handler.setFormatter(logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            ))
            handlers.append(stdout_handler)

            # Add rotating file handler for persistent logging in non-development environments
            if self.env != "development":
                try:
                    log_config = self.config["MIDDLEWARE"]["logging"]
                    rotation_config = log_config.get("rotation", {})

                    file_handler = RotatingFileHandler(
                        str(log_dir / f"{self.env}.log"),
                        maxBytes=rotation_config.get("max_bytes", 10485760),
                        backupCount=rotation_config.get("backup_count", 5)
                    )
                    file_handler.setFormatter(logging.Formatter(
                        "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
                    ))
                    handlers.append(file_handler)
                except Exception as e:
                    logger.warning(f"Failed to create file handler: {str(e)}, continuing with console logging only")

            # Update root logger configuration
            root_logger = logging.getLogger()
            root_logger.setLevel(getattr(logging, log_level))

            # Remove existing handlers to prevent duplication
            for handler in root_logger.handlers[:]:
                root_logger.removeHandler(handler)

            # Add new handlers
            for handler in handlers:
                root_logger.addHandler(handler)

            logger.info(f"Logging configured at {log_level} level")
        except Exception as e:
            logger.error(f"Error configuring logging: {str(e)}")
            if self.env == "development":
                logger.exception("Detailed error trace:")
            raise ConfigurationError(f"Failed to configure logging: {str(e)}")

    def __str__(self) -> str:
        """String representation of configuration."""
        return f"ConfigurationManager(env={self.env}, initialized={self._initialized})"

# Create singleton instance
config_manager = ConfigurationManager()